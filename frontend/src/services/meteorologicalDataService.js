/**
 * DRISHTI Unified Meteorological Data & Provenance Orchestration Layer
 * Stage 2B: Live / Model Meteorological Intelligence
 *
 * CORE PRINCIPLE:
 * DRISHTI must NEVER present model data as direct IMD observation.
 * Every meteorological value must have explicit provenance:
 * - OBSERVED: Official IMD Synoptic Weather Bulletins, Warnings, & INSAT-3DS/MOSDAC Satellite Products
 * - MODEL: Open-Meteo Numerical Weather Prediction (NWP) 10m Wind & Surface Telemetry
 * - DERIVED: DRISHTI Spatial System Distance & Haversine Proximity Calculation
 * - SIMULATED: Cyclone Remal (May 2024) Calibrated Historical Exercise
 *
 * STRICT PROVENANCE & TIMESTAMP RULES:
 * 1. Open-Meteo values are ALWAYS labeled MODEL (SOURCE: OPEN-METEO).
 * 2. NEVER label Open-Meteo values as IMD OBSERVED.
 * 3. Never invent current values or substitute fake values for missing fields.
 * 4. Separate DATA TIME from DRISHTI CHECKED TIME on all cards.
 * 5. Surface pressure and cyclone central pressure are explicitly kept separate.
 */

import { fetchIndiaMeteorology, calculateDistanceKm } from "./openMeteoService";
import { fetchActiveSynopticSystems } from "./synopticSystemService";
import { ACTIVE_EMERGENCY_ALERTS, ACTIVE_BULLETINS, SYSTEM_NOTIFICATIONS } from "./imdAlertService";
import { STATES_AND_UTS } from "../data/indiaGeography";
import { SATELLITE_PRODUCTS } from "./satelliteService";

export const PROVENANCE_LEVELS = {
  OBSERVED: "OBSERVED",
  MODEL: "MODEL",
  DERIVED: "DERIVED",
  SIMULATED: "SIMULATED"
};

/**
 * Returns dynamic live IST formatted timestamp strings
 */
export function getLiveISTTime(date = new Date()) {
  const day = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).toUpperCase();

  const time = date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const timeShort = date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });

  return {
    raw: date,
    formatted: `${day} • ${time} IST`,
    timeOnly: `${time} IST`,
    timeShort: `${timeShort} IST`,
    dateOnly: day
  };
}

/**
 * Normalizes all frontend meteorological information into ONE unified service schema.
 *
 * @param {string} operatingMode "NORMAL" | "DISASTER"
 * @param {object} activeScenario Current scenario metadata (e.g. Remal simulation)
 * @param {Array} infraList Critical infrastructure assets list
 */
