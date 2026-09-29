/**
 * DRISHTI Open-Meteo Weather Integration Service
 *
 * SOURCING CLASSIFICATION: CURRENT MODEL DATA (SOURCE: OPEN-METEO)
 * PROVENANCE: MODEL
 *
 * Fetches batch current numerical model telemetry for all 36 Indian States & UTs:
 * - temperature_2m (°C)
 * - relative_humidity_2m (%)
 * - surface_pressure (hPa)
 * - precipitation (mm)
 * - wind_speed_10m (km/h)
 * - wind_direction_10m (degrees)
 * - wind_gusts_10m (km/h)
 *
 * STRICT PROVENANCE RULES:
 * 1. Open-Meteo values are ALWAYS labeled MODEL (Source: OPEN-METEO).
 * 2. NEVER label Open-Meteo values as IMD OBSERVED.
 * 3. Never invent or hard-code current weather numbers when API is offline.
 * 4. Stamped with genuine Open-Meteo model run time and DRISHTI checked time.
 */

import { STATES_AND_UTS } from "../data/indiaGeography";

// In-memory cache to prevent excessive requests (10-minute TTL)
let cachedWeatherData = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Converts wind direction in degrees (0–360) to 16-point compass label.
 */
export function getWindCompassLabel(degrees) {
  if (degrees == null || isNaN(degrees)) return null;
  const val = Math.round(degrees / 22.5) % 16;
  const compassDirections = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];
  return compassDirections[val] || null;
}

/**
 * Converts an Open-Meteo ISO time string (e.g. "2026-09-29T08:45") to IST format.
 */
export function formatOpenMeteoTimeToIST(isoString) {
  if (!isoString) return null;
  try {
    // Open-Meteo time is UTC
    const date = new Date(isoString.endsWith("Z") ? isoString : `${isoString}Z`);
    if (isNaN(date.getTime())) return null;

    const dateFormatted = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    });

    const timeFormatted = date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });

    return `${dateFormatted} • ${timeFormatted} IST`;
  } catch {
    return null;
  }
}

/**
 * Returns current IST time string for checked-at timestamp.
 */
