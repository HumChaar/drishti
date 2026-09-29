/**
 * DRISHTI Synoptic & Cyclone Intelligence Service
 *
 * Authoritative IMD System/Bulletin Integration Layer.
 * Adheres strictly to the DRISHTI Provenance Architecture:
 * - SOURCE: IMD (India Meteorological Department)
 * - STATUS: OBSERVED (Only when officially verified from source)
 * - PROVENANCE: OBSERVED / UNAVAILABLE
 *
 * SOURCING RULES:
 * - Attempts direct connection to official IMD endpoints.
 * - When direct browser access is blocked by CORS:
 *   - NEVER uses unauthorized proxy or scraper.
 *   - NEVER fabricates coordinates or substitutes stale demo systems.
 *   - Sets liveStatus to "SOURCE_UNAVAILABLE".
 *   - Sets coordinates and observation time to "NOT VERIFIED".
 *   - Displays DRISHTI Checked time explicitly.
 *   - Provides direct link to the official IMD Cyclone Information portal.
 */

export const OFFICIAL_CYCLONE_PORTALS = {
  PRIMARY_CYCLONE_INFO: {
    title: "IMD Cyclone Information",
    url: "https://mausam.imd.gov.in/responsive/cycloneinformation.php",
    description: "Official real-time cyclone tracking and advisory bulletins issued by IMD."
  },
  CYCLONE_ARCHIVE: {
    title: "IMD All India Cyclone Bulletins",
    url: "https://mausam.imd.gov.in/responsive/cyclone_bulletin_archive.php",
    description: "Authoritative archive of national and oceanic tropical cyclone advisories."
  },
  RSMC_NEW_DELHI: {
    title: "RSMC Tropical Cyclones New Delhi",
    url: "https://rsmcnewdelhi.imd.gov.in/bulletins-products-cwd.php",
    description: "Regional Specialised Meteorological Centre for North Indian Ocean."
  },
  SATELLITE_BULLETIN: {
    title: "IMD Satellite Bulletin View",
    url: "https://mausam.imd.gov.in/Forecast/satellite_bulletin_view.php",
    description: "Official synoptic satellite analysis bulletin and cloud vortex positions."
  }
};

/**
 * Format latitude coordinate to official IMD precision or NOT VERIFIED
 */
export function formatLatitude(lat) {
  if (lat == null || isNaN(lat)) return "NOT VERIFIED";
  const num = parseFloat(lat);
  const dir = num >= 0 ? "N" : "S";
  return `${Math.abs(num).toFixed(2)}° ${dir}`;
}

/**
 * Format longitude coordinate to official IMD precision or NOT VERIFIED
 */
export function formatLongitude(lon) {
  if (lon == null || isNaN(lon)) return "NOT VERIFIED";
  const num = parseFloat(lon);
  const dir = num >= 0 ? "E" : "W";
  return `${Math.abs(num).toFixed(2)}° ${dir}`;
}

/**
 * Format combined coordinates or NOT VERIFIED
 */
export function formatCoordinates(lat, lon) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return "NOT VERIFIED";
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const latDir = latNum >= 0 ? "N" : "S";
  const lonDir = lonNum >= 0 ? "E" : "W";
  return `${Math.abs(latNum).toFixed(2)}°${latDir}, ${Math.abs(lonNum).toFixed(2)}°${lonDir}`;
}

/**
 * Parses raw text or HTML from IMD bulletin for synoptic systems
 */
