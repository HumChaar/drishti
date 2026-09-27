/**
 * DRISHTI Service Layer - Cyclone API Client
 * Connects to FastAPI backend (`/api/cyclone`) with local simulation fallback.
 */

import { CYCLONE_METADATA, TIMELINE_STEPS, TIMELINE_SCENARIOS } from "../data/cycloneData.js";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const cycloneApi = {
  /**
   * Fetch active cyclone metadata
   */
  async getCycloneMetadata() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cyclone`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local cyclone metadata:", err);
      }
    }
    return Promise.resolve({
      ...CYCLONE_METADATA,
      fetchedAt: new Date().toISOString(),
      dataSource: "LOCAL_SIMULATION_FALLBACK"
    });
  },

  /**
   * Get available timeline steps for temporal forecasting
   */
  async getTimelineSteps() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cyclone/timeline`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local timeline steps:", err);
      }
    }
    return Promise.resolve([...TIMELINE_STEPS]);
  },

  /**
   * Fetch cyclone state, track, forecast cone and wind radii for a given timeline step
   * @param {string} stepId - e.g. "T-24h", "NOW", "+12h"
   */
  async getScenarioByStep(stepId = "NOW") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cyclone/scenario/${encodeURIComponent(stepId)}`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local scenario data:", err);
      }
    }
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
    const currentScenario = TIMELINE_SCENARIOS["NOW"];
    return Promise.resolve({
      track: currentScenario.pastTrack,
      totalPoints: currentScenario.pastTrack.length
    });
  }
};

export default cycloneApi;
