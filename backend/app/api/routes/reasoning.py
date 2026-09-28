from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Body

from app.models.schemas import (
    GeminiReasoningRequest,
    GeminiAdvisory
)
from app.services.gemini_service import gemini_service

router = APIRouter(tags=["Gemini Reasoning Layer"])


@router.get(
    "/reasoning/status",
    response_model=Dict[str, Any],
    summary="Get Gemini Reasoning Service Status & Governance Configuration"
)
async def get_reasoning_status():
    """
    Returns the configuration and governance mode of the Gemini Reasoning layer.
    Reports whether LIVE_GEMINI or DEMO_MOCK is active.
    """
    return gemini_service.get_status()


@router.get(
    "/reasoning/advisory/{district_id}",
    response_model=GeminiAdvisory,
    summary="Get Grounded Gemini Advisory for Monitored District"
)
async def get_district_reasoning_advisory(
    district_id: str = Path(..., description="Unique district ID, e.g. 'od_balasore', 'od_kendrapara'"),
    step_id: Optional[str] = Query("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")
):
    """
    Retrieves verified evidence and decision recommendations for the district,
    and produces an explanatory, grounded advisory via Gemini (or deterministic mock).
    Risk scores and decision IDs are strictly preserved.
    """
    try:
        advisory = gemini_service.get_advisory_for_district(district_id, step_id=step_id or "NOW")
        return advisory
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate Gemini reasoning advisory for '{district_id}': {str(e)}"
        )


@router.post(
    "/reasoning/advisory",
    response_model=GeminiAdvisory,
    summary="Generate Grounded Gemini Advisory from Structured Request"
)
async def generate_reasoning_advisory(
    request: GeminiReasoningRequest = Body(..., description="Structured reasoning request payload")
):
    """
    Generates a grounded Gemini advisory from a pre-compiled GeminiReasoningRequest.
    Preserves all quantitative scores, bands, and decision IDs.
    """
    try:
        advisory = gemini_service.generate_advisory(request)
        return advisory
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini reasoning generation failed: {str(e)}"
        )
