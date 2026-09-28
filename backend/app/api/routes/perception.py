"""
DRISHTI FastAPI Perception Route - SegFormer SAR Flood Perception
Stage 3: [AI INFERENCE] Perception Service
Strictly decoupled from REMAL historical simulation.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Path

from app.models.schemas import (
    FloodInferenceEvidence,
    FloodInferenceRequest,
    FloodInferenceStatusResponse,
)
from app.services.segformer_service import segformer_service

router = APIRouter(prefix="/perception", tags=["SegFormer SAR Flood Perception [AI INFERENCE]"])


@router.get("/status", response_model=FloodInferenceStatusResponse, summary="Get SegFormer Model & Perception Engine Status")
async def get_perception_status():
    """
    Returns SegFormer-B0 perception model status, parameter counts, CPU execution device, and checkpoint status.
    """
    return segformer_service.get_status()


@router.post("/flood", response_model=FloodInferenceEvidence, summary="Execute SegFormer Flood Segmentation [AI INFERENCE]")
async def run_flood_inference(
    request: Optional[FloodInferenceRequest] = None,
    include_mask: bool = Query(True, description="Whether to include full 224x224 flood mask")
):
    """
    Executes SegFormer-B0 dual-channel (VV/VH) flood inundation perception.
    PROVENANCE: Clearly annotated as [AI INFERENCE] - distinct from historical REMAL simulation.
    """
    if not segformer_service.is_checkpoint_ready():
        raise HTTPException(
            status_code=503,
            detail="SegFormer best_clean model checkpoint not available."
        )

    # If raw VV/VH matrices provided in request payload
    if request and request.vv_values and request.vh_values:
        evidence = segformer_service.predict(
            request.vv_values,
            request.vh_values,
            is_genuine_sample=False,
            include_mask=include_mask if request.include_mask is None else request.include_mask
        )
        return evidence

    # Otherwise generate deterministic synthetic SAR fixture
    fixture_type = "high_inundation" if request and request.district_id in ["wb_south24", "od_balasore"] else "baseline"
    vv, vh = segformer_service.generate_synthetic_fixture(fixture_type)
    evidence = segformer_service.predict(
        vv,
        vh,
        is_genuine_sample=False,
        include_mask=include_mask if (request is None or request.include_mask) else False
    )
    return evidence


@router.post("/segformer", response_model=FloodInferenceEvidence, summary="Execute SegFormer Flood Perception [AI INFERENCE]")
async def run_segformer_inference(
    request: Optional[FloodInferenceRequest] = None,
    include_mask: bool = Query(True, description="Whether to include full 224x224 flood mask")
):
    """
    Dedicated SegFormer-B0 inference endpoint returning transparent flood perception evidence.
    """
    return await run_flood_inference(request=request, include_mask=include_mask)


@router.get("/flood/district/{district_id}", response_model=FloodInferenceEvidence, summary="Get District SAR Flood Perception [AI INFERENCE]")
async def get_district_flood_perception(
    district_id: str = Path(..., description="Coastal district identifier, e.g. 'od_balasore', 'od_kendrapara'"),
    include_mask: bool = Query(True, description="Whether to include full 224x224 flood mask")
):
    """
    Retrieves SegFormer SAR perception scan for a coastal district.
    Uses deterministic dual-polarization SAR backscatter calibrated for the coastal zone.
    PROVENANCE: [AI INFERENCE] SegFormer-B0 SAR Flood Perception.
    """
    if not segformer_service.is_checkpoint_ready():
        raise HTTPException(
            status_code=503,
            detail="SegFormer best_clean model checkpoint not available."
        )

    fixture_type = "high_inundation" if district_id in ["wb_south24", "od_balasore", "od_bhadrak"] else "baseline"
    vv, vh = segformer_service.generate_synthetic_fixture(fixture_type)
    evidence = segformer_service.predict(
        vv,
        vh,
        is_genuine_sample=False,
        include_mask=include_mask
    )
    return evidence
