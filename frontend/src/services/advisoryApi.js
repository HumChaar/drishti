/**
 * DRISHTI Service Layer - Decision Intelligence & Gemini Advisory Client
 * Connects to FastAPI backend (`/api/advisory/*`) with resilient local fallback.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== ""
    ? import.meta.env.VITE_API_BASE_URL
    : "http://localhost:8000"
).replace(/\/+$/, "");

export const advisoryApi = {
  /**
   * Request structured disaster advisory for a given district, timeline step, and language.
   */
  async generateAdvisory(districtId, stepId = "NOW", language = "en") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/advisory/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district_id: districtId,
            step_id: stepId,
            language: language,
            include_sar_perception: true
          })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend advisory unavailable, using local simulation:", err);
      }
    }

    // Local resilient fallback advisory
    return Promise.resolve({
      advisory_id: `adv-${districtId}-${stepId}-local`,
      district_id: districtId,
      district_name: districtId.replace(/^od_|^wb_/, "").toUpperCase(),
      language: language,
      risk_score: 84,
      risk_band: "EXTREME",
      mode: "DEMO_FALLBACK",
      advisory: {
        summary: `Severe Cyclonic Storm REMAL trajectory poses severe coastal surge and inundation hazards to this sector. Preparedness protocols must prioritize coastal buffer evacuation and port defense.`,
        risk_explanation: `High Risk Score driven by severe tidal surge overwash and satellite-detected flood inundation across coastal lowlands.`,
        priority_actions: [
          {
            action_id: "ACT-EVAC-01",
            priority: "CRITICAL",
            action_type: "Evacuation",
            title: "Mandatory Coastal Evacuation within 5km Hazard Belt",
            description: "Mobilize local revenue teams and police to safely transfer high-risk populations to designated Multi-Purpose Cyclone Shelters (MPCS).",
            target_agency: "Revenue & Disaster Management / District Police",
            rationale: "High storm surge and SAR-detected flood inundation threaten coastal mud structures."
          },
          {
            action_id: "ACT-PORT-02",
            priority: "CRITICAL",
            action_type: "Maritime Safety",
            title: "Enforce Anchorage Clearance & Harbor Berth Evacuation",
            description: "Suspend all commercial shipping, small craft operations, and cargo handling.",
            target_agency: "Port Authorities / State Maritime Board",
            rationale: "Gale winds exceeding 90 km/h and dangerous swells along open sea face."
          }
        ],
        affected_population: "Significant population exposed in coastal buffer zone.",
        infrastructure_concerns: [
          "Overwash hazard along coastal mud dykes and embankment sectors",
          "Power feeder lines exposed to wind-blown saline vegetation"
        ],
        confidence: "HIGH (Local Fallback Telemetry)",
        provenance: "DEMO / FALLBACK — AI ADVISORY UNAVAILABLE (Local SOP Mode)",
        requires_human_approval: true
      },
      review: {
        advisory_id: `adv-${districtId}-${stepId}-local`,
        status: "PENDING",
        reviewer_name: "Command Center Incident Commander",
        reviewer_notes: null,
        reviewed_at: null,
        modified_actions: null
      },
      decision_profile: {
        profile_id: `dip-${districtId}-local`,
        district_id: districtId,
        district_name: districtId,
        state: "Odisha",
        step_id: stepId,
        risk_score: 84,
        risk_band: "EXTREME",
        color: "#dc2626",
        surge_meters: 2.6,
        rain_mm_24h: 180,
        wind_kmh: 88,
        gust_kmh: 110,
        eye_distance_km: 185,
        flood_extent_pct: 88.5,
        flood_probability: 0.88,
        is_genuine_sar: false,
        total_population: 1500000,
        vulnerable_population: 400000,
        shelter_capacity: 80000,
        shelter_deficit: 320000,
        critical_assets_count: 3,
        critical_assets: ["Port Complex", "Grid Substation"],
        shelter_occupancy_pct: 65,
        evacuation_progress_pct: 70,
        contributing_factors_summary: { flood_hazard: 22.0, storm_surge: 18.0 },
        provenance_chain: { source: "DEMO_FALLBACK" },
        evidence_references: ["Fallback reference"],
        timestamp: new Date().toISOString()
      },
      generated_at: new Date().toISOString()
    });
  },

  /**
   * Submit human review action (APPROVE, REJECT, MODIFY)
   */
  async reviewAdvisory(advisoryId, action, reviewerName = "Incident Commander", notes = "", modifiedActions = null) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/advisory/${encodeURIComponent(advisoryId)}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: action,
            reviewer_name: reviewerName,
            reviewer_notes: notes,
            modified_actions: modifiedActions
          })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn("Backend review unavailable, applying local state:", err);
      }
    }

    // Local fallback update
    return Promise.resolve({
      advisory_id: advisoryId,
      review: {
        advisory_id: advisoryId,
        status: action.toUpperCase(),
        reviewer_name: reviewerName,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        modified_actions: modifiedActions
      }
    });
  }
};

export default advisoryApi;
