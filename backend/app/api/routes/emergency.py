from fastapi import APIRouter, HTTPException, Path
from app.models.schemas import (
    EmergencyDirectivesResponse, 
    EmergencyDirective, 
    UpdateDirectiveStatusRequest,
    PreparednessMetrics
)
from app.services.emergency_service import emergency_service

router = APIRouter(prefix="/emergency", tags=["Emergency Operations & SOP"])

@router.get("/directives", response_model=EmergencyDirectivesResponse, summary="Get Emergency Directives & Preparedness KPIs")
async def get_emergency_directives():
    """
    Returns incident command standard operating procedure (SOP) directives, evacuation metrics, and port signal warnings.
    """
    metrics = emergency_service.get_metrics()
    directives = emergency_service.get_directives()

    return EmergencyDirectivesResponse(
        provenance="SIMULATED_DISASTER_EOC",
        metrics=PreparednessMetrics(**metrics),
        directives=[EmergencyDirective(**d) for d in directives]
    )

@router.patch("/directive/{directive_id}", response_model=EmergencyDirective, summary="Update Incident Directive Status")
async def update_directive_status(
    directive_id: str = Path(..., description="Directive ID, e.g. 'act-01'"),
    body: UpdateDirectiveStatusRequest = ...
):
    """
    Simulates incident commander operational acknowledgment or dispatch state updates.
    """
    updated = emergency_service.update_directive_status(directive_id, body.status)
    if not updated:
        raise HTTPException(
            status_code=404,
            detail=f"Emergency directive '{directive_id}' not found."
        )
    return EmergencyDirective(**updated)
