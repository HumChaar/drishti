"""
DRISHTI JEV Bounded Decision Integration Layer

Implements the JEV (Joint Evaluation Verdict / TypeSafe Bounded Decision Layer) for DRISHTI.

JEV operates AFTER:
1. SegFormer flood evidence
2. Deterministic impact/vulnerability features
3. Deterministic risk score
4. Sentinel-2 verification
5. Gemini verification
6. Verification uncertainty calculation

Architecture:
SegFormer → Risk Engine → Gemini Verification → Verification Policy → Risk Range → JEV → Human Review → Gemini Advisory

CRITICAL GOVERNANCE CONSTRAINTS:
JEV MUST NOT:
- Invent measurements or satellite observations
- Modify SegFormer predictions
- Modify the deterministic risk score (risk_score, risk_lower, risk_upper, risk_band)
- Modify exposure values (population_exposure, road_exposure, hospital_exposure)
- Override verification evidence
- Declare a flood as ground truth
- Independently issue evacuation orders or authorize emergency dispatch
- Bypass human approval for sensitive actions
- Treat missing data or abstention as safe conditions

JEV consumes these values — it does NOT recompute or alter them.
"""

from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class JEVDecisionOutput(BaseModel):
    decision: str = Field(..., description="Decision: REVIEW_REQUIRED | MONITOR | REQUEST_EVIDENCE | ESCALATE")
    priority: str = Field(..., description="Priority: CRITICAL | HIGH | MEDIUM | ROUTINE")
    verification_status: str = Field(..., description="VERIFIED | PARTIAL | CONTRADICTED | UNVERIFIED")
    next_action: str = Field(..., description="Next Action: WATCH_OFFICER_REVIEW | CONTINUE_MONITORING | REQUEST_ADDITIONAL_EVIDENCE")
    reason_code: str = Field(..., description="Reason Code: RISK_BAND_CROSSING | STABLE_RISK_BAND | VERIFICATION_ABSTAINED | EVIDENCE_CONFLICT")
    additional_evidence_request: List[str] = Field(default_factory=list, description="Recommended tactical evidence actions")
    governance_note: str = Field(
        default="JEV Bounded Decision Layer: Preserved central deterministic risk score. Autonomous evacuation execution is locked.",
        description="Governance disclaimer"
    )


class JEVDecisionEngine:
    """
    Evaluates bounded operational workflow decisions based on calculated evidence snapshots.
    Strictly preserves central risk scores and enforces human-in-the-loop safety.
    """

    def evaluate(
        self,
        event_id: str,
        zone_id: str,
        central_risk_score: float,
        risk_lower: float,
        risk_upper: float,
        risk_band: str,
        verdict: str,
        failure_mode: str,
        evidence_quality: str,
        disagreement_level: float,
        population_exposure: Optional[int] = None,
        road_exposure_km: Optional[float] = None,
        hospitals_exposure: Optional[int] = None,
        human_review_required: bool = False
    ) -> JEVDecisionOutput:
        """
        Runs JEV bounded decision logic based on exact JEV Decision Rules.
        """
        v_upper = verdict.lower()
        
        # 1. Determine verification status string
        if v_upper == "agree":
            v_status = "VERIFIED"
        elif v_upper == "partial":
            v_status = "PARTIAL"
        elif v_upper == "disagree":
            v_status = "CONTRADICTED"
        else:
            v_status = "UNVERIFIED"

        # 2. Additional evidence requests
        requests: List[str] = []
        if failure_mode == "permanent_water":
            requests.append("Cross-reference JRC Global Surface Water occurrence map with high-resolution optical imagery")
            requests.append("Verify whether inundation extends beyond known permanent aquaculture boundaries")
        elif failure_mode == "cloud_contamination" or evidence_quality == "low" or v_upper == "abstain":
            requests.append("Request next-pass Sentinel-1 SAR acquisition or UAV optical flight over low-lying sectors")
            requests.append("Deploy ground observation team for visual embankment inspection")
        elif failure_mode == "radar_shadow":
            requests.append("Inspect DEM elevation profile to rule out terrain radar shadow artifacts")

        if hospitals_exposure and hospitals_exposure > 0:
            requests.append(f"Verify emergency generator fuel supply & flood protection at {hospitals_exposure} hospital hub(s)")
        if road_exposure_km and road_exposure_km > 10:
            requests.append(f"Request state highway patrol status for {road_exposure_km:.1f} km affected road network")

        if not requests:
            requests.append("Continue routine synoptic surveillance and monitor next satellite pass")

        # 3. Apply exact JEV Decision Rules
        # CASE 3: Gemini verification ABSTAINed
        if v_upper == "abstain":
            decision = "REVIEW_REQUIRED" if (human_review_required or central_risk_score >= 65) else "REQUEST_EVIDENCE"
            priority = "HIGH" if central_risk_score >= 65 else "MEDIUM"
            next_action = "REQUEST_ADDITIONAL_EVIDENCE"
            reason_code = "VERIFICATION_ABSTAINED"

        # CASE 4: Gemini DISAGREE on HIGH/CRITICAL risk
        elif v_upper == "disagree" and central_risk_score >= 65:
            decision = "REVIEW_REQUIRED"
            priority = "CRITICAL" if central_risk_score >= 80 else "HIGH"
            next_action = "WATCH_OFFICER_REVIEW"
            reason_code = "EVIDENCE_CONFLICT"

        # CASE 1: Risk Band Crossing
        elif human_review_required:
            decision = "REVIEW_REQUIRED"
            priority = "CRITICAL" if central_risk_score >= 80 else "HIGH"
            next_action = "WATCH_OFFICER_REVIEW"
            reason_code = "RISK_BAND_CROSSING"

        # CASE 2: Stable Risk Band (No band crossing)
        else:
            decision = "MONITOR"
            priority = "CRITICAL" if central_risk_score >= 80 else "HIGH" if central_risk_score >= 65 else "MEDIUM" if central_risk_score >= 45 else "ROUTINE"
            next_action = "CONTINUE_MONITORING"
            reason_code = "STABLE_RISK_BAND"

        return JEVDecisionOutput(
            decision=decision,
            priority=priority,
            verification_status=v_status,
            next_action=next_action,
            reason_code=reason_code,
            additional_evidence_request=requests
        )


jev_decision_engine = JEVDecisionEngine()
