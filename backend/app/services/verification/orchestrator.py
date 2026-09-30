"""
DRISHTI Verification Orchestrator (Main Integration Service)

Orchestrates the full AI Flood Evidence Verification + Uncertainty pipeline:

1. Sentinel-2 retrieval (Phase 2)
2. Cloud quality gating (Phase 3)
3. Permanent water check (Phase 4)
4. Gemini structured verifier (Phase 5)
5. Verification policy → uncertainty range (Phases 6–7)
6. Risk-band crossing detection (Phase 8)
7. Human review queue routing (Phase 9)

Follows the golden path:
    SegFormer flood mask
        ↓
    SAR evidence + Sentinel-2 optical evidence
        ↓
    Cloud / quality gate
        ↓
    Gemini multimodal verifier (second opinion only)
        ↓
    Structured verification verdict
        ↓
    Deterministic verification policy
        ↓
    Risk uncertainty range
        ↓
    Band-crossing check
        ↓
    Human review queue
"""

from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.models.schemas import (
    VerificationRunRequest,
    VerificationRunResponse,
    VerificationResult,
    ReviewItem
)
from app.services.verification.sentinel2_service import sentinel2_service
from app.services.verification.permanent_water import permanent_water_service
from app.services.verification.gemini_verifier import gemini_verifier_service
from app.services.verification.verification_policy import verification_policy_engine
from app.services.verification.review_queue import review_queue_service

logger = logging.getLogger(__name__)


