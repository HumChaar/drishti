/**
 * DRISHTI Service Layer - Weather & Marine Observation API Client
 *
 * NOTE FOR STAGE 2:
 * In Stage 2, replace mock handlers with calls to FastAPI meteorological ingestion endpoints:
 * e.g. `const res = await fetch(`${API_BASE_URL}/weather/marine-bulletin`);`
 */

export const weatherApi = {
  /**
   * Fetch current marine weather bulletin & sea condition summary
   */
  async getMarineBulletin() {
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
  },

  /**
   * Fetch station automated weather observation
   * @param {string} stationCode
   */
  async getStationWeather(stationCode = "PARADIP") {
    const stations = {
      PARADIP: {
        stationName: "Paradip Port Coastal Observatory",
        pressureHpa: 984.2,
        sustainedWindKmh: 92,
        peakGustKmh: 118,
        windDirDeg: 70,
        tempC: 27.4,
        humidityPct: 96,
        rainfallAccumMm: 142.5
      },
      CHANDIPUR: {
        stationName: "Chandipur Coastal Station",
        pressureHpa: 988.6,
        sustainedWindKmh: 74,
        peakGustKmh: 95,
        windDirDeg: 80,
        tempC: 26.8,
        humidityPct: 94,
        rainfallAccumMm: 98.0
      },
      PURI: {
        stationName: "Puri Beach IMD Observatory",
        pressureHpa: 994.0,
        sustainedWindKmh: 55,
        peakGustKmh: 70,
        windDirDeg: 120,
        tempC: 28.5,
        humidityPct: 90,
        rainfallAccumMm: 45.2
      }
    };

    return Promise.resolve(stations[stationCode] || stations["PARADIP"]);
  }
};

export default weatherApi;
