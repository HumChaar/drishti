from datetime import datetime, timezone
from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse, summary="System Health & Diagnostic Check")
async def get_health():
    """
    Returns operational health status, deployment environment, and data provenance.
    """
    return HealthResponse(
        status="healthy",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        provenance="HISTORICAL SIMULATION — CYCLONE REMAL 2024",
        timestamp=datetime.now(timezone.utc).isoformat()
    )
