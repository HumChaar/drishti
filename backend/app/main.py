from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Disaster Risk Intelligence & Surveillance Hazard Tracking Interface (DRISHTI) Backend API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS configuration
# Explicit origins for local Vite dev and configured Vercel production domains
# Origin regex securely handles Vercel preview branch deployments without wildcard '*'
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount all API endpoints under /api
app.include_router(api_router, prefix=settings.API_PREFIX)

from app.api.routes.health import get_health
from app.models.schemas import HealthResponse

@app.get("/health", response_model=HealthResponse, tags=["Health"], summary="System Health & Diagnostic Check (Root)")
async def root_health():
    return await get_health()

@app.get("/", tags=["Root"])
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "api_health": f"{settings.API_PREFIX}/health",
        "status": "ONLINE"
    }
