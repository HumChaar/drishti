"""
DRISHTI Language & Translation Module
Centralized, Gemini-powered runtime translation service, language contract,
and persistent server-side translation cache.
"""

from app.language.contract import (
    SUPPORTED_LANGUAGES,
    LanguageMetadata,
    get_supported_languages,
    get_language,
    is_supported_language
)
from app.language.service import translation_service
from app.language.cache import translation_cache

__all__ = [
    "SUPPORTED_LANGUAGES",
    "LanguageMetadata",
    "get_supported_languages",
    "get_language",
    "is_supported_language",
    "translation_service",
    "translation_cache"
]
