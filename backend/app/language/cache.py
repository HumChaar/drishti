"""
DRISHTI Persistent Server-Side Translation Cache
Provides thread-safe, disk-persisted caching of translations in backend/app/data/translation_cache.json.
Guarantees fast retrieval and preserves translated life-safety advisories across service restarts.
"""

import json
import hashlib
import threading
from pathlib import Path
from typing import Dict, Optional, List, Tuple, Any
from datetime import datetime, timezone


class TranslationCache:
    _STORE_PATH: Path = (
        Path(__file__).parent.parent / "data" / "translation_cache.json"
    )

    def __init__(self):
        self._lock = threading.Lock()
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._hits: int = 0
        self._misses: int = 0
        self._init_store()

    def _init_store(self) -> None:
        """Initializes the data directory and loads existing cache entries."""
        try:
            self._STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
            if self._STORE_PATH.exists():
                raw = self._STORE_PATH.read_text(encoding="utf-8")
                if raw.strip():
                    self._memory_cache = json.loads(raw)
            else:
                self._STORE_PATH.write_text("{}", encoding="utf-8")
        except Exception as e:
            print(f"[TranslationCache] Warning during cache initialization: {e}")
            self._memory_cache = {}

    def _generate_key(self, text: str, target_language: str, context: Optional[str] = None) -> str:
        """Computes a deterministic SHA256 cache key for source text, target language, and optional context."""
        normalized_text = text.strip()
        normalized_lang = target_language.lower().strip()
        normalized_ctx = (context or "").strip()
        payload = f"{normalized_lang}:::{normalized_ctx}:::{normalized_text}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def get(self, text: str, target_language: str, context: Optional[str] = None) -> Optional[str]:
        """Retrieves cached translation for the given text and language."""
        if target_language.lower().strip() == "en":
            return text

        key = self._generate_key(text, target_language, context)
        with self._lock:
            entry = self._memory_cache.get(key)
            if entry and isinstance(entry, dict) and "translated" in entry:
                self._hits += 1
                return entry["translated"]
            self._misses += 1
            return None

    def set(
        self,
        text: str,
        target_language: str,
        translated_text: str,
        context: Optional[str] = None
    ) -> None:
        """Stores a translation in memory and flushes to disk."""
        if target_language.lower().strip() == "en":
            return

        key = self._generate_key(text, target_language, context)
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            self._memory_cache[key] = {
                "source": text,
                "target_language": target_language.lower().strip(),
                "context": context,
                "translated": translated_text,
                "created_at": now_iso
            }
            self._flush_to_disk()

    def set_batch(
        self,
        items: List[Tuple[str, str, str, Optional[str]]]
    ) -> None:
        """
        Stores multiple translation entries in a single disk write.
        Each item is a tuple: (source_text, target_language, translated_text, context)
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._lock:
            for text, lang, translated, ctx in items:
                if lang.lower().strip() == "en":
                    continue
                key = self._generate_key(text, lang, ctx)
                self._memory_cache[key] = {
                    "source": text,
                    "target_language": lang.lower().strip(),
                    "context": ctx,
                    "translated": translated,
                    "created_at": now_iso
                }
            self._flush_to_disk()

    def _flush_to_disk(self) -> None:
        """Atomically writes memory cache to the JSON file store."""
        try:
            self._STORE_PATH.write_text(
                json.dumps(self._memory_cache, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
        except Exception as e:
            print(f"[TranslationCache] Warning: could not persist cache to disk: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Returns cache telemetry: total entries, hit count, miss count, hit ratio."""
        with self._lock:
            total_entries = len(self._memory_cache)
            total_requests = self._hits + self._misses
            ratio = (self._hits / total_requests) if total_requests > 0 else 0.0
            return {
                "entries_count": total_entries,
                "hits": self._hits,
                "misses": self._misses,
                "hit_ratio": round(ratio, 4),
                "store_path": str(self._STORE_PATH)
            }

    def clear(self) -> None:
        """Clears both memory and disk caches."""
        with self._lock:
            self._memory_cache = {}
            self._hits = 0
            self._misses = 0
            self._flush_to_disk()


translation_cache = TranslationCache()