function parseImdBulletinText(text) {
  if (!text || typeof text !== "string") return null;

  // Look for depression or cyclonic disturbance mention
  const depMatch = text.match(/(?:depression|deep depression|cyclonic storm|well[- ]marked low pressure area|low pressure area)\s+over\s+([^.]+?)(?:lay centered|centered near|moved|\.)/i);
  const coordMatch = text.match(/(?:latitude|lat\.?)\s*([0-9]+\.?[0-9]*)\s*°?\s*N\s*(?:and|,)?\s*(?:longitude|long\.?)\s*([0-9]+\.?[0-9]*)\s*°?\s*E/i);

  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    let classification = "DEPRESSION";
    if (/deep depression/i.test(text)) classification = "DEEP DEPRESSION";
    else if (/severe cyclonic storm/i.test(text)) classification = "SEVERE CYCLONIC STORM";
    else if (/cyclonic storm/i.test(text)) classification = "CYCLONIC STORM";
    else if (/well[- ]marked low/i.test(text)) classification = "WELL-MARKED LOW";
    else if (/low pressure area/i.test(text)) classification = "LOW PRESSURE AREA";

    // Extract official observation time only if present in text, never synthesize with system clock
    const timeMatch = text.match(/(?:observed at|observed on|as on|at)\s*([0-9]{1,2}[:.][0-9]{2}\s*(?:hrs|hours|ist|utc)?)/i);
    const observationTime = timeMatch ? timeMatch[1].trim() : "NOT VERIFIED";

    return {
      id: `sys-live-${Date.now()}`,
      name: depMatch ? `System over ${depMatch[1].trim()}` : `${classification} System`,
      shortName: depMatch ? depMatch[1].trim().slice(0, 30) : classification,
      classification,
      status: "ACTIVE",
      locationDescription: depMatch ? depMatch[1].trim() : "Indian Subcontinent & Oceanic Basins",
      latitude: lat,
      longitude: lon,
      latitudeFormatted: formatLatitude(lat),
      longitudeFormatted: formatLongitude(lon),
      coordinatesFormatted: formatCoordinates(lat, lon),
      pressureHpa: null,
      maxWindKmph: null,
      gustKmph: null,
      movementDirection: null,
      movementSpeedKmph: null,
      movementDescription: "See official IMD bulletin",
      observationTime,
      source: "IMD Official Bulletin",
      provenance: "OBSERVED",
      liveStatus: "LIVE",
      sourceUrl: OFFICIAL_CYCLONE_PORTALS.PRIMARY_CYCLONE_INFO.url
    };
  }
  return null;
}

/**
 * Fetches active synoptic systems from official IMD sources.
 * Handles browser CORS restrictions gracefully without proxies or fake data.
 */
export async function fetchActiveSynopticSystems() {
  const checkTime = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false, hour: "2-digit", minute: "2-digit" }) + " IST";

  const result = {
    systems: [],
    primarySystem: null,
    hasActiveSystem: false,
    isAvailable: false,
    liveStatus: "SOURCE_UNAVAILABLE", // "LIVE" | "SOURCE_UNAVAILABLE" | "NO_ACTIVE_SYSTEM"
    corsBlocked: false,
    checkedAt: checkTime,
    sourceUrl: OFFICIAL_CYCLONE_PORTALS.PRIMARY_CYCLONE_INFO.url,
    notice: "Direct IMD bulletin web access blocked by browser CORS. Official live system observation and coordinates cannot be verified client-side without an official proxy."
  };

  try {
    // Attempt direct fetch to official IMD endpoint
    const response = await fetch(OFFICIAL_CYCLONE_PORTALS.PRIMARY_CYCLONE_INFO.url, {
      method: "GET",
      headers: { "Accept": "text/html,application/xhtml+xml" }
    });

    if (response.ok) {
      const htmlText = await response.text();
      const parsed = parseImdBulletinText(htmlText);
      if (parsed) {
        result.systems = [parsed];
        result.primarySystem = parsed;
        result.hasActiveSystem = true;
        result.isAvailable = true;
        result.liveStatus = "LIVE";
        return result;
      } else {
        result.liveStatus = "NO_ACTIVE_SYSTEM";
        result.hasActiveSystem = false;
        result.isAvailable = true;
        return result;
      }
    } else {
      result.liveStatus = "SOURCE_UNAVAILABLE";
    }
  } catch {
    // Expected in standard browser environment due to browser CORS restriction
    result.corsBlocked = true;
    result.liveStatus = "SOURCE_UNAVAILABLE";
    result.hasActiveSystem = false;
    result.primarySystem = null;
    result.isAvailable = false;
  }

  // Under CORS restriction: return empty system with SOURCE_UNAVAILABLE and NOT VERIFIED.
  // NEVER fall back to hardcoded fake coordinates or timestamps.
  return result;
}
