/**
 * DRISHTI Service Layer - Risk & Vulnerability API Client
 * Connects to FastAPI backend (`/api/risk/*`, `/api/infrastructure`, `/api/emergency/*`) with resilient fallback.
 */

import { COASTAL_DISTRICTS, DISTRICT_RISK_BY_TIMELINE } from "../data/districtRiskData.js";
import { INFRASTRUCTURE_ASSETS } from "../data/infrastructureData.js";
import { EMERGENCY_DIRECTIVES, PREPAREDNESS_METRICS } from "../data/emergencyActionsData.js";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ""
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:8000"
).replace(/\/+$/, "");

export const riskApi = {
  /**
   * Fetch district risk evaluation list for a given timeline step
   * @param {string} stepId - e.g. "T-24h", "NOW", "+12h"
   */
  async getDistrictRiskMatrix(stepId = "NOW") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/risk/districts?step_id=${encodeURIComponent(stepId)}`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local district risk matrix:", err);
      }
    }

    const riskByDistrict = DISTRICT_RISK_BY_TIMELINE[stepId] || DISTRICT_RISK_BY_TIMELINE["NOW"];

    const compiledDistricts = COASTAL_DISTRICTS.map((d) => {
      const riskData = riskByDistrict[d.id] || {
        riskScore: 40,
        riskBand: "MODERATE",
        color: "#ca8a04",
        surgeMeters: 1.0,
        rainMm24h: 50,
        windKmh: 50,
        gustKmh: 65,
        inundationProbPct: 20,
        evacuatedCount: 5000,
        evacuationTarget: 50000,
        shelterOccupancyPct: 10,
        primaryDrivers: ["Peripheral storm effects"]
      };

      return {
        ...d,
        risk: riskData
      };
    });

    compiledDistricts.sort((a, b) => b.risk.riskScore - a.risk.riskScore);

    return Promise.resolve({
      stepId,
      provenance: "SIMULATED_RISK_ENGINE",
      totalDistrictsMonitored: compiledDistricts.length,
      districts: compiledDistricts
    });
  },

  /**
   * Fetch single district detailed profile & risk
   */
  async getDistrictDetail(districtId, stepId = "NOW") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/risk/district/${encodeURIComponent(districtId)}?step_id=${encodeURIComponent(stepId)}`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local district detail:", err);
      }
    }

    const district = COASTAL_DISTRICTS.find((d) => d.id === districtId);
    if (!district) return Promise.reject(new Error(`District ${districtId} not found`));

    const riskByDistrict = DISTRICT_RISK_BY_TIMELINE[stepId] || DISTRICT_RISK_BY_TIMELINE["NOW"];
    const riskData = riskByDistrict[districtId];

    return Promise.resolve({
      ...district,
      risk: riskData
    });
  },

  /**
   * Fetch critical infrastructure exposure list
   */
  async getInfrastructureExposure() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/infrastructure`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local infrastructure data:", err);
      }
    }

    return Promise.resolve({
      provenance: "SIMULATED_INFRA_REGISTRY",
      totalAssets: INFRASTRUCTURE_ASSETS.length,
      assets: [...INFRASTRUCTURE_ASSETS]
    });
  },

  /**
   * Fetch emergency standard operating procedures & directives
   */
  async getEmergencyDirectives() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/emergency/directives`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, using local emergency directives:", err);
      }
    }

    return Promise.resolve({
      provenance: "SIMULATED_DISASTER_EOC",
      metrics: { ...PREPAREDNESS_METRICS },
      directives: [...EMERGENCY_DIRECTIVES]
    });
  },

  /**
   * Toggle or update directive status (mock operational commander action)
   */
  async updateDirectiveStatus(directiveId, newStatus) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/emergency/directive/${encodeURIComponent(directiveId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend unavailable, updating local directive state:", err);
      }
    }

    const directive = EMERGENCY_DIRECTIVES.find((d) => d.id === directiveId);
    if (directive) {
      directive.status = newStatus;
      if (newStatus === "COMPLETED") directive.progressPct = 100;
    }
    return Promise.resolve({
      success: true,
      updatedId: directiveId,
      newStatus
    });
  }
};

export default riskApi;
