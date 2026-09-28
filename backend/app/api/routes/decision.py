from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Body

from app.models.schemas import (
    DecisionRequest,
    DecisionRecommendation
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
