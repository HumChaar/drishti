/**
 * DRISHTI Service Layer - Cyclone API Client
 *
 * NOTE FOR STAGE 2:
 * These functions currently resolve with structured local simulation data.
 * In Stage 2, replace mock handlers with fetch/axios calls to the FastAPI backend:
 * e.g. `const res = await fetch(`${API_BASE_URL}/cyclone/current?step=${stepId}`);`
 */

import { CYCLONE_METADATA, TIMELINE_STEPS, TIMELINE_SCENARIOS } from "../data/cycloneData.js";

// Placeholder for future backend URL configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const cycloneApi = {
  /**
   * Fetch system metadata and active cyclone scenario details
   */
  async getCycloneMetadata() {
    return Promise.resolve({
      ...CYCLONE_METADATA,
      fetchedAt: new Date().toISOString(),
      dataSource: "SIMULATED_LOCAL_REPLAY"
    });
  },

  /**
   * Get available timeline steps for replay/forecasting
   */
  async getTimelineSteps() {
    return Promise.resolve([...TIMELINE_STEPS]);
  },

  /**
   * Fetch cyclone state, track, forecast cone and wind radii for a given timeline step
   * @param {string} stepId - e.g. "T-24h", "NOW", "+12h"
   */
  async getScenarioByStep(stepId = "NOW") {
    const scenario = TIMELINE_SCENARIOS[stepId] || TIMELINE_SCENARIOS["NOW"];
    return Promise.resolve({
      success: true,
      data: scenario,
      metadata: {
        stormId: CYCLONE_METADATA.stormId,
        stormName: CYCLONE_METADATA.name,
        category: scenario.current.category,
        provenance: CYCLONE_METADATA.provenance,
        timestamp: scenario.current.timestamp
      }
    });
  },

  /**
   * Fetch full historical track points for path rendering
   */
  async getFullHistoricalTrack() {
    // Collect full past path up to current time
    const currentScenario = TIMELINE_SCENARIOS["NOW"];
    return Promise.resolve({
      track: currentScenario.pastTrack,
      totalPoints: currentScenario.pastTrack.length
    });
  }
};

export default cycloneApi;
