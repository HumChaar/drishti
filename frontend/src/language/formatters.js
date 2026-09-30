/**
 * DRISHTI Regional Indic Formatters
 * Formats numbers, dates, and times according to state disaster management conventions.
 */

const INDIC_DIGIT_MAPS = {
  or: ["୦", "୧", "୨", "୩", "୪", "୫", "୬", "୭", "୮", "୯"],
  bn: ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"],
  hi: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  te: ["౦", "౧", "౨", "౩", "౪", "౫", "౬", "౭", "౮", "౯"]
};

/**
 * Converts Western Arabic digits (0-9) to native Indic numerals if requested.
 */
export function toIndicDigits(value, lang = "en") {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const digits = INDIC_DIGIT_MAPS[lang];
  if (!digits) return str;

  return str.replace(/[0-9]/g, (w) => digits[parseInt(w, 10)]);
}

/**
 * Formats numerical values using regional Indian number grouping (lakhs/crores).
 */
export function formatNumber(value, lang = "en", options = {}) {
  if (value === null || value === undefined || isNaN(value)) return "—";
  const num = Number(value);
  try {
    const formatted = new Intl.NumberFormat("en-IN", options).format(num);
    if (options.useIndicDigits) {
      return toIndicDigits(formatted, lang);
    }
    return formatted;
  } catch {
    return String(value);
  }
}

/**
 * Formats timestamps in Indian Standard Time (IST).
 */
export function formatISTDateTime(date, lang = "en") {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  try {
    const formattedDate = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    }).toUpperCase();

    const formattedTime = d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    return `${formattedDate} • ${formattedTime} IST`;
  } catch {
    return d.toISOString();
  }
}
