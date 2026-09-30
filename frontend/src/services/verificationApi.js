/**
 * DRISHTI Verification API Client
 * Connects to the AI Flood Evidence Verification + Uncertainty Layer backend.
 *
 * All calls fail gracefully — never throw unhandled errors.
 * Returns structured mock responses when backend is unavailable.
 *
 * Governance:
 * - Never displays Gemini output as ground truth
 * - Always shows provenance labels
 * - Always shows "VERIFICATION" and "AI" badges clearly
 */

import { API_BASE_URL } from "./riskApi.js";

/**
 * Run the full verification pipeline for a risk zone.
 *
 * @param {Object} params
 * @param {string} params.eventId - e.g. 'CYCLONE_REMAL_2024'
 * @param {Object} params.roi - {min_lon, min_lat, max_lon, max_lat}
 * @param {number} params.riskScore - Deterministic risk score (0–100)
 * @param {string} [params.riskZoneId] - Optional district/zone ID
 * @param {boolean} [params.useSentinel2=true]
 * @param {boolean} [params.usePermanentWater=true]
 * @param {number} [params.floodPercentage]
 * @param {number} [params.floodProbability]
 * @param {number} [params.affectedPopulation]
 * @param {number} [params.affectedRoadKm]
 * @param {number} [params.affectedHospitals]
 * @returns {Promise<Object>} VerificationRunResponse
 */
export async function runVerification({
  eventId = "CYCLONE_REMAL_2024",
  roi,
  riskScore,
  riskZoneId = null,
  useSentinel2 = true,
  usePermanentWater = true,
  floodPercentage = null,
  floodProbability = null,
  affectedPopulation = null,
  affectedRoadKm = null,
  affectedHospitals = null,
} = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        roi,
        risk_score: riskScore,
        risk_zone_id: riskZoneId,
        use_sentinel2: useSentinel2,
        use_permanent_water: usePermanentWater,
        flood_percentage: floodPercentage,
        flood_probability: floodProbability,
        affected_population: affectedPopulation,
        affected_road_km: affectedRoadKm,
        affected_hospitals: affectedHospitals,
      }),
    });

    if (!response.ok) {
      console.warn("[VerificationAPI] Backend returned non-OK response:", response.status);
      return buildMockVerificationResponse(riskScore, "abstain");
    }

    return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Backend unavailable, using demo response:", err.message);
    return buildMockVerificationResponse(riskScore, "abstain");
  }
}

/**
 * Fetch the human review queue.
 * @param {string} [status] - Optional filter: PENDING | APPROVED | REJECTED | ESCALATED
 */
export async function getReviewQueue(status = null) {
  try {
    const url = `${API_BASE_URL}/api/verification/queue${status ? `?status=${status}` : ""}`;
    const response = await fetch(url);
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Review queue fetch failed:", err.message);
  }
  return [];
}

/**
 * Fetch a single review queue item.
 */
export async function getReviewItem(reviewId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/queue/${encodeURIComponent(reviewId)}`);
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Review item fetch failed:", err.message);
  }
  return null;
}

/**
 * Submit a human review decision.
 * @param {string} reviewId
 * @param {Object} decision - {action: 'APPROVE'|'REJECT'|'ESCALATE', reviewer_name, reviewer_note}
 */
export async function submitReviewDecision(reviewId, { action, reviewerName, reviewerNote } = {}) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verification/queue/${encodeURIComponent(reviewId)}/decision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewer_name: reviewerName,
          reviewer_note: reviewerNote,
        }),
      }
    );
    if (response.ok) return await response.json();
    console.warn("[VerificationAPI] Decision submission failed:", response.status);
  } catch (err) {
    console.warn("[VerificationAPI] Decision submission error:", err.message);
  }
  return null;
}

/**
 * Fetch the verification audit log.
 */
export async function getAuditLog(limit = 100) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/audit-log?limit=${limit}`);
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Audit log fetch failed:", err.message);
  }
  return [];
}

/**
 * Fetch verification layer status.
 */
export async function getVerificationStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/status`);
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Status fetch failed:", err.message);
  }
  return null;
}

/**
 * Fetch ranked Cyclone Remal verification zones.
 */
export async function getRemalZones() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/remal/zones`);
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Remal zones fetch failed:", err.message);
  }
  return [];
}

/**
 * Execute the complete Remal Golden Path demonstration.
 * @param {string} [zoneId='ALL'] - 'ALL' or specific zone ID
 */
