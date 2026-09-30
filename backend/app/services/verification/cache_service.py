"""
DRISHTI Verification Caching Service (Phase 17)

Caches Sentinel-2 metadata and Gemini verification results using deterministic keys:
    cache_key = {event_id}_{zone_id}_{scene_id}_{segformer_model_version}

Prevents redundant external API calls for identical evidence snapshots.
Persistence: In-memory cache + disk persistence in backend/app/data/verification_cache.json
"""

from __future__ import annotations
import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

CACHE_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "verification_cache.json")


class VerificationCacheService:
    """
    Deterministic caching service for verification artifacts and Gemini responses.
    """

    def __init__(self, cache_file: str = CACHE_FILE_PATH):
        self._cache_file = os.path.abspath(cache_file)
        self._cache: Dict[str, Any] = {}
        self._load_cache()

    def _load_cache(self):
        """Loads cache from disk if available."""
        try:
            if os.path.exists(self._cache_file):
                with open(self._cache_file, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
                logger.info(f"[VerificationCacheService] Loaded {len(self._cache)} cached verification entries.")
        except Exception as e:
            logger.warning(f"[VerificationCacheService] Failed to load cache file: {e}")
            self._cache = {}

    def _save_cache(self):
        """Persists cache to disk."""
        try:
            os.makedirs(os.path.dirname(self._cache_file), exist_ok=True)
            with open(self._cache_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2)
        except Exception as e:
            logger.warning(f"[VerificationCacheService] Failed to save cache file: {e}")

    def make_key(
        self,
        event_id: str,
        zone_id: str,
        scene_id: Optional[str] = None,
        model_version: str = "SegFormer-B0"
    ) -> str:
        """Constructs deterministic cache key."""
        s_id = scene_id or "no_scene"
        return f"{event_id}_{zone_id}_{s_id}_{model_version}".replace(" ", "_")

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves cached verification result if present."""
        return self._cache.get(key)

    def put(self, key: str, value: Dict[str, Any]):
        """Stores verification result in cache."""
        self._cache[key] = value
        self._save_cache()

    def clear(self):
        """Clears cache."""
        self._cache = {}
        self._save_cache()


verification_cache_service = VerificationCacheService()
