import os
import json
from typing import List, Optional, Dict, Any

from app.models.schemas import (
    DistrictEvidence,
    RiskExplanation,
    RiskEvaluationRequest
)
from app.services.evidence_service import evidence_service
from app.services.risk_engine import transparent_risk_engine

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DISTRICT_RISK_PATH = os.path.join(DATA_DIR, "district_risk.json")
INFRASTRUCTURE_PATH = os.path.join(DATA_DIR, "infrastructure.json")


class RiskService:
    def __init__(self):
        self._district_data = None
        self._infra_data = None
        self._load_data()

    def _load_data(self):
        if os.path.exists(DISTRICT_RISK_PATH):
            with open(DISTRICT_RISK_PATH, "r", encoding="utf-8") as f:
                self._district_data = json.load(f)
        else:
            self._district_data = {"districts": [], "timeline_risk": {}}

        if os.path.exists(INFRASTRUCTURE_PATH):
            with open(INFRASTRUCTURE_PATH, "r", encoding="utf-8") as f:
                self._infra_data = json.load(f)
        else:
            self._infra_data = {"assets": []}

    def _enrich_risk_with_explanation(
        self,
        district_id: str,
        step_id: str,
        base_risk: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enriches a baseline REMAL simulation risk dictionary with transparent engine audit factors.
        Preserves baseline metrics while providing full factor attribution.
        """
        try:
            evidence = evidence_service.compile_district_evidence(district_id, step_id=step_id)
            explanation = transparent_risk_engine.evaluate_risk(evidence)
            
            factors_dict = {
                k: v.model_dump() for k, v in explanation.contributingFactors.items()
            }
            
            enriched = dict(base_risk)
            enriched["contributingFactors"] = factors_dict
            enriched["explanation"] = explanation.plainTextExplanation
            enriched["provenanceSummary"] = explanation.provenanceTiers
            enriched["evidenceSummary"] = {
                "floodPercentage": evidence.floodPerception.floodPercentage,
                "floodProbability": evidence.floodPerception.floodProbability,
                "eyeDistanceKm": evidence.cycloneHazard.eyeDistanceKm,
                "coastalLineKm": evidence.vulnerability.coastalLineKm,
                "shelterDeficitPersons": evidence.vulnerability.shelterDeficitPersons,
                "criticalAssetsCount": evidence.infrastructure.totalCriticalAssets
            }
            return enriched
        except Exception as e:
            # Resilient fallback if dynamic evidence assembly encounters edge case
            enriched = dict(base_risk)
            enriched["explanation"] = f"Baseline REMAL simulation assessment: {', '.join(base_risk.get('primaryDrivers', []))}"
            enriched["provenanceSummary"] = {
                "cyclone_hazard": "HISTORICAL_SIMULATION_REMAL_2024",
                "flood_perception": "[AI INFERENCE] SegFormer-B0 SAR Flood Perception",
                "meteorology": "HISTORICAL_SIMULATION_METEOROLOGY"
            }
            return enriched

    def get_district_risk_matrix(self, step_id: str = "NOW") -> List[Dict[str, Any]]:
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        districts = self._district_data.get("districts", [])
        timeline_risk = self._district_data.get("timeline_risk", {})
        
        step_risk = timeline_risk.get(normalized_step) or timeline_risk.get("NOW", {})

        compiled = []
        for d in districts:
            d_id = d["id"]
            risk = step_risk.get(d_id, {
                "riskScore": 30,
                "riskBand": "LOW",
                "color": "#16a34a",
                "surgeMeters": 0.5,
                "rainMm24h": 30,
                "windKmh": 40,
                "gustKmh": 50,
                "inundationProbPct": 10,
                "evacuatedCount": 1000,
                "evacuationTarget": 20000,
                "shelterOccupancyPct": 5,
                "primaryDrivers": ["Peripheral baseline conditions"]
            })
            enriched_risk = self._enrich_risk_with_explanation(d_id, normalized_step, risk)
            compiled.append({**d, "risk": enriched_risk})

        # Sort descending by risk score
        compiled.sort(key=lambda x: x["risk"]["riskScore"], reverse=True)
        return compiled

    def get_district_by_id(self, district_id: str, step_id: str = "NOW") -> Optional[Dict[str, Any]]:
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        districts = self._district_data.get("districts", [])
        district = next((d for d in districts if d["id"] == district_id), None)
        if not district:
            return None

        timeline_risk = self._district_data.get("timeline_risk", {})
        step_risk = timeline_risk.get(normalized_step) or timeline_risk.get("NOW", {})
        risk = step_risk.get(district_id)

        if not risk:
            risk = {
                "riskScore": 30,
                "riskBand": "LOW",
                "color": "#16a34a",
                "surgeMeters": 0.5,
                "rainMm24h": 30,
                "windKmh": 40,
                "gustKmh": 50,
                "inundationProbPct": 10,
                "evacuatedCount": 1000,
                "evacuationTarget": 20000,
                "shelterOccupancyPct": 5,
                "primaryDrivers": ["Peripheral baseline conditions"]
            }

        enriched_risk = self._enrich_risk_with_explanation(district_id, normalized_step, risk)
        return {**district, "risk": enriched_risk}

    def get_district_evidence(self, district_id: str, step_id: str = "NOW") -> DistrictEvidence:
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        evidence = evidence_service.compile_district_evidence(district_id, step_id=normalized_step)
        explanation = transparent_risk_engine.evaluate_risk(evidence)
        evidence.riskExplanation = explanation
        return evidence

    def get_all_districts_evidence(self, step_id: str = "NOW") -> List[DistrictEvidence]:
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        evidences = evidence_service.compile_all_districts_evidence(step_id=normalized_step)
        for ev in evidences:
            ev.riskExplanation = transparent_risk_engine.evaluate_risk(ev)
        return evidences

    def evaluate_custom_risk(self, req: RiskEvaluationRequest) -> DistrictEvidence:
        """
        Dynamically evaluates multi-hazard risk using custom or genuine SAR inputs.
        """
        is_genuine = req.sar_vv_values is not None and req.sar_vh_values is not None
        evidence = evidence_service.compile_district_evidence(
            district_id=req.district_id,
            step_id=req.step_id or "NOW",
            custom_rain_mm=req.custom_rain_mm_24h,
            custom_surge_m=req.custom_surge_meters,
            custom_wind_kmh=req.custom_wind_kmh,
            custom_flood_pct=req.custom_flood_pct,
            sar_vv=req.sar_vv_values,
            sar_vh=req.sar_vh_values,
            is_genuine_sar=is_genuine
        )
        explanation = transparent_risk_engine.evaluate_risk(evidence)
        evidence.riskExplanation = explanation
        return evidence

    def get_infrastructure_assets(self) -> List[Dict[str, Any]]:
        return self._infra_data.get("assets", [])


risk_service = RiskService()
