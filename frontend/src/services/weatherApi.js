/**
 * DRISHTI Service Layer - Weather & Marine Observation API Client
 * Connects to FastAPI backend (`/api/weather/bulletin`) with resilient fallback.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const weatherApi = {
  /**
   * Fetch current marine weather bulletin & sea condition summary
   */
  async getMarineBulletin() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/weather/bulletin`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local marine bulletin:", err);
      }
    }

    return Promise.resolve({
      bulletinNo: "IMD-SEA-BOB-2024-44",
      issuedAt: "26 May 06:00 IST",
      provenance: "SIMULATED / HISTORICAL ARCHIVE",
      seaCondition: "Phenomenal to Very High over North & Adjoining Westcentral Bay of Bengal",
      significantWaveHeightMeters: 7.5,
      waveDirection: "South-Southeasterly",
      surfaceWaterTempC: 30.2,
      squallWarning: "Squally wind speed reaching 90-100 kmph gusting to 115 kmph prevailing over North Bay of Bengal",
      fishermenAdvisory: "Total suspension of fishing operations over North Bay of Bengal and along Odisha-West Bengal coasts."
    });
  }
};

export default weatherApi;
