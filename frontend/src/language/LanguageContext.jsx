import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguageMetadata,
  isLanguageSupported
} from "./languages";
import { translationClient } from "./translationClient";

const LanguageContext = createContext(null);

const STORAGE_KEY = "drishti_language";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isLanguageSupported(stored)) {
        return stored;
      }
    } catch (e) {
      console.warn("[LanguageProvider] Could not read stored language:", e);
    }
    return DEFAULT_LANGUAGE;
  });

  const [isTranslating, setIsTranslating] = useState(false);
  const [version, setVersion] = useState(0); // Trigger re-render when batch arrives

  // Queue of strings needing translation for active screen
  const queueRef = useRef(new Set());
  const debounceTimerRef = useRef(null);

  // Synchronize document <html lang="..."> attribute and direction
  useEffect(() => {
    try {
      document.documentElement.lang = language;
      const meta = getLanguageMetadata(language);
      document.documentElement.dir = meta.direction || "ltr";
    } catch {
      // Ignore during SSR or testing
    }
  }, [language]);

  // Flush queued strings to backend in a single batched call
  const flushQueue = useCallback(async () => {
    if (queueRef.current.size === 0 || language === "en") return;

    const stringsToTranslate = Array.from(queueRef.current);
    queueRef.current.clear();

    const items = stringsToTranslate.map((text, idx) => ({
      id: `str_${idx}_${text.slice(0, 10).replace(/\W/g, "")}`,
      text
    }));

    setIsTranslating(true);
    try {
      await translationClient.translateBatch(items, language, "Screen Translation");
      // Trigger consumer re-render once new translations are in memory
      setVersion((v) => v + 1);
    } catch (err) {
      console.warn("[LanguageProvider] Screen translation batch failed:", err);
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Set language with persistence and auto-translation trigger
  const setLanguage = useCallback((newLang) => {
    const normalized = (newLang || DEFAULT_LANGUAGE).toLowerCase().trim();
    if (!isLanguageSupported(normalized)) {
      console.warn(`[LanguageProvider] Unsupported language: ${newLang}`);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch (e) {
      console.warn("[LanguageProvider] Could not persist language:", e);
    }

    setLanguageState(normalized);
  }, []);

  // Main translation function: t(sourceText, params, context)
  const t = useCallback((sourceText, params, _context) => {
    if (!sourceText || typeof sourceText !== "string") {
      return sourceText;
    }

    // English passthrough
    if (language === "en") {
      return translationClient.interpolate(sourceText, params);
    }

    // Check two-tier cache
    const cached = translationClient.getCached(sourceText, language);
    if (cached !== null) {
      return translationClient.interpolate(cached, params);
    }

    // String needs translation: register in screen queue
    queueRef.current.add(sourceText);

    // Debounce flush so entire screen's t() calls are batched into 1 request
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      flushQueue();
    }, 60);

    // Return English source interpolated as immediate optimistic display
    return translationClient.interpolate(sourceText, params);
  }, [language, flushQueue]);

  // Batch translate screen-level string list explicitly
  const translateScreen = useCallback(async (stringsList) => {
    if (!stringsList || stringsList.length === 0 || language === "en") return;

    const items = stringsList.map((text, idx) => ({
      id: `screen_${idx}`,
      text
    }));

    setIsTranslating(true);
    try {
      await translationClient.translateBatch(items, language, "Explicit Screen Prefetch");
      setVersion((v) => v + 1);
    } catch (err) {
      console.warn("[LanguageProvider] translateScreen failed:", err);
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  const currentLanguage = getLanguageMetadata(language);

  const contextValue = {
    language,
    setLanguage,
    t,
    translateScreen,
    isTranslating,
    languages: SUPPORTED_LANGUAGES,
    currentLanguage,
    version
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a <LanguageProvider>");
  }
  return context;
}
