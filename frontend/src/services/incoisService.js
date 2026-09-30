/**
 * DRISHTI INCOIS Coastal & Ocean Hazard Intelligence Service
 *
 * Official Source: Indian National Centre for Ocean Information Services (INCOIS),
 * Ministry of Earth Sciences (MoES), Government of India.
 * Portal: https://incois.gov.in/
 *
 * PROVENANCE:
 * OBSERVED / ADVISORY
 * SOURCE: INCOIS
 *
 * CRITICAL RULE:
 * NEVER invent tsunami, ocean wave, or storm surge warnings.
 * If browser cannot fetch directly due to CORS or endpoint restriction,
 * report honest "SOURCE UNAVAILABLE" and mark "BACKEND INTEGRATION REQUIRED — JOHNEY".
 */

export async function fetchIncoisBulletins({ timeoutMs = 4000 } = {}) {
  const checkedAt = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }) + " IST";

  const candidateEndpoints = [
    "/api/v1/incois/bulletins", // Backend proxy
    "https://incois.gov.in/portal/osf/osf.jsp"
  ];

  for (const endpoint of candidateEndpoints) {
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
        return {
          liveStatus: "LIVE",
          provenance: "COASTAL HAZARD / OCEAN ALERT • SOURCE: INCOIS",
          source: "INCOIS (MoES)",
          checkedAt,
          bulletins: data.bulletins || [],
          error: null
        };
      }
    } catch {
      // CORS block expected on direct browser access
    }
  }

  return {
    liveStatus: "SOURCE_UNAVAILABLE",
    provenance: "COASTAL HAZARD / OCEAN ALERT • SOURCE: INCOIS",
    source: "INCOIS (Indian National Centre for Ocean Information Services)",
    officialPortalUrl: "https://incois.gov.in/",
    checkedAt,
    bulletins: [],
    requiresBackend: true,
    backendStatus: "BACKEND INTEGRATION REQUIRED — JOHNEY",
    limitation: "Direct browser access to INCOIS bulletins is restricted by CORS. An authoritative backend proxy is required to ingest official Indian Ocean marine forecasts."
  };
}

export default {
  fetchIncoisBulletins
};
