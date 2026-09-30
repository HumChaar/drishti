/**
 * DRISHTI Terrain & Elevation Service
 *
 * Source: Open-Meteo High-Resolution Elevation API (90m Copernicus DEM)
 * Endpoint: https://api.open-meteo.com/v1/elevation
 *
 * PROVENANCE:
 * DERIVED
 * SOURCE: DRISHTI + ELEVATION DATA SOURCE (OPEN-METEO DEM)
 *
 * RULES:
 * - Do NOT use elevation as an independent "safe/unsafe" decision.
 * - Cache queries in memory to avoid repetitive queries.
 * - Always return honest values or null if unavailable.
 */

// In-memory elevation cache: key -> elevation in meters
const elevationCache = new Map();

/**
 * Fetch terrain elevation for given coordinates
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{ elevationMeters: number|null, provenance: string, source: string }>}
 */
export async function getElevation(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return { elevationMeters: null, provenance: "UNKNOWN", source: "NONE" };
  }

  const cacheKey = `${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)}`;
  if (elevationCache.has(cacheKey)) {
    return {
      elevationMeters: elevationCache.get(cacheKey),
      provenance: "DERIVED • SOURCE: DRISHTI + ELEVATION DATA SOURCE (OPEN-METEO DEM)",
      source: "Open-Meteo Elevation (Copernicus DEM 90m)"
    };
  }

  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Elevation API HTTP ${res.status}`);
    }

    const data = await res.json();
    const elev = Array.isArray(data.elevation) ? data.elevation[0] : (data.elevation ?? null);

    if (elev != null) {
      elevationCache.set(cacheKey, elev);
      // Evict oldest if cache grows over 300 entries
      if (elevationCache.size > 300) {
        const firstKey = elevationCache.keys().next().value;
        elevationCache.delete(firstKey);
      }
    }

    return {
      elevationMeters: elev,
      provenance: "DERIVED • SOURCE: DRISHTI + ELEVATION DATA SOURCE (OPEN-METEO DEM)",
      source: "Open-Meteo Elevation (Copernicus DEM 90m)"
    };
  } catch (err) {
    console.warn("Elevation query failed:", err);
    return {
      elevationMeters: null,
      provenance: "DERIVED • SOURCE: DRISHTI + ELEVATION DATA SOURCE (FAILED)",
      source: "Open-Meteo Elevation (Copernicus DEM 90m)"
    };
  }
}

export default {
  getElevation
};
