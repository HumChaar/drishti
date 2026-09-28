"""
DRISHTI Stage 5 JEV / TypeSafe Decision Intelligence Test Suite
Tests:
- EXTREME -> emergency decisions (evacuation, auxiliary shelter, infrastructure protection, operations escalation)
- HIGH -> preparedness decisions (prepare evacuation, increase shelter readiness, infrastructure monitoring, coordination)
- MODERATE -> monitoring/preparedness (enhanced monitoring, preparedness actions, shelter check)
- LOW -> routine monitoring (routine monitoring, DEOC standby)
- Shelter deficit influence
- Infrastructure exposure influence
- Deterministic repeated evaluation (zero variance)
- Invalid district error handling (404)
- Malformed input error handling (422)
- Provenance preservation
- Human approval flag (mandatory Human-in-the-Loop)
- No autonomous action claims
- Config & All districts endpoints
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestStage5DecisionEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_extreme_risk_emergency_decisions(self):
        """EXTREME risk -> emergency decisions triggered with REQUIRES_APPROVAL status."""
        res = self.client.get("/api/decision/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["district_id"], "od_balasore")
        self.assertGreaterEqual(data["risk_score"], 80)
        self.assertIn(data["risk_band"], ["EXTREME", "CRITICAL"])
        self.assertEqual(data["priority"], "IMMEDIATE")
        self.assertTrue(data["requires_human_approval"])

        # Check recommended decision IDs
        decision_ids = [d["decision_id"] for d in data["recommended_decisions"]]
        self.assertIn("EVACUATION_RECOMMENDATION", decision_ids)
        self.assertIn("EMERGENCY_SHELTER_ACTIVATION", decision_ids)
        self.assertIn("CRITICAL_INFRASTRUCTURE_PROTECTION", decision_ids)
        self.assertIn("EMERGENCY_OPERATIONS_ESCALATION", decision_ids)

        # Check status and no autonomous claims
        for d in data["recommended_decisions"]:
            self.assertEqual(d["status"], "REQUIRES_APPROVAL")
            self.assertTrue(d["requires_human_approval"])
            self.assertNotIn("EXECUTED", d["status"])
            self.assertNotIn("COMPLETED", d["status"])

        print(f"PASS: EXTREME Risk Scenario ({data['district_id']} Score: {data['risk_score']}) -> Emergency decisions verified")

    def test_02_high_risk_preparedness_decisions(self):
        """HIGH risk -> preparedness decisions triggered with RECOMMENDED status."""
        res = self.client.get("/api/decision/od_kendrapara?step_id=T-24h")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["risk_band"], "HIGH")
        self.assertEqual(data["priority"], "HIGH")
        self.assertTrue(data["requires_human_approval"])

        decision_ids = [d["decision_id"] for d in data["recommended_decisions"]]
        self.assertIn("PREPARE_EVACUATION", decision_ids)
        self.assertIn("INCREASE_SHELTER_READINESS", decision_ids)
        self.assertIn("INFRASTRUCTURE_MONITORING", decision_ids)
        self.assertIn("EMERGENCY_COORDINATION", decision_ids)

        # Verify status is RECOMMENDED
        for d in data["recommended_decisions"]:
            self.assertIn(d["status"], ["RECOMMENDED", "REQUIRES_APPROVAL"])
            self.assertTrue(d["requires_human_approval"])

        print(f"PASS: HIGH Risk Scenario ({data['district_id']} Score: {data['risk_score']}) -> Preparedness decisions verified")

    def test_03_moderate_risk_monitoring_decisions(self):
        """MODERATE risk -> enhanced monitoring and preparedness actions."""
        res = self.client.get("/api/decision/od_puri?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["risk_band"], "MODERATE")
        self.assertEqual(data["priority"], "MODERATE")
        self.assertTrue(data["requires_human_approval"])

        decision_ids = [d["decision_id"] for d in data["recommended_decisions"]]
        self.assertIn("ENHANCED_MONITORING", decision_ids)
        self.assertIn("PREPAREDNESS_ACTIONS", decision_ids)
        self.assertIn("SHELTER_READINESS_CHECK", decision_ids)

        print(f"PASS: MODERATE Risk Scenario ({data['district_id']} Score: {data['risk_score']}) -> Monitoring/preparedness verified")

    def test_04_low_risk_routine_monitoring(self):
        """LOW risk -> routine monitoring and baseline readiness checks."""
        res = self.client.get("/api/decision/od_ganjam?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["risk_band"], "LOW")
        self.assertEqual(data["priority"], "ROUTINE")
        self.assertTrue(data["requires_human_approval"])

        decision_ids = [d["decision_id"] for d in data["recommended_decisions"]]
        self.assertIn("ROUTINE_MONITORING", decision_ids)
        self.assertIn("SHELTER_READINESS_CHECK", decision_ids)

        for d in data["recommended_decisions"]:
            self.assertEqual(d["status"], "READY")

        print(f"PASS: LOW Risk Scenario ({data['district_id']} Score: {data['risk_score']}) -> Routine monitoring verified")

    def test_05_shelter_deficit_influence(self):
        """Verifies shelter deficit triggers auxiliary shelter activation under stress."""
        res = self.client.get("/api/decision/wb_s24parganas?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        shelter_opt = next((d for d in data["recommended_decisions"] if d["decision_id"] == "EMERGENCY_SHELTER_ACTIVATION"), None)
        self.assertIsNotNone(shelter_opt)
        self.assertGreater(shelter_opt["affected_population"], 10000)
        self.assertIn("shelter_deficit", shelter_opt["trigger_conditions"])
        print("PASS: Shelter deficit influence -> Triggers auxiliary shelter mobilization")

    def test_06_infrastructure_exposure_influence(self):
        """Verifies critical infrastructure protection lists specific monitored assets."""
        res = self.client.get("/api/decision/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        infra_opt = next((d for d in data["recommended_decisions"] if d["decision_id"] == "CRITICAL_INFRASTRUCTURE_PROTECTION"), None)
        self.assertIsNotNone(infra_opt)
        self.assertGreater(len(infra_opt["affected_infrastructure"]), 0)
        self.assertIn("Balasore 132/33kV Grid Station", infra_opt["affected_infrastructure"])
        print("PASS: Infrastructure exposure influence -> Specific critical assets monitored")

    def test_07_deterministic_repeated_evaluation(self):
        """Verifies 100% deterministic repeatability (identical outputs for identical inputs)."""
        res1 = self.client.get("/api/decision/od_balasore?step_id=NOW").json()
        res2 = self.client.get("/api/decision/od_balasore?step_id=NOW").json()

        self.assertEqual(res1["risk_score"], res2["risk_score"])
        self.assertEqual(res1["risk_band"], res2["risk_band"])
        self.assertEqual(res1["priority"], res2["priority"])
        self.assertEqual(
            [d["decision_id"] for d in res1["recommended_decisions"]],
            [d["decision_id"] for d in res2["recommended_decisions"]]
        )
        print("PASS: Deterministic repeated evaluation -> Zero variance confirmed")

    def test_08_invalid_district_404(self):
        """Verifies clean 404 response for unknown district IDs."""
        res = self.client.get("/api/decision/unknown_district_xyz")
        self.assertEqual(res.status_code, 404)
        print("PASS: Invalid district -> 404 Not Found")

    def test_09_malformed_input_422(self):
        """Verifies 422 Unprocessable Entity for malformed evaluate payloads."""
        res = self.client.post("/api/decision/evaluate", json={"invalid_field": 123})
        self.assertEqual(res.status_code, 422)
        print("PASS: Malformed input -> 422 Unprocessable Entity")

    def test_10_provenance_preservation(self):
        """Verifies explicit provenance preservation indicating TypeSafe JEV deterministic engine."""
        res = self.client.get("/api/decision/od_balasore")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("[DECISION INTELLIGENCE]", data["provenance"])
        self.assertIn("TypeSafe JEV", data["provenance"])
        print("PASS: Provenance preservation -> Explicit TypeSafe JEV tag verified")

    def test_11_human_approval_flag_and_no_autonomous_claims(self):
        """Verifies strict Human-in-the-Loop policy: requires_human_approval=True on all outputs."""
        res = self.client.get("/api/decision/od_balasore")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["requires_human_approval"])
        for d in data["recommended_decisions"]:
            self.assertTrue(d["requires_human_approval"])
            self.assertNotEqual(d["status"], "EXECUTED")
            self.assertNotEqual(d["status"], "COMPLETED")
            self.assertIn(d["status"], ["REQUIRES_APPROVAL", "RECOMMENDED", "READY", "NOT_TRIGGERED"])

        print("PASS: Governance & Safety -> Mandatory Human Approval & No Autonomous Action Claims")

    def test_12_config_and_all_endpoints(self):
        """Verifies /api/decision/config and /api/decision/all endpoints."""
        res_cfg = self.client.get("/api/decision/config")
        self.assertEqual(res_cfg.status_code, 200)
        cfg = res_cfg.json()
        self.assertIn("policies", cfg)
        self.assertIn("thresholds", cfg)
        self.assertFalse(cfg["governance"]["autonomous_execution_allowed"])

        res_all = self.client.get("/api/decision/all")
        self.assertEqual(res_all.status_code, 200)
        all_districts = res_all.json()
        self.assertEqual(len(all_districts), 8)
        print(f"PASS: /api/decision/config & /api/decision/all -> {len(all_districts)} districts evaluated")


if __name__ == "__main__":
    unittest.main()
