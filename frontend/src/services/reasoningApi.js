/**
 * DRISHTI Service Layer - Gemini Reasoning API Client (Stage 6)
 * Connects to FastAPI backend (`/api/reasoning/*`) with resilient client-side fallback.
 * PROVENANCE: Strictly annotated as [GEMINI REASONING] or [MOCK GEMINI REASONING].
 * Gemini strictly synthesizes verified risk & decision intelligence; it does NOT calculate or alter risk.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ""
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:8000"
).replace(/\/+$/, "");

export const reasoningApi = {
  /**
   * Fetch Gemini Reasoning layer status and governance flags
   */
  async getStatus() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reasoning/status`);
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend reasoning status unavailable:", err);
      }
    }
    return {
      status: "ready",
      configured: false,
      model: "mock-gemini-2.0-flash",
      mode: "mock",
      governance: {
        risk_calculation_permitted: false,
        risk_modification_permitted: false,
        autonomous_execution_permitted: false,
        human_approval_mandatory: true
      }
    };
  },

  /**
   * Fetch grounded Gemini advisory for a specific district
   * @param {string} districtId - e.g. "wb_s24parganas", "od_balasore"
   * @param {string} stepId - timeline step, e.g. "NOW", "+12h"
   */
  async getDistrictAdvisory(districtId = "od_balasore", stepId = "NOW") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/reasoning/advisory/${encodeURIComponent(districtId)}?step_id=${encodeURIComponent(stepId)}`
        );
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend reasoning advisory unavailable:", err);
      }
    }

    // Deterministic fallback mock advisory
    return {
      district_id: districtId,
      headline: "Extreme flood and cyclone risk requires immediate preparedness.",
      situation_summary: `${districtId} is currently classified under elevated risk with composite threat driven by storm surge and flood inundation.`,
      key_risk_drivers: [
        "Flood inundation",
        "Storm surge",
        "Population exposure",
        "Shelter deficit"
      ],
      exposure_summary: "High population exposure in coastal lowland sectors with shelter capacity constraints.",
      recommended_actions: [
        "Execute immediate coastal evacuation within 5km hazard belt.",
        "Pre-position relief rations and emergency medical supplies.",
        "Suspend non-essential maritime transit and secure harbor craft."
      ],
      uncertainty_notes: "Satellite SAR water masking subject to speckle and cloud/shadow artifacts. Wind track confidence decreases beyond +24h forecast window.",
      evidence_references: [
        "SegFormer Flood Perception Mask (confidence 0.88)",
        "IMD Track & Surge Inundation Model"
      ],
      risk_score: 86.0,
      risk_band: "EXTREME",
      decision_ids: ["EVACUATION_RECOMMENDATION", "RELIEF_PREPOSITIONING"],
      requires_human_approval: true,
      provenance: "[MOCK GEMINI REASONING] Grounded Synthetic Advisory",
      generated_at: new Date().toISOString(),
      model: "mock-gemini-2.0-flash",
      is_mock: true
    };
  },

  /**
   * Generate advisory from verified input request
   * @param {Object} requestData
   */
  async generateAdvisory(requestData) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/reasoning/advisory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend generate advisory error:", err);
      }
    }
    return this.getDistrictAdvisory(
      requestData?.district_id || "od_balasore",
      requestData?.scenario_or_step_id || "NOW"
    );
  }
};

export default reasoningApi;