export async function getNormalizedMeteorology(operatingMode = "NORMAL", activeScenario = null, infraList = []) {
  const istNow = getLiveISTTime();
  const checkedAtTime = istNow.formatted;

  // 1. Fetch current Open-Meteo numerical model weather for 36 States/UTs
  let rawWeather = null;
  let weatherAvailable = true;
  try {
    rawWeather = await fetchIndiaMeteorology();
    weatherAvailable = rawWeather?.success !== false;
  } catch (err) {
    console.warn("MeteorologicalDataService: Weather fetch failed:", err);
    weatherAvailable = false;
  }

  // 2. Fetch authoritative synoptic system intelligence from IMD
  let synopticReport = null;
  try {
    synopticReport = await fetchActiveSynopticSystems();
  } catch (err) {
    console.warn("MeteorologicalDataService: Synoptic system fetch failed:", err);
  }

  // Determine active system state with honest provenance
  // Never falsely label unverified data as LIVE or substitute hardcoded systems
  let activeSystem = null;
  const isSystemOfficiallyLive = synopticReport?.liveStatus === "LIVE" && synopticReport?.primarySystem;

  if (isSystemOfficiallyLive) {
    const sys = synopticReport.primarySystem;
    activeSystem = {
      hasActiveSystem: true,
      isAvailable: true,
      liveStatus: "LIVE",
      name: sys.name,
      classification: sys.classification,
      latitude: sys.latitude,
      longitude: sys.longitude,
      coordinatesFormatted: sys.coordinatesFormatted,
      centralPressureHpa: sys.pressureHpa,
      maxWindKmph: sys.maxWindKmph,
      gustKmph: sys.gustKmph,
      movementDescription: sys.movementDescription,
      observationTime: sys.observationTime,
      source: "IMD (OFFICIAL BULLETIN)",
      provenance: PROVENANCE_LEVELS.OBSERVED,
      checkedAt: checkedAtTime
    };
  } else {
    activeSystem = {
      hasActiveSystem: false,
      isAvailable: false,
      liveStatus: "SOURCE_UNAVAILABLE",
      name: "IMD SYSTEM FEED",
      statusText: "SOURCE UNAVAILABLE",
      classification: "SOURCE UNAVAILABLE",
      latitude: null,
      longitude: null,
      coordinatesFormatted: "NOT VERIFIED",
      latitudeFormatted: "NOT VERIFIED",
      longitudeFormatted: "NOT VERIFIED",
      centralPressureHpa: null,
      maxWindKmph: null,
      gustKmph: null,
      movementDescription: "NOT VERIFIED",
      observationTime: "NOT VERIFIED",
      source: "IMD (FEED RESTRICTED)",
      provenance: "UNAVAILABLE",
      checkedAt: checkedAtTime,
      corsBlocked: synopticReport?.corsBlocked || false,
      notice: "Direct IMD bulletin web access blocked by browser CORS. Official live system observation and coordinates cannot be verified client-side without an official proxy."
    };
  }

  // 3. Normalize all 36 States and UTs with preferred schema
  const verifiedSystemLat = (activeSystem?.hasActiveSystem && activeSystem?.latitude) ? activeSystem.latitude : null;
  const verifiedSystemLon = (activeSystem?.hasActiveSystem && activeSystem?.longitude) ? activeSystem.longitude : null;

  const normalizedStates = STATES_AND_UTS.map((state) => {
    const modelRecord = rawWeather?.states ? rawWeather.states[state.id] : null;

    // Derived distance to active system (Section 11)
    let distanceToSystemKm = null;
    let distanceProvenance = null;
    if (verifiedSystemLat != null && verifiedSystemLon != null) {
      distanceToSystemKm = calculateDistanceKm(
        state.center[0],
        state.center[1],
        verifiedSystemLat,
        verifiedSystemLon
      );
      distanceProvenance = PROVENANCE_LEVELS.DERIVED;
    }

    if (!modelRecord || !modelRecord.hasData) {
      return {
        location: state.name,
        stateId: state.id,
        region: state.region,
        capital: state.capital,
        latitude: state.center[0],
        longitude: state.center[1],

        temperatureC: null,
        humidityPct: null,
        pressureHpa: null,

        windSpeedKmph: null,
        windDirectionDeg: null,
        windDirectionLabel: null,
        windGustKmph: null,

        rainfallMm: null,
        precipitationProbabilityPct: null,

        observationTime: null,
        checkedAt: checkedAtTime,

        source: "OPEN-METEO (OFFLINE)",
        provenance: PROVENANCE_LEVELS.MODEL,

        hasData: false,
        status: "DATA UNAVAILABLE",
        distanceToSystemKm,
        distanceProvenance
      };
    }

    return {
      location: state.name,
      stateId: state.id,
      region: state.region,
      capital: state.capital,
      latitude: state.center[0],
      longitude: state.center[1],

      temperatureC: modelRecord.temperatureC,
      humidityPct: modelRecord.humidityPct,
      pressureHpa: modelRecord.pressureHpa,

      windSpeedKmph: modelRecord.windSpeedKmph,
      windDirectionDeg: modelRecord.windDirectionDeg,
      windDirectionLabel: modelRecord.windDirectionLabel,
      windGustKmph: modelRecord.windGustKmph,

      rainfallMm: modelRecord.rainfallMm,
      precipitationProbabilityPct: modelRecord.precipitationProbabilityPct,

      observationTime: modelRecord.observationTime,
      checkedAt: modelRecord.checkedAt || checkedAtTime,

      source: "OPEN-METEO",
      provenance: PROVENANCE_LEVELS.MODEL,

      hasData: true,
      status: "MODEL DATA",
      distanceToSystemKm,
      distanceProvenance
    };
  });

  // State map indexed by ID for fast O(1) lookups
  const statesById = {};
  normalizedStates.forEach((s) => {
    statesById[s.stateId] = s;
  });

  // 4. Normalized National Weather Summary Cards
  const validStates = normalizedStates.filter((s) => s.hasData);
  const rainingStates = validStates
    .filter((s) => s.rainfallMm != null && s.rainfallMm > 0)
    .sort((a, b) => (b.rainfallMm || 0) - (a.rainfallMm || 0));

  const maxWindState = validStates.slice().sort((a, b) => (b.windSpeedKmph || 0) - (a.windSpeedKmph || 0))[0] || null;
  const maxRainState = rainingStates[0] || null;

  let meanTempC = null;
  let meanPressureHpa = null;
  if (validStates.length > 0) {
    const tempSum = validStates.reduce((acc, s) => acc + (s.temperatureC || 0), 0);
    meanTempC = Math.round((tempSum / validStates.length) * 10) / 10;

    const validPressureStates = validStates.filter((s) => s.pressureHpa != null);
    if (validPressureStates.length > 0) {
      const pressSum = validPressureStates.reduce((acc, s) => acc + (s.pressureHpa || 0), 0);
      meanPressureHpa = Math.round(pressSum / validPressureStates.length);
    }
  }

  // 5. Normalized Surface Wind Telemetry & Vectors
  const wind = {
    points: rawWeather?.windPoints || [],
    maxWindState: maxWindState
      ? {
          location: maxWindState.location,
          speedKmph: maxWindState.windSpeedKmph,
          directionDeg: maxWindState.windDirectionDeg,
          directionLabel: maxWindState.windDirectionLabel,
          gustKmph: maxWindState.windGustKmph
        }
      : null,
    source: "OPEN-METEO",
    provenance: PROVENANCE_LEVELS.MODEL,
    observationTime: rawWeather?.modelDataTime || null,
    checkedAt: checkedAtTime,
    modelAvailable: weatherAvailable && (rawWeather?.windPoints?.length || 0) > 0
  };

  // 6. Normalized Precipitation Overview
  const rainfall = {
    topRainStates: rainingStates.slice(0, 5),
    maxRainState: maxRainState
      ? {
          location: maxRainState.location,
          rainfallMm: maxRainState.rainfallMm
        }
      : null,
    activeRainSectorsCount: rainingStates.length,
    source: "OPEN-METEO",
    provenance: PROVENANCE_LEVELS.MODEL,
    observationTime: rawWeather?.modelDataTime || null,
    checkedAt: checkedAtTime,
    modelAvailable: weatherAvailable
  };

  // 7. Surface Pressure Overview (Strictly separated from cyclone central pressure)
  const surfacePressure = {
    meanPressureHpa,
    unit: "hPa",
    type: "SURFACE PRESSURE",
    source: "OPEN-METEO",
    provenance: PROVENANCE_LEVELS.MODEL,
    observationTime: rawWeather?.modelDataTime || null,
    checkedAt: checkedAtTime,
    modelAvailable: weatherAvailable
  };

  // 8. 2m Temperature Overview
  const temperature = {
    meanTemperatureC: meanTempC,
    unit: "°C",
    source: "OPEN-METEO",
    provenance: PROVENANCE_LEVELS.MODEL,
    observationTime: rawWeather?.modelDataTime || null,
    checkedAt: checkedAtTime,
    modelAvailable: weatherAvailable
  };

  // 9. Warnings & Alerts (DEMO / SIMULATED from demonstration scenarios)
  const normalizedWarnings = ACTIVE_EMERGENCY_ALERTS.map((alert) => ({
    ...alert,
    provenance: alert.provenance || PROVENANCE_LEVELS.SIMULATED,
    issuedAt: alert.issuedAt || `${istNow.dateOnly} • ${istNow.timeShort}`
  }));

  // 10. Bulletins (DEMO / SIMULATED from demonstration scenarios)
  const normalizedBulletins = ACTIVE_BULLETINS.map((bulletin) => ({
    ...bulletin,
    provenance: bulletin.provenance || PROVENANCE_LEVELS.SIMULATED,
    issuedAt: bulletin.issuedAt || `${istNow.dateOnly} • ${istNow.timeShort}`
  }));

  // 11. System Notifications
  const notifications = (SYSTEM_NOTIFICATIONS || []).map((notif, idx) => ({
    ...notif,
    id: notif.id || `notif-${idx}`,
    time: notif.time || istNow.timeShort,
    isRead: Boolean(notif.isRead)
  }));

  // 12. Satellite Products (OBSERVED from IMD / INSAT-3DS)
  const satellite = {
    products: SATELLITE_PRODUCTS,
    activeProduct: SATELLITE_PRODUCTS[0],
    source: "IMD / INSAT-3DS",
    satelliteName: "INSAT-3DS",
    provenance: PROVENANCE_LEVELS.OBSERVED,
    checkedAt: checkedAtTime
  };

  // 13. Assemble and return unified DRISHTI schema
  return {
    timestamp: istNow,
    checkedAt: checkedAtTime,
    dataMode: operatingMode,
    isNormal: operatingMode === "NORMAL",
    weatherAvailable,

    // Core Meteorological Pillars (Sections 4, 5, 6, 7)
    wind,
    rainfall,
    surfacePressure,
    temperature,
    activeSystem,

    // 36 States and UTs Normalized Records (Section 8)
    states: normalizedStates,
    statesById,

    // Demonstration & Advisory Products
    warnings: normalizedWarnings,
    bulletins: normalizedBulletins,
    satellite,
    infrastructure: infraList,
    notifications,

    // Historical Scenario (SIMULATED - Section 16)
    scenario: activeScenario,

    // Backward-compatibility wrapper for existing subcomponents
    weather: {
      states: statesById,
      windPoints: wind.points,
      activeSystem,
      lastUpdatedFormatted: istNow.timeShort,
      modelAvailable: weatherAvailable
    },

    provenanceMatrix: {
      OBSERVED: "INSAT-3DS Satellite Imagery (Direct Live Hotlinks)",
      MODEL: "LIVE WEATHER — CURRENT MODEL DATA (Open-Meteo NWP)",
      DERIVED: "DRISHTI Spatial System Distance & Haversine Proximity Calculation",
      SIMULATED: "HISTORICAL SIMULATION — CYCLONE REMAL 2024 & DEMO METEOROLOGICAL DATA"
    }
  };
}
