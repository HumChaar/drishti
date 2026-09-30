/**
 * DRISHTI Language Contract & Registry
 * Authoritative registry of supported emergency management languages.
 */

export const SUPPORTED_LANGUAGES = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    fontFamily: "Inter, sans-serif",
    locale: "en-IN",
    direction: "ltr",
    ttsLocale: "en-IN",
    sttLocale: "en-IN"
  },
  {
    code: "or",
    label: "Odia",
    nativeLabel: "ଓଡ଼ିଆ",
    fontFamily: "'Noto Sans Oriya', Inter, sans-serif",
    locale: "or-IN",
    direction: "ltr",
    ttsLocale: "or-IN",
    sttLocale: "or-IN"
  },
  {
    code: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    fontFamily: "'Noto Sans Bengali', Inter, sans-serif",
    locale: "bn-IN",
    direction: "ltr",
    ttsLocale: "bn-IN",
    sttLocale: "bn-IN"
  },
  {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    fontFamily: "'Noto Sans Devanagari', Inter, sans-serif",
    locale: "hi-IN",
    direction: "ltr",
    ttsLocale: "hi-IN",
    sttLocale: "hi-IN"
  },
  {
    code: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    fontFamily: "'Noto Sans Telugu', Inter, sans-serif",
    locale: "te-IN",
    direction: "ltr",
    ttsLocale: "te-IN",
    sttLocale: "te-IN"
  }
];

export const DEFAULT_LANGUAGE = "en";

export function getLanguageMetadata(code) {
  const normalized = (code || DEFAULT_LANGUAGE).toLowerCase().trim();
  return SUPPORTED_LANGUAGES.find((l) => l.code === normalized) || SUPPORTED_LANGUAGES[0];
}

export function isLanguageSupported(code) {
  const normalized = (code || "").toLowerCase().trim();
  return SUPPORTED_LANGUAGES.some((l) => l.code === normalized);
}
