from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Path, Body
from app.models.schemas import (
    DistrictRiskMatrixResponse, 
    DistrictWithRisk, 
    InfrastructureResponse,
    InfrastructureAsset,
    DistrictEvidence,
    DistrictEvidenceResponse,
    AllDistrictsEvidenceResponse,
    RiskExplanation,
    RiskEvaluationRequest
)
from app.core.risk_config import (
    DEFAULT_RISK_WEIGHTS,
    DEFAULT_THRESHOLDS,
    RISK_BANDS
)
from app.services.risk_service import risk_service

router = APIRouter(tags=["Risk & Infrastructure"])

@router.get("/risk/districts", response_model=DistrictRiskMatrixResponse, summary="Get District Risk & Vulnerability Matrix")
async def get_district_risk_matrix(
    step_id: str = Query("NOW", description="Timeline step identifier, e.g. 'T-24h', 'NOW', '+12h'")
):
    """
    Returns coastal districts in Odisha and West Bengal ranked by composite hazard risk score,
    enriched with transparent contributing factors and explanations.
    """
    districts = risk_service.get_district_risk_matrix(step_id)
    return DistrictRiskMatrixResponse(
        stepId=step_id,
        provenance="TRANSPARENT_MULTI_MODAL_RISK_ENGINE",
        totalDistrictsMonitored=len(districts),
        districts=[DistrictWithRisk(**d) for d in districts]
    )

@router.get("/risk/district/{district_id}", response_model=DistrictWithRisk, summary="Get Single District Hazard Dossier")
async def get_district_detail(
    district_id: str = Path(..., description="Unique district ID, e.g. 'od_balasore', 'od_kendrapara'"),
    step_id: str = Query("NOW", description="Timeline step identifier")
):
    """
    Returns specific district exposure metrics, surge levels, rainfall predictions, and transparent vulnerability drivers.
    """
    district_data = risk_service.get_district_by_id(district_id, step_id)
    if not district_data:
        raise HTTPException(
            status_code=404,
            detail=f"District '{district_id}' not found in coastal hazard surveillance registry."
        )
    return DistrictWithRisk(**district_data)

@router.get("/risk/evidence", response_model=AllDistrictsEvidenceResponse, summary="Get Evidence Layer for All Districts")
async def get_all_evidence(
    step_id: str = Query("NOW", description="Timeline step identifier")
):
    """
    Returns the complete structured Evidence Layer across all coastal districts, fusing cyclone hazard,
    SegFormer AI flood perception, meteorology, population vulnerability, and infrastructure.
    """
    evidences = risk_service.get_all_districts_evidence(step_id)
    return AllDistrictsEvidenceResponse(
        stepId=step_id,
        provenance="EVIDENCE_LAYER_MULTI_MODAL_AGGREGATOR",
        totalDistricts=len(evidences),
        districts=evidences
    )

@router.get("/risk/evidence/{district_id}", response_model=DistrictEvidenceResponse, summary="Get District Multi-Modal Evidence Dossier")
async def get_district_evidence(
    district_id: str = Path(..., description="Unique district ID, e.g. 'od_balasore'"),
    step_id: str = Query("NOW", description="Timeline step identifier")
):
    """
    Returns the comprehensive, multi-modal Evidence Layer object for an individual district.
    """
    try:
        evidence = risk_service.get_district_evidence(district_id, step_id)
        return DistrictEvidenceResponse(
            stepId=step_id,
            provenance="EVIDENCE_LAYER_MULTI_MODAL_AGGREGATOR",
            district=evidence
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/risk/explain/{district_id}", response_model=RiskExplanation, summary="Explain District Risk Score Formulation")
async def explain_district_risk(
    district_id: str = Path(..., description="Unique district ID"),
    step_id: str = Query("NOW", description="Timeline step identifier")
):
    """
    Explains exactly WHY a district received its risk score, returning factor-by-factor sub-scores,
    weights, weighted contributions, mathematical formula, and plain-English narrative explanation.
    """
    try:
        evidence = risk_service.get_district_evidence(district_id, step_id)
        if not evidence.riskExplanation:
            raise HTTPException(status_code=500, detail="Risk explanation calculation failed.")
        return evidence.riskExplanation
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/risk/config", summary="Get Risk Engine Transparent Weights & Normalization Config")
async def get_risk_config() -> Dict[str, Any]:
    """
    Returns the explicit, auditable weights, thresholds, and risk classification bands.
    """
    return {
        "weights": DEFAULT_RISK_WEIGHTS.model_dump(),
        "thresholds": DEFAULT_THRESHOLDS.model_dump(),
        "bands": {k: v.model_dump() for k, v in RISK_BANDS.items()},
        "formula": "CompositeScore = round(0.25*S_flood + 0.20*S_surge + 0.20*S_wind + 0.20*S_vuln + 0.15*S_infra)"
    }

@router.post("/risk/evaluate", response_model=DistrictEvidence, summary="Dynamically Evaluate Risk with Custom / SAR Inputs")
async def evaluate_custom_risk(
    request: RiskEvaluationRequest = Body(...)
):
    """
    Evaluates multi-hazard risk dynamically with custom parameters or real Sentinel-1 VV/VH arrays.
    """
    try:
        evidence = risk_service.evaluate_custom_risk(request)
        return evidence
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/infrastructure", response_model=InfrastructureResponse, summary="Get Critical Coastal Infrastructure Assets")
async def get_infrastructure():
    """
    Returns critical ports, multipurpose cyclone shelters (MPCS), district hospitals, and power grid substations.
    """
    assets = risk_service.get_infrastructure_assets()
    return InfrastructureResponse(
        provenance="SIMULATED_INFRA_REGISTRY",
        totalAssets=len(assets),
        assets=[InfrastructureAsset(**a) for a in assets]
    )
