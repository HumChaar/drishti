/**
 * DRISHTI Lightweight Road Routing Service
 *
 * Engine: Project OSRM (Open Source Routing Machine) Public Routing API
 * Endpoint: https://router.project-osrm.org/route/v1/driving/
 *
 * PROVENANCE:
 * ROUTING: OSRM (OPEN SOURCE ROUTING MACHINE)
 *
 * CONSTRAINTS:
 * - Zero bundled routing engine or offline routing data (preserves <512MB RAM constraint).
 * - Zero heavy external GIS packages.
 * - In-memory caching to minimize external public API load.
 * - Returns road geometry directly compatible with Leaflet Polyline and GeoJSON layers.
 */

const routeCache = new Map();

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(totalSeconds) {
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours} hr ${mins} min`;
}

/**
 * Haversine straight-line distance fallback (in km)
 */
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Calculate road route between origin and destination coordinates
 *
 * @param {Object} origin - { lat, lon }
 * @param {Object} destination - { lat, lon, name }
 * @returns {Promise<Object>} Route details with Leaflet-ready coordinates
 */
export async function calculateRoute(origin, destination) {
  if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
    throw new Error("Invalid origin or destination coordinates for routing");
  }

  const cacheKey = `${origin.lat.toFixed(4)},${origin.lon.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const originLon = Number(origin.lon).toFixed(5);
  const originLat = Number(origin.lat).toFixed(5);
  const destLon = Number(destination.lon).toFixed(5);
  const destLat = Number(destination.lat).toFixed(5);

  const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`OSRM API responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No routable road path found between locations");
    }

    const primaryRoute = data.routes[0];
    const distanceKm = Number((primaryRoute.distance / 1000).toFixed(1));
    const durationMinutes = Math.round(primaryRoute.duration / 60);

    // OSRM returns GeoJSON coordinates as [lon, lat]. Convert to Leaflet [lat, lon]
    const leafletCoords = (primaryRoute.geometry?.coordinates || []).map(
      ([lon, lat]) => [lat, lon]
    );

    const result = {
      success: true,
      distanceKm,
      distanceFormatted: `${distanceKm} km`,
      durationMinutes,
      durationFormatted: formatDuration(primaryRoute.duration),
      coordinates: leafletCoords,
      geoJsonGeometry: primaryRoute.geometry,
      destinationName: destination.name || "Target Facility",
      source: "OSRM Public Road Network",
      provenance: "ROUTING: OSRM (OPEN SOURCE ROUTING MACHINE)",
      isFallback: false
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("OSRM routing request failed, computing geometric estimate:", err.message);

    // Resilient fallback: Haversine distance with straight-line vector
    const straightDistKm = calculateHaversineKm(origin.lat, origin.lon, destination.lat, destination.lon);
    const estimatedMinutes = Math.max(3, Math.round((straightDistKm / 25) * 60)); // Assumes 25 km/h urban disaster speed

    return {
      success: true,
      distanceKm: straightDistKm,
      distanceFormatted: `${straightDistKm} km (approx)`,
      durationMinutes: estimatedMinutes,
      durationFormatted: `~${estimatedMinutes} min`,
      coordinates: [
        [origin.lat, origin.lon],
        [destination.lat, destination.lon]
      ],
      destinationName: destination.name || "Target Facility",
      source: "DRISHTI Haversine Geodesic (OSRM Network Offline)",
      provenance: "DERIVED • STRAIGHT-LINE PROXIMITY ESTIMATE",
      isFallback: true
    };
  }
}

export default {
  calculateRoute
};
