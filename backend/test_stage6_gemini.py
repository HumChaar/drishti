"""
DRISHTI Stage 6 Gemini Reasoning Layer Test Suite
Tests:
- Mock mode operational without API key
- Structured GeminiReasoningRequest input validation
- Structured GeminiAdvisory output validation
- Risk score preserved strictly (Gemini never modifies risk)
- Risk band preserved strictly
- Decision IDs preserved from JEV Decision Intelligence
- Human approval flag preserved (requires_human_approval = True)
- Provenance preserved ([MOCK GEMINI REASONING] / [GEMINI REASONING])
- Missing evidence handling ("Evidence unavailable.")
- No autonomous execution claims
- Deterministic mock output repeatability
- Endpoints: GET /api/reasoning/status, GET /api/reasoning/advisory/{district_id}, POST /api/reasoning/advisory
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.services.gemini_service import gemini_service
from app.models.schemas import GeminiReasoningRequest, GeminiAdvisory


class TestStage6GeminiReasoning(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_reasoning_status_endpoint(self):
        """Verifies GET /api/reasoning/status reports active mode and governance rules."""
        res = self.client.get("/api/reasoning/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("mode", data)
        self.assertIn("governance", data)
        self.assertTrue(data["governance"]["risk_calculation_by_llm_prohibited"])
        self.assertTrue(data["governance"]["decision_override_by_llm_prohibited"])
        self.assertTrue(data["governance"]["human_approval_mandatory"])
        self.assertTrue(data["governance"]["downstream_of_jev_engine"])
        print(f"PASS: /api/reasoning/status -> Mode: {data['mode']}, Model: {data['model']}")

    def test_02_mock_mode_without_api_key(self):
        """Verifies that in the absence of a live API key, mock mode activates deterministically."""
        # Ensure we test with key cleared
        original_key = gemini_service.get_api_key()
        try:
            # Force empty key
            gemini_service.get_api_key = lambda: ""

            status = gemini_service.get_status()
            self.assertEqual(status["mode"], "DEMO_MOCK")
            self.assertFalse(status["api_key_configured"])

            res = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW")
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertTrue(data["is_mock"])
            self.assertIn("[MOCK GEMINI REASONING]", data["provenance"])
            self.assertEqual(data["model"], "mock-gemini-2.0-flash")
            print("PASS: Mock mode operates deterministically without API key")
        finally:
            gemini_service.get_api_key = lambda: original_key

    def test_03_preservation_of_risk_score_and_band(self):
        """CRITICAL INVARIANT: Gemini must NEVER modify the deterministic risk score or band."""
        districts = ["od_balasore", "od_puri", "od_ganjam"]
        for d_id in districts:
            res = self.client.get(f"/api/reasoning/advisory/{d_id}?step_id=NOW")
            self.assertEqual(res.status_code, 200)
            advisory = res.json()

            # Compare against underlying risk matrix
            risk_res = self.client.get(f"/api/risk/district/{d_id}?step_id=NOW").json()
            expected_score = risk_res["risk"]["riskScore"]
            expected_band = risk_res["risk"]["riskBand"]

            self.assertEqual(advisory["risk_score"], expected_score)
            self.assertEqual(advisory["risk_band"], expected_band)

        print("PASS: Risk score and band preservation invariant verified across 3 districts")

    def test_04_decision_ids_preserved_from_decision_engine(self):
        """CRITICAL INVARIANT: Gemini recommendations must originate from Decision Intelligence."""
        res_dec = self.client.get("/api/decision/od_balasore?step_id=NOW").json()
        expected_dec_ids = [d["decision_id"] for d in res_dec["recommended_decisions"]]

        res_gem = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW").json()
        actual_dec_ids = res_gem["decision_ids"]

        for d_id in expected_dec_ids:
            self.assertIn(d_id, actual_dec_ids)

        print(f"PASS: Decision IDs preserved from JEV layer: {actual_dec_ids[:3]}...")

    def test_05_human_approval_flag_and_no_autonomous_claims(self):
        """Verifies mandatory Human-in-the-Loop policy and no claims that actions executed."""
        res = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["requires_human_approval"])
        text_corpus = (data["headline"] + " " + data["situation_summary"] + " " + " ".join(data["recommended_actions"])).lower()
        self.assertNotIn("has been evacuated", text_corpus)
        self.assertNotIn("action completed", text_corpus)
        self.assertNotIn("successfully executed", text_corpus)

        print("PASS: Governance check -> requires_human_approval=True and zero autonomous execution claims")

    def test_06_missing_evidence_handling(self):
        """Verifies that missing evidence fields are explicitly marked 'Evidence unavailable.'"""
        original_key = gemini_service.get_api_key()
        try:
            gemini_service.get_api_key = lambda: ""
            custom_req = {
                "district_id": "test_district",
                "risk_score": 50,
                "risk_band": "MODERATE",
                "evidence": {
                    "vulnerable_population": 0  # Missing / zero demographic evidence
                },
                "contributing_factors": {},
                "decision_recommendations": []
            }
            res = self.client.post("/api/reasoning/advisory", json=custom_req)
            self.assertEqual(res.status_code, 200)
            data = res.json()

            self.assertEqual(data["exposure_summary"], "Evidence unavailable.")
            print("PASS: Missing evidence handled gracefully -> 'Evidence unavailable.'")
        finally:
            gemini_service.get_api_key = lambda: original_key

    def test_07_structured_input_and_output_schemas(self):
        """Verifies strict Pydantic parsing of GeminiReasoningRequest and GeminiAdvisory."""
        raw_payload = {
            "district_id": "od_bhadrak",
            "risk_score": 85,
            "risk_band": "EXTREME",
            "evidence": {
                "storm_surge_m": 2.4,
                "flood_extent_pct": 42.5,
                "vulnerable_population": 360000,
                "shelter_deficit": 22000,
                "critical_assets": ["Dhamra Port LNG Terminal", "Chudamani Fishing Base"]
            },
            "contributing_factors": {
                "flood_hazard": {"driverSummary": "Severe coastal flooding", "rawValue": "42.5%"}
            },
            "decision_recommendations": [
                {"decision_id": "EVACUATION_RECOMMENDATION", "title": "Mandatory Evacuation", "rationale": "High storm surge"}
            ],
            "provenance": "[TEST SUITE]"
        }

        # Validates Pydantic serialization
        req = GeminiReasoningRequest(**raw_payload)
        self.assertEqual(req.district_id, "od_bhadrak")

        res = self.client.post("/api/reasoning/advisory", json=raw_payload)
        self.assertEqual(res.status_code, 200)
        advisory = GeminiAdvisory(**res.json())
        self.assertEqual(advisory.risk_score, 85)
        self.assertEqual(advisory.risk_band, "EXTREME")
        self.assertIn("Dhamra Port", advisory.exposure_summary)
        print("PASS: Structured request/response schema parsing verified")

    def test_08_deterministic_mock_repeatability(self):
        """Verifies 100% deterministic repeatability in mock mode."""
        original_key = gemini_service.get_api_key()
        try:
            gemini_service.get_api_key = lambda: ""
            res1 = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW").json()
            res2 = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW").json()

            self.assertEqual(res1["headline"], res2["headline"])
            self.assertEqual(res1["situation_summary"], res2["situation_summary"])
            self.assertEqual(res1["key_risk_drivers"], res2["key_risk_drivers"])
            self.assertEqual(res1["recommended_actions"], res2["recommended_actions"])
            print("PASS: Deterministic mock repeatability confirmed (zero drift)")
        finally:
            gemini_service.get_api_key = lambda: original_key


if __name__ == "__main__":
    unittest.main()
