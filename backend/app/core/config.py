import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "DRISHTI Cyclone Impact & Vulnerability Forecasting API"
    VERSION: str = "1.0.0-rc1"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))

    # CORS origins: configurable via comma-separated string or list in env
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://drishti.vercel.app"
    ]

    # Regex pattern to securely allow any preview or production Vercel deployment without wildcard '*'
    ALLOWED_ORIGIN_REGEX: str = r"^https:\/\/.*\.vercel\.app$"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000"
        ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
