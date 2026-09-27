from fastapi import APIRouter
from app.api.routes import health, cyclone, risk, emergency, weather

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(cyclone.router)
api_router.include_router(risk.router)
api_router.include_router(emergency.router)
api_router.include_router(weather.router)
