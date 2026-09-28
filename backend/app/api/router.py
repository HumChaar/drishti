from fastapi import APIRouter
from app.api.routes import health, cyclone, risk, emergency, weather, inference, perception, advisory, decision, reasoning

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(cyclone.router)
api_router.include_router(risk.router)
api_router.include_router(emergency.router)
api_router.include_router(weather.router)
api_router.include_router(inference.router)
api_router.include_router(perception.router)
api_router.include_router(advisory.router)
api_router.include_router(decision.router)
api_router.include_router(reasoning.router)


