import os
import json
from typing import List, Optional, Dict, Any

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

    def get_district_risk_matrix(self, step_id: str = "NOW") -> List[Dict[str, Any]]:
        districts = self._district_data.get("districts", [])
        timeline_risk = self._district_data.get("timeline_risk", {})
        
        step_risk = timeline_risk.get(step_id) or timeline_risk.get("NOW", {})

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
            compiled.append({**d, "risk": risk})

        # Sort descending by risk score
        compiled.sort(key=lambda x: x["risk"]["riskScore"], reverse=True)
        return compiled

    def get_district_by_id(self, district_id: str, step_id: str = "NOW") -> Optional[Dict[str, Any]]:
        districts = self._district_data.get("districts", [])
        district = next((d for d in districts if d["id"] == district_id), None)
        if not district:
            return None

        timeline_risk = self._district_data.get("timeline_risk", {})
        step_risk = timeline_risk.get(step_id) or timeline_risk.get("NOW", {})
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

        return {**district, "risk": risk}

    def get_infrastructure_assets(self) -> List[Dict[str, Any]]:
        return self._infra_data.get("assets", [])

risk_service = RiskService()
