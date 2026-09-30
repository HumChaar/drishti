"""Quick smoke-test for DRISHTI live Gemini translation pipeline."""
import sys, io
# Force UTF-8 output on Windows console so Indic scripts render
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from app.language.service import translation_service

items = [
    {"id": "1", "text": "COMMAND CENTRE"},
    {"id": "2", "text": "WEATHER"},
    {"id": "3", "text": "Cyclone track updated"},
    {"id": "4", "text": "Evacuation advisory issued for coastal districts"},
]

print("=== Testing Odia (or) translation via Gemini API ===")
results_or = translation_service.translate_batch(items, "or", "Emergency Management Dashboard")
for r in results_or:
    print(f"  [{r['id']}] {r['text']}")

print()
print("=== Testing Hindi (hi) translation via Gemini API ===")
results_hi = translation_service.translate_batch(items[:2], "hi", "Dashboard")
for r in results_hi:
    print(f"  [{r['id']}] {r['text']}")

print()
cache_stats = translation_service.get_status()
print("=== Service Status ===")
print(f"  Mode:  {cache_stats['mode']}")
print(f"  Cache: {cache_stats['cache']}")
