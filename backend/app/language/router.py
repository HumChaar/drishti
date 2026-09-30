"""
DRISHTI Language API Router
Provides endpoints for batch translation, language registry, and service telemetry.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.language.contract import (
    LanguageMetadata,
    get_supported_languages,
    is_supported_language
)
from app.language.service import translation_service
from app.language.cache import translation_cache

router = APIRouter(prefix="/language", tags=["Language & Translation"])


class TranslationItemInput(BaseModel):
    id: str = Field(..., description="Unique client-side identifier for response alignment")
    text: str = Field(..., description="English source string or template with {tokens}")


class TranslationBatchRequest(BaseModel):
    items: List[TranslationItemInput] = Field(..., description="List of items to translate")
    targetLanguage: str = Field(..., description="ISO language code: en, or, bn, hi, te")
    context: Optional[str] = Field(default=None, description="Optional domain or screen context")


class TranslationItemOutput(BaseModel):
    id: str
    text: str


class TranslationBatchResponse(BaseModel):
    translations: List[TranslationItemOutput]
    targetLanguage: str
    count: int


@router.get("/languages", response_model=List[LanguageMetadata], summary="List Supported Emergency Languages")
async def list_languages():
    """Returns the full language contract registry of supported Indic languages."""
    return get_supported_languages()


@router.get("/status", summary="Translation Engine & Cache Status")
async def get_status():
    """Provides operational status of the Gemini translation engine, API key configuration, and cache stats."""
    return translation_service.get_status()


@router.post("/translate", response_model=TranslationBatchResponse, summary="Batch Translate Strings")
async def translate_batch(request: TranslationBatchRequest):
    """
    Translates a batch of strings into the requested target language.
    Guarantees response alignment by 'id'.
    Leverages persistent cache and batches missing items into a single Gemini API call.
    """
    target_lang = request.targetLanguage.lower().strip()
    if not is_supported_language(target_lang):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported target language '{request.targetLanguage}'. Supported codes: en, or, bn, hi, te"
        )

    raw_items = [{"id": item.id, "text": item.text} for item in request.items]

    try:
        results = translation_service.translate_batch(
            items=raw_items,
            target_language=target_lang,
            context=request.context
        )
        return TranslationBatchResponse(
            translations=[TranslationItemOutput(id=r["id"], text=r["text"]) for r in results],
            targetLanguage=target_lang,
            count=len(results)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(exc)}"
        )


@router.post("/cache/clear", summary="Clear Server Translation Cache")
async def clear_cache():
    """Clears the server-side persistent translation cache."""
    translation_cache.clear()
    return {"status": "SUCCESS", "message": "Translation cache cleared successfully."}
