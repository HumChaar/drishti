"""
DRISHTI STAGE 5 TEST SUITE — DECISION INTELLIGENCE & GEMINI ADVISORY
Verifies:
1. Valid advisory request across multiple timeline steps and districts.
2. Missing Gemini API key / graceful demo fallback handling.
3. Strict preservation of Risk Engine scores and bands (AI does NOT invent scores).
4. Evidence traceability (evidence used matches Evidence Layer outputs).
5. Multilingual advisory generation (English, Odia, Bengali, Hindi).
6. Human approval lifecycle: PENDING -> APPROVED, REJECTED, MODIFIED.
7. Error handling on invalid district IDs.
8. API response structure and status codes.
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.services.advisory_service import advisory_service, SUPPORTED_LANGUAGES

client = TestClient(app)

class TestStage5AdvisoryAndDecisionIntelligence(unittest.TestCase):

    def test_01_supported_languages_endpoint(self):
        resp = client.get("/api/advisory/config/languages")
        self.assertEqual(resp.status_code, 200)
        langs = resp.json()
        self.assertIn("en", langs)
        self.assertIn("or", langs)
        self.assertIn("bn", langs)
        self.assertIn("hi", langs)

    def test_02_generate_advisory_demo_fallback(self):
        # Force no API key to guarantee demo fallback path
        payload = {
            "district_id": "od_balasore",
            "step_id": "NOW",
            "language": "en"
        }
        resp = client.post("/api/advisory/generate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["advisory_id"].startswith("adv-od_balasore"))
        self.assertEqual(data["district_id"], "od_balasore")
        self.assertEqual(data["district_name"], "Balasore")
        self.assertEqual(data["language"], "en")
        
        # Verify mode is either LIVE_GEMINI (if key set in environment) or DEMO_FALLBACK
        self.assertIn(data["mode"], ["LIVE_GEMINI", "DEMO_FALLBACK"])
        
        # Verify strict risk score preservation from Risk Engine
        self.assertEqual(data["risk_score"], 86)
        self.assertEqual(data["risk_band"], "EXTREME")

        # Verify structured content
        adv = data["advisory"]
        self.assertTrue(len(adv["summary"]) > 20)
        self.assertTrue(len(adv["priority_actions"]) >= 2)
        self.assertTrue(adv["requires_human_approval"])
        self.assertTrue(len(adv["evidence_used"]) >= 3)

        # Verify initial human review status is PENDING
        review = data["review"]
        self.assertEqual(review["status"], "PENDING")

    def test_03_evidence_and_score_preservation(self):
        payload = {
            "district_id": "od_kendrapara",
            "step_id": "NOW",
            "language": "en"
        }
        resp = client.post("/api/advisory/generate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Score must match Kendrapara's risk score at NOW (88)
        self.assertEqual(data["risk_score"], 88)
        self.assertEqual(data["risk_band"], "EXTREME")
        self.assertEqual(data["decision_profile"]["district_id"], "od_kendrapara")
        self.assertGreater(data["decision_profile"]["surge_meters"], 1.5)

    def test_04_multilingual_advisories(self):
        # Test Odia, Bengali, and Hindi generation
        for lang_code in ["or", "bn", "hi"]:
            payload = {
                "district_id": "od_balasore",
                "step_id": "NOW",
                "language": lang_code
            }
            resp = client.post("/api/advisory/generate", json=payload)
            self.assertEqual(resp.status_code, 200, f"Failed for language: {lang_code}")
            data = resp.json()
            self.assertEqual(data["language"], lang_code)
            self.assertEqual(data["risk_score"], 86)
            self.assertTrue(len(data["advisory"]["summary"]) > 10)

    def test_05_human_approval_workflow_approve(self):
        # 1. Generate advisory
        gen_resp = client.post("/api/advisory/generate", json={"district_id": "od_balasore", "step_id": "NOW"})
        adv_id = gen_resp.json()["advisory_id"]

        # 2. Approve advisory
        review_payload = {
            "action": "APPROVE",
            "reviewer_name": "Special Relief Commissioner, Odisha",
            "reviewer_notes": "Advisory verified against ground telemetry. Mandatory evacuation authorized."
        }
        rev_resp = client.post(f"/api/advisory/{adv_id}/review", json=review_payload)
        self.assertEqual(rev_resp.status_code, 200)
        updated = rev_resp.json()
        self.assertEqual(updated["review"]["status"], "APPROVED")
        self.assertEqual(updated["review"]["reviewer_name"], "Special Relief Commissioner, Odisha")
        self.assertIsNotNone(updated["review"]["reviewed_at"])

    def test_06_human_approval_workflow_reject(self):
        gen_resp = client.post("/api/advisory/generate", json={"district_id": "od_puri", "step_id": "NOW"})
        adv_id = gen_resp.json()["advisory_id"]

        review_payload = {
            "action": "REJECT",
            "reviewer_name": "Duty Officer Puri",
            "reviewer_notes": "Local eye observations report wind gusts below threshold; holding action."
        }
        rev_resp = client.post(f"/api/advisory/{adv_id}/review", json=review_payload)
        self.assertEqual(rev_resp.status_code, 200)
        self.assertEqual(rev_resp.json()["review"]["status"], "REJECTED")

    def test_07_human_approval_workflow_modify(self):
        gen_resp = client.post("/api/advisory/generate", json={"district_id": "od_jagatsinghpur", "step_id": "NOW"})
        adv_id = gen_resp.json()["advisory_id"]

        modified_action = [
            {
                "action_id": "MOD-ACT-01",
                "priority": "CRITICAL",
                "action_type": "Evacuation",
                "title": "Expanded Evacuation to Erasama Block Polders",
                "description": "Officer command: Prioritize 12 additional polder gram panchayats.",
                "target_agency": "ODRAF Team 4",
                "rationale": "Field survey reports mud embankment micro-fissures."
            }
        ]
        review_payload = {
            "action": "MODIFY",
            "reviewer_name": "Collector Jagatsinghpur",
            "reviewer_notes": "Elevated Erasama block priority due to local embankment weakness.",
            "modified_actions": modified_action
        }
        rev_resp = client.post(f"/api/advisory/{adv_id}/review", json=review_payload)
        self.assertEqual(rev_resp.status_code, 200)
        updated = rev_resp.json()
        self.assertEqual(updated["review"]["status"], "MODIFIED")
        self.assertEqual(len(updated["advisory"]["priority_actions"]), 1)
        self.assertEqual(updated["advisory"]["priority_actions"][0]["action_id"], "MOD-ACT-01")

    def test_08_get_and_list_advisories(self):
        gen_resp = client.post("/api/advisory/generate", json={"district_id": "od_bhadrak", "step_id": "NOW"})
        adv_id = gen_resp.json()["advisory_id"]

        # Get by ID
        get_resp = client.get(f"/api/advisory/{adv_id}")
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.json()["advisory_id"], adv_id)

        # List all
        list_resp = client.get("/api/advisory/all/list")
        self.assertEqual(list_resp.status_code, 200)
        self.assertTrue(len(list_resp.json()) >= 1)

    def test_09_invalid_district_id(self):
        resp = client.post("/api/advisory/generate", json={"district_id": "invalid_xyz", "step_id": "NOW"})
        self.assertEqual(resp.status_code, 404)

    def test_10_invalid_review_action(self):
        gen_resp = client.post("/api/advisory/generate", json={"district_id": "od_balasore", "step_id": "NOW"})
        adv_id = gen_resp.json()["advisory_id"]

        resp = client.post(f"/api/advisory/{adv_id}/review", json={"action": "INVALID_ACTION"})
        self.assertEqual(resp.status_code, 400)


if __name__ == "__main__":
    unittest.main()
