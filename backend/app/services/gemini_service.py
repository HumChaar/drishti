"""
DRISHTI Gemini Reasoning Service (Stage 6)
Implements the Gemini Reasoning layer downstream of JEV / TypeSafe Decision Intelligence.

Architectural Flow:
DATA -> SegFormer Perception -> Evidence Layer -> Transparent Risk Engine -> RISK + EXPOSURE -> JEV / TypeSafe Decision Intelligence -> GEMINI REASONING -> Multilingual Advisory -> Human Approval -> Action

Governance Rules:
- Gemini does NOT calculate or modify risk scores.
- Gemini does NOT override or invent operational decisions.
- Gemini does NOT autonomously trigger actuators or execute actions.
- Gemini explains, synthesizes, communicates uncertainty, and drafts grounded advisories.
- Supports seamless DEMO / MOCK mode when GEMINI_API_KEY is not configured or unavailable.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

from app.core.config import settings
from app.models.schemas import (
    GeminiReasoningRequest,
    GeminiAdvisory,
    DecisionRecommendation
)
from app.services.risk_service import risk_service
from app.services.decision_service import decision_service


GEMINI_SYSTEM_INSTRUCTION = """You are a disaster-risk advisory reasoning assistant for the DRISHTI Coastal Surveillance System.

You do not calculate risk.
You do not invent evidence.
You do not override deterministic risk scores.
You do not create new operational decisions.
You only explain the structured evidence and decision recommendations supplied to you.

Every operational recommendation must originate from the supplied Decision Intelligence layer.

Clearly distinguish:
- historical simulation data
- AI inference
- deterministic risk engine output
- decision recommendations
- uncertainty

Never claim that an action has been executed.
Human approval is required for operational actions.

If specific evidence is missing or null, explicitly state 'Evidence unavailable.'
Do NOT hallucinate or extrapolate missing quantitative values.

