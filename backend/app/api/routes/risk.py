from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Path
from app.models.schemas import (
    DistrictRiskMatrixResponse, 
    DistrictWithRisk, 
    InfrastructureResponse,
    InfrastructureAsset
)
from app.services.risk_service import risk_service

router = APIRouter(tags=["Risk & Infrastructure"])

@router.get("/risk/districts", response_model=DistrictRiskMatrixResponse, summary="Get District Risk & Vulnerability Matrix")
async def get_district_risk_matrix(
    step_id: str = Query("NOW", description="Timeline step identifier, e.g. 'T-24h', 'NOW', '+12h'")
):
    """
    Returns coastal districts in Odisha and West Bengal ranked by composite hazard risk score for the specified timeline step.
    """
    districts = risk_service.get_district_risk_matrix(step_id)
    return DistrictRiskMatrixResponse(
        stepId=step_id,
        provenance="SIMULATED_RISK_ENGINE",
        totalDistrictsMonitored=len(districts),
        districts=[DistrictWithRisk(**d) for d in districts]
    )

@router.get("/risk/district/{district_id}", response_model=DistrictWithRisk, summary="Get Single District Hazard Dossier")
async def get_district_detail(
    district_id: str = Path(..., description="Unique district ID, e.g. 'od_balasore', 'od_kendrapara'"),
    step_id: str = Query("NOW", description="Timeline step identifier")
):
    """
    Returns specific district exposure metrics, surge levels, rainfall predictions, and primary vulnerability drivers.
    """
    district_data = risk_service.get_district_by_id(district_id, step_id)
    if not district_data:
        raise HTTPException(
            status_code=404,
            detail=f"District '{district_id}' not found in coastal hazard surveillance registry."
        )
    return DistrictWithRisk(**district_data)

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
