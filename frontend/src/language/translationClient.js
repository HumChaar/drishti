/**
 * DRISHTI Translation Client & Two-Tier Cache
 * Tier 1: In-memory Map for sub-millisecond retrieval during component renders.
 * Tier 2: LocalStorage for instant hydration across page reloads.
 * Single-request batching to /api/language/translate.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ""
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:8000"
).replace(/\/+$/, "");

class TranslationClient {
  constructor() {
    this.memoryCache = new Map();
    this.hydratedLanguages = new Set();
  }

  _getStorageKey(lang) {
    return `drishti_translations_${lang.toLowerCase().trim()}`;
  }

  _hydrateLanguageCache(lang) {
    if (this.hydratedLanguages.has(lang)) return;
    this.hydratedLanguages.add(lang);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(this._getStorageKey(lang));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([sourceText, transText]) => {
              const memKey = `${lang}:::${sourceText}`;
              this.memoryCache.set(memKey, transText);
            });
          }
        }
      }
    } catch (e) {
      console.warn("[TranslationClient] LocalStorage hydration warning:", e);
    }
  }

  _persistToStorage(lang, newEntries) {
    try {
      if (typeof window !== "undefined" && window.localStorage && Object.keys(newEntries).length > 0) {
        const storageKey = this._getStorageKey(lang);
        const existingRaw = window.localStorage.getItem(storageKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : {};
        const merged = { ...existing, ...newEntries };
        window.localStorage.setItem(storageKey, JSON.stringify(merged));
      }
    } catch (e) {
      console.warn("[TranslationClient] LocalStorage persist warning:", e);
    }
  }

  /**
   * Retrieves translation from Tier 1 (memory) or Tier 2 (localStorage) synchronously.
   */
  getCached(sourceText, targetLang) {
    if (!sourceText || !targetLang || targetLang.toLowerCase() === "en") {
      return sourceText;
    }
    const lang = targetLang.toLowerCase().trim();
    this._hydrateLanguageCache(lang);
    const key = `${lang}:::${sourceText}`;
    return this.memoryCache.get(key) || null;
  }

  /**
   * Translates a batch of { id, text } objects for a target language.
   * Leverages cache and dispatches missing items in a single HTTP POST request.
   */
  async translateBatch(items, targetLang, context = "DRISHTI Dashboard") {
    if (!items || items.length === 0) return {};
    const lang = (targetLang || "en").toLowerCase().trim();

    if (lang === "en") {
      const enResult = {};
      items.forEach((item) => {
        enResult[item.id] = item.text;
      });
      return enResult;
    }

    this._hydrateLanguageCache(lang);

    const resultMap = {};
    const missingItems = [];

    // Check caches
    items.forEach((item) => {
      const cached = this.getCached(item.text, lang);
      if (cached !== null) {
        resultMap[item.id] = cached;
      } else {
        missingItems.push(item);
      }
    });

    if (missingItems.length === 0) {
      return resultMap;
    }

    // Call backend batch translation endpoint
    try {
      const res = await fetch(`${API_BASE_URL}/api/language/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: missingItems.map((m) => ({ id: String(m.id), text: m.text })),
          targetLanguage: lang,
          context
        })
      });

      if (!res.ok) {
        throw new Error(`Translation API error: HTTP ${res.status}`);
      }

      const data = await res.json();
      const newlyTranslated = {};

      if (data && Array.isArray(data.translations)) {
        data.translations.forEach((tr, idx) => {
          const origItem = missingItems.find((m) => String(m.id) === String(tr.id)) || missingItems[idx];
          const isUnavailable = !tr.text || tr.text.startsWith("[Translation unavailable:");
          const textToUse = isUnavailable ? (origItem ? origItem.text : tr.text) : tr.text;

          resultMap[tr.id] = textToUse;

          if (origItem) {
            const memKey = `${lang}:::${origItem.text}`;
            this.memoryCache.set(memKey, textToUse);
            if (!isUnavailable) {
              newlyTranslated[origItem.text] = textToUse;
            }
          }
        });
      }

      // Persist newly translated entries to Tier 2 (localStorage)
      this._persistToStorage(lang, newlyTranslated);
    } catch (err) {
      console.warn("[TranslationClient] Batch translation failed:", err);
      // Explicit fallback for missed items: keep readable text in memory to stop looping
      missingItems.forEach((item) => {
        if (!resultMap[item.id]) {
          resultMap[item.id] = item.text;
        }
        const memKey = `${lang}:::${item.text}`;
        if (!this.memoryCache.has(memKey)) {
          this.memoryCache.set(memKey, item.text);
        }
      });
    }

    return resultMap;
  }

  /**
   * Template interpolation helper: replaces tokens like {district} with params[district].
   */
  interpolate(template, params) {
    if (!template || typeof template !== "string") return template;
    if (!params || typeof params !== "object") return template;

    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined && params[key] !== null ? String(params[key]) : match;
    });
  }
}

export const translationClient = new TranslationClient();
