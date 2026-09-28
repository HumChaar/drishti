"""
DRISHTI Stage 5: JEV / TypeSafe Decision Intelligence Verification Suite
Validates:
1. Deterministic Output (Zero drift across multiple runs)
2. Typed Pydantic Schema Validation (DecisionContext, DecisionOption, DecisionConstraint, DecisionEvidence, DecisionRecommendation)
3. Decision Threshold Logic (PolicyRule trigger evaluation)
4. Extreme-Risk Scenario (Evacuation & shelter escalation under severe threat)
5. Low-Risk Scenario (Routine monitoring, baseline readiness)
6. Constraint Handling (Precondition evaluation & deferred decision explanations)
7. Human Approval Requirement (Mandatory Human-in-the-Loop policy)
8. RECOMMENDED != EXECUTED Separation (execution_status is strictly NOT_EXECUTED)
9. API Endpoints (GET /api/decision/{id}, GET /api/decision/config, POST /api/decision/evaluate)
10. Stage 4 Regression (Evidence Layer & Transparent Risk Engine intact)
"""

import json
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import (
    DecisionContext,
    DecisionOption,
    DecisionConstraint,
    DecisionEvidence,
    DecisionRecommendation,
    DecisionType,
    DecisionPriority,
    RecommendationStatus,
    ExecutionStatus
)
from app.services.decision_service import decision_service


