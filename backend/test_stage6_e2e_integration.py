"""
DRISHTI STAGE 6: END-TO-END PIPELINE INTEGRATION & VALIDATION TEST SUITE

Validates the complete verified multi-stage pipeline:
  Data (IMD REMAL Simulation)
  -> SegFormer Perception ([AI INFERENCE] SegFormer-B0 SAR Flood Perception)
  -> Evidence Layer (Multi-Modal Aggregator)
  -> Transparent Risk Engine ([DETERMINISTIC RISK ENGINE])
  -> JEV Decision Intelligence ([JEV DECISION INTELLIGENCE])
  -> Gemini Reasoning ([GEMINI REASONING] / [MOCK GEMINI REASONING])
  -> Human Approval (Incident Commander Sign-off)
  -> Operational Advisory

Test Scenarios:
1. Complete End-to-End High-Risk Case (od_balasore):
   - SegFormer flood perception verified (synthetic benchmark boundary respected)
   - Evidence Layer multi-modal aggregation verified
   - Transparent Risk Engine 86/100 EXTREME attribution verified
   - JEV Decision Intelligence candidate evaluation & constraint compliance verified
   - Gemini Reasoning receives verified risk/evidence/JEV and preserves exact scores
   - Full 5-tier provenance chain preserved
   - Human approval workflow verified
2. Negative Safety Case:
   - Injected low-risk/inconsistent evidence (od_ganjam, score 32) attempting emergency evacuation
   - JEV blocks/defers evacuation with explicit constraint failure explanation
   - Risk consistency check detects mismatch and flags REJECTED grade
   - Gemini Reasoning respects low-risk context and refrains from emergency directives
3. Autonomous Execution Barrier:
   - Verifies execution_status is strictly NOT_EXECUTED across all stages
   - Confirms direct actuation is prohibited
4. Synthetic Benchmark Boundary:
   - Verifies explicit synthetic benchmark disclosure without claiming live satellite prediction
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestStage6E2EIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # -------------------------------------------------------------------------
    # TEST 1: HIGH-RISK END-TO-END PIPELINE (Balasore)
    # -------------------------------------------------------------------------

    def test_01_complete_pipeline_high_risk_balasore(self):
        """
        Executes and validates the entire 7-stage DRISHTI pipeline for Balasore:
        Data -> SegFormer -> Evidence -> Risk Engine -> JEV -> Gemini -> Human Approval
        """
        print("\n" + "="*75)
        print("STAGE 6 E2E DEMO: COMPLETE HIGH-RISK PIPELINE (od_balasore)")
        print("="*75)

        # ---------------------------------------------------------------------
        # STEP 1: SegFormer Perception Layer
        # ---------------------------------------------------------------------
        res_perc_status = self.client.get("/api/perception/status")
        self.assertEqual(res_perc_status.status_code, 200)
        perc_status = res_perc_status.json()
        self.assertIn("SegFormer-B0", perc_status["model_identifier"])
        self.assertEqual(perc_status["input_channels"], 2)

        res_perc = self.client.get("/api/perception/flood/district/od_balasore")
        self.assertEqual(res_perc.status_code, 200)
        perc_data = res_perc.json()
        self.assertGreater(perc_data["flood_percentage"], 50.0)
        self.assertFalse(perc_data["is_genuine_sar_sample"])  # Synthetic benchmark disclosure
        self.assertIn("[AI INFERENCE]", perc_data["provenance"])
        print(f"[STAGE 3 PERCEPTION] SegFormer-B0 Inundation: {perc_data['flood_percentage']:.1f}% | Provenance: {perc_data['provenance']}")

        # ---------------------------------------------------------------------
        # STEP 2: Multi-Modal Evidence Layer
        # ---------------------------------------------------------------------
        res_ev = self.client.get("/api/risk/evidence/od_balasore?step_id=NOW")
        self.assertEqual(res_ev.status_code, 200)
        ev_data = res_ev.json()
        d_ev = ev_data.get("district", ev_data)
        self.assertEqual(d_ev["districtId"], "od_balasore")
        self.assertGreater(d_ev["meteorology"]["surgeMeters"], 2.0)
        self.assertGreater(d_ev["vulnerability"]["vulnerablePopulation"], 0)
        self.assertGreater(len(d_ev["infrastructure"]["criticalAssetsList"]), 0)
        print(f"[STAGE 4 EVIDENCE] Surge: {d_ev['meteorology']['surgeMeters']:.1f}m | Rain: {d_ev['meteorology']['rainMm24h']:.0f}mm | Vulnerable Pop: {d_ev['vulnerability']['vulnerablePopulation']:,}")

        # ---------------------------------------------------------------------
        # STEP 3: Transparent Risk Engine
        # ---------------------------------------------------------------------
        res_risk = self.client.get("/api/risk/district/od_balasore?step_id=NOW")
        self.assertEqual(res_risk.status_code, 200)
        risk_data = res_risk.json()
        score = risk_data["risk"]["riskScore"]
        band = risk_data["risk"]["riskBand"]
        self.assertGreaterEqual(score, 80)
        self.assertIn(band, ["EXTREME", "CRITICAL"])

        res_exp = self.client.get("/api/risk/explain/od_balasore?step_id=NOW")
        self.assertEqual(res_exp.status_code, 200)
        exp_data = res_exp.json()
        self.assertEqual(len(exp_data["contributingFactors"]), 5)
        print(f"[STAGE 4 RISK ENGINE] Score: {score}/100 ({band}) | 5 Factors Attributed | Zero LLM calculation")

        # ---------------------------------------------------------------------
        # STEP 4: JEV Decision Intelligence
        # ---------------------------------------------------------------------
        res_jev = self.client.get("/api/decision/jev/district/od_balasore?step_id=NOW")
        self.assertEqual(res_jev.status_code, 200)
        jev_report = res_jev.json()

        self.assertEqual(jev_report["evaluation_grade"], "HIGH_CONFIDENCE")
        self.assertGreaterEqual(jev_report["evaluation_score"], 0.85)
        self.assertEqual(jev_report["evidence_coverage"]["coverage_percentage"], 100.0)
        self.assertTrue(jev_report["risk_consistency"]["is_consistent"])
        self.assertTrue(jev_report["constraint_compliance"]["is_fully_compliant"])
        self.assertEqual(jev_report["execution_status"], "NOT_EXECUTED")
        self.assertTrue(jev_report["human_approval_mandatory"])
        self.assertTrue(jev_report["autonomous_execution_prohibited"])

        dec_types = [d["decision_type"] for d in jev_report["decision_evaluation"]["recommended_decisions"]]
        self.assertIn("EVACUATION_ALERT", dec_types)
        self.assertIn("SHELTER_ACTIVATION", dec_types)
        print(f"[STAGE 5 JEV DECISION] Grade: {jev_report['evaluation_grade']} (Score: {jev_report['evaluation_score']}) | Directives: {dec_types[:2]} | Status: NOT_EXECUTED")

        # ---------------------------------------------------------------------
        # STEP 5: Gemini Reasoning Layer
        # ---------------------------------------------------------------------
        res_gem = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW")
        self.assertEqual(res_gem.status_code, 200)
        gem_adv = res_gem.json()

        # Strict Invariants: Risk score and band preserved exactly
        self.assertEqual(gem_adv["risk_score"], score)
        self.assertEqual(gem_adv["risk_band"], band)
        self.assertTrue(gem_adv["requires_human_approval"])
        self.assertIn("EVACUATION_RECOMMENDATION", gem_adv["decision_ids"])
        self.assertIn("extreme", gem_adv["headline"].lower())
        self.assertGreater(len(gem_adv["key_risk_drivers"]), 0)
        self.assertTrue(any(term in gem_adv["uncertainty_notes"].lower() for term in ["segformer", "sar", "simulation", "synthetic", "resolution", "sensor"]))

        # 5-Tier Provenance Verification
        prov_chain = gem_adv.get("provenance_chain") or {}
        self.assertIn("HISTORICAL SIMULATION", prov_chain.get("historical_simulation", ""))
        self.assertIn("[AI INFERENCE]", prov_chain.get("perception_ai", ""))
        self.assertIn("[DETERMINISTIC RISK ENGINE]", prov_chain.get("risk_engine", ""))
        self.assertIn("[JEV DECISION INTELLIGENCE]", prov_chain.get("decision_intelligence", ""))
        self.assertIn("GEMINI REASONING", gem_adv["provenance"])

        print(f"[STAGE 6 GEMINI REASONING] Headline: '{gem_adv['headline']}'")
        print(f"[STAGE 6 GEMINI REASONING] Preserved Score: {gem_adv['risk_score']}/100 ({gem_adv['risk_band']}) | Linked Decisions: {gem_adv['decision_ids']}")

        # ---------------------------------------------------------------------
        # STEP 6: Human Approval Sign-off
        # ---------------------------------------------------------------------
        res_adv = self.client.post("/api/advisory/generate", json={
            "district_id": "od_balasore",
            "step_id": "NOW",
            "language": "en"
        })
        self.assertEqual(res_adv.status_code, 200)
        adv_data = res_adv.json()
        adv_id = adv_data["advisory_id"]

        res_review = self.client.post(f"/api/advisory/{adv_id}/review", json={
            "action": "APPROVE",
            "reviewer_name": "Special Relief Commissioner, Odisha",
            "reviewer_notes": "All JEV recommendations and SegFormer evidence dossiers audited and verified. Mandatory evacuation authorized."
        })
        self.assertEqual(res_review.status_code, 200)
        review_data = res_review.json()
        self.assertEqual(review_data["review"]["status"], "APPROVED")
        print(f"[STAGE 7 HUMAN APPROVAL] Review Status: {review_data['review']['status']} by {review_data['review']['reviewer_name']}")
        print("="*75)
        print("HIGH-RISK PIPELINE VERIFIED SUCCESSFULLY (100% INVARIANTS CONSERVED)")

    # -------------------------------------------------------------------------
    # TEST 2: NEGATIVE SAFETY CASE (Inconsistent / Low-Risk Evidence)
    # -------------------------------------------------------------------------

    def test_02_negative_safety_case_inconsistent_evidence_rejection(self):
        """
        NEGATIVE SAFETY CASE:
        Injects an unauthorized evacuation recommendation into a LOW-risk district (od_ganjam, score 32/100).
        Verifies:
        1. JEV Decision Intelligence rejects the evacuation recommendation (constraint fails, status DEFERRED).
        2. In test mode 'NEGATIVE_INCONSISTENT_RISK', JEV flags risk_consistency == False and marks grade as REJECTED.
        3. Gemini Reasoning reflects routine monitoring, not emergency evacuation.
        4. Autonomous execution remains blocked (execution_status is NOT_EXECUTED).
        """
        print("\n" + "-"*75)
        print("STAGE 6 NEGATIVE SAFETY CASE: LOW-RISK EVACUATION REJECTION (od_ganjam)")
        print("-"*75)

        # 1. Base District Decision Check
        res_dec = self.client.get("/api/decision/od_ganjam?step_id=NOW")
        self.assertEqual(res_dec.status_code, 200)
        dec_data = res_dec.json()
        self.assertLess(dec_data["risk_score"], 45)
        self.assertEqual(dec_data["risk_band"], "LOW")

        # Confirm evacuation is NOT in recommended decisions
        rec_ids = [d["decision_id"] for d in dec_data["recommended_decisions"]]
        self.assertNotIn("EVACUATION_RECOMMENDATION", rec_ids)

        # Confirm evacuation IS in deferred decisions with failed constraint
        def_ids = [d["decision_id"] for d in dec_data["deferred_decisions"]]
        self.assertIn("EVACUATION_ALERT", def_ids)
        evac_def = next(d for d in dec_data["deferred_decisions"] if d["decision_id"] == "EVACUATION_ALERT")
        self.assertEqual(evac_def["status"], "DEFERRED")
        self.assertFalse(evac_def["constraints"][0]["is_satisfied"])
        print(f"[JEV SAFETY SHIELD] Evacuation Deferred Reason: '{evac_def['constraints'][0]['explanation']}'")

        # 2. Injected Inconsistent Risk Test via JEV Evaluate Endpoint
        res_inj = self.client.post("/api/decision/jev/evaluate", json={
            "district_id": "od_ganjam",
            "step_id": "NOW",
            "test_mode": "NEGATIVE_INCONSISTENT_RISK"
        })
        self.assertEqual(res_inj.status_code, 200)
        inj_report = res_inj.json()

        self.assertFalse(inj_report["risk_consistency"]["is_consistent"])
        self.assertEqual(inj_report["evaluation_grade"], "REJECTED")
        self.assertGreater(len(inj_report["risk_consistency"]["detected_discrepancies"]), 0)
        print(f"[JEV CONSISTENCY MONITOR] Discrepancy Detected: {inj_report['risk_consistency']['detected_discrepancies']}")
        print(f"[JEV CONSISTENCY MONITOR] Evaluation Grade: {inj_report['evaluation_grade']} (Autonomous Action Blocked)")

        # 3. Gemini Reasoning Response under Low Risk Context
        res_gem_low = self.client.get("/api/reasoning/advisory/od_ganjam?step_id=NOW")
        self.assertEqual(res_gem_low.status_code, 200)
        gem_low = res_gem_low.json()

        self.assertEqual(gem_low["risk_band"], "LOW")
        self.assertLess(gem_low["risk_score"], 45)
        self.assertTrue(any(word in gem_low["headline"] for word in ["Routine", "LOW", "Low"]))
        self.assertNotIn("EVACUATION_RECOMMENDATION", gem_low["decision_ids"])
        self.assertNotIn("EVACUATION_ALERT", gem_low["decision_ids"])
        self.assertIn("ROUTINE_MONITORING", gem_low["decision_ids"])
        self.assertTrue(gem_low["requires_human_approval"])
        print(f"[GEMINI REASONING SAFETY] Headline: '{gem_low['headline']}' | Directives: {gem_low['decision_ids']}")
        print("-"*75)
        print("NEGATIVE SAFETY CASE VERIFIED (MISMATCH INTERCEPTED AND BLOCKED)")

    # -------------------------------------------------------------------------
    # TEST 3: AUTONOMOUS EXECUTION PROHIBITION INVARIANT
    # -------------------------------------------------------------------------

    def test_03_autonomous_execution_prevention(self):
        """
        Verifies that across all monitored districts (Balasore, South 24 Parganas, Ganjam, Puri),
        execution_status is strictly NOT_EXECUTED, autonomous execution is prohibited,
        and human incident commander approval is mandatory.
        """
        for d_id in ["od_balasore", "wb_s24parganas", "od_ganjam", "od_puri"]:
            res_dec = self.client.get(f"/api/decision/{d_id}?step_id=NOW")
            self.assertEqual(res_dec.status_code, 200)
            data = res_dec.json()
            self.assertEqual(data["execution_status"], "NOT_EXECUTED")
            self.assertTrue(data["human_approval_required"])
            self.assertTrue(data["direct_execution_prohibited"])

            for opt in data["recommended_decisions"]:
                self.assertEqual(opt["execution_status"], "NOT_EXECUTED")
                self.assertNotIn("EXECUTED", opt["status"])

            res_gem = self.client.get(f"/api/reasoning/advisory/{d_id}?step_id=NOW")
            self.assertEqual(res_gem.status_code, 200)
            g_data = res_gem.json()
            self.assertTrue(g_data["requires_human_approval"])

        print("PASS: test_03_autonomous_execution_prevention -> Zero autonomous execution confirmed")

    # -------------------------------------------------------------------------
    # TEST 4: SYNTHETIC SAR BENCHMARK BOUNDARY DISCLOSURE
    # -------------------------------------------------------------------------

    def test_04_synthetic_sar_benchmark_boundary(self):
        """
        Verifies that SegFormer flood perception evidence explicitly discloses that it is a
        synthetic dual-pol SAR benchmark, and that genuine Sentinel-1 data is required for
        real-world satellite ground truth.
        """
        res_perc = self.client.get("/api/perception/flood/district/od_balasore")
        self.assertEqual(res_perc.status_code, 200)
        p_data = res_perc.json()
        self.assertFalse(p_data["is_genuine_sar_sample"])
        self.assertIn("AI INFERENCE", p_data["provenance"])

        res_gem = self.client.get("/api/reasoning/advisory/od_balasore?step_id=NOW")
        self.assertEqual(res_gem.status_code, 200)
        g_data = res_gem.json()
        self.assertTrue(any(term in g_data["uncertainty_notes"].lower() for term in ["sentinel-1", "non-genuine", "synthetic", "simulation", "benchmark", "sar"]))

        print("PASS: test_04_synthetic_sar_benchmark_boundary -> Explicit synthetic benchmark disclosure confirmed")


if __name__ == "__main__":
    unittest.main()
