/**
 * DRISHTI Water Exposure & Flood Hazard Intelligence Service
 *
 * Sourcing & Context:
 * - Central Water Commission (CWC) Official Flood Forecast: https://ffs.india-water.gov.in/
 * - India Water Resources Information System (India-WRIS): https://indiawris.gov.in/
 * - DRISHTI Digital Elevation Model & Inundation Polygons
 *
 * PROVENANCE:
 * DERIVED
 * SOURCE: DRISHTI + CWC / ELEVATION DATA
 *
 * CRITICAL SAFETY RULES:
 * 1. NEVER call a facility "SAFE" simply because it is far from a water body.
 * 2. Only valid exposure classifications:
 *    - "LOW WATER EXPOSURE"
 *    - "MODERATE WATER EXPOSURE"
 *    - "HIGH WATER EXPOSURE"
 *    - "WATER EXPOSURE: UNKNOWN"
 * 3. If sufficient official evidence is unavailable, MUST return:
 *    "WATER EXPOSURE: UNKNOWN"
 */

import { getElevation } from "./terrainService.js";

export const EXPOSURE_LEVELS = {
  LOW: {
    key: "LOW",
    badgeText: "WATER EXPOSURE: LOW",
    textColor: "#15803d",
    bgColor: "#f0fdf4",
    borderColor: "#86efac"
  },
  MODERATE: {
    key: "MODERATE",
    badgeText: "WATER EXPOSURE: MODERATE",
    textColor: "#b45309",
    bgColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  HIGH: {
    key: "HIGH",
    badgeText: "WATER EXPOSURE: HIGH",
    textColor: "#b91c1c",
    bgColor: "#fef2f2",
    borderColor: "#fca5a5"
  },
  UNKNOWN: {
    key: "UNKNOWN",
    badgeText: "WATER EXPOSURE: UNKNOWN",
    textColor: "#475569",
    bgColor: "#f8fafc",
    borderColor: "#cbd5e1"
  }
};

/**
 * Determine if a point is within approximate coastal surge / flood zone
 */
function isWithinInundationArc(lat, lon, scenario) {
  if (!scenario || scenario.id !== "remal") return false;
  // West Bengal coastal arc & Sunderbans inundation envelope
  return lat >= 21.4 && lat <= 22.8 && lon >= 87.5 && lon <= 89.2;
}

/**
 * Evaluate water exposure for a given facility or coordinate
 *
 * @param {Object} facility - { lat, lon, name, category }
 * @param {Object} context - { operatingMode, currentScenario, isCoastal }
 * @returns {Promise<Object>} Exposure evaluation
 */
export async function evaluateWaterExposure(facility, context = {}) {
  const { lat, lon } = facility;

  if (lat == null || lon == null) {
    return {
      level: "UNKNOWN",
      ...EXPOSURE_LEVELS.UNKNOWN,
      evidence: "Coordinates missing for water exposure computation",
      provenance: "DERIVED • SOURCE: DRISHTI",
      source: "CWC / DRISHTI"
    };
  }

  // 1. Check active simulated/observed cyclone storm surge inundation envelope
  if (context.operatingMode === "DISASTER" && isWithinInundationArc(lat, lon, context.currentScenario)) {
    return {
      level: "HIGH",
      ...EXPOSURE_LEVELS.HIGH,
      evidence: "Located inside active storm surge & coastal inundation envelope (Cyclone Remal)",
      provenance: "SIMULATED • SOURCE: DRISHTI CYCLONE REMAL INUNDATION MODEL",
      source: "DRISHTI / CWC Historical Baseline"
    };
  }

  // 2. Query real Digital Elevation Model (Open-Meteo DEM 90m)
  try {
    const elevResult = await getElevation(lat, lon);
    const elevation = elevResult.elevationMeters;

    if (elevation != null) {
      // Coastal low-elevation assessment
      if (elevation < 4) {
        return {
          level: "HIGH",
          ...EXPOSURE_LEVELS.HIGH,
          evidence: `Low-lying elevation (${elevation}m MSL); high susceptibility to runoff accumulation`,
          provenance: "DERIVED • SOURCE: DRISHTI + OPEN-METEO DEM",
          source: "DRISHTI + Copernicus 90m DEM"
        };
      }

      if (elevation >= 4 && elevation <= 12) {
        return {
          level: "MODERATE",
          ...EXPOSURE_LEVELS.MODERATE,
          evidence: `Intermediate terrain elevation (${elevation}m MSL); moderate surface runoff exposure`,
          provenance: "DERIVED • SOURCE: DRISHTI + OPEN-METEO DEM",
          source: "DRISHTI + Copernicus 90m DEM"
        };
      }

      if (elevation > 12) {
        return {
          level: "LOW",
          ...EXPOSURE_LEVELS.LOW,
          evidence: `Topographic elevation (${elevation}m MSL) above regional baseline runoff thresholds`,
          provenance: "DERIVED • SOURCE: DRISHTI + OPEN-METEO DEM",
          source: "DRISHTI + Copernicus 90m DEM"
        };
      }
    }
  } catch {
    // If elevation service is unavailable, continue to fallback
  }

  // 3. Fallback when insufficient authoritative evidence exists: MUST BE UNKNOWN
  return {
    level: "UNKNOWN",
    ...EXPOSURE_LEVELS.UNKNOWN,
    evidence: "Direct CWC river gauge & inundation telemetry unavailable in browser session",
    provenance: "DERIVED • SOURCE: DRISHTI (EVIDENCE INSUFFICIENT)",
    source: "CWC / India-WRIS"
  };
}

export default {
  evaluateWaterExposure,
  EXPOSURE_LEVELS
};
