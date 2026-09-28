"""
DRISHTI STAGE 4 TEST SUITE
Verifies:
1. Evidence Layer construction and multi-source provenance tracking.
2. Deterministic Transparent Risk Engine calculations & boundary conditions.
3. Contributing factors breakdown & human-readable explanation generation.
4. Compatibility with existing risk schemas and endpoints.
5. New Evidence Layer and Risk Explanation FastAPI endpoints.
"""

import sys
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.core.risk_config import DEFAULT_RISK_WEIGHTS, DEFAULT_THRESHOLDS, RISK_BANDS
from app.services.evidence_service import evidence_service, haversine_distance
from app.services.risk_engine import transparent_risk_engine, TransparentRiskEngine
from app.models.schemas import RiskEvaluationRequest

client = TestClient(app)

class TestStage4EvidenceAndRiskEngine(unittest.TestCase):

    def test_01_haversine_distance(self):
        # Distance between Balasore (21.49, 86.93) and Kendrapara (20.5, 86.42)
        dist = haversine_distance(21.49, 86.93, 20.5, 86.42)
        self.assertTrue(110 < dist < 130, f"Distance should be ~120km, got {dist}km")

    def test_02_evidence_construction_and_provenance(self):
        evidence = evidence_service.compile_district_evidence("od_balasore", step_id="NOW")
        self.assertEqual(evidence.districtId, "od_balasore")
        self.assertEqual(evidence.state, "Odisha")
        self.assertEqual(evidence.cycloneHazard.stormName, "REMAL")
        self.assertEqual(evidence.cycloneHazard.provenance, "HISTORICAL_SIMULATION_REMAL_2024")
        self.assertIn("[AI INFERENCE]", evidence.floodPerception.provenance)
        self.assertEqual(evidence.meteorology.provenance, "HISTORICAL_SIMULATION_METEOROLOGY")
        self.assertEqual(evidence.vulnerability.provenance, "CENSUS_2011_PROJECTED_SDMA")
        self.assertEqual(evidence.infrastructure.provenance, "NDMA_SDMA_COASTAL_REGISTRY")
        self.assertGreater(evidence.vulnerability.totalPopulation, 1000000)

    def test_03_transparent_risk_engine_calculation(self):
        evidence = evidence_service.compile_district_evidence("od_balasore", step_id="NOW")
        explanation = transparent_risk_engine.evaluate_risk(evidence)

        self.assertGreaterEqual(explanation.compositeScore, 0)
        self.assertLessEqual(explanation.compositeScore, 100)
        self.assertIn(explanation.riskBand, ["LOW", "MODERATE", "HIGH", "EXTREME"])
        self.assertTrue(explanation.color.startswith("#"))
        self.assertEqual(len(explanation.contributingFactors), 5)

        # Check weights sum
        weights_sum = sum(f.weight for f in explanation.contributingFactors.values())
        self.assertAlmostEqual(weights_sum, 1.0, places=4)

        # Check weighted points sum to composite score (within rounding)
        total_pts = sum(f.weightedPoints for f in explanation.contributingFactors.values())
        self.assertEqual(explanation.compositeScore, int(round(total_pts)))

        # Check explanation contains clear text
        self.assertIn("Risk score of", explanation.plainTextExplanation)
        self.assertIn(explanation.riskBand, explanation.plainTextExplanation)

    def test_04_boundary_conditions(self):
        # 1. Zero hazard boundary condition
        zero_evidence = evidence_service.compile_district_evidence(
            "od_balasore",
            step_id="NOW",
            custom_rain_mm=0.0,
            custom_surge_m=0.0,
            custom_wind_kmh=0,
            custom_flood_pct=0.0
        )
        zero_explanation = transparent_risk_engine.evaluate_risk(zero_evidence)
        # Should be driven only by baseline demographic vulnerability and assets, well below high
        self.assertLess(zero_explanation.compositeScore, 45)
        self.assertEqual(zero_explanation.riskBand, "LOW")

        # 2. Maximum hazard boundary condition
        max_evidence = evidence_service.compile_district_evidence(
            "od_balasore",
            step_id="NOW",
            custom_rain_mm=300.0,
            custom_surge_m=5.0,
            custom_wind_kmh=160,
            custom_flood_pct=100.0
        )
        max_explanation = transparent_risk_engine.evaluate_risk(max_evidence)
        self.assertGreaterEqual(max_explanation.compositeScore, 75)
        self.assertIn(max_explanation.riskBand, ["HIGH", "EXTREME"])

    def test_05_api_risk_districts_enriched(self):
        resp = client.get("/api/risk/districts?step_id=NOW")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["provenance"], "TRANSPARENT_MULTI_MODAL_RISK_ENGINE")
        self.assertEqual(data["totalDistrictsMonitored"], 8)
        
        # Verify first district has enriched transparent fields
        first_dist = data["districts"][0]
        self.assertIn("risk", first_dist)
        risk = first_dist["risk"]
        self.assertIn("contributingFactors", risk)
        self.assertIsNotNone(risk["contributingFactors"])
        self.assertIn("flood_hazard", risk["contributingFactors"])
        self.assertIn("explanation", risk)
        self.assertTrue(len(risk["explanation"]) > 20)

    def test_06_api_risk_evidence_endpoints(self):
        # All evidence
        resp = client.get("/api/risk/evidence?step_id=NOW")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["totalDistricts"], 8)

        # Single district evidence
        resp2 = client.get("/api/risk/evidence/od_kendrapara?step_id=NOW")
        self.assertEqual(resp2.status_code, 200)
        ev_data = resp2.json()["district"]
        self.assertEqual(ev_data["districtId"], "od_kendrapara")
        self.assertIn("cycloneHazard", ev_data)
        self.assertIn("floodPerception", ev_data)
        self.assertIn("meteorology", ev_data)

    def test_07_api_risk_explain_endpoint(self):
        resp = client.get("/api/risk/explain/od_kendrapara?step_id=NOW")
        self.assertEqual(resp.status_code, 200)
        exp = resp.json()
        self.assertIn("compositeScore", exp)
        self.assertIn("formula", exp)
        self.assertIn("contributingFactors", exp)
        self.assertIn("flood_hazard", exp["contributingFactors"])
        self.assertIn("storm_surge", exp["contributingFactors"])

    def test_08_api_risk_config_endpoint(self):
        resp = client.get("/api/risk/config")
        self.assertEqual(resp.status_code, 200)
        cfg = resp.json()
        self.assertIn("weights", cfg)
        self.assertIn("thresholds", cfg)
        self.assertIn("bands", cfg)
        self.assertEqual(cfg["weights"]["flood_hazard"], 0.25)
        self.assertEqual(cfg["weights"]["storm_surge"], 0.20)

    def test_09_api_risk_evaluate_dynamic(self):
        payload = {
            "districtId": "od_balasore",
            "stepId": "NOW",
            "customRainMm24h": 220.0,
            "customSurgeMeters": 3.8,
            "customFloodPct": 88.5
        }
        resp = client.post("/api/risk/evaluate", json=payload)
        self.assertEqual(resp.status_code, 200)
        result = resp.json()
        self.assertEqual(result["districtId"], "od_balasore")
        self.assertIsNotNone(result["riskExplanation"])
        self.assertGreaterEqual(result["riskExplanation"]["compositeScore"], 65)
        self.assertIn(result["riskExplanation"]["riskBand"], ["HIGH", "EXTREME"])


if __name__ == "__main__":
    unittest.main()