Respond in strict JSON with the following keys:
{
  "headline": "Concise executive disaster warning headline",
  "situation_summary": "2-3 sentence grounded narrative explaining the situation and risk",
  "key_risk_drivers": ["List of 3-4 specific physical hazard drivers"],
  "exposure_summary": "Summary of vulnerable population and critical infrastructure in hazard zone",
  "recommended_actions": ["List of operational recommendations grounded in Decision Intelligence"],
  "uncertainty_notes": "Explicit statement regarding sensor resolution, forecast cones, or mock data",
  "evidence_references": ["List of evidence sources cited"]
}"""


class GeminiReasoningService:
    def __init__(self):
        self.system_prompt = GEMINI_SYSTEM_INSTRUCTION

    def get_api_key(self) -> str:
        """Retrieves Gemini API key strictly from settings/environment variable."""
        key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        return key.strip()

    def get_status(self) -> Dict[str, Any]:
        """Returns the operational status, active mode, and safety governance configuration."""
        api_key = self.get_api_key()
        has_key = bool(api_key)
        return {
            "service": "Gemini Reasoning Layer (Stage 6)",
            "api_key_configured": has_key,
            "mode": "LIVE_GEMINI" if has_key else "DEMO_MOCK",
            "model": settings.GEMINI_MODEL if has_key else "mock-gemini-2.0-flash",
            "governance": {
                "risk_calculation_by_llm_prohibited": True,
                "decision_override_by_llm_prohibited": True,
                "autonomous_action_claims_prohibited": True,
                "human_approval_mandatory": True,
                "downstream_of_jev_engine": True
            }
        }

    def generate_advisory(self, request: GeminiReasoningRequest) -> GeminiAdvisory:
        """
        Synthesizes a structured, grounded advisory from a validated GeminiReasoningRequest.
        Uses live Gemini REST API if GEMINI_API_KEY is available; falls back to deterministic mock.
        """
        api_key = self.get_api_key()
        if not api_key:
            return self._build_mock_advisory(request)

        try:
            return self._call_live_gemini(request, api_key)
        except Exception as e:
            # Resilient fallback: ensure platform demo never crashes on network/quota error
            fallback = self._build_mock_advisory(request)
            fallback.uncertainty_notes += f" [Note: Live Gemini API call failed ({type(e).__name__}); fallen back to deterministic reasoning]."
            return fallback

    def get_advisory_for_district(self, district_id: str, step_id: str = "NOW") -> GeminiAdvisory:
        """
        End-to-end integration: retrieves verified outputs from Risk Engine & Decision Intelligence
        and feeds them into the Gemini Reasoning layer.
        """
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id

        # 1. Fetch deterministic Decision Intelligence output
        decision_rec: DecisionRecommendation = decision_service.evaluate_district(district_id, step_id=normalized_step)

        # 2. Fetch Evidence Layer snapshot
        evidence = risk_service.get_district_evidence(district_id, step_id=normalized_step)

        # 3. Assemble structured reasoning request
        factors_dict = {}
        if evidence.riskExplanation and evidence.riskExplanation.contributingFactors:
            factors_dict = {
                k: {
                    "subScore": v.subScore,
                    "weightedPoints": v.weightedPoints,
                    "driverSummary": v.driverSummary,
                    "rawValue": v.rawValueDisplay
                }
                for k, v in evidence.riskExplanation.contributingFactors.items()
            }

        evidence_dict = {
            "storm_surge_m": evidence.meteorology.surgeMeters,
            "rain_mm_24h": evidence.meteorology.rainMm24h,
            "wind_kmh": evidence.meteorology.windKmh,
            "gust_kmh": evidence.meteorology.gustKmh,
            "flood_extent_pct": evidence.floodPerception.floodPercentage,
            "flood_confidence": evidence.floodPerception.floodProbability,
            "is_genuine_sar": evidence.floodPerception.isGenuineSar,
            "total_population": evidence.vulnerability.totalPopulation,
            "vulnerable_population": evidence.vulnerability.vulnerablePopulation,
            "shelter_deficit": evidence.vulnerability.shelterDeficitPersons,
            "critical_assets": evidence.infrastructure.criticalAssetsList
        }

        decisions_list = [
            {
                "decision_id": d.decision_id,
                "title": d.title,
                "priority": d.priority,
                "status": d.status,
                "rationale": d.rationale
            }
            for d in decision_rec.recommended_decisions
        ]

        reasoning_req = GeminiReasoningRequest(
            district_id=district_id,
            risk_score=decision_rec.risk_score,
            risk_band=decision_rec.risk_band,
            evidence=evidence_dict,
            contributing_factors=factors_dict,
            decision_recommendations=decisions_list,
            provenance=decision_rec.provenance,
            scenario="CYCLONE_REMAL_2024",
            step_id=normalized_step
        )

        return self.generate_advisory(reasoning_req)

    def _call_live_gemini(self, request: GeminiReasoningRequest, api_key: str) -> GeminiAdvisory:
        """Executes live HTTP REST call to Google Gemini API with strict prompt governance."""
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        payload_context = {
            "district_id": request.district_id,
            "risk_score": request.risk_score,
            "risk_band": request.risk_band,
            "scenario": request.scenario,
            "step_id": request.step_id,
            "evidence": request.evidence,
            "contributing_factors": request.contributing_factors,
            "decision_recommendations": request.decision_recommendations,
            "upstream_provenance": request.provenance
        }

        user_content = (
            f"Analyze the following verified multi-modal disaster evidence and decision recommendations. "
            f"Do not alter the risk score ({request.risk_score}) or risk band ({request.risk_band}).\n\n"
            f"{json.dumps(payload_context, indent=2)}"
        )

        req_body = {
            "systemInstruction": {
                "parts": [{"text": self.system_prompt}]
            },
            "contents": [
                {
                    "parts": [{"text": user_content}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
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

        with urllib.request.urlopen(http_req, timeout=12) as response:
            res_body = json.loads(response.read().decode("utf-8"))

        raw_text = res_body["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)

        decision_ids = [
            d.get("decision_id", "") if isinstance(d, dict) else getattr(d, "decision_id", "")
            for d in request.decision_recommendations
        ]

        now_iso = datetime.now(timezone.utc).isoformat()

        return GeminiAdvisory(
            district_id=request.district_id,
            headline=parsed.get("headline", f"{request.risk_band} Cyclone Risk Advisory for {request.district_id}"),
            situation_summary=parsed.get("situation_summary", "Situation summary unavailable."),
            key_risk_drivers=parsed.get("key_risk_drivers", []),
            exposure_summary=parsed.get("exposure_summary", "Exposure summary unavailable."),
            recommended_actions=parsed.get("recommended_actions", []),
            uncertainty_notes=parsed.get("uncertainty_notes", "Sensor resolution and forecast margins apply."),
            evidence_references=parsed.get("evidence_references", [request.provenance]),
            # STRICT INVARIANTS: Gemini CANNOT change risk score, risk band, or human approval
            risk_score=request.risk_score,
            risk_band=request.risk_band,
            decision_ids=[d for d in decision_ids if d],
            requires_human_approval=True,
            provenance="[GEMINI REASONING] Grounded AI Advisory (gemini-2.5-flash)",
            generated_at=now_iso,
            model=model_name,
            is_mock=False,
            provenance_chain={
                "historical_simulation": "HISTORICAL SIMULATION — CYCLONE REMAL 2024",
                "perception_ai": "[AI INFERENCE] SegFormer-B0 SAR Flood Perception",
                "risk_engine": "[DETERMINISTIC RISK ENGINE] Transparent Multi-Factor Attribution",
                "decision_intelligence": "[JEV DECISION INTELLIGENCE] Deterministic Rule Engine (TypeSafe JEV)",
                "advisory_reasoning": "[GEMINI REASONING] Grounded AI Advisory (gemini-2.5-flash)"
            }
        )

    def _build_mock_advisory(self, request: GeminiReasoningRequest) -> GeminiAdvisory:
        """
        Builds a deterministic, auditable mock advisory when GEMINI_API_KEY is not configured.
        Preserves 100% fidelity to the structured evidence and decision intelligence inputs.
        """
        d_name = request.district_id.replace("od_", "").replace("wb_", "").replace("_", " ").title()
        score = request.risk_score
        band = request.risk_band

        ev = request.evidence or {}
        surge = ev.get("storm_surge_m", 0.0)
        flood = ev.get("flood_extent_pct", 0.0)
        vuln = ev.get("vulnerable_population", 0)
        deficit = ev.get("shelter_deficit", 0)
        assets = ev.get("critical_assets", [])

        # 1. Headline
        if score >= 80 or band in ["EXTREME", "CRITICAL"]:
            headline = f"Extreme flood and cyclone risk requires immediate preparedness in {d_name}."
        elif score >= 65 or band == "HIGH":
            headline = f"High cyclone surge and rainfall hazard in {d_name}: Targeted relocation advised."
        elif score >= 45 or band == "MODERATE":
            headline = f"Moderate coastal advisory for {d_name}: Precautionary staging in progress."
        else:
            headline = f"Routine coastal weather watch for {d_name}: Baseline monitoring active."

        # 2. Situation Summary
        situation_summary = (
            f"{d_name} is currently classified as {band} risk with a composite score of {score}/100 "
            f"under simulation scenario {request.scenario} ({request.step_id}). Multi-hazard indicators "
            f"reflect {surge:.1f}m storm surge, {flood:.1f}% SAR-detected inundation, and elevated vulnerability."
        )

        # 3. Key Risk Drivers
        key_drivers = []
        if request.contributing_factors:
            for k, v in request.contributing_factors.items():
                if isinstance(v, dict) and "driverSummary" in v:
                    key_drivers.append(v["driverSummary"])
                elif isinstance(v, dict) and "rawValue" in v:
                    key_drivers.append(f"{k.replace('_', ' ').title()}: {v['rawValue']}")
        if not key_drivers:
            key_drivers = [
                f"Tidal Storm Surge: {surge:.1f}m along open sea frontage",
                f"SegFormer SAR Flood Extent: {flood:.1f}% pixel inundation",
                f"Coastal Demographic Vulnerability: {vuln:,} residents in hazard buffer"
            ]

        # 4. Exposure Summary
        if vuln > 0:
            top_assets_str = ", ".join(assets[:3]) if assets else "critical coastal infrastructure"
            exposure_summary = (
                f"Approximately {vuln:,} vulnerable citizens reside within the 5km coastal buffer. "
                f"Current shelter capacity indicates a deficit of {deficit:,} persons. Monitored assets at risk include {top_assets_str}."
            )
        else:
            exposure_summary = "Evidence unavailable."

        # 5. Recommended Actions (grounded in Decision Intelligence)
        recommended_actions = []
        decision_ids = []
        for d in request.decision_recommendations:
            if isinstance(d, dict):
                d_id = d.get("decision_id", "")
                title = d.get("title", d_id)
                rationale = d.get("rationale", "")
                decision_ids.append(d_id)
                recommended_actions.append(f"{title}: {rationale}")
            elif hasattr(d, "decision_id"):
                decision_ids.append(d.decision_id)
                recommended_actions.append(f"{d.title}: {d.rationale}")

        if not recommended_actions:
            recommended_actions = ["ROUTINE_MONITORING: Maintain standing DEOC coastal surveillance."]
            decision_ids = ["ROUTINE_MONITORING"]

        # 6. Uncertainty Notes
        uncertainty_notes = (
            "SegFormer flood extent is evaluated from deterministic dual-pol SAR benchmarks; genuine Sentinel-1 GRD "
            "ingestion is required for post-landfall ground truth. Timeline track reflects standard forecast cone margin."
        )

        # 7. Evidence References with explicit 5-tier pipeline citations
        evidence_refs = [
            f"Risk Engine: Score {score}/100 ({band}) [DETERMINISTIC RISK ENGINE]",
            "Perception: [AI INFERENCE] SegFormer-B0 SAR Flood Perception",
            f"Meteorology: Surge {surge:.1f}m, Rain {ev.get('rain_mm_24h', 0)}mm (HISTORICAL SIMULATION — CYCLONE REMAL 2024)",
            f"Decision Layer: {', '.join(decision_ids[:3])} [JEV DECISION INTELLIGENCE]"
        ]

        provenance_chain = {
            "historical_simulation": "HISTORICAL SIMULATION — CYCLONE REMAL 2024",
            "perception_ai": "[AI INFERENCE] SegFormer-B0 SAR Flood Perception",
            "risk_engine": "[DETERMINISTIC RISK ENGINE] Transparent Multi-Factor Attribution",
            "decision_intelligence": "[JEV DECISION INTELLIGENCE] Deterministic Rule Engine (TypeSafe JEV)",
            "advisory_reasoning": "[MOCK GEMINI REASONING] Grounded Synthetic Advisory"
        }

        now_iso = datetime.now(timezone.utc).isoformat()

        return GeminiAdvisory(
            district_id=request.district_id,
            headline=headline,
            situation_summary=situation_summary,
            key_risk_drivers=key_drivers[:4],
            exposure_summary=exposure_summary,
            recommended_actions=recommended_actions,
            uncertainty_notes=uncertainty_notes,
            evidence_references=evidence_refs,
            # Strictly preserved deterministic values
            risk_score=score,
            risk_band=band,
            decision_ids=decision_ids,
            requires_human_approval=True,
            provenance="[MOCK GEMINI REASONING] Grounded Synthetic Advisory",
            generated_at=now_iso,
            model="mock-gemini-2.0-flash",
            is_mock=True,
            provenance_chain=provenance_chain
        )


gemini_service = GeminiReasoningService()
