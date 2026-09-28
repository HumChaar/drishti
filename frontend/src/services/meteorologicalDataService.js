/**
 * DRISHTI Unified Meteorological Data & Provenance Orchestration Layer
 * 
 * SOURCING CLASSIFICATIONS:
 * 1. OBSERVED: Official IMD Synoptic Weather Bulletins, Warnings, & MOSDAC Satellite Products
 * 2. MODEL: Open-Meteo Numerical Weather Prediction (NWP) 10m Wind & Surface Telemetry
 * 3. DERIVED: DRISHTI Spatial Depression Influence % & Multi-factor Synthesis
 * 4. SIMULATED: Cyclone Remal (May 2024) Calibrated Historical Exercise
 * 
 * STRICT PROVENANCE: Every meteorological metric has an explicit provenance tag.
 */

import { fetchIndiaMeteorology } from "./openMeteoService";
import { ACTIVE_EMERGENCY_ALERTS, ACTIVE_BULLETINS, SYSTEM_NOTIFICATIONS } from "./imdAlertService";
import { STATES_AND_UTS } from "../data/indiaGeography";
import { SATELLITE_PRODUCTS } from "../components/satellite/SatellitePanel";

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
 * Normalizes all available frontend data sources into a single unified schema.
 */
export async function getNormalizedMeteorology(operatingMode = "NORMAL", activeScenario = null, infraList = []) {
  const istNow = getLiveISTTime();

  // 1. Fetch or retrieve cached Open-Meteo model weather
  let rawWeather = null;
  let weatherAvailable = true;
  try {
    rawWeather = await fetchIndiaMeteorology();
  } catch (err) {
    console.warn("MeteorologicalDataService: Weather fetch failed:", err);
    weatherAvailable = false;
  }

  // 2. Active Synoptic Depression System with dynamic date & status validation
  let activeSystem = null;
  if (!weatherAvailable) {
    activeSystem = {
      hasActiveSystem: false,
      isAvailable: false,
      name: "CURRENT SYSTEM DATA UNAVAILABLE",
      shortName: "System Data Unavailable",
      status: "UNAVAILABLE",
      statusText: "CURRENT SYSTEM DATA UNAVAILABLE",
      details: "Synoptic tracking telemetry feed offline or unverified. Monitoring routine surface vectors.",
      provenance: PROVENANCE_LEVELS.OBSERVED,
      observedDate: istNow.dateOnly,
      updatedAt: istNow.timeShort
    };
  } else if (rawWeather?.activeSystem?.hasActiveSystem) {
    activeSystem = {
      ...rawWeather.activeSystem,
      statusText: "ACTIVE SYNOPTIC SYSTEM",
      observedDate: istNow.dateOnly,
      updatedAt: rawWeather?.lastUpdatedFormatted || istNow.timeShort,
      provenance: PROVENANCE_LEVELS.OBSERVED
    };
  } else {
    activeSystem = {
      hasActiveSystem: false,
      isAvailable: true,
      name: "NO ACTIVE SYNOPTIC SYSTEM",
      shortName: "No Active System",
      status: "QUIET",
      statusText: "NO ACTIVE SYNOPTIC SYSTEM",
      details: "No cyclonic storm or deep depression currently active across Indian oceanic or continental sectors.",
      provenance: PROVENANCE_LEVELS.OBSERVED,
      observedDate: istNow.dateOnly,
      updatedAt: istNow.timeShort
    };
  }

  // 3. Normalized 36 States and UTs
  const normalizedStates = STATES_AND_UTS.map((state) => {
    const weatherRecord = rawWeather?.states ? rawWeather.states[state.id] : null;

    if (!weatherRecord) {
      return {
        id: state.id,
        name: state.name,
        region: state.region,
        center: state.center,
        capital: state.capital,
        hasData: false,
        statusText: "NO CURRENT DATA",
        temperature: null,
        humidity: null,
        windSpeed: null,
        windDirection: null,
        windGust: null,
        rain: null,
        depressionInfluencePct: null,
        source: "Open-Meteo (Offline)",
        provenance: PROVENANCE_LEVELS.MODEL,
        updatedAt: null
      };
    }

    return {
      ...weatherRecord,
      hasData: true,
      statusText: "LIVE MODEL",
      provenance: PROVENANCE_LEVELS.MODEL,
      updatedAt: weatherRecord.updatedAt || istNow.timeShort
    };
  });

  // 4. Normalized Warnings & Alerts with IST timestamping
  const normalizedWarnings = ACTIVE_EMERGENCY_ALERTS.map((alert) => ({
    ...alert,
    provenance: alert.provenance || PROVENANCE_LEVELS.OBSERVED,
    issuedAt: alert.issuedAt || `${istNow.dateOnly} • ${istNow.timeShort}`
  }));

  // 5. Normalized Bulletins
  const normalizedBulletins = ACTIVE_BULLETINS.map((bulletin) => ({
    ...bulletin,
    provenance: bulletin.provenance || PROVENANCE_LEVELS.OBSERVED,
    issuedAt: bulletin.issuedAt || `${istNow.dateOnly} • ${istNow.timeShort}`
  }));

  // 6. Normalized Notifications with dynamic read state calculation
  const notifications = (SYSTEM_NOTIFICATIONS || []).map((notif, idx) => ({
    ...notif,
    id: notif.id || `notif-${idx}`,
    time: notif.time || istNow.timeShort,
    isRead: Boolean(notif.isRead)
  }));

  // 7. Dynamic Wind Telemetry
  const wind = {
    points: rawWeather?.windPoints || [],
    source: "OPEN-METEO",
    provenance: PROVENANCE_LEVELS.MODEL,
    lastUpdated: rawWeather?.lastUpdatedFormatted || istNow.timeShort,
    modelAvailable: weatherAvailable
  };

  // 8. Rainfall Overview
  const statesWithRain = normalizedStates
    .filter((s) => s.hasData && s.rain != null && s.rain > 0)
    .sort((a, b) => (b.rain || 0) - (a.rain || 0));

  const rainfall = {
    topRainStates: statesWithRain.slice(0, 5),
    maxRainState: statesWithRain[0] || null,
    provenance: PROVENANCE_LEVELS.MODEL
  };

  // 9. Satellite Availability
  const satellite = {
    products: SATELLITE_PRODUCTS,
    activeProduct: SATELLITE_PRODUCTS[0],
    source: "SPACE APPLICATIONS CENTRE • ISRO / MOSDAC",
    satelliteName: "INSAT-3DS",
    provenance: PROVENANCE_LEVELS.OBSERVED,
    lastCapture: istNow.timeShort
  };

  // 10. Unified Schema
  return {
    timestamp: istNow,
    dataMode: operatingMode,
    weatherAvailable,
    warnings: normalizedWarnings,
    bulletins: normalizedBulletins,
    systems: [activeSystem],
    activeSystem,
    wind,
    rainfall,
    weather: rawWeather,
    satellite,
    states: normalizedStates,
    infrastructure: infraList,
    notifications,
    scenario: activeScenario,
    provenanceMatrix: {
      OBSERVED: "IMD Authoritative Bulletins & MOSDAC Satellite",
      MODEL: "Open-Meteo High-Resolution Numerical Forecast",
      DERIVED: "DRISHTI Mathematical Depression Influence %",
      SIMULATED: "Cyclone Remal 2024 Calibrated Benchmark"
    }
  };
}
