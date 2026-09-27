from typing import List
from fastapi import APIRouter, HTTPException, Path
from app.models.schemas import CycloneMetadata, TimelineStep, CycloneScenarioResponse, CycloneScenario
from app.services.cyclone_service import cyclone_service

router = APIRouter(prefix="/cyclone", tags=["Cyclone"])

@router.get("", response_model=CycloneMetadata, summary="Get Active Cyclone Metadata")
async def get_cyclone():
    """
    Returns metadata for the currently monitored cyclone scenario (Cyclone REMAL - BOB/01/2024).
    """
    return cyclone_service.get_metadata()

@router.get("/timeline", response_model=List[TimelineStep], summary="Get Available Temporal Timeline Steps")
async def get_timeline():
    """
    Returns available replay steps for temporal hazard forecasting (T-24h to +72h).
    """
    return cyclone_service.get_timeline_steps()

@router.get("/scenario/{step_id}", response_model=CycloneScenarioResponse, summary="Get Cyclone State for Timeline Step")
async def get_cyclone_scenario(
    step_id: str = Path(..., description="Timeline step identifier, e.g. 'T-24h', 'NOW', '+12h'")
):
    """
    Returns cyclone coordinates, sustained wind, pressure, forecast track, and uncertainty cone coordinates for the requested temporal step.
    """
    scenario_data = cyclone_service.get_scenario(step_id)
    if not scenario_data:
        raise HTTPException(
            status_code=404,
            detail=f"Timeline scenario step '{step_id}' not found. Valid steps: ['T-24h', 'T-12h', 'NOW', '+12h', '+24h', '+48h', '+72h']"
        )

    meta = cyclone_service.get_metadata()
    return CycloneScenarioResponse(
        success=True,
        data=CycloneScenario(**scenario_data),
        metadata={
            "stormId": meta["stormId"],
            "stormName": meta["name"],
            "category": scenario_data["current"]["category"],
            "provenance": meta["provenance"],
            "timestamp": scenario_data["current"]["timestamp"]
        }
    )
