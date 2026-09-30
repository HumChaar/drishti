"""
DRISHTI Permanent Water Check Service (Phase 4)

Checks whether SegFormer-predicted flood pixels overlap with known permanent
water bodies using the JRC Global Surface Water dataset (or equivalent).

Purpose:
    If SegFormer predicts flooding over a region known to be permanent water,
    flag: "possible_permanent_water_false_positive"

IMPORTANT:
    This does NOT automatically remove the flood prediction.
    It is verification evidence, not ground truth.
    SAR-dark pixels over permanent water may trigger false flood detections
    due to specular reflection (similar backscatter signature to floodwater).

Provenance: HISTORICAL / DERIVED (JRC Global Surface Water is a processed product)
"""

from __future__ import annotations
import os
import logging
from typing import Optional, Dict, Any, Tuple

from app.models.schemas import PermanentWaterResult
from app.core.verification_config import DEFAULT_PERM_WATER_CONFIG

logger = logging.getLogger(__name__)

try:
    import ee
    _EE_AVAILABLE = True
except ImportError:
    ee = None  # type: ignore
    _EE_AVAILABLE = False


class PermanentWaterService:
    """
    Checks for permanent water overlap with SegFormer-predicted flood regions.

    Uses JRC Global Surface Water (occurrence band) via Google Earth Engine.
    Fails gracefully if GEE is unavailable — returns non-flagged, provenance-tagged result.
    """

    def __init__(self):
        self._ee_initialized = False
        self._cfg = DEFAULT_PERM_WATER_CONFIG

    def _init_ee(self) -> bool:
        """Lightweight EE initialization check. Reuses existing session if available."""
        if not _EE_AVAILABLE:
            return False
        if self._ee_initialized:
            return True
        try:
            # EE should already be initialized by sentinel2_service; just verify
            ee.Number(1).getInfo()
            self._ee_initialized = True
            return True
        except Exception:
            return False

    def check_permanent_water(
        self,
        roi: Dict[str, float],
        flood_mask_fraction: Optional[float] = None
    ) -> PermanentWaterResult:
        """
        Checks the overlap between predicted flood area and JRC permanent water.

        Args:
            roi: Region of interest {min_lon, min_lat, max_lon, max_lat}
            flood_mask_fraction: Optional fraction of ROI predicted as flood (0–1).
                                 Used for approximate overlap calculation if EE unavailable.

        Returns:
            PermanentWaterResult — never raises.
        """
        if not self._init_ee():
            return self._make_unavailable_result()

        try:
            return self._compute_overlap(roi, flood_mask_fraction)
        except Exception as e:
            logger.warning(f"[PermanentWaterService] GEE query failed: {e}")
            return self._make_unavailable_result()

    def _compute_overlap(
        self,
        roi: Dict[str, float],
        flood_fraction: Optional[float]
    ) -> PermanentWaterResult:
        """Executes GEE query for JRC permanent water overlap."""

        geometry = ee.Geometry.Rectangle([
            roi["min_lon"], roi["min_lat"],
            roi["max_lon"], roi["max_lat"]
        ])

        # JRC Global Surface Water — occurrence band (0–100, % of time water present)
        jrc = ee.Image(self._cfg.jrc_collection).select("occurrence")

        # Create binary permanent water mask
        perm_water_mask = jrc.gte(self._cfg.jrc_occurrence_threshold)

        # Compute fraction of ROI that is permanent water
        scale = 30  # JRC native resolution (30m)
        stats = perm_water_mask.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=scale,
            maxPixels=65536
        ).getInfo()

        perm_water_fraction = float(stats.get("occurrence", 0.0) or 0.0)

        # Approximate overlap with predicted flood area
        # If SegFormer flood fraction is available, use it for context
        # Otherwise use permanent water fraction as proxy
        if flood_fraction is not None and flood_fraction > 0:
            # Conservative approximation: assume flood pixels uniformly distributed
            # Actual spatial overlap requires the flood mask geometry
            overlap_fraction = min(perm_water_fraction, flood_fraction)
        else:
            overlap_fraction = perm_water_fraction

        overlap_fraction = max(0.0, min(1.0, overlap_fraction))
        is_flagged = overlap_fraction >= self._cfg.overlap_flag_threshold

        flag_label = "possible_permanent_water_false_positive" if is_flagged else None

        return PermanentWaterResult(
            dataset=self._cfg.jrc_collection,
            overlap_fraction=round(overlap_fraction, 4),
            is_flagged=is_flagged,
            flag_label=flag_label,
            provenance="HISTORICAL",
            note=(
                f"JRC GSW occurrence threshold: {self._cfg.jrc_occurrence_threshold}%. "
                f"Overlap fraction: {overlap_fraction:.1%}. "
                "This does NOT remove the flood prediction — it is verification evidence only. "
                "SAR specular reflection can produce false flood detections over permanent water."
            )
        )

    def _make_unavailable_result(self) -> PermanentWaterResult:
        """Safe fallback result when GEE is unavailable."""
        return PermanentWaterResult(
            dataset=self._cfg.jrc_collection,
            overlap_fraction=0.0,
            is_flagged=False,
            flag_label=None,
            provenance="CACHED",
            note=(
                "Permanent water check unavailable: GEE not configured or not accessible. "
                "Overlap fraction set to 0 (unknown) — not evidence of absence of overlap. "
                "This does NOT remove the flood prediction."
            )
        )

    def get_status(self) -> Dict[str, Any]:
        """Returns service status."""
        return {
            "service": "PermanentWaterService",
            "dataset": self._cfg.jrc_collection,
            "jrc_occurrence_threshold": self._cfg.jrc_occurrence_threshold,
            "overlap_flag_threshold": self._cfg.overlap_flag_threshold,
            "ee_available": _EE_AVAILABLE,
            "governance": {
                "removes_flood_prediction": False,
                "is_ground_truth": False,
                "is_verification_evidence": True
            }
        }


permanent_water_service = PermanentWaterService()
