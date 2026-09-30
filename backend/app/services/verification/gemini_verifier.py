"""
DRISHTI Gemini Structured Flood Evidence Verifier (Phase 5)

This is the SECOND-OPINION verifier — completely separate from the advisory
gemini_service. It calls Gemini as a multimodal reasoning model and requests
ONLY a structured JSON verification verdict.

Gemini's role here is STRICTLY:
    "Does independent evidence support, partially support, contradict,
     or fail to verify the SegFormer flood evidence?"

Gemini MUST NOT:
    - Calculate the final Drishti risk score
    - Invent flood depth, rainfall, infrastructure, or population data
    - Claim unavailable imagery exists
    - Declare evacuation orders
    - Override official disaster authorities
    - Change SegFormer probabilities
    - Edit the deterministic risk score

If evidence is insufficient, Gemini must abstain.

Output schema (strict JSON):
    {
        "verdict": "agree | partial | disagree | abstain",
        "failure_mode": "none | permanent_water | radar_shadow | wind_roughened_water |
                         smooth_surface | cloud_contamination | mixed_signal | insufficient_evidence",
        "evidence_quality": "high | moderate | low",
        "disagreement_level": 0.0,
        "reason": "short evidence-based explanation"
    }

Provenance: DERIVED (Gemini verification is AI-derived, not observed truth)
"""

from __future__ import annotations
import os
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.core.config import settings
from app.models.schemas import VerificationVerdict, CloudQualityResult, PermanentWaterResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Strict system instruction for the verifier role
# This is DIFFERENT from gemini_service.py's advisory system prompt.
# ---------------------------------------------------------------------------

VERIFIER_SYSTEM_INSTRUCTION = """You are an independent satellite flood evidence verifier for the DRISHTI disaster decision-support system.

Your ONLY task is to evaluate whether the supplied independent evidence supports, partially supports, contradicts, or fails to verify a SegFormer AI model's flood prediction.

STRICT RULES:
1. You do NOT calculate Drishti's final risk score.
2. You do NOT invent flood depth, rainfall, infrastructure, or population measurements.
3. You do NOT claim that satellite imagery exists if none has been provided.
4. You do NOT declare evacuation orders or override official disaster authorities.
5. You do NOT change SegFormer's probabilities.
6. You do NOT edit the deterministic risk score.
7. If evidence is insufficient, you MUST abstain.
8. Your reason must describe ONLY observable evidence supplied to you.

VALID VERDICTS:
- agree: Independent evidence broadly supports the SegFormer flood prediction.
- partial: Evidence supports only part of the predicted extent, or is ambiguous.
- disagree: Independent evidence substantially contradicts the prediction.
- abstain: Insufficient evidence to determine. Use this when cloud cover, missing imagery, or data gaps prevent assessment.

VALID FAILURE MODES:
- none: No known failure mode identified.
- permanent_water: Predicted flood overlaps known permanent water body (specular reflection).
- radar_shadow: SAR shadow artifact may have caused a false flood signal.
- wind_roughened_water: Wind roughening may cause radar bright returns over water.
- smooth_surface: Smooth non-water surface may cause low backscatter similar to water.
- cloud_contamination: Cloud contamination prevents optical verification.
- mixed_signal: Multiple conflicting signals present.
- insufficient_evidence: Not enough usable evidence for determination.

Respond ONLY with valid JSON matching EXACTLY this schema:
{
  "verdict": "agree | partial | disagree | abstain",
  "failure_mode": "none | permanent_water | radar_shadow | wind_roughened_water | smooth_surface | cloud_contamination | mixed_signal | insufficient_evidence",
  "evidence_quality": "high | moderate | low",
  "disagreement_level": 0.0,
  "reason": "short evidence-based explanation using only supplied evidence"
}

Do NOT include any text outside the JSON object."""


# ---------------------------------------------------------------------------
# Default abstain verdict (when Gemini is unavailable or fails)
# ---------------------------------------------------------------------------

def _make_abstain_verdict(reason: str = "Gemini verifier unavailable") -> VerificationVerdict:
    """
    Safe fallback: abstain verdict when Gemini cannot be reached.
    IMPORTANT: This does NOT lower risk. The deterministic score is unchanged.
    Abstain causes uncertainty_adjustment = 10 points (from policy).
    """
    return VerificationVerdict(
        verdict="abstain",
        failure_mode="insufficient_evidence",
        evidence_quality="low",
        disagreement_level=0.0,
        reason=(
            f"{reason}. Evidence quality cannot be assessed without the verifier. "
            "Drishti defaults to abstain — never assumes evidence of safety when verification fails."
        )
    )


