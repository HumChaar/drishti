"""
DRISHTI Remal Golden Path Validation Service

Executes the complete end-to-end Remal Golden Path validation across all 4 ranked
verification zones using real Drishti datasets:

Golden Path Flow:
Cyclone Remal (BOB/01/2024)
    ↓
Sentinel-1 SAR
    ↓
Existing SegFormer-B0 flood prediction ("SegFormer-predicted flood extent")
    ↓
Impact / Exposure features (WorldPop, OSM roads, hospitals)
    ↓
Deterministic central risk score (0.72 - 0.96 / 100)
    ↓
Sentinel-2 optical verification
    ↓
Cloud-quality gate (QA60/SCL analysis)
    ↓
Permanent-water check (JRC Global Surface Water)
    ↓
Gemini structured verifier (Second-opinion only)
    ↓
Verification policy → uncertainty range [lower, upper]
    ↓
Risk-band crossing check (LOW, MEDIUM, HIGH, VERY HIGH/CRITICAL)
    ↓
Human review queue routing
    ↓
Laya decision layer (tactical recommendations, priority, evidence request)
    ↓
Gemini Watch Officer advisory (6-question briefing)
    ↓
Audit log persistence
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any

from app.models.schemas import VerificationRunRequest
from app.services.verification.remal_zones import get_remal_verification_zones, get_remal_zone_by_id
from app.services.verification.orchestrator import verification_orchestrator
from app.services.verification.jev_layer import jev_decision_engine
from app.services.verification.gemini_verifier import gemini_verifier_service
from app.services.verification.review_queue import review_queue_service

logger = logging.getLogger(__name__)


class RemalGoldenPathService:
    """
    Executes and validates the Remal Golden Path demonstration across all verification zones.
    """

    def run_golden_path(self, target_zone_id: str = "ALL") -> Dict[str, Any]:
        """
        Runs the end-to-end golden path pipeline.
        If target_zone_id == 'ALL', runs for all 4 zones.
        Otherwise runs for the specified zone ID.
        """
        all_zones = get_remal_verification_zones()
        if target_zone_id != "ALL":
            selected_zones = [z for z in all_zones if z["zone_id"] == target_zone_id]
            if not selected_zones:
                selected_zones = [get_remal_zone_by_id(target_zone_id)]
        else:
            selected_zones = all_zones

        zone_results: List[Dict[str, Any]] = []
        review_items_created: List[Any] = []
        human_review_count = 0

        for zone in selected_zones:
            logger.info(f"[RemalGoldenPath] Executing verification for zone {zone['zone_id']} ({zone['zone_name']})")

            # Build VerificationRunRequest for this real zone
            req = VerificationRunRequest(
                event_id=zone["event_id"],
                risk_zone_id=zone["zone_id"],
                roi=zone["roi"],
                risk_score=zone["risk_score"],
                flood_percentage=zone["flood_fraction"] * 100.0,
                flood_probability=zone["flood_fraction"],
                affected_population=zone["population_exposure"],
                affected_road_km=zone["road_exposure_km"],
                affected_hospitals=zone["hospitals_exposure"],
                event_metadata={
                    "event_name": "CYCLONE REMAL",
                    "event_date": "2024-05-27",
                    "basin": "Bay of Bengal",
                    "landfall_zone": zone["district_name"],
                    "state": zone["state"]
                },
                terrain_summary=f"Low-lying coastal sector in {zone['district_name']}, {zone['state']}. Elevation < 5m."
            )

            # 1. Run main 5-phase verification orchestrator
            res = verification_orchestrator.run_verification(req)

            # 2. Run JEV Bounded Decision Layer
            jev_eval = jev_decision_engine.evaluate(
                event_id=req.event_id,
                zone_id=zone["zone_id"],
                central_risk_score=req.risk_score,
                risk_lower=res.risk.risk_lower,
                risk_upper=res.risk.risk_upper,
                risk_band=zone["risk_band"],
                verdict=res.verification.verdict.verdict,
                failure_mode=res.verification.verdict.failure_mode,
                evidence_quality=res.verification.verdict.evidence_quality,
                disagreement_level=res.verification.verdict.disagreement_level,
                population_exposure=zone["population_exposure"],
                road_exposure_km=zone["road_exposure_km"],
                hospitals_exposure=zone["hospitals_exposure"],
                human_review_required=res.risk.requires_human_review
            )

            # 3. Generate Gemini Watch Officer 6-question advisory
            advisory = gemini_verifier_service.generate_advisory(
                zone_name=zone["zone_name"],
                central_risk=req.risk_score,
                risk_band=zone["risk_band"],
                risk_lower=res.risk.risk_lower,
                risk_upper=res.risk.risk_upper,
                verdict=res.verification.verdict.verdict,
                failure_mode=res.verification.verdict.failure_mode,
                evidence_quality=res.verification.verdict.evidence_quality,
                population_exposure=zone["population_exposure"],
                road_exposure_km=zone["road_exposure_km"],
                hospitals_exposure=zone["hospitals_exposure"],
                infrastructure_list=zone["critical_infrastructure"],
                requires_human_review=res.risk.requires_human_review,
                human_review_reason=res.risk.human_review_reason
            )

            if res.risk.requires_human_review:
                human_review_count += 1
                if res.human_review.get("review_id"):
                    review_items_created.append(res.human_review["review_id"])

            zone_results.append({
                "zone_info": zone,
                "verification_run": res.model_dump(),
                "jev_decision": jev_eval.model_dump(),
                "watch_officer_advisory": advisory
            })

        current_queue = review_queue_service.get_queue()
        audit_log = review_queue_service.get_audit_log(limit=20)

        return {
            "title": "DRISHTI Cyclone Remal AI Flood Evidence Verification Golden Path",
            "event_name": "CYCLONE REMAL (BOB/01/2024)",
            "summary": {
                "total_zones_verified": len(selected_zones),
                "zones_requiring_human_review": human_review_count,
                "pending_queue_count": len([i for i in current_queue if i.review_status == "PENDING"]),
                "governance": "Central deterministic risk score preserved across all verification runs."
            },
            "verified_zones": zone_results,
            "review_queue_snapshot": [item.model_dump() for item in current_queue],
            "recent_audit_log": [log.model_dump() for log in audit_log]
        }


remal_golden_path_service = RemalGoldenPathService()
