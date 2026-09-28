from fastapi import APIRouter
from app.models.schemas import MarineBulletinResponse

router = APIRouter(prefix="/weather", tags=["Meteorological & Marine Weather"])

@router.get("/bulletin", response_model=MarineBulletinResponse, summary="Get Marine Meteorological Bulletin")
async def get_marine_bulletin():
    """
    Returns official marine weather bulletin and sea conditions archive for North Bay of Bengal.
    """
    return MarineBulletinResponse(
        bulletinNo="IMD-SEA-BOB-2024-44",
        issuedAt="26 May 06:00 IST",
        provenance="HISTORICAL SIMULATION — CYCLONE REMAL 2024",
        seaCondition="Phenomenal to Very High over North & Adjoining Westcentral Bay of Bengal",
        significantWaveHeightMeters=7.5,
        waveDirection="South-Southeasterly",
        surfaceWaterTempC=30.2,
        squallWarning="Squally wind speed reaching 90-100 kmph gusting to 115 kmph prevailing over North Bay of Bengal",
        fishermenAdvisory="Total suspension of fishing operations over North Bay of Bengal and along Odisha-West Bengal coasts."
    )
