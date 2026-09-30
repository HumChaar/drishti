"""
DRISHTI Language Contract & Registry
Defines the authoritative language contract for the DRISHTI emergency platform.
Supported Indic coastal languages: English, Odia, Bengali, Hindi, Telugu.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class LanguageMetadata(BaseModel):
    code: str = Field(..., description="ISO 639-1 language code (e.g. en, or, bn, hi, te)")
    name: str = Field(..., description="English name of the language")
    native_name: str = Field(..., description="Native script name of the language")
    font_family: str = Field(..., description="Primary CSS font family for rendering")
    locale: str = Field(..., description="Regional BCP 47 locale tag")
    direction: str = Field(default="ltr", description="Text layout direction (ltr or rtl)")
    tts_locale: str = Field(..., description="Speech synthesis voice locale code")
    stt_locale: str = Field(..., description="Speech recognition locale code")


SUPPORTED_LANGUAGES: Dict[str, LanguageMetadata] = {
    "en": LanguageMetadata(
        code="en",
        name="English",
        native_name="English",
        font_family="Inter, sans-serif",
        locale="en-IN",
        direction="ltr",
        tts_locale="en-IN",
        stt_locale="en-IN"
    ),
    "or": LanguageMetadata(
        code="or",
        name="Odia",
        native_name="ଓଡ଼ିଆ",
        font_family="'Noto Sans Oriya', Inter, sans-serif",
        locale="or-IN",
        direction="ltr",
        tts_locale="or-IN",
        stt_locale="or-IN"
    ),
    "bn": LanguageMetadata(
        code="bn",
        name="Bengali",
        native_name="বাংলা",
        font_family="'Noto Sans Bengali', Inter, sans-serif",
        locale="bn-IN",
        direction="ltr",
        tts_locale="bn-IN",
        stt_locale="bn-IN"
    ),
    "hi": LanguageMetadata(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        font_family="'Noto Sans Devanagari', Inter, sans-serif",
        locale="hi-IN",
        direction="ltr",
        tts_locale="hi-IN",
        stt_locale="hi-IN"
    ),
    "te": LanguageMetadata(
        code="te",
        name="Telugu",
        native_name="తెలుగు",
        font_family="'Noto Sans Telugu', Inter, sans-serif",
        locale="te-IN",
        direction="ltr",
        tts_locale="te-IN",
        stt_locale="te-IN"
    )
}

DEFAULT_LANGUAGE = "en"


def get_supported_languages() -> List[LanguageMetadata]:
    """Returns a list of all registered language metadata records."""
    return list(SUPPORTED_LANGUAGES.values())


def is_supported_language(code: str) -> bool:
    """Checks if the given language code is supported."""
    return code.lower().strip() in SUPPORTED_LANGUAGES


def get_language(code: str) -> Optional[LanguageMetadata]:
    """Retrieves language metadata by code. Returns None if unsupported."""
    return SUPPORTED_LANGUAGES.get(code.lower().strip())
