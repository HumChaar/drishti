"""
DRISHTI Verification API Routes (Phase 12)

POST /api/verification/run       — Run full verification pipeline
GET  /api/verification/queue     — List human review queue
POST /api/verification/queue/{id}/decision — Submit review decision
GET  /api/verification/audit-log — Audit log
GET  /api/verification/status    — Verification layer status
GET  /api/verification/policy    — Verification policy configuration
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Path

from app.models.schemas import (
    VerificationRunRequest,
    VerificationRunResponse,
    ReviewItem,
    ReviewDecisionRequest,
    AuditLogEntry
)
from app.services.verification.orchestrator import verification_orchestrator
from app.services.verification.review_queue import review_queue_service
from app.services.verification.verification_policy import verification_policy_engine
from app.services.verification.remal_zones import get_remal_verification_zones
from app.services.verification.remal_golden_path import remal_golden_path_service

router = APIRouter(
    prefix="/verification",
    tags=["AI Flood Evidence Verification + Uncertainty Layer"]
)


@router.post(
    "/run",
    response_model=VerificationRunResponse,
    summary="Run AI Flood Evidence Verification + Uncertainty Pipeline"
)
async def run_verification(request: VerificationRunRequest):
    """
    Runs the full AI Flood Evidence Verification + Uncertainty Layer pipeline:

    1. Retrieves Sentinel-2 optical imagery via Google Earth Engine (if available)
    2. Applies deterministic cloud quality gate
    3. Checks permanent water reference (JRC Global Surface Water)
    4. Calls Gemini structured verifier (second-opinion — does NOT modify risk score)
    5. Applies deterministic verification policy → uncertainty range
    6. Detects risk-band boundary crossings → routes to human review queue

    **IMPORTANT**:
    - The central deterministic risk score is NEVER modified.
    - Gemini is a second-opinion verifier only — it cannot change risk scores.
    - Missing evidence defaults to ABSTAIN — never reduces risk.
    - Human approval is required for all operational actions.
    
    **Remal Golden Path**:
    ROI: min_lon=87.5, min_lat=22.0, max_lon=88.0, max_lat=22.5
    """
    try:
        return verification_orchestrator.run_verification(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Verification pipeline error: {type(e).__name__}: {str(e)}",
                "fallback": "Verification unavailable. Risk score calculated from available deterministic evidence.",
                "governance": "Central deterministic risk score remains unchanged."
            }
        )


@router.get(
    "/queue",
    response_model=List[ReviewItem],
    summary="Get Human Review Queue"
)
async def get_review_queue(
    status: Optional[str] = Query(
        None,
        description="Filter by status: PENDING | APPROVED | REJECTED | ESCALATED"
    )
):
    """
    Returns all items in the human review queue.

    Review items are generated when verification uncertainty crosses a risk-band boundary.
    Every item requires human approval before operational dispatch.

    Status filter: PENDING | APPROVED | REJECTED | ESCALATED
    """
    return review_queue_service.get_queue(status_filter=status)


@router.get(
    "/queue/{review_id}",
    response_model=ReviewItem,
    summary="Get Single Review Item"
)
async def get_review_item(
    review_id: str = Path(..., description="Review item ID (e.g. 'rev_abc123')")
):
    """Returns a single review queue item by ID."""
    item = review_queue_service.get_item(review_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Review item '{review_id}' not found.")
    return item


@router.post(
    "/queue/{review_id}/decision",
    response_model=ReviewItem,
    summary="Submit Human Review Decision"
)
async def submit_review_decision(
    review_id: str = Path(..., description="Review item ID"),
    request: ReviewDecisionRequest = ...
):
    """
    Submits a human review decision for a flagged risk zone.

    Actions: **APPROVE** | **REJECT** | **ESCALATE**

    Every decision is recorded in the audit log with:
    - Timestamp
    - Reviewer name
    - Decision
    - Optional reviewer note

    **IMPORTANT**: Human approval is required. Drishti does not autonomously
    execute evacuation orders or other operational actions.
    """
    if request.action.upper() not in {"APPROVE", "REJECT", "ESCALATE"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{request.action}'. Must be APPROVE, REJECT, or ESCALATE."
        )

    item = review_queue_service.submit_decision(
        review_id=review_id,
        action=request.action,
        reviewer_name=request.reviewer_name,
        reviewer_note=request.reviewer_note
    )

    if not item:
        raise HTTPException(status_code=404, detail=f"Review item '{review_id}' not found.")

    return item


@router.get(
    "/audit-log",
    response_model=List[AuditLogEntry],
    summary="Get Verification Audit Log"
)
async def get_audit_log(
    limit: int = Query(100, ge=1, le=1000, description="Maximum entries to return")
):
    """
    Returns the verification layer audit log.

    Records:
    - Every verification run (VERIFICATION_RUN)
    - Every human review decision (REVIEW_DECISION)
    - Verification errors (VERIFICATION_ERROR)

    API keys and secrets are NEVER stored in the audit log.
    """
    return review_queue_service.get_audit_log(limit=limit)


@router.get(
    "/status",
    summary="Get Verification Layer Status"
)
async def get_verification_status():
    """
    Returns operational status of all verification layer components:
    - Sentinel-2 / GEE connectivity
    - Permanent water service
    - Gemini verifier mode (LIVE or DEMO_ABSTAIN)
    - Verification policy configuration
    - Review queue statistics
    """
    return verification_orchestrator.get_status()


@router.get(
    "/policy",
    summary="Get Verification Policy Configuration"
)
async def get_verification_policy():
    """
    Returns the current deterministic verification policy configuration:
    - Uncertainty adjustments per verdict
    - Risk band boundaries
    - Band-crossing detection logic

    All adjustments are marked as MVP engineering baselines requiring calibration.
    """
    return verification_policy_engine.get_policy_summary()


@router.get(
    "/queue/stats",
    summary="Get Review Queue Statistics"
)
async def get_queue_stats():
    """Returns summary statistics for the human review queue."""
    return review_queue_service.get_stats()


@router.get(
    "/remal/zones",
    summary="Get Cyclone Remal Ranked Verification Zones"
)
async def get_remal_zones():
    """
    Returns the ranked list of real verification zones for Cyclone Remal (May 2024).
    Each zone contains deterministic risk scores, SegFormer-predicted flood extents,
    WorldPop population exposure, and OSM critical infrastructure details.
    """
    return get_remal_verification_zones()


@router.post(
    "/remal/golden-path",
    summary="Run Complete Cyclone Remal Golden Path Demonstration"
)
async def run_remal_golden_path(
    zone_id: str = Query("ALL", description="Target zone ID (e.g. 'REMAL-ZONE-001') or 'ALL'")
):
    """
    Executes the complete Remal Golden Path validation across all 4 ranked verification zones:
    
    1. SegFormer-predicted flood extent & deterministic risk score
    2. Sentinel-2 optical retrieval & cloud gate
    3. Permanent water check
    4. Gemini structured verifier
    5. Uncertainty range & band crossing check
    6. Human review queue routing
    7. JEV decision evaluation
    8. Gemini 6-question Watch Officer advisory
    9. Audit log entry
    """
    try:
        return remal_golden_path_service.run_golden_path(target_zone_id=zone_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Remal Golden Path execution error: {type(e).__name__}: {str(e)}"
        )