export async function runRemalGoldenPath(zoneId = "ALL") {
  try {
    const response = await fetch(`${API_BASE_URL}/api/verification/remal/golden-path?zone_id=${encodeURIComponent(zoneId)}`, {
      method: "POST",
    });
    if (response.ok) return await response.json();
  } catch (err) {
    console.warn("[VerificationAPI] Remal golden path run failed:", err.message);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Demo/Fallback Mock Responses
// ---------------------------------------------------------------------------

/**
 * Deterministic mock verification response for demo mode.
 * Never invents real measurements or claims unavailable imagery.
 */
export function buildMockVerificationResponse(riskScore = 70, verdict = "abstain") {
  const adj = { agree: 0, partial: 5, disagree: 15, abstain: 10 }[verdict] ?? 10;
  const lower = Math.max(0, riskScore - adj);
  const upper = Math.min(100, riskScore + adj);
  const boundaries = [45, 65, 80].filter((b) => lower < b && b < upper);
  const requiresReview = boundaries.length > 0;

  return {
    verification: {
      verification_id: `ver_demo_${Date.now()}`,
      event_id: "CYCLONE_REMAL_2024",
      roi: { min_lon: 87.5, min_lat: 22.0, max_lon: 88.0, max_lat: 22.5 },
      timestamp: new Date().toISOString(),
      verdict: {
        verdict,
        failure_mode: verdict === "abstain" ? "insufficient_evidence" : "none",
        evidence_quality: verdict === "agree" ? "high" : "low",
        disagreement_level: verdict === "disagree" ? 0.75 : 0.0,
        reason:
          "[DEMO MODE] Verification service unavailable. Risk calculated from available deterministic evidence only.",
      },
      cloud_quality: {
        quality: "INSUFFICIENT",
        usable: false,
        provenance: "CACHED",
        note: "Demo mode: Sentinel-2 not retrieved. Cloud gate thresholds are MVP engineering defaults.",
      },
      permanent_water: {
        dataset: "JRC/GSW1_4/GlobalSurfaceWater",
        overlap_fraction: 0.0,
        is_flagged: false,
        provenance: "CACHED",
        note: "Demo mode: Permanent water check not available.",
      },
      sentinel2_available: false,
      sentinel2_scene_date: null,
      provenance: {
        segformer_prediction: "DERIVED",
        sentinel2_optical: "CACHED",
        gemini_verification: "DERIVED",
      },
      source_description:
        "[DEMO] Verification unavailable. Risk score calculated from available deterministic evidence.",
    },
    risk: {
      central_risk: riskScore,
      risk_band: getRiskBand(riskScore),
      uncertainty_adjustment: adj,
      risk_lower: lower,
      risk_upper: upper,
      risk_lower_band: getRiskBand(lower),
      risk_upper_band: getRiskBand(upper),
      band_boundaries_crossed: boundaries,
      requires_human_review: requiresReview,
      human_review_reason: requiresReview
        ? `Uncertainty interval [${lower}–${upper}] crosses risk-band boundary at ${boundaries.join(", ")}.`
        : null,
      formula: `central=${riskScore} ± ${adj} → [${lower}, ${upper}]`,
      policy_note: "MVP engineering baselines — not scientifically calibrated.",
    },
    human_review: {
      required: requiresReview,
      reason: requiresReview ? "Uncertainty crosses risk-band boundary." : "No band boundary crossed.",
      review_id: null,
      band_boundaries_crossed: boundaries,
    },
    provenance: {
      segformer_prediction: "DERIVED",
      gemini_verification: "DERIVED",
    },
    pipeline_note:
      "Drishti does not blindly trust a single AI flood prediction. It cross-checks model-derived evidence with independent observations.",
  };
}

/**
 * Helper: get risk band for 0–100 score (matches backend bands).
 */
export function getRiskBand(score) {
  if (score >= 80) return "EXTREME";
  if (score >= 65) return "HIGH";
  if (score >= 45) return "MODERATE";
  return "LOW";
}

export const RISK_BAND_COLORS = {
  EXTREME: { bg: "rgba(220,38,38,0.15)", border: "rgba(220,38,38,0.4)", text: "#f87171", dot: "#ef4444" },
  HIGH: { bg: "rgba(234,88,12,0.15)", border: "rgba(234,88,12,0.4)", text: "#fb923c", dot: "#f97316" },
  MODERATE: { bg: "rgba(202,138,4,0.15)", border: "rgba(202,138,4,0.4)", text: "#fbbf24", dot: "#eab308" },
  LOW: { bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.3)", text: "#4ade80", dot: "#22c55e" },
};

export const VERDICT_STYLES = {
  agree: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", text: "#4ade80", label: "AGREE" },
  partial: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.35)", text: "#fbbf24", label: "PARTIAL" },
  disagree: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#f87171", label: "DISAGREE" },
  abstain: { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", text: "#94a3b8", label: "ABSTAIN" },
};

export const QUALITY_STYLES = {
  CLEAR: { text: "#4ade80", label: "CLEAR" },
  PARTIAL: { text: "#fbbf24", label: "PARTIAL" },
  CLOUDY: { text: "#f87171", label: "CLOUDY" },
  INSUFFICIENT: { text: "#94a3b8", label: "INSUFFICIENT" },
  high: { text: "#4ade80", label: "HIGH" },
  moderate: { text: "#fbbf24", label: "MODERATE" },
  low: { text: "#f87171", label: "LOW" },
};