class VerificationOrchestrator:
    """
    Main verification orchestrator for DRISHTI's AI Flood Evidence Verification layer.
    
    Fail-safe principles:
    - Every external call fails gracefully to abstain
    - The deterministic risk score is NEVER modified
    - Missing evidence widens uncertainty — it never lowers risk
    - All decisions are logged to the audit trail
    """

    def run_verification(self, request: VerificationRunRequest) -> VerificationRunResponse:
        """
        Runs the full verification pipeline for a given ROI and risk score.

        Returns a complete VerificationRunResponse containing:
        - Structured verification result (Gemini verdict + evidence)
        - Risk uncertainty range (central score unchanged)
        - Human review routing decision
        - Provenance chain
        """
        verification_id = f"ver_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        logger.info(
            f"[VerificationOrchestrator] Starting verification {verification_id} "
            f"for event={request.event_id}, risk_score={request.risk_score}"
        )

        # ------------------------------------------------------------------
        # Phase 2 + 3: Sentinel-2 retrieval + Cloud quality gate
        # ------------------------------------------------------------------
        cloud_quality = None
        scene_meta = None
        sentinel2_available = False
        sentinel2_scene_date = None

        if request.use_sentinel2:
            try:
                event_date = None
                if request.event_metadata:
                    event_date = request.event_metadata.get("event_date")

                cloud_quality, scene_meta = sentinel2_service.get_verification_evidence(
                    roi=request.roi,
                    event_date=event_date
                )
                sentinel2_available = cloud_quality.usable
                sentinel2_scene_date = cloud_quality.scene_date

            except Exception as e:
                logger.warning(f"[VerificationOrchestrator] Sentinel-2 retrieval failed: {e}")
                from app.models.schemas import CloudQualityResult
                cloud_quality = CloudQualityResult(
                    quality="INSUFFICIENT",
                    usable=False,
                    provenance="DERIVED",
                    note=f"Sentinel-2 retrieval failed: {type(e).__name__}. Defaulting to abstain."
                )
        else:
            from app.models.schemas import CloudQualityResult
            cloud_quality = CloudQualityResult(
                quality="INSUFFICIENT",
                usable=False,
                provenance="DERIVED",
                note="Sentinel-2 retrieval not requested for this run."
            )

        # ------------------------------------------------------------------
        # Phase 4: Permanent water check
        # ------------------------------------------------------------------
        from app.models.schemas import PermanentWaterResult
        permanent_water = PermanentWaterResult(
            dataset="JRC/GSW1_4/GlobalSurfaceWater",
            overlap_fraction=0.0,
            is_flagged=False,
            provenance="DERIVED",
            note="Permanent water check not requested."
        )

        if request.use_permanent_water:
            try:
                flood_fraction = None
                if request.flood_percentage is not None:
                    flood_fraction = request.flood_percentage / 100.0

                permanent_water = permanent_water_service.check_permanent_water(
                    roi=request.roi,
                    flood_mask_fraction=flood_fraction
                )
            except Exception as e:
                logger.warning(f"[VerificationOrchestrator] Permanent water check failed: {e}")
                permanent_water = PermanentWaterResult(
                    dataset="JRC/GSW1_4/GlobalSurfaceWater",
                    overlap_fraction=0.0,
                    is_flagged=False,
                    provenance="CACHED",
                    note=f"Permanent water check unavailable: {type(e).__name__}."
                )

        # ------------------------------------------------------------------
        # Phase 5: Gemini structured verifier
        # ------------------------------------------------------------------
        try:
            gemini_verdict = gemini_verifier_service.verify(
                segformer_flood_pct=request.flood_percentage,
                segformer_flood_prob=request.flood_probability,
                cloud_quality=cloud_quality,
                permanent_water=permanent_water,
                roi=request.roi,
                event_metadata=request.event_metadata,
                terrain_summary=request.terrain_summary
            )
        except Exception as e:
            logger.error(f"[VerificationOrchestrator] Gemini verifier error: {e}", exc_info=True)
            from app.services.verification.gemini_verifier import _make_abstain_verdict
            gemini_verdict = _make_abstain_verdict(f"Verifier error: {type(e).__name__}")

        # ------------------------------------------------------------------
        # Build structured verification result
        # ------------------------------------------------------------------
        provenance_map = {
            "cyclone_track": "HISTORICAL",
            "sentinel1_sar": "HISTORICAL",
            "segformer_prediction": "DERIVED",
            "sentinel2_optical": cloud_quality.provenance,
            "permanent_water_reference": permanent_water.provenance,
            "gemini_verification": "DERIVED",
            "risk_engine": "DERIVED"
        }

        verification_result = VerificationResult(
            verification_id=verification_id,
            event_id=request.event_id,
            roi=request.roi,
            risk_zone_id=request.risk_zone_id,
            timestamp=now,
            verdict=gemini_verdict,
            cloud_quality=cloud_quality,
            permanent_water=permanent_water,
            sentinel2_available=sentinel2_available,
            sentinel2_scene_date=sentinel2_scene_date,
            provenance=provenance_map,
            source_description=(
                "[AI VERIFICATION] Independent multimodal flood evidence cross-check. "
                "Gemini verified/challenged SegFormer-derived flood evidence. "
                "This does NOT replace the SegFormer prediction — it adds independent observational context."
            )
        )

        # ------------------------------------------------------------------
        # Phases 6–8: Verification policy → uncertainty → band-crossing
        # ------------------------------------------------------------------
        risk_uncertainty = verification_policy_engine.calculate_uncertainty(
            central_risk=request.risk_score,
            verdict=gemini_verdict
        )

        # ------------------------------------------------------------------
        # Phase 9: Human review queue routing
        # ------------------------------------------------------------------
        review_item: Optional[ReviewItem] = None
        if risk_uncertainty.requires_human_review:
            try:
                # Determine location string
                roi = request.roi
                location = (
                    f"ROI [{roi.get('min_lon', '?'):.2f}°E–{roi.get('max_lon', '?'):.2f}°E, "
                    f"{roi.get('min_lat', '?'):.2f}°N–{roi.get('max_lat', '?'):.2f}°N]"
                )
                if request.risk_zone_id:
                    location = f"{request.risk_zone_id} — {location}"

                review_item = review_queue_service.add_review_item(
                    risk=risk_uncertainty,
                    verification=verification_result,
                    event_id=request.event_id,
                    location=location,
                    affected_population=request.affected_population,
                    affected_road_km=request.affected_road_km,
                    affected_hospitals=request.affected_hospitals
                )
            except Exception as e:
                logger.error(f"[VerificationOrchestrator] Review queue error: {e}", exc_info=True)
        else:
            # Log non-review runs to audit log too
            review_queue_service._log_audit(
                event_type="VERIFICATION_RUN",
                event_id=request.event_id,
                zone_id=request.risk_zone_id,
                verification_verdict=gemini_verdict.verdict,
                risk_score=request.risk_score,
                risk_lower=risk_uncertainty.risk_lower,
                risk_upper=risk_uncertainty.risk_upper,
                evidence_sources=[
                    f"Sentinel-2 cloud quality: {cloud_quality.quality}",
                    f"Permanent water: {'FLAGGED' if permanent_water.is_flagged else 'OK'}",
                    f"Gemini verdict: {gemini_verdict.verdict}"
                ]
            )

        # ------------------------------------------------------------------
        # Build human_review response block
        # ------------------------------------------------------------------
        human_review_block: Dict[str, Any] = {
            "required": risk_uncertainty.requires_human_review,
            "reason": risk_uncertainty.human_review_reason or "No band boundary crossed.",
            "review_id": review_item.review_id if review_item else None,
            "band_boundaries_crossed": risk_uncertainty.band_boundaries_crossed,
            "note": (
                "Human approval is required for all operational actions. "
                "Drishti does not autonomously execute evacuation orders."
            )
        }

        logger.info(
            f"[VerificationOrchestrator] Completed {verification_id}: "
            f"verdict={gemini_verdict.verdict}, "
            f"central={request.risk_score}, "
            f"range=[{risk_uncertainty.risk_lower}–{risk_uncertainty.risk_upper}], "
            f"human_review={risk_uncertainty.requires_human_review}"
        )

        return VerificationRunResponse(
            verification=verification_result,
            risk=risk_uncertainty,
            human_review=human_review_block,
            provenance=provenance_map,
            pipeline_note=(
                "Drishti does not blindly trust a single AI flood prediction. "
                "It cross-checks model-derived evidence with independent observations, "
                "represents disagreement as uncertainty, and routes decision-sensitive "
                "cases to human review."
            )
        )

    def get_status(self) -> Dict[str, Any]:
        """Returns verification layer operational status."""
        s2_status = sentinel2_service.get_status()
        pw_status = permanent_water_service.get_status()
        verifier_status = gemini_verifier_service.get_status()
        policy = verification_policy_engine.get_policy_summary()
        queue_stats = review_queue_service.get_stats()

        return {
            "layer": "AI Flood Evidence Verification + Uncertainty Layer",
            "version": "1.0.0",
            "components": {
                "sentinel2_service": s2_status,
                "permanent_water_service": pw_status,
                "gemini_verifier": verifier_status,
                "verification_policy": policy,
                "review_queue": queue_stats
            },
            "governance": {
                "central_risk_never_modified": True,
                "gemini_is_second_opinion_only": True,
                "human_review_on_band_crossing": True,
                "fails_safely_to_abstain": True,
                "never_reduces_risk_on_missing_evidence": True,
                "segformer_remains_primary_model": True
            }
        }


verification_orchestrator = VerificationOrchestrator()
