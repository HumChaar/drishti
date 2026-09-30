"""
DRISHTI Sentinel-2 Verification Service (Phase 2)

Retrieves Sentinel-2 optical imagery from Google Earth Engine as
independent verification evidence for SegFormer-predicted flood extents.

Architecture Notes:
- Uses COPERNICUS/S2_SR_HARMONIZED joined with COPERNICUS/S2_CLOUD_PROBABILITY
- Retrieves a small verification tile, not the entire ROI at once
- Fails safely: returns abstain evidence if GEE is unavailable
- Does NOT download entire 0.5° × 0.5° scenes — operates on small tiles

GEE Authentication:
    Set EE_SERVICE_ACCOUNT_KEY (path or JSON string) and EE_PROJECT in .env
    If not set, the service returns cached/unavailable state without crashing.

Provenance: HISTORICAL (for past events like Remal) or LIVE (operational use)
"""

from __future__ import annotations
import os
import json
import base64
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple

from app.models.schemas import CloudQualityResult
from app.core.verification_config import DEFAULT_CLOUD_GATE_CONFIG, DEFAULT_S2_CONFIG

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# GEE Availability Gate
# ---------------------------------------------------------------------------
# GEE Python client is large and optional. If not installed, all methods
# fall back gracefully to "INSUFFICIENT" cloud quality.

try:
    import ee
    _EE_AVAILABLE = True
except ImportError:
    ee = None  # type: ignore
    _EE_AVAILABLE = False


