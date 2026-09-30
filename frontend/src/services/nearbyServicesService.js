/**
 * DRISHTI Nearby Response Services Intelligence
 *
 * Source: OpenStreetMap (OSM) via Overpass API
 * Mirrors:
 * - https://overpass-api.de/api/interpreter
 * - https://lz4.overpass-api.de/api/interpreter
 *
 * PROVENANCE:
 * OPENSTREETMAP INFRASTRUCTURE
 *
 * DATA INTEGRITY RULES:
 * 1. ONLY real returned OSM objects.
 * 2. NEVER fabricate facilities, names, or coordinates.
 * 3. NEVER query continuously; query on-demand only when user requests.
 * 4. Bound query radius (3–5 km) to keep payload small.
 * 5. In-memory caching with 5-minute TTL.
 */

import { evaluateWaterExposure } from "./waterExposureService.js";

const facilitiesCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

function categorizeAmenity(tags = {}) {
  const amenity = tags.amenity || "";
  const building = tags.building || "";
  const emergency = tags.emergency || "";

  if (["hospital", "clinic", "pharmacy", "doctors"].includes(amenity)) {
    return {
      category: "HOSPITAL",
      label: "Hospitals & Medical",
      icon: "🏥"
    };
  }
  if (["shelter"].includes(amenity) || ["public", "civic"].includes(building) || tags.social_facility === "shelter") {
    return {
      category: "SHELTER",
      label: "Shelters & Relief",
      icon: "🛟"
    };
  }
  if (amenity === "fire_station") {
    return {
      category: "FIRE",
      label: "Fire Station",
      icon: "🚒"
    };
  }
  if (amenity === "police" || emergency === "ambulance_station") {
    return {
      category: "POLICE",
      label: "Police & Emergency",
      icon: "👮"
    };
  }

  return {
    category: "EMERGENCY",
    label: "Emergency Facility",
    icon: "⚓"
  };
}

/**
 * Fetch real nearby response facilities from OpenStreetMap via Overpass API
 *
 * @param {Object} options
 * @param {number} options.latitude
 * @param {number} options.longitude
 * @param {number} [options.radiusMeters=5000]
 * @param {Object} [options.context={}]
 * @returns {Promise<Object>}
 */
export async function fetchNearbyFacilities({
  latitude,
  longitude,
  radiusMeters = 5000,
  context = {}
}) {
  if (latitude == null || longitude == null) {
    throw new Error("Latitude and longitude required to query nearby response services.");
  }

  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${radiusMeters}`;
  const now = Date.now();

  if (facilitiesCache.has(cacheKey)) {
    const cached = facilitiesCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const query = `[out:json][timeout:12];
(
  node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
  node["amenity"="clinic"](around:${radiusMeters},${latitude},${longitude});
  node["amenity"="shelter"](around:${radiusMeters},${latitude},${longitude});
  node["amenity"="fire_station"](around:${radiusMeters},${latitude},${longitude});
  node["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
  node["emergency"="ambulance_station"](around:${radiusMeters},${latitude},${longitude});
);
out 40;`;

  const postData = "data=" + encodeURIComponent(query);
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter"
  ];

  let rawElements = [];
  let fetchedSuccessfully = false;

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json"
        },
        body: postData,
        signal: controller.signal
      });

      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        rawElements = json.elements || [];
        fetchedSuccessfully = true;
        break;
      }
    } catch {
      // Try next mirror
    }
  }

  if (!fetchedSuccessfully) {
    return {
      status: "SOURCE_UNAVAILABLE",
      error: "Overpass API temporarily unreachable or timed out.",
      facilities: [],
      hospitalsCount: 0,
      sheltersCount: 0,
      emergencyCount: 0,
      totalCount: 0,
      checkedAt: new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      }) + " IST"
    };
  }

  const checkedAt = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }) + " IST";

  // Standardize real facilities without fabricating
  const facilitiesPromises = rawElements
    .filter((el) => el.lat != null && el.lon != null)
    .map(async (el) => {
      const tags = el.tags || {};
      const catMeta = categorizeAmenity(tags);
      const name = tags.name || tags["name:en"] || `${catMeta.label} (${tags.amenity || "OSM Facility"})`;
      const distanceKm = calculateHaversineKm(latitude, longitude, el.lat, el.lon);

      // Evaluate water exposure with strict integrity rules
      const waterExposure = await evaluateWaterExposure(
        { lat: el.lat, lon: el.lon, name, category: catMeta.category },
        context
      );

      return {
        id: `osm-${el.type || "node"}-${el.id}`,
        osmId: el.id,
        name,
        category: catMeta.category,
        categoryLabel: catMeta.label,
        categoryIcon: catMeta.icon,
        lat: el.lat,
        lon: el.lon,
        distanceKm,
        distanceFormatted: `${distanceKm} km`,
        phone: tags.phone || tags["contact:phone"] || null,
        operator: tags.operator || null,
        emergency: tags.emergency || null,
        waterExposure,
        source: "OpenStreetMap",
        provenance: "OPENSTREETMAP INFRASTRUCTURE",
        lastChecked: checkedAt
      };
    });

  const facilities = (await Promise.all(facilitiesPromises)).sort(
    (a, b) => a.distanceKm - b.distanceKm
  );

  const hospitalsCount = facilities.filter((f) => f.category === "HOSPITAL").length;
  const sheltersCount = facilities.filter((f) => f.category === "SHELTER").length;
  const emergencyCount = facilities.filter((f) => ["FIRE", "POLICE", "EMERGENCY"].includes(f.category)).length;

  const result = {
    status: "SUCCESS",
    facilities,
    hospitalsCount,
    sheltersCount,
    emergencyCount,
    totalCount: facilities.length,
    checkedAt,
    userLocation: { lat: latitude, lon: longitude },
    source: "OpenStreetMap (Overpass API)",
    provenance: "OPENSTREETMAP INFRASTRUCTURE"
  };

  facilitiesCache.set(cacheKey, { timestamp: now, data: result });
  return result;
}

export default {
  fetchNearbyFacilities
};
