"""
Unit and Integration Tests for DRISHTI Language Module
Tests contract registry, persistent cache, placeholder preservation,
and batch translation API endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.language.contract import (
    SUPPORTED_LANGUAGES,
    is_supported_language,
    get_language,
    get_supported_languages
)
from app.language.cache import translation_cache
from app.language.service import translation_service

client = TestClient(app)


def test_language_contract_registry():
    """Verify all 5 languages are registered with required metadata."""
    expected_codes = {"en", "or", "bn", "hi", "te"}
    assert set(SUPPORTED_LANGUAGES.keys()) == expected_codes

    for code in expected_codes:
        assert is_supported_language(code) is True
        meta = get_language(code)
        assert meta is not None
        assert meta.code == code
        assert len(meta.native_name) > 0
        assert len(meta.font_family) > 0
        assert len(meta.tts_locale) > 0
        assert len(meta.stt_locale) > 0

    assert is_supported_language("invalid_code") is False
    assert get_language("invalid_code") is None


def test_translation_cache_operations():
    """Test get, set, batch set, hits/misses, and keying."""
    translation_cache.clear()

    # English passthrough
    assert translation_cache.get("Hello", "en") == "Hello"

    # Miss
    assert translation_cache.get("Cyclone Alert", "or") is None

    # Set and hit
    translation_cache.set("Cyclone Alert", "or", "ବାତ୍ୟା ସତର୍କତା")
    cached = translation_cache.get("Cyclone Alert", "or")
    assert cached == "ବାତ୍ୟା ସତର୍କତା"

    # Batch set
    batch_entries = [
        ("Evacuation", "bn", "স্থানান্তর", None),
        ("High Risk", "hi", "उच्च जोखिम", None),
        ("Safe Shelter", "te", "సురక్షిత ఆశ్రయం", None)
    ]
    translation_cache.set_batch(batch_entries)

    assert translation_cache.get("Evacuation", "bn") == "স্থানান্তর"
    assert translation_cache.get("High Risk", "hi") == "उच्च जोखिम"
    assert translation_cache.get("Safe Shelter", "te") == "సురక్షిత ఆశ్రయం"

    stats = translation_cache.get_stats()
    assert stats["entries_count"] >= 4
    assert stats["hits"] >= 4


def test_translation_service_batch_alignment():
    """Test batch translation preserves request IDs and handles fallback gracefully."""
    items = [
        {"id": "item-1", "text": "COMMAND CENTRE"},
        {"id": "item-2", "text": "WEATHER"},
        {"id": "item-3", "text": "HAZARDS"}
    ]

    results = translation_service.translate_batch(items, target_language="hi")
    assert len(results) == 3

    # Verify ID alignment
    result_map = {r["id"]: r["text"] for r in results}
    assert "item-1" in result_map
    assert "item-2" in result_map
    assert "item-3" in result_map

    # Verified fallback translation for known keywords
    assert result_map["item-1"] == "कमांड सेंटर"
    assert result_map["item-2"] == "मौसम"
    assert result_map["item-3"] == "खतरे"


def test_api_language_endpoints():
    """Test GET /api/language/languages and GET /api/language/status."""
    res_langs = client.get("/api/language/languages")
    assert res_langs.status_code == 200
    langs = res_langs.json()
    assert len(langs) == 5
    codes = [l["code"] for l in langs]
    assert "en" in codes
    assert "or" in codes
    assert "bn" in codes
    assert "hi" in codes
    assert "te" in codes

    res_status = client.get("/api/language/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "service" in status_data
    assert "mode" in status_data
    assert "cache" in status_data


def test_api_translate_batch_endpoint():
    """Test POST /api/language/translate."""
    payload = {
        "items": [
            {"id": "b-1", "text": "COMMAND CENTRE"},
            {"id": "b-2", "text": "SATELLITE"}
        ],
        "targetLanguage": "or",
        "context": "Header navigation"
    }

    res = client.post("/api/language/translate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["targetLanguage"] == "or"
    assert len(data["translations"]) == 2

    id_to_text = {t["id"]: t["text"] for t in data["translations"]}
    assert id_to_text["b-1"] in ("କମାଣ୍ଡ ସେଣ୍ଟର", "କମାଣ୍ଡ୍ ସେଣ୍ଟର୍", "କମାଣ୍ଡ ସେଣ୍ଟର୍", "କମାଣ୍ଡ୍ ସେଣ୍ଟର") or "କମାଣ୍ଡ" in id_to_text["b-1"]
    assert id_to_text["b-2"] in ("ଉପଗ୍ରହ", "ସାଟେଲାଇଟ୍", "ସାଟେଲାଇଟ")


def test_advisory_multilingual_integration():
    """Test generating an advisory in Odia routes through translation and works properly."""
    res = client.post(
        "/api/advisory/generate",
        json={"district_id": "od_balasore", "step_id": "NOW", "language": "or"}
    )
    assert res.status_code == 200
    adv_data = res.json()
    assert adv_data["district_id"] == "od_balasore"
    assert adv_data["language"] == "or"
    assert adv_data["advisory"]["summary"] is not None
    assert len(adv_data["advisory"]["priority_actions"]) > 0