class Sentinel2Service:
    """
    Retrieves Sentinel-2 optical imagery for independent flood verification.

    Principle: If ANY external dependency fails, return an abstain-compatible
    result. Never treat missing evidence as evidence of safety.
    """

    def __init__(self):
        self._ee_initialized = False
        self._cfg = DEFAULT_S2_CONFIG
        self._cloud_cfg = DEFAULT_CLOUD_GATE_CONFIG

    # ------------------------------------------------------------------
    # GEE Initialization
    # ------------------------------------------------------------------

    def _init_ee(self) -> bool:
        """
        Attempts to initialize Earth Engine.
        Returns True if successful, False otherwise.
        Never raises — always fails gracefully.
        """
        if not _EE_AVAILABLE:
            logger.warning("[Sentinel2Service] earthengine-api not installed. Returning INSUFFICIENT evidence.")
            return False

        if self._ee_initialized:
            return True

        try:
            key_env = os.getenv("EE_SERVICE_ACCOUNT_KEY", "")
            project = os.getenv("EE_PROJECT", "")

            if not key_env or not project:
                # Try application default credentials (local dev)
                try:
                    ee.Initialize(project=project or None)
                    self._ee_initialized = True
                    logger.info("[Sentinel2Service] GEE initialized with application default credentials.")
                    return True
                except Exception as e:
                    logger.warning(f"[Sentinel2Service] GEE init failed (no credentials configured): {e}")
                    return False

            # Parse service account key
            if os.path.isfile(key_env):
                with open(key_env, "r") as f:
                    key_data = json.load(f)
            else:
                # Try as JSON string
                key_data = json.loads(key_env)

            service_account = key_data.get("client_email", "")
            credentials = ee.ServiceAccountCredentials(service_account, key_data=json.dumps(key_data))
            ee.Initialize(credentials, project=project)
            self._ee_initialized = True
            logger.info("[Sentinel2Service] GEE initialized with service account credentials.")
            return True

        except Exception as e:
            logger.warning(f"[Sentinel2Service] GEE initialization failed: {e}")
            return False

    # ------------------------------------------------------------------
    # Main Retrieval Method
    # ------------------------------------------------------------------

    def get_verification_evidence(
        self,
        roi: Dict[str, float],
        event_date: Optional[str] = None,
        search_window_days: Optional[int] = None
    ) -> Tuple[CloudQualityResult, Optional[Dict[str, Any]]]:
        """
        Retrieves Sentinel-2 scene for a verification tile around the ROI.

        Returns:
            (cloud_quality_result, scene_metadata_or_None)

        Fails safely to INSUFFICIENT if GEE unavailable or any error occurs.
        """
        window = search_window_days or self._cloud_cfg.search_window_days

        if not self._init_ee():
            return self._make_insufficient("GEE not available or not configured"), None

        try:
            return self._retrieve_scene(roi, event_date, window)
        except Exception as e:
            logger.error(f"[Sentinel2Service] Scene retrieval error: {e}", exc_info=True)
            return self._make_insufficient(f"GEE retrieval error: {type(e).__name__}"), None

    def _retrieve_scene(
        self,
        roi: Dict[str, float],
        event_date: Optional[str],
        window_days: int
    ) -> Tuple[CloudQualityResult, Optional[Dict[str, Any]]]:
        """
        Executes the GEE query for the best Sentinel-2 scene.
        Joins S2_SR_HARMONIZED with S2_CLOUD_PROBABILITY by system:index.
        """
        buf = self._cfg.verification_tile_buffer_deg
        min_lon = roi["min_lon"] + buf
        min_lat = roi["min_lat"] + buf
        max_lon = roi["max_lon"] - buf
        max_lat = roi["max_lat"] - buf

        # Clamp to valid bounds
        min_lon = max(-180, min(min_lon, 180))
        max_lon = max(-180, min(max_lon, 180))
        min_lat = max(-90, min(min_lat, 90))
        max_lat = max(-90, min(max_lat, 90))

        geometry = ee.Geometry.Rectangle([min_lon, min_lat, max_lon, max_lat])

        # Date window
        if event_date:
            end_date = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
        else:
            end_date = datetime.now(timezone.utc)

        start_date = end_date - timedelta(days=window_days)

        start_str = start_date.strftime("%Y-%m-%d")
        end_str = (end_date + timedelta(days=1)).strftime("%Y-%m-%d")

        # S2 surface reflectance collection
        s2_col = (
            ee.ImageCollection(self._cfg.collection)
            .filterBounds(geometry)
            .filterDate(start_str, end_str)
            .sort("CLOUDY_PIXEL_PERCENTAGE")
        )

        # Cloud probability collection
        s2_cloud_col = (
            ee.ImageCollection(self._cfg.cloud_prob_collection)
            .filterBounds(geometry)
            .filterDate(start_str, end_str)
        )

        # Join on system:index
        join = ee.Join.saveFirst("cloud_prob_img")
        condition = ee.Filter.equals(leftField="system:index", rightField="system:index")
        joined = ee.ImageCollection(join.apply(s2_col, s2_cloud_col, condition))

        # Select best (least cloudy) scene
        best = joined.first()

        if best is None:
            return self._make_insufficient("No Sentinel-2 scene found in search window"), None

        # Evaluate scene metadata
        info = best.getInfo()
        if not info:
            return self._make_insufficient("Could not retrieve scene metadata"), None

        props = info.get("properties", {})
        scene_id = props.get("system:index", "unknown")
        cloudy_pct = float(props.get("CLOUDY_PIXEL_PERCENTAGE", 100.0))

        # Extract mean cloud probability over geometry
        cloud_prob_img = ee.Image(best.get("cloud_prob_img"))
        cloud_prob_mean_dict = cloud_prob_img.select("probability").reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=self._cfg.target_resolution_m,
            maxPixels=self._cfg.max_tile_pixels
        ).getInfo()
        cloud_prob_mean = float(cloud_prob_mean_dict.get("probability", 100.0))

        # Scene date
        scene_timestamp = props.get("system:time_start", 0)
        scene_date = datetime.utcfromtimestamp(scene_timestamp / 1000).strftime("%Y-%m-%d") if scene_timestamp else None

        # Classify cloud quality
        quality = self._classify_cloud_quality(cloudy_pct, cloud_prob_mean)

        # Build thumbnail URL for optional UI use (small tile)
        thumbnail_url = None
        try:
            vis_params = {
                "bands": self._cfg.rgb_bands,
                "min": 0,
                "max": 3000,
                "gamma": 1.4
            }
            thumbnail_url = best.getThumbURL({
                "region": geometry.getInfo()["coordinates"],
                "dimensions": "256x256",
                "format": "png",
                **{k: v for k, v in vis_params.items()}
            })
        except Exception as thumb_err:
            logger.debug(f"[Sentinel2Service] Thumbnail URL failed: {thumb_err}")

        cloud_result = CloudQualityResult(
            quality=quality,
            cloudy_pixel_pct=round(cloudy_pct, 2),
            cloud_prob_mean=round(cloud_prob_mean, 2),
            scene_date=scene_date,
            scene_id=scene_id,
            usable=(quality in ("CLEAR", "PARTIAL")),
            provenance="HISTORICAL",  # Remal is a historical event
            note=(
                "Cloud gate thresholds are MVP engineering defaults — not scientifically calibrated. "
                f"CLOUDY_PIXEL_PERCENTAGE={cloudy_pct:.1f}%, mean cloud probability={cloud_prob_mean:.1f}%."
            )
        )

        scene_meta = {
            "scene_id": scene_id,
            "scene_date": scene_date,
            "cloudy_pct": cloudy_pct,
            "cloud_prob_mean": cloud_prob_mean,
            "thumbnail_url": thumbnail_url,
            "collection": self._cfg.collection,
            "roi_used": roi
        }

        return cloud_result, scene_meta

    # ------------------------------------------------------------------
    # Cloud Quality Classification
    # ------------------------------------------------------------------

    def _classify_cloud_quality(self, cloudy_pct: float, cloud_prob_mean: float) -> str:
        """
        Deterministic cloud quality gate.
        MVP thresholds — not scientifically validated.

        Returns: CLEAR | PARTIAL | CLOUDY
        """
        cfg = self._cloud_cfg
        if (cloudy_pct <= cfg.clear_max_cloudy_pct and
                cloud_prob_mean <= cfg.clear_max_cloud_prob_mean):
            return "CLEAR"
        elif (cloudy_pct <= cfg.partial_max_cloudy_pct or
              cloud_prob_mean <= cfg.partial_max_cloud_prob_mean):
            return "PARTIAL"
        else:
            return "CLOUDY"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _make_insufficient(self, reason: str) -> CloudQualityResult:
        """Returns an INSUFFICIENT cloud quality result for safe fallback."""
        return CloudQualityResult(
            quality="INSUFFICIENT",
            cloudy_pixel_pct=None,
            cloud_prob_mean=None,
            scene_date=None,
            scene_id=None,
            usable=False,
            provenance="CACHED" if "cached" in reason.lower() else "DERIVED",
            note=f"Evidence unavailable: {reason}. MVP cloud gate thresholds not scientifically calibrated."
        )

    def get_status(self) -> Dict[str, Any]:
        """Returns service operational status."""
        ee_configured = bool(os.getenv("EE_SERVICE_ACCOUNT_KEY") or os.getenv("EE_PROJECT"))
        return {
            "service": "Sentinel2Service",
            "earthengine_api_available": _EE_AVAILABLE,
            "ee_configured": ee_configured,
            "ee_initialized": self._ee_initialized,
            "collection": self._cfg.collection,
            "cloud_prob_collection": self._cfg.cloud_prob_collection,
            "mode": "LIVE_GEE" if (ee_configured and _EE_AVAILABLE) else "UNAVAILABLE_ABSTAIN",
            "governance": {
                "fails_safely_to_abstain": True,
                "never_invents_imagery": True,
                "provenance_required": True
            }
        }


sentinel2_service = Sentinel2Service()
