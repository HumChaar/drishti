/**
 * DRISHTI NDMA SACHET Alert Service
 *
 * Official Source: National Disaster Management Authority (NDMA) — Project SACHET
 * Portal: https://sachet.ndma.gov.in/
 * Standard: Common Alerting Protocol (CAP - ITU-T X.1303 / OASIS CAP v1.2)
 *
 * PROVENANCE:
 * WARNING / ALERT
 * SOURCE: NDMA SACHET
 *
 * CORS & DATA INTEGRITY:
 * - Direct browser access to SACHET portal endpoints is blocked by browser CORS policy.
 * - This service adheres to DRISHTI Data Integrity Rules:
 *   1. NEVER fabricate fake alerts or fallback synthetic warnings.
 *   2. NEVER bypass CORS via unauthorized proxies or client-side tampering.
 *   3. If direct browser access fails, report honest "SOURCE UNAVAILABLE" state.
 *   4. Provide clean normalized interface for Johney's FastAPI backend proxy integration.
 */

export const SACHET_SEVERITY_LEVELS = {
  EXTREME: {
    code: "Extreme",
    badgeLabel: "RED WARNING",
    textColor: "#b91c1c",
    bgColor: "#fef2f2",
    borderColor: "#f87171",
    priority: 1
  },
  SEVERE: {
    code: "Severe",
    badgeLabel: "ORANGE ALERT",
    textColor: "#c2410c",
    bgColor: "#fff7ed",
    borderColor: "#fb923c",
    priority: 2
  },
  MODERATE: {
    code: "Moderate",
    badgeLabel: "YELLOW WATCH",
    textColor: "#a16207",
    bgColor: "#fefce8",
    borderColor: "#facc15",
    priority: 3
  },
  MINOR: {
    code: "Minor",
    badgeLabel: "GREEN ADVISORY",
    textColor: "#15803d",
    bgColor: "#f0fdf4",
    borderColor: "#86efac",
    priority: 4
  }
};

/**
 * Normalized NDMA SACHET Service Adapter
 */
export async function fetchNdmaAlerts({ state: _state = null, district: _district = null, timeoutMs = 4000 } = {}) {
  const checkedAt = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }) + " IST";

  // Official direct candidate endpoints
  const endpoints = [
    "/api/v1/sachet/alerts", // Future backend proxy
    "https://sachet.ndma.gov.in/api/alerts" // Direct public probe
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json, text/xml, */*" },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const rawAlerts = Array.isArray(data) ? data : data.alerts || [];

        const normalized = rawAlerts.map(parseCapAlert);

        return {
          liveStatus: "LIVE",
          provenance: "WARNING / ALERT • SOURCE: NDMA SACHET",
          source: "NDMA SACHET (CAP)",
          officialPortalUrl: "https://sachet.ndma.gov.in/",
          checkedAt,
          alertsCount: normalized.length,
          alerts: normalized,
          error: null
        };
      }
    } catch {
      // CORS block or network timeout expected on direct browser access
    }
  }

  // Authoritative fallback: Honest reporting of CORS restriction without fake alerts
  return {
    liveStatus: "SOURCE_UNAVAILABLE",
    provenance: "WARNING / ALERT • SOURCE: NDMA SACHET",
    source: "NDMA SACHET (Common Alerting Protocol)",
    officialPortalUrl: "https://sachet.ndma.gov.in/",
    checkedAt,
    alertsCount: 0,
    alerts: [],
    requiresBackend: true,
    backendStatus: "BACKEND INTEGRATION REQUIRED — JOHNEY",
    limitation: "Direct browser access to NDMA SACHET CAP feeds is restricted by CORS. An authoritative FastAPI backend proxy is required to ingest official XML/CAP payloads."
  };
}

/**
 * Standardized CAP Alert Item Normalizer
 */
export function parseCapAlert(item) {
  const severityKey = (item.severity || "Moderate").toUpperCase();
  const severityMeta = SACHET_SEVERITY_LEVELS[severityKey] || SACHET_SEVERITY_LEVELS.MODERATE;

  return {
    id: item.identifier || item.id || `sachet-${Date.now()}`,
    headline: item.headline || item.title || "Disaster Advisory",
    event: item.event || "Multi-Hazard Advisory",
    category: item.category || "Met",
    urgency: item.urgency || "Immediate",
    severity: item.severity || "Moderate",
    severityMeta,
    certainty: item.certainty || "Observed",
    areaDesc: item.areaDesc || item.state || "National Domain",
    effective: item.effective || item.sent || null,
    expires: item.expires || null,
    instruction: item.instruction || item.description || "Follow NDMA official advisories.",
    senderName: item.senderName || "National Disaster Management Authority (NDMA)",
    source: "NDMA SACHET",
    provenance: "WARNING / ALERT • SOURCE: NDMA SACHET"
  };
}

export default {
  fetchNdmaAlerts,
  parseCapAlert,
  SACHET_SEVERITY_LEVELS
};
