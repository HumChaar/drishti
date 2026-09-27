/**
 * DRISHTI Service Layer - Risk & Vulnerability API Client
 *
 * NOTE FOR STAGE 2:
 * In Stage 2, replace mock handlers with calls to FastAPI risk engine endpoints:
 * e.g. `const res = await fetch(`${API_BASE_URL}/risk/matrix?step=${stepId}`);`
 */

import { COASTAL_DISTRICTS, DISTRICT_RISK_BY_TIMELINE } from "../data/districtRiskData.js";
import { INFRASTRUCTURE_ASSETS } from "../data/infrastructureData.js";
import { EMERGENCY_DIRECTIVES, PREPAREDNESS_METRICS } from "../data/emergencyActionsData.js";

export const riskApi = {
  /**
   * Fetch district risk evaluation list for a given timeline step
   * @param {string} stepId - e.g. "T-24h", "NOW", "+12h"
   */
  async getDistrictRiskMatrix(stepId = "NOW") {
    const riskByDistrict = DISTRICT_RISK_BY_TIMELINE[stepId] || DISTRICT_RISK_BY_TIMELINE["NOW"];

    const compiledDistricts = COASTAL_DISTRICTS.map((d) => {
      const riskData = riskByDistrict[d.id] || {
        riskScore: 40,
        riskBand: "MODERATE",
        color: "#eab308",
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

    // Sort by riskScore descending
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
