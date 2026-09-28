from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Body

from app.models.schemas import (
    DecisionRequest,
    DecisionRecommendation,
    JEVEvaluationRequest,
    JEVEvaluationReport
)
from app.services.decision_service import decision_service

router = APIRouter(tags=["Decision Intelligence"])


@router.get(
    "/decision/config",
    response_model=Dict[str, Any],
    summary="Get Decision Engine Configuration & Policy Rules"
)
async def get_decision_config():
    """
    Returns the centralized, auditable decision policies, thresholds, and governance configuration.
    """
    return decision_service.get_config()


@router.get(
    "/decision/all",
    response_model=List[DecisionRecommendation],
    summary="Get Decision Recommendations for All Coastal Districts"
)
async def get_all_district_decisions(
    step_id: Optional[str] = Query("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")
):
    """
    Returns deterministic decision recommendations across all 8 monitored districts in Odisha and West Bengal.
    """
    try:
        return decision_service.evaluate_all_districts(step_id=step_id or "NOW")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate decisions for all districts: {str(e)}"
        )


@router.get(
    "/decision/{district_id}",
    response_model=DecisionRecommendation,
    summary="Get Deterministic Decision Recommendations for Single District"
)
async def get_district_decision(
    district_id: str = Path(..., description="Unique district ID, e.g. 'od_balasore', 'od_kendrapara'"),
    step_id: Optional[str] = Query("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")
):
    """
    Returns deterministic, rule-grounded operational decision recommendations across operational pillars.
    All recommendations strictly require human incident commander approval.
    """
    try:
        decision = decision_service.evaluate_district(district_id, step_id=step_id or "NOW")
        return decision
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Decision evaluation failed for district '{district_id}': {str(e)}"
        )


@router.post(
    "/decision/evaluate",
    response_model=DecisionRecommendation,
    summary="Evaluate Decision Recommendations with Custom or SAR Overrides"
)
async def evaluate_decision_request(
    request: DecisionRequest = Body(..., description="Decision evaluation request payload with optional overrides")
):
    """
    Evaluates deterministic decision recommendations dynamically, supporting custom rainfall,
    surge, wind, or raw Sentinel-1 SAR dual-pol tensor grids.
    Direct execution is strictly prohibited. Human approval required.
    """
    try:
        decision = decision_service.evaluate_request(request)
        return decision
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Dynamic decision evaluation failed: {str(e)}"
        )


@router.get(
    "/decision/jev/district/{district_id}",
    response_model=JEVEvaluationReport,
    summary="Get JEV Decision Evaluation & Verification Dossier for District"
)
async def get_district_jev_evaluation(
    district_id: str = Path(..., description="Unique district ID, e.g. 'od_balasore', 'od_ganjam'"),
    step_id: Optional[str] = Query("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")
):
    """
    Executes formal JEV Decision Intelligence verification across 6 evaluation pillars:
    Decision Evaluation, Evaluation Score, Evidence Coverage, Risk Consistency,
    Constraint Compliance, and Auditable Explanation.
    Autonomous execution is prohibited. Mandatory human incident commander approval.
    """
    try:
        req = JEVEvaluationRequest(district_id=district_id, step_id=step_id or "NOW")
        return decision_service.evaluate_jev(req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"JEV decision evaluation failed for district '{district_id}': {str(e)}"
        )


@router.post(
    "/decision/jev/evaluate",
    response_model=JEVEvaluationReport,
    summary="Evaluate JEV Decision Intelligence with Multi-Modal Overrides & Test Modes"
)
async def evaluate_jev_request(
    request: JEVEvaluationRequest = Body(..., description="JEV evaluation request payload")
):
    """
    Evaluates JEV Decision Intelligence dynamically. Supports test modes:
    - 'STANDARD': Normal verified evaluation
    - 'NEGATIVE_INCONSISTENT_RISK': Injects priority-risk mismatch to verify consistency check
    - 'NEGATIVE_DEFICIENT_EVIDENCE': Strips modalities to verify coverage penalty
    - 'NEGATIVE_AUTONOMOUS_ATTEMPT': Tests autonomous execution block enforcement
    """
    try:
        return decision_service.evaluate_jev(request)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"JEV evaluation failed: {str(e)}"
        )


@router.post(
    "/decision/jev/validate",
    response_model=JEVEvaluationReport,
    summary="Validate Candidate Decisions Against Evidence & Risk Consistency"
)
async def validate_jev_request(
    request: JEVEvaluationRequest = Body(..., description="JEV validation request payload")
):
    """
    Alias endpoint for external automated mentors and validation harnesses.
    """
    try:
        return decision_service.evaluate_jev(request)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"JEV validation failed: {str(e)}"
        )

