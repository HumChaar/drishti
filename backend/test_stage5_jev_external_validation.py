"""
DRISHTI STAGE 5: JEV DECISION INTELLIGENCE + EXTERNAL VALIDATION
Mentor-Facing Demonstration & Executive Test Suite

Pillars Demonstrated:
1. Decision Evaluation: Candidate operational options, priorities, and triggers
2. Evaluation Score: Quantified composite confidence (0.0 to 1.0) and validation grade
3. Evidence Coverage: Multi-modal coverage (SAR flood, surge, wind, vuln, infra)
4. Risk Consistency: Alignment between Transparent Risk Engine and decision urgency
5. Constraint Compliance: Precondition satisfaction and autonomous execution prevention
6. Auditable Explanation: Plain-text trace from Evidence -> Risk -> Threshold -> Recommendation

Test Matrix:
- Positive Test Cases:
  * test_01_mentor_positive_extreme_risk_balasore (Extreme risk scenario)
  * test_02_mentor_positive_high_risk_kendrapara (High risk preparedness scenario)
  * test_03_mentor_positive_low_risk_ganjam (Low risk deferred decisions scenario)
- Negative Test Cases:
  * test_04_mentor_negative_inconsistent_risk_injection (Risk-decision mismatch detection)
  * test_05_mentor_negative_deficient_evidence (Missing sensor/perception penalty)
  * test_06_mentor_negative_autonomous_execution_attempt (Direct execution blocking)
  * test_07_mentor_negative_invalid_district (404 error handling)
- API Integration:
  * test_08_jev_fastapi_endpoints (GET & POST /api/decision/jev/* endpoints)
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import (
    JEVEvaluationReport,
    JEVEvaluationRequest,
    EvidenceCoverageSummary,
    RiskConsistencyCheck,
    ConstraintComplianceSummary
)
from app.services.decision_service import decision_service


class TestStage5JEVExternalValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # -------------------------------------------------------------------------
    # POSITIVE TEST CASES
    # -------------------------------------------------------------------------

    def test_01_mentor_positive_extreme_risk_balasore(self):
        """
        MENTOR EVALUATION 1: EXTREME RISK SCENARIO (Balasore)
        Demonstrates:
        - Decision Evaluation: Mandatory evacuation & shelter auxiliary activation
        - Evaluation Score: HIGH_CONFIDENCE (score >= 0.85)
        - Evidence Coverage: 100% Complete (SAR flood, surge, wind, vuln, infra)
        - Risk Consistency: Consistent with 86/100 EXTREME risk score
        - Constraint Compliance: 100% of active constraints satisfied
        - Auditable Explanation: Full evidence-to-policy trace
        """
        res = self.client.get("/api/decision/jev/district/od_balasore?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        report = res.json()

        print("\n" + "="*70)
        print("JEV MENTOR DEMO 1: EXTREME RISK (od_balasore)")
        print(f"District: {report['district_name']} | Score: {report['evaluation_score']} | Grade: {report['evaluation_grade']}")
        print(f"Evidence Coverage: {report['evidence_coverage']['coverage_percentage']}% ({report['evidence_coverage']['coverage_tier']})")
        print(f"Risk Consistency: {'CONSISTENT' if report['risk_consistency']['is_consistent'] else 'INCONSISTENT'}")
        print(f"Constraint Compliance: {report['constraint_compliance']['compliance_rate_pct']}%")
        print("="*70)

        # 1. Decision Evaluation
        dec = report["decision_evaluation"]
        self.assertEqual(dec["risk_band"], "EXTREME")
        self.assertGreaterEqual(dec["risk_score"], 80)
        self.assertEqual(dec["priority"], "IMMEDIATE")
        dec_types = [d["decision_type"] for d in dec["recommended_decisions"]]
        self.assertIn("EVACUATION_ALERT", dec_types)
        self.assertIn("SHELTER_ACTIVATION", dec_types)

        # 2. Evaluation Score
        self.assertGreaterEqual(report["evaluation_score"], 0.85)
        self.assertEqual(report["evaluation_grade"], "HIGH_CONFIDENCE")

        # 3. Evidence Coverage
        cov = report["evidence_coverage"]
        self.assertEqual(cov["coverage_percentage"], 100.0)
        self.assertEqual(cov["coverage_tier"], "COMPLETE")
        self.assertTrue(cov["sar_perception_verified"])
        self.assertTrue(cov["meteorology_verified"])
        self.assertTrue(cov["vulnerability_verified"])
        self.assertEqual(len(cov["missing_modalities"]), 0)

        # 4. Risk Consistency
        cons = report["risk_consistency"]
        self.assertTrue(cons["is_consistent"])
        self.assertEqual(cons["consistency_score"], 1.0)
        self.assertEqual(len(cons["detected_discrepancies"]), 0)

        # 5. Constraint Compliance
        comp = report["constraint_compliance"]
        self.assertTrue(comp["is_fully_compliant"])
        self.assertEqual(comp["compliance_rate_pct"], 100.0)
        self.assertTrue(comp["autonomous_execution_blocked"])
        self.assertTrue(comp["human_approval_enforced"])

        # 6. Auditable Explanation
        self.assertIn("JEV Decision Intelligence Audit", report["auditable_explanation"])
        self.assertIn("Grounded in Transparent Risk Engine score", report["auditable_explanation"])
        self.assertIn("NOT_EXECUTED", report["auditable_explanation"])

        # Provenance Distinction
        self.assertIn("[JEV DECISION INTELLIGENCE]", report["provenance"])
        self.assertIn("HISTORICAL_SIMULATION_REMAL_2024", report["provenance_breakdown"]["historical_simulation"])
        self.assertIn("SegFormer", report["provenance_breakdown"]["perception_ai"])
        self.assertIn("Transparent", report["provenance_breakdown"]["risk_engine"])

        print("PASS: test_01_mentor_positive_extreme_risk_balasore verified")

    def test_02_mentor_positive_high_risk_kendrapara(self):
        """
        MENTOR EVALUATION 2: HIGH RISK SCENARIO (Kendrapara at T-24h)
        Demonstrates targeted preparedness (pre-stocking shelters, road de-watering QRT)
        consistent with HIGH risk score (65-79).
        """
        res = self.client.get("/api/decision/jev/district/od_kendrapara?step_id=T-24h")
        self.assertEqual(res.status_code, 200)
        report = res.json()

        self.assertEqual(report["evaluation_grade"], "HIGH_CONFIDENCE")
        self.assertGreaterEqual(report["evaluation_score"], 0.85)

        dec = report["decision_evaluation"]
        self.assertEqual(dec["risk_band"], "HIGH")
        self.assertEqual(dec["priority"], "HIGH")

        # Evacuation should be PREPARE_EVACUATION, not full mandatory zone clearance
        dec_ids = [d["decision_id"] for d in dec["recommended_decisions"]]
        self.assertIn("PREPARE_EVACUATION", dec_ids)
        self.assertIn("INCREASE_SHELTER_READINESS", dec_ids)
        self.assertIn("EMERGENCY_COORDINATION", dec_ids)

        self.assertTrue(report["risk_consistency"]["is_consistent"])
        self.assertTrue(report["constraint_compliance"]["is_fully_compliant"])
        print("PASS: test_02_mentor_positive_high_risk_kendrapara verified")

    def test_03_mentor_positive_low_risk_ganjam(self):
        """
        MENTOR EVALUATION 3: LOW RISK SCENARIO (Ganjam)
        Demonstrates deferred decision handling: mandatory evacuation is deferred with
        clear audit explanation because min_risk_threshold (>= 80) is not met.
        """
        res = self.client.get("/api/decision/jev/district/od_ganjam?step_id=NOW")
        self.assertEqual(res.status_code, 200)
        report = res.json()

        self.assertEqual(report["evaluation_grade"], "HIGH_CONFIDENCE")
        dec = report["decision_evaluation"]
        self.assertEqual(dec["risk_band"], "LOW")
        self.assertEqual(dec["priority"], "ROUTINE")

        # Verify active decisions are routine
        active_ids = [d["decision_id"] for d in dec["recommended_decisions"]]
        self.assertIn("ROUTINE_MONITORING", active_ids)
        self.assertNotIn("EVACUATION_RECOMMENDATION", active_ids)

        # Verify deferred decisions explain why evacuation was not triggered
        deferred = dec["deferred_decisions"]
        self.assertGreater(len(deferred), 0)
        def_evac = next((d for d in deferred if "EVACUATION" in d["decision_id"]), None)
        self.assertIsNotNone(def_evac)
        self.assertEqual(def_evac["status"], "DEFERRED")
        self.assertIn("below", def_evac["constraints"][0]["explanation"].lower())

        print("PASS: test_03_mentor_positive_low_risk_ganjam verified")

    # -------------------------------------------------------------------------
    # NEGATIVE TEST CASES
    # -------------------------------------------------------------------------

    def test_04_mentor_negative_inconsistent_risk_injection(self):
        """
        MENTOR EVALUATION 4 (NEGATIVE): INCONSISTENT DECISION-RISK INJECTION
        Simulates injecting an unauthorized mandatory evacuation directive into a LOW risk context.
        Verifies JEV flags discrepancy, lowers consistency score, and marks report as REJECTED.
        """
        res = self.client.post("/api/decision/jev/evaluate", json={
            "district_id": "od_ganjam",
            "step_id": "NOW",
            "test_mode": "NEGATIVE_INCONSISTENT_RISK"
        })
        self.assertEqual(res.status_code, 200)
        report = res.json()

        print("\n" + "-"*70)
        print("JEV NEGATIVE DEMO 4: INCONSISTENT RISK INJECTION")
        print(f"Risk Consistency: {report['risk_consistency']['is_consistent']}")
        print(f"Consistency Score: {report['risk_consistency']['consistency_score']}")
        print(f"Discrepancies: {report['risk_consistency']['detected_discrepancies']}")
        print(f"Evaluation Grade: {report['evaluation_grade']}")
        print("-" * 70)

        self.assertFalse(report["risk_consistency"]["is_consistent"])
        self.assertLessEqual(report["risk_consistency"]["consistency_score"], 0.30)
        self.assertGreater(len(report["risk_consistency"]["detected_discrepancies"]), 0)
        self.assertEqual(report["evaluation_grade"], "REJECTED")
        print("PASS: test_04_mentor_negative_inconsistent_risk_injection successfully rejected")

    def test_05_mentor_negative_deficient_evidence(self):
        """
        MENTOR EVALUATION 5 (NEGATIVE): DEFICIENT EVIDENCE COVERAGE
        Simulates stripped SAR flood perception and missing meteorology telemetry.
        Verifies evidence coverage drops, missing modalities are flagged, and grade drops.
        """
        res = self.client.post("/api/decision/jev/evaluate", json={
            "district_id": "od_balasore",
            "step_id": "NOW",
            "test_mode": "NEGATIVE_DEFICIENT_EVIDENCE"
        })
        self.assertEqual(res.status_code, 200)
        report = res.json()

        cov = report["evidence_coverage"]
        self.assertLess(cov["coverage_percentage"], 80.0)
        self.assertIn(cov["coverage_tier"], ["PARTIAL", "DEFICIENT"])
        self.assertFalse(cov["sar_perception_verified"])
        self.assertIn("flood_perception", cov["missing_modalities"])
        self.assertIn("meteorology", cov["missing_modalities"])
        self.assertIn(report["evaluation_grade"], ["LOW_CONFIDENCE", "REJECTED"])

        print("PASS: test_05_mentor_negative_deficient_evidence successfully penalized")

    def test_06_mentor_negative_autonomous_execution_attempt(self):
        """
        MENTOR EVALUATION 6 (NEGATIVE): AUTONOMOUS EXECUTION ATTEMPT BLOCKED
        Simulates an unauthorized attempt to autonomously execute emergency actions without
        human incident commander approval.
        Verifies JEV safety constraint guardrails block the evaluation.
        """
        res = self.client.post("/api/decision/jev/evaluate", json={
            "district_id": "od_balasore",
            "step_id": "NOW",
            "test_mode": "NEGATIVE_AUTONOMOUS_ATTEMPT"
        })
        self.assertEqual(res.status_code, 200)
        report = res.json()

        comp = report["constraint_compliance"]
        self.assertFalse(comp["is_fully_compliant"])
        self.assertEqual(report["evaluation_grade"], "REJECTED")
        self.assertEqual(report["execution_status"], "NOT_EXECUTED")
        self.assertTrue(report["autonomous_execution_prohibited"])
        self.assertTrue(report["human_approval_mandatory"])

        print("PASS: test_06_mentor_negative_autonomous_execution_attempt safety barrier verified")

    def test_07_mentor_negative_invalid_district(self):
        """
        MENTOR EVALUATION 7 (NEGATIVE): INVALID DISTRICT ID
        Verifies 404 response when querying unregistered district.
        """
        res = self.client.get("/api/decision/jev/district/invalid_coastal_district_xyz")
        self.assertEqual(res.status_code, 404)
        print("PASS: test_07_mentor_negative_invalid_district -> 404 returned correctly")

    # -------------------------------------------------------------------------
    # API ENDPOINT VALIDATION
    # -------------------------------------------------------------------------

    def test_08_jev_fastapi_endpoints(self):
        """
        MENTOR EVALUATION 8: FASTAPI ENDPOINT FUNCTIONALITY
        Validates:
        - GET /api/decision/jev/district/{district_id}
        - POST /api/decision/jev/evaluate
        - POST /api/decision/jev/validate
        """
        # 1. District endpoint
        res1 = self.client.get("/api/decision/jev/district/od_puri?step_id=NOW")
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["district_id"], "od_puri")

        # 2. Evaluate endpoint with custom surge and wind
        res2 = self.client.post("/api/decision/jev/evaluate", json={
            "district_id": "od_balasore",
            "step_id": "NOW",
            "custom_surge_m": 2.9,
            "custom_wind_kmh": 115
        })
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["district_id"], "od_balasore")

        # 3. Validate endpoint (mentor harness alias)
        res3 = self.client.post("/api/decision/jev/validate", json={
            "district_id": "wb_s24parganas",
            "step_id": "NOW"
        })
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json()["district_id"], "wb_s24parganas")

        print("PASS: test_08_jev_fastapi_endpoints -> All JEV endpoints verified")


if __name__ == "__main__":
    unittest.main()
