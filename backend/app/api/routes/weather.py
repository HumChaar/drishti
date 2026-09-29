from fastapi import APIRouter
from app.models.schemas import MarineBulletinResponse, IndiaWeatherResponse
from app.services.india_weather_service import fetch_india_weather

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


@router.get("/india", response_model=IndiaWeatherResponse, summary="Get Live India Meteorology (Open-Meteo Proxy)")
async def get_india_meteorology():
    """
    Server-side proxy for Open-Meteo live weather data across all 36 Indian states/UTs.
    PROVENANCE: LIVE WEATHER — distinct from HISTORICAL SIMULATION (REMAL 2024).
    10-minute cache applied to prevent rate limiting.
    """
    return await fetch_india_weather()