export function getCurrentISTTimestamp() {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });

  const timeFormatted = now.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${dateFormatted} • ${timeFormatted} IST`;
}

/**
 * Calculates Haversine distance in km between two lat/lon coordinates.
 * Marked explicitly as DERIVED (Source: DRISHTI calculation).
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Primary function to fetch current Open-Meteo numerical model observations
 * for all 36 Indian States & UTs.
 *
 * Never substitutes fake live numbers if API is unreachable.
 */
export async function fetchIndiaMeteorology(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedWeatherData && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedWeatherData;
  }

  const checkedAtTime = getCurrentISTTimestamp();

  try {
    const latitudes = STATES_AND_UTS.map((s) => s.center[0]).join(",");
    const longitudes = STATES_AND_UTS.map((s) => s.center[1]).join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned HTTP status ${response.status}`);
    }

    const jsonList = await response.json();
    const resultsArray = Array.isArray(jsonList) ? jsonList : [jsonList];

    const stateMeteorologyMap = {};
    const windGridPoints = [];
    let validTempSum = 0;
    let validTempCount = 0;
    let maxWindState = null;
    let maxRainState = null;
    let validPressureSum = 0;
    let validPressureCount = 0;
    let modelDataTime = null;

    STATES_AND_UTS.forEach((state, index) => {
      const currentData = resultsArray[index]?.current || null;

      if (!currentData) {
        stateMeteorologyMap[state.id] = {
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
          source: "OPEN-METEO",
          provenance: "MODEL",
          hasData: false,
          status: "DATA UNAVAILABLE"
        };
        return;
      }

      if (!modelDataTime && currentData.time) {
        modelDataTime = formatOpenMeteoTimeToIST(currentData.time);
      }

      const temp = currentData.temperature_2m != null ? Math.round(currentData.temperature_2m * 10) / 10 : null;
      const humidity = currentData.relative_humidity_2m != null ? Math.round(currentData.relative_humidity_2m) : null;
      const pressure = currentData.surface_pressure != null ? Math.round(currentData.surface_pressure) : null;
      const rain = currentData.precipitation != null ? Math.round(currentData.precipitation * 10) / 10 : null;
      const windSpeed = currentData.wind_speed_10m != null ? Math.round(currentData.wind_speed_10m) : null;
      const windDir = currentData.wind_direction_10m != null ? Math.round(currentData.wind_direction_10m) : null;
      const windGust = currentData.wind_gusts_10m != null ? Math.round(currentData.wind_gusts_10m) : null;
      const dirLabel = getWindCompassLabel(windDir);
      const obsTime = formatOpenMeteoTimeToIST(currentData.time) || modelDataTime;

      if (temp != null) {
        validTempSum += temp;
        validTempCount++;
      }
      if (pressure != null) {
        validPressureSum += pressure;
        validPressureCount++;
      }
      if (windSpeed != null && (!maxWindState || windSpeed > (maxWindState.windSpeedKmph || 0))) {
        maxWindState = { name: state.name, windSpeedKmph: windSpeed, windDirectionLabel: dirLabel, windDirectionDeg: windDir };
      }
      if (rain != null && rain > 0 && (!maxRainState || rain > (maxRainState.rainfallMm || 0))) {
        maxRainState = { name: state.name, rainfallMm: rain };
      }

      const stateRecord = {
        location: state.name,
        stateId: state.id,
        region: state.region,
        capital: state.capital,
        latitude: state.center[0],
        longitude: state.center[1],
        temperatureC: temp,
        humidityPct: humidity,
        pressureHpa: pressure,
        windSpeedKmph: windSpeed,
        windDirectionDeg: windDir,
        windDirectionLabel: dirLabel,
        windGustKmph: windGust,
        rainfallMm: rain,
        precipitationProbabilityPct: null,
        observationTime: obsTime,
        checkedAt: checkedAtTime,
        source: "OPEN-METEO",
        provenance: "MODEL",
        hasData: true,
        status: "MODEL DATA"
      };

      stateMeteorologyMap[state.id] = stateRecord;

      if (windSpeed != null && windDir != null) {
        windGridPoints.push({
          lat: state.center[0],
          lon: state.center[1],
          name: state.name,
          speed: windSpeed,
          direction: windDir,
          gust: windGust || windSpeed
        });
      }
    });

    cachedWeatherData = {
      success: true,
      states: stateMeteorologyMap,
      windPoints: windGridPoints,
      nationalSummary: {
        meanTemperatureC: validTempCount > 0 ? Math.round((validTempSum / validTempCount) * 10) / 10 : null,
        meanPressureHpa: validPressureCount > 0 ? Math.round(validPressureSum / validPressureCount) : null,
        maxWindState,
        maxRainState
      },
      modelDataTime: modelDataTime || checkedAtTime,
      checkedAt: checkedAtTime,
      source: "OPEN-METEO",
      provenance: "MODEL",
      modelAvailable: true
    };

    lastFetchTimestamp = now;
    return cachedWeatherData;
  } catch (err) {
    console.warn("Open-Meteo API fetch unavailable:", err.message);

    // Honest unavailable state — zero fake fallback numbers
    const stateMeteorologyMap = {};
    STATES_AND_UTS.forEach((state) => {
      stateMeteorologyMap[state.id] = {
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
        provenance: "MODEL",
        hasData: false,
        status: "DATA UNAVAILABLE"
      };
    });

    return {
      success: false,
      error: err.message,
      states: stateMeteorologyMap,
      windPoints: [], // Empty: do NOT generate random or fake vectors
      nationalSummary: {
        meanTemperatureC: null,
        meanPressureHpa: null,
        maxWindState: null,
        maxRainState: null
      },
      modelDataTime: null,
      checkedAt: checkedAtTime,
      source: "OPEN-METEO",
      provenance: "MODEL",
      modelAvailable: false
    };
  }
}
