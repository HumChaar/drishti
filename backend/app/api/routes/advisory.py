"""
DRISHTI Advisory API Routes
Hosts endpoints for generating grounded multi-lingual disaster advisories,
retrieving decision intelligence profiles, and managing human approval workflows.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Path, Body
from app.models.schemas import (
    AdvisoryGenerationRequest,
    AdvisoryResponse,
    AdvisoryReviewRequest
)
from app.services.advisory_service import advisory_service, SUPPORTED_LANGUAGES

router = APIRouter(tags=["Decision Intelligence & AI Advisory"])

@router.post("/advisory/generate", response_model=AdvisoryResponse, summary="Generate Grounded Disaster Advisory")
async def generate_advisory(
    request: AdvisoryGenerationRequest = Body(...)
):
    """
    Synthesizes multi-hazard evidence and transparent risk into an operational advisory.
    Uses Google Gemini if GEMINI_API_KEY is configured; otherwise gracefully defaults
    to the calibrated deterministic multilingual Demo Fallback.
    """
    try:
        response = advisory_service.generate_advisory(
            district_id=request.district_id,
            step_id=request.step_id or "NOW",
            language=request.language or "en",
            include_sar=request.include_sar_perception if request.include_sar_perception is not None else True
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advisory generation failed: {str(e)}")

@router.get("/advisory/{advisory_id}", response_model=AdvisoryResponse, summary="Get Advisory by ID")
async def get_advisory(
    advisory_id: str = Path(..., description="Unique advisory ID, e.g. 'adv-od_balasore-NOW-123456'")
):
    """
    Retrieves an existing advisory record and its current human review status.
    """
    advisory = advisory_service.get_advisory(advisory_id)
    if not advisory:
        raise HTTPException(status_code=404, detail=f"Advisory '{advisory_id}' not found.")
    return advisory

@router.post("/advisory/{advisory_id}/review", response_model=AdvisoryResponse, summary="Review & Authorize Advisory (Human-in-the-Loop)")
async def review_advisory(
    advisory_id: str = Path(..., description="Target advisory ID to review"),
    review_request: AdvisoryReviewRequest = Body(...)
):
    """
    Enforces Human-in-the-Loop governance: Incident commanders can APPROVE, REJECT,
    or MODIFY priority emergency actions before deployment.
    """
    try:
        updated = advisory_service.review_advisory(advisory_id, review_request)
        if not updated:
            raise HTTPException(status_code=404, detail=f"Advisory '{advisory_id}' not found.")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/advisory/all/list", response_model=List[AdvisoryResponse], summary="List All Generated Advisories")
async def list_advisories():
    """
    Returns all session-generated advisories and their respective authorization statuses.
    """
    return advisory_service.list_advisories()

@router.get("/advisory/config/languages", summary="Get Supported Multilingual Advisory Languages")
async def get_supported_languages() -> Dict[str, str]:
    """
    Returns supported language codes and their full native labels.
    """
    return {
        code: f"{meta.name} ({meta.native_name})" if meta.name != meta.native_name else meta.name
        for code, meta in SUPPORTED_LANGUAGES.items()
    }

