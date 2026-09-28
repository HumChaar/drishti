"""
DRISHTI API Routes - SegFormer Flood Segmentation Inference
Stage 3A: Modular production inference endpoints
Independent from the risk engine and frontend.
"""

from fastapi import APIRouter, HTTPException, Query
import numpy as np

from app.models.schemas import (
    FloodInferenceEvidence,
    FloodInferenceStatusResponse,
)
from app.services.flood_inference_service import flood_inference_service

router = APIRouter(prefix="/inference", tags=["SegFormer Flood Inundation Inference"])


@router.get("/status", response_model=FloodInferenceStatusResponse, summary="Get Model Status & Specification")
async def get_inference_status():
    """
    Returns SegFormer model status, parameter count, input specifications, and checkpoint availability.
    """
    return flood_inference_service.get_service_status()


@router.post("/benchmark-segmentation", response_model=FloodInferenceEvidence, summary="Execute Model Segmentation on Tensor Fixture")
async def benchmark_segmentation(
    fixture_type: str = Query("baseline", description="Fixture type: 'baseline', 'high_inundation', or 'low_inundation'"),
    include_mask: bool = Query(True, description="Whether to include full 224x224 mask in response")
):
    """
    Executes SegFormer segmentation inference on a controlled dual-polarization tensor fixture.
    NOTE: As per DRISHTI validation guidelines, tensor fixtures are used for diagnostic verification;
    real-world flood extent requires genuine Sentinel-1 SAR input.
    """
    if not flood_inference_service.is_checkpoint_available():
        raise HTTPException(
            status_code=503,
            detail="SegFormer model checkpoint not available on this server."
        )

    # Construct controlled test fixtures representing SAR backscatter
    H, W = 224, 224
    if fixture_type == "high_inundation":
        # Water/inundated areas have low backscatter: VV ~ -28 dB, VH ~ -32 dB
        vv = np.random.normal(loc=-26.0, scale=3.0, size=(H, W)).astype(np.float32)
        vh = np.random.normal(loc=-30.0, scale=3.0, size=(H, W)).astype(np.float32)
    elif fixture_type == "low_inundation":
        # Dry soil / rough urban / forest has higher backscatter: VV ~ -9 dB, VH ~ -14 dB
        vv = np.random.normal(loc=-9.0, scale=2.0, size=(H, W)).astype(np.float32)
        vh = np.random.normal(loc=-14.0, scale=2.0, size=(H, W)).astype(np.float32)
    else:  # baseline coastal split
        vv = np.random.normal(loc=-16.0, scale=4.0, size=(H, W)).astype(np.float32)
        vh = np.random.normal(loc=-21.0, scale=4.0, size=(H, W)).astype(np.float32)
        # Add a simulated water body region in the lower half
        vv[112:, 112:] = np.random.normal(loc=-28.0, scale=2.0, size=(112, 112))
        vh[112:, 112:] = np.random.normal(loc=-33.0, scale=2.0, size=(112, 112))

    evidence = flood_inference_service.infer(
        (vv, vh),
        is_genuine_sample=False,
        include_mask=include_mask
    )
    return evidence