class TestStage5DecisionIntelligence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_deterministic_output(self):
        """Zero variance guarantee: identical inputs yield byte-identical decision recommendations."""
        res1 = self.client.get("/api/decision/od_balasore?step_id=NOW")
        res2 = self.client.get("/api/decision/od_balasore?step_id=NOW")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)

        data1 = res1.json()
        data2 = res2.json()

        # Ignore runtime timestamp and random uuid in decision_id
        for key in ["generated_at", "decision_id"]:
            data1.pop(key, None)
            data2.pop(key, None)

        self.assertEqual(data1, data2)
        print("PASS: test_01_deterministic_output -> Zero variance confirmed")

    def test_02_typed_schema_validation(self):
        """Validates that service output strictly conforms to Pydantic DecisionRecommendation schema."""
        raw_recommendation = decision_service.evaluate_district("od_balasore", step_id="NOW")
        self.assertIsInstance(raw_recommendation, DecisionRecommendation)

        # Validate inner collections
        self.assertGreater(len(raw_recommendation.recommended_decisions), 0)
        for opt in raw_recommendation.recommended_decisions:
            self.assertIsInstance(opt, DecisionOption)
            self.assertIsInstance(opt.decision_type, (DecisionType, str))
            self.assertIsInstance(opt.constraints, list)
            for c in opt.constraints:
                self.assertIsInstance(c, DecisionConstraint)
                self.assertIsInstance(c.is_satisfied, bool)
            self.assertIsInstance(opt.supporting_evidence, list)
            for ev in opt.supporting_evidence:
                self.assertIsInstance(ev, DecisionEvidence)

        if raw_recommendation.context:
            self.assertIsInstance(raw_recommendation.context, DecisionContext)

        print("PASS: test_02_typed_schema_validation -> Pydantic models validated successfully")

    def test_03_decision_threshold_logic(self):
        """Verifies policy threshold evaluation against centralized decision configurations."""
        config_res = self.client.get("/api/decision/config")
        self.assertEqual(config_res.status_code, 200)
        cfg = config_res.json()

        self.assertIn("thresholds", cfg)
        self.assertIn("policies", cfg)
        self.assertEqual(cfg["thresholds"]["extreme_risk_threshold"], 80)
        self.assertEqual(cfg["thresholds"]["high_risk_threshold"], 65)
        self.assertEqual(cfg["thresholds"]["moderate_risk_threshold"], 45)

        # Check policy catalog
        self.assertIn("EVACUATION_RECOMMENDATION", cfg["policies"])
        self.assertIn("EMERGENCY_SHELTER_ACTIVATION", cfg["policies"])
        print("PASS: test_03_decision_threshold_logic -> Threshold configuration verified")

    def test_04_extreme_risk_scenario(self):
        """Verifies candidate decisions generated under EXTREME risk (Balasore score >= 80)."""
        res = self.client.get("/api/decision/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["district_id"], "od_balasore")
        self.assertGreaterEqual(data["risk_score"], 80)
        self.assertIn(data["risk_band"], ["EXTREME", "CRITICAL"])
        self.assertEqual(data["priority"], "IMMEDIATE")

        dec_ids = [d["decision_id"] for d in data["recommended_decisions"]]
        self.assertIn("EVACUATION_RECOMMENDATION", dec_ids)
        self.assertIn("EMERGENCY_SHELTER_ACTIVATION", dec_ids)
        self.assertIn("CRITICAL_INFRASTRUCTURE_PROTECTION", dec_ids)

        # Check triggers and justification fields
        evac_opt = next(d for d in data["recommended_decisions"] if d["decision_id"] == "EVACUATION_RECOMMENDATION")
        self.assertEqual(evac_opt["decision_type"], "EVACUATION_ALERT")
        self.assertEqual(evac_opt["priority"], "IMMEDIATE")
        self.assertGreater(len(evac_opt["triggers"]), 0)
        self.assertIn("storm surge", " ".join(evac_opt["triggers"]).lower())
        self.assertIn("relevant_exposure", evac_opt)
        self.assertGreater(evac_opt["relevant_exposure"]["vulnerable_population"], 0)
        print("PASS: test_04_extreme_risk_scenario -> Emergency evacuation directives verified")

    def test_05_low_risk_scenario(self):
        """Verifies candidate decisions generated under LOW risk (Ganjam score < 45)."""
        res = self.client.get("/api/decision/od_ganjam?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["district_id"], "od_ganjam")
        self.assertLess(data["risk_score"], 45)
        self.assertEqual(data["risk_band"], "LOW")
        self.assertEqual(data["priority"], "ROUTINE")

        dec_ids = [d["decision_id"] for d in data["recommended_decisions"]]
        self.assertIn("ROUTINE_MONITORING", dec_ids)
        self.assertIn("SHELTER_READINESS_CHECK", dec_ids)
        self.assertNotIn("EVACUATION_RECOMMENDATION", dec_ids)
        print("PASS: test_05_low_risk_scenario -> Routine monitoring confirmed without emergency directives")

    def test_06_constraint_handling_and_deferred_decisions(self):
        """Verifies explicit constraint evaluation and why decisions were deferred."""
        res = self.client.get("/api/decision/od_ganjam?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("deferred_decisions", data)
        deferred = data["deferred_decisions"]
        self.assertGreater(len(deferred), 0)

        # Find deferred evacuation alert
        def_evac = next((d for d in deferred if "EVACUATION" in d["decision_id"]), None)
        self.assertIsNotNone(def_evac)
        self.assertEqual(def_evac["status"], "DEFERRED")
        self.assertGreater(len(def_evac["constraints"]), 0)

        # Verify failed constraint contains explicit reason
        failed_constraints = [c for c in def_evac["constraints"] if not c["is_satisfied"]]
        self.assertGreater(len(failed_constraints), 0)
        self.assertIn("below", failed_constraints[0]["explanation"].lower())
        print("PASS: test_06_constraint_handling_and_deferred_decisions -> Constraints & deferred explanations verified")

    def test_07_human_approval_requirement(self):
        """Verifies strict Human-in-the-Loop policy flags across top-level and item recommendations."""
        res = self.client.get("/api/decision/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["requires_human_approval"])
        self.assertTrue(data["human_approval_required"])
        self.assertTrue(data["direct_execution_prohibited"])

        for d in data["recommended_decisions"]:
            self.assertTrue(d["requires_human_approval"])
            self.assertTrue(d["human_approval_required"])

        print("PASS: test_07_human_approval_requirement -> Mandatory human incident commander approval verified")

    def test_08_recommended_not_executed_separation(self):
        """Verifies strict RECOMMENDED != EXECUTED separation."""
        res = self.client.get("/api/decision/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["execution_status"], "NOT_EXECUTED")
        for d in data["recommended_decisions"]:
            self.assertEqual(d["execution_status"], "NOT_EXECUTED")
            self.assertIn(d["status"], ["REQUIRES_APPROVAL", "RECOMMENDED", "READY"])
            self.assertNotIn("EXECUTED", d["status"])
            self.assertNotIn("COMPLETED", d["status"])

        print("PASS: test_08_recommended_not_executed_separation -> Separation of recommended from executed verified")

    def test_09_api_endpoints(self):
        """Tests /api/decision/* endpoints including single district, config, and evaluate."""
        # 1. District endpoint
        res_d = self.client.get("/api/decision/od_kendrapara?step_id=NOW")
        self.assertEqual(res_d.status_code, 200)
        self.assertEqual(res_d.json()["district_id"], "od_kendrapara")

        # 2. Config endpoint
        res_c = self.client.get("/api/decision/config")
        self.assertEqual(res_c.status_code, 200)

        # 3. Dynamic evaluate endpoint
        res_e = self.client.post("/api/decision/evaluate", json={
            "district_id": "od_balasore",
            "step_id": "NOW",
            "custom_surge_m": 3.0,
            "custom_rain_mm": 250.0,
            "custom_wind_kmh": 120
        })
        self.assertEqual(res_e.status_code, 200)
        e_data = res_e.json()
        self.assertGreaterEqual(e_data["risk_score"], 60)
        self.assertEqual(e_data["execution_status"], "NOT_EXECUTED")

        # 4. 404 for invalid district
        res_404 = self.client.get("/api/decision/non_existent_district_xyz")
        self.assertEqual(res_404.status_code, 404)

        print("PASS: test_09_api_endpoints -> All decision API routes responding correctly")

    def test_10_stage4_evidence_and_risk_regression(self):
        """Verifies Stage 4 Evidence Layer and Transparent Risk Engine endpoints remain intact."""
        res_ev = self.client.get("/api/risk/evidence/od_balasore")
        self.assertEqual(res_ev.status_code, 200)
        ev_data = res_ev.json()
        d_ev = ev_data.get("district", ev_data)
        self.assertIn("floodPerception", d_ev)
        self.assertIn("cycloneHazard", d_ev)

        res_exp = self.client.get("/api/risk/explain/od_balasore")
        self.assertEqual(res_exp.status_code, 200)
        exp_data = res_exp.json()
        self.assertIn("contributingFactors", exp_data)
        self.assertEqual(len(exp_data["contributingFactors"]), 5)

        res_cfg = self.client.get("/api/risk/config")
        self.assertEqual(res_cfg.status_code, 200)
        print("PASS: test_10_stage4_evidence_and_risk_regression -> Stage 4 endpoints functioning with zero regression")


if __name__ == "__main__":
    unittest.main()