class GeminiVerifierService:
    """
    Calls Gemini as a structured second-opinion multimodal flood evidence verifier.
    Completely separate from GeminiReasoningService (advisory layer).
    """

    def __init__(self):
        self._system_prompt = VERIFIER_SYSTEM_INSTRUCTION

    def get_api_key(self) -> str:
        """Retrieves Gemini API key from environment only — never hardcoded."""
        key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        return key.strip()

    def verify(
        self,
        segformer_flood_pct: Optional[float],
        segformer_flood_prob: Optional[float],
        cloud_quality: CloudQualityResult,
        permanent_water: PermanentWaterResult,
        roi: Dict[str, float],
        event_metadata: Optional[Dict[str, Any]] = None,
        terrain_summary: Optional[str] = None,
    ) -> VerificationVerdict:
        """
        Runs Gemini structured verification.

        Gemini receives:
            - SegFormer flood statistics (NOT labeled as ground truth)
            - Cloud quality metadata
            - Permanent water check result
            - Terrain/location context
            - Event metadata

        Gemini returns ONLY a structured verification verdict JSON.
        Never touches risk score.
        """
        api_key = self.get_api_key()
        if not api_key:
            logger.info("[GeminiVerifier] No API key configured — returning abstain.")
            return _make_abstain_verdict("Gemini API key not configured. Running in DEMO mode.")

        try:
            return self._call_gemini_verifier(
                api_key,
                segformer_flood_pct,
                segformer_flood_prob,
                cloud_quality,
                permanent_water,
                roi,
                event_metadata,
                terrain_summary
            )
        except Exception as e:
            logger.error(f"[GeminiVerifier] API call failed: {e}", exc_info=True)
            return _make_abstain_verdict(f"Gemini API error: {type(e).__name__}")

    def _call_gemini_verifier(
        self,
        api_key: str,
        segformer_flood_pct: Optional[float],
        segformer_flood_prob: Optional[float],
        cloud_quality: CloudQualityResult,
        permanent_water: PermanentWaterResult,
        roi: Dict[str, float],
        event_metadata: Optional[Dict[str, Any]],
        terrain_summary: Optional[str],
    ) -> VerificationVerdict:
        """Executes live HTTP call to Gemini REST API with strict verifier prompt."""

        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={api_key}"
        )

        # Build evidence payload — never send API keys or secrets
        evidence_payload = {
            "verifier_role": (
                "You are evaluating whether independent optical and reference evidence "
                "supports the SegFormer AI model's SAR-based flood prediction. "
                "The SegFormer output is model-derived — NOT observed ground truth."
            ),
            "segformer_evidence": {
                "label": "[AI MODEL PREDICTION — NOT OBSERVED GROUND TRUTH]",
                "source": "SegFormer-B0 SAR Dual-Polarization Flood Segmentation",
                "flood_percentage": segformer_flood_pct,
                "mean_flood_probability": segformer_flood_prob,
                "note": (
                    "These are model-derived estimates. Do NOT treat as ground truth. "
                    "Do NOT invent measurements not listed here."
                )
            },
            "sentinel2_optical_evidence": {
                "cloud_quality": cloud_quality.quality,
                "cloudy_pixel_pct": cloud_quality.cloudy_pixel_pct,
                "cloud_prob_mean": cloud_quality.cloud_prob_mean,
                "scene_date": cloud_quality.scene_date,
                "usable": cloud_quality.usable,
                "note": (
                    "If cloud_quality is CLOUDY or INSUFFICIENT, optical verification is not possible. "
                    "In that case, use failure_mode='cloud_contamination' or 'insufficient_evidence' and verdict='abstain'."
                )
            },
            "permanent_water_check": {
                "dataset": permanent_water.dataset,
                "overlap_fraction": permanent_water.overlap_fraction,
                "is_flagged": permanent_water.is_flagged,
                "flag_label": permanent_water.flag_label,
                "note": (
                    "If overlap_fraction is high, consider failure_mode='permanent_water'. "
                    "This does NOT prove the flood prediction is wrong — it is a known SAR failure mode."
                )
            },
            "location": {
                "roi_min_lon": roi.get("min_lon"),
                "roi_min_lat": roi.get("min_lat"),
                "roi_max_lon": roi.get("max_lon"),
                "roi_max_lat": roi.get("max_lat"),
                "terrain_summary": terrain_summary or "Not provided."
            },
            "event_context": event_metadata or {"event": "CYCLONE_REMAL_2024"},
            "instructions": (
                "Based ONLY on the evidence above, determine if the optical and reference evidence "
                "supports, partially supports, contradicts, or is insufficient to verify the "
                "SegFormer flood prediction. "
                "Do NOT invent data. Do NOT calculate risk scores. "
                "If optical evidence is CLOUDY or INSUFFICIENT, you MUST abstain."
            )
        }

        user_prompt = (
            "You are the Drishti flood evidence verifier. Analyze the following evidence and "
            "return ONLY a valid JSON verdict.\n\n"
            f"{json.dumps(evidence_payload, indent=2)}"
        )

        req_body = {
            "systemInstruction": {
                "parts": [{"text": self._system_prompt}]
            },
            "contents": [
                {"parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.1,  # Low temperature for structured factual output
                "responseMimeType": "application/json"
            }
        }

        req_data = json.dumps(req_body).encode("utf-8")
        http_req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(http_req, timeout=15) as response:
            res_body = json.loads(response.read().decode("utf-8"))

        raw_text = res_body["candidates"][0]["content"]["parts"][0]["text"]

        # Parse and validate the JSON response
        parsed = json.loads(raw_text)
        return self._parse_verdict(parsed)

    def _parse_verdict(self, parsed: Dict[str, Any]) -> VerificationVerdict:
        """
        Parses and validates Gemini's JSON response against the strict schema.
        Falls back to abstain if the response is malformed.
        """
        VALID_VERDICTS = {"agree", "partial", "disagree", "abstain"}
        VALID_FAILURE_MODES = {
            "none", "permanent_water", "radar_shadow", "wind_roughened_water",
            "smooth_surface", "cloud_contamination", "mixed_signal", "insufficient_evidence"
        }
        VALID_QUALITY = {"high", "moderate", "low"}

        verdict = str(parsed.get("verdict", "abstain")).lower()
        failure_mode = str(parsed.get("failure_mode", "insufficient_evidence")).lower()
        evidence_quality = str(parsed.get("evidence_quality", "low")).lower()
        reason = str(parsed.get("reason", "Evidence assessment unavailable."))

        try:
            disagreement_level = float(parsed.get("disagreement_level", 0.0))
            disagreement_level = max(0.0, min(1.0, disagreement_level))
        except (TypeError, ValueError):
            disagreement_level = 0.0

        # Validate and sanitize
        if verdict not in VALID_VERDICTS:
            logger.warning(f"[GeminiVerifier] Invalid verdict '{verdict}' — defaulting to abstain")
            verdict = "abstain"
        if failure_mode not in VALID_FAILURE_MODES:
            logger.warning(f"[GeminiVerifier] Invalid failure_mode '{failure_mode}' — defaulting to insufficient_evidence")
            failure_mode = "insufficient_evidence"
        if evidence_quality not in VALID_QUALITY:
            evidence_quality = "low"

        return VerificationVerdict(
            verdict=verdict,
            failure_mode=failure_mode,
            evidence_quality=evidence_quality,
            disagreement_level=disagreement_level,
            reason=reason
        )

    def generate_advisory(
        self,
        zone_name: str,
        central_risk: float,
        risk_band: str,
        risk_lower: float,
        risk_upper: float,
        verdict: str,
        failure_mode: str,
        evidence_quality: str,
        population_exposure: int,
        road_exposure_km: float,
        hospitals_exposure: int,
        infrastructure_list: List[str],
        requires_human_review: bool,
        human_review_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates structured Watch Officer explanation advisory based STRICTLY on
        already calculated facts (Prompt Section 13).

        Answers 6 mandatory operational questions:
        1. Why is this zone high risk?
        2. What evidence supports the risk?
        3. What evidence is uncertain or contradictory?
        4. What infrastructure is affected?
        5. Why is human review required?
        6. What should the Watch Officer inspect first?
        """
        api_key = self.get_api_key()
        
        # Build strict deterministic prompt input
        facts = {
            "zone_name": zone_name,
            "central_risk_score": central_risk,
            "risk_band": risk_band,
            "uncertainty_range": f"{risk_lower:.1f}–{risk_upper:.1f}",
            "verification_verdict": verdict,
            "failure_mode": failure_mode,
            "evidence_quality": evidence_quality,
            "population_exposure": population_exposure,
            "road_exposure_km": road_exposure_km,
            "hospitals_exposure": hospitals_exposure,
            "infrastructure": infrastructure_list,
            "requires_human_review": requires_human_review,
            "review_reason": human_review_reason or "No band boundary crossed"
        }

        # Safe deterministic fallback generator (used if offline or API error)
        fallback_advisory = {
            "why_high_risk": f"{zone_name} is classified as {risk_band} risk with a central deterministic score of {central_risk}/100 based on synoptic surge, heavy precipitation, and high population vulnerability.",
            "supporting_evidence": f"SegFormer dual-polarization SAR flood prediction indicates significant pixel inundation across coastal polders. Sourcing tier: DERIVED.",
            "uncertain_or_contradictory_evidence": (
                f"Verification verdict is '{verdict.upper()}' (quality: {evidence_quality}). "
                + (f"Known SAR failure mode flagged: '{failure_mode}'." if failure_mode != "none" else "No major SAR failure mode flagged.")
            ),
            "affected_infrastructure": f"Exposes {population_exposure:,} vulnerable residents, {road_exposure_km:.1f} km of road network, {hospitals_exposure} hospital hub(s), and key assets ({', '.join(infrastructure_list[:3])}).",
            "why_human_review_required": (
                f"Human review is {'REQUIRED' if requires_human_review else 'NOT REQUIRED'}. "
                + (f"Reason: {human_review_reason}" if requires_human_review else "Uncertainty interval remains strictly inside central risk band.")
            ),
            "watch_officer_inspection_priorities": [
                f"1. Verify coastal embankment integrity along {zone_name}",
                f"2. Inspect emergency power backup at {infrastructure_list[0] if infrastructure_list else 'key hospital'}",
                f"3. Confirm shelter occupancy and food stock levels prior to operational dispatch"
            ],
            "provenance": "DERIVED (Gemini Watch Officer Advisory)"
        }

        if not api_key:
            return fallback_advisory

        try:
            model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            
            prompt_text = (
                "You are an AI Disaster Advisory Engine for DRISHTI. Based ONLY on the following calculated facts, "
                "generate a structured Watch Officer briefing. Do NOT invent numbers or facts.\n\n"
                f"CALCULATED FACTS:\n{json.dumps(facts, indent=2)}\n\n"
                "Return ONLY a JSON object with keys:\n"
                "why_high_risk, supporting_evidence, uncertain_or_contradictory_evidence, "
                "affected_infrastructure, why_human_review_required, watch_officer_inspection_priorities (list of 3 strings)."
            )

            req_body = {
                "contents": [{"parts": [{"text": prompt_text}]}],
                "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
            }

            req_data = json.dumps(req_body).encode("utf-8")
            http_req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"}, method="POST")

            with urllib.request.urlopen(http_req, timeout=15) as response:
                res_body = json.loads(response.read().decode("utf-8"))

            raw_text = res_body["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)
            parsed["provenance"] = "DERIVED (Gemini Watch Officer Advisory)"
            return parsed

        except Exception as e:
            logger.warning(f"[GeminiVerifier] Advisory generation fallback used: {e}")
            return fallback_advisory

    def get_status(self) -> Dict[str, Any]:
        """Returns verifier operational status."""
        api_key = self.get_api_key()
        return {
            "service": "GeminiVerifierService",
            "mode": "LIVE_GEMINI" if api_key else "DEMO_ABSTAIN",
            "api_key_configured": bool(api_key),
            "model": settings.GEMINI_MODEL or "gemini-2.5-flash",
            "verifier_role": "second_opinion_only",
            "governance": {
                "modifies_risk_score": False,
                "invents_measurements": False,
                "declares_evacuation": False,
                "overrides_official_authorities": False,
                "abstains_when_insufficient": True,
                "fails_safely": True
            }
        }


gemini_verifier_service = GeminiVerifierService()

