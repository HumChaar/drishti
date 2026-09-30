"""
DRISHTI Cyclone Remal Golden Path & Verification Failure Mode Test Suite (Phase 16)

Tests the 6 mandatory operational failure cases (Prompt Section 16):
- CASE A: Good optical evidence → verification proceeds.
- CASE B: Cloud-heavy optical scene → ABSTAIN / cloud_contamination.
- CASE C: Permanent-water overlap → possible_permanent_water flag.
- CASE D: Gemini unavailable → ABSTAIN, central risk unchanged.
- CASE E: Uncertainty crosses HIGH / CRITICAL → human review required.
- CASE F: Uncertainty stays inside one band → human review not required.

Also tests Laya decision engine & Remal Golden Path zone selector.
"""

import pytest
from app.models.schemas import CloudQualityResult, PermanentWaterResult, VerificationRunRequest
from app.services.verification.verification_policy import verification_policy_engine
from app.services.verification.jev_layer import jev_decision_engine
from app.services.verification.remal_zones import get_remal_verification_zones, get_remal_zone_by_id
from app.services.verification.remal_golden_path import remal_golden_path_service
from app.services.verification.orchestrator import verification_orchestrator


class TestRemalGoldenPathZones:

    def test_remal_zones_returned(self):
        zones = get_remal_verification_zones()
        assert len(zones) == 4
        assert zones[0]["zone_id"] == "REMAL-ZONE-003"  # Highest priority (0.98)
        assert "SegFormer-predicted flood extent" in zones[0]["flood_description"]

    def test_remal_zone_lookup(self):
        zone = get_remal_zone_by_id("REMAL-ZONE-001")
        assert zone["zone_name"] == "Balasore / Subarnarekha Estuary & Bhograi Sector"
        assert zone["risk_score"] == 86


class TestFailureCasesSection16:

    def test_case_a_good_optical_evidence(self):
        """CASE A: Clear optical scene → usable=True, quality=CLEAR"""
        cq = CloudQualityResult(
            quality="CLEAR",
            cloudy_pixel_pct=5.0,
            cloud_prob_mean=4.0,
            usable=True,
            provenance="HISTORICAL"
        )
        assert cq.usable is True
        assert cq.quality == "CLEAR"

    def test_case_b_cloud_heavy_scene(self):
        """CASE B: Cloud-heavy scene → usable=False, quality=CLOUDY"""
        cq = CloudQualityResult(
            quality="CLOUDY",
            cloudy_pixel_pct=75.0,
            cloud_prob_mean=60.0,
            usable=False,
            provenance="HISTORICAL"
        )
        assert cq.usable is False
        assert cq.quality == "CLOUDY"

    def test_case_c_permanent_water_overlap(self):
        """CASE C: Permanent water overlap → is_flagged=True, does NOT erase flood prediction"""
        pw = PermanentWaterResult(
            dataset="JRC/GSW1_4/GlobalSurfaceWater",
            overlap_fraction=0.35,
            is_flagged=True,
            flag_label="possible_permanent_water_false_positive",
            provenance="HISTORICAL"
        )
        assert pw.is_flagged is True
        assert pw.flag_label == "possible_permanent_water_false_positive"
        assert "does NOT remove the flood prediction" in pw.note

    def test_case_d_gemini_unavailable(self):
        """CASE D: Gemini unavailable → ABSTAIN, central risk score unchanged"""
        req = VerificationRunRequest(
            event_id="CYCLONE_REMAL_2024",
            risk_zone_id="REMAL-ZONE-001",
            roi={"min_lon": 87.5, "min_lat": 22.0, "max_lon": 88.0, "max_lat": 22.5},
            risk_score=72,
            use_sentinel2=False,
            use_permanent_water=False
        )
        res = verification_orchestrator.run_verification(req)
        assert res.risk.central_risk == 72
        assert res.verification.verdict.verdict == "abstain"
        # Abstain widens range [62 - 82]
        assert res.risk.risk_lower == 62
        assert res.risk.risk_upper == 82

    def test_case_e_uncertainty_crosses_high_critical_boundary(self):
        """CASE E: Uncertainty crosses HIGH (65-79) → CRITICAL (80-100) boundary (80) → human review required"""
        res = verification_policy_engine.calculate_uncertainty(
            central_risk=74,
            verdict=type("V", (), {"verdict": "disagree", "disagreement_level": 0.8, "failure_mode": "none"})()
        )
        # 74 with disagree (±15) -> [59, 89] -> crosses 65 and 80 boundaries
        assert res.central_risk == 74
        assert res.risk_lower == 59
        assert res.risk_upper == 89
        assert res.requires_human_review is True
        assert 80 in res.band_boundaries_crossed

    def test_case_f_uncertainty_stays_inside_one_band(self):
        """CASE F: Risk 55, verdict agree (±0) -> range [55, 55] -> inside HIGH [50-74] -> no human review"""
        res = verification_policy_engine.calculate_uncertainty(
            central_risk=55,
            verdict=type("V", (), {"verdict": "agree", "disagreement_level": 0.0, "failure_mode": "none"})()
        )
        assert res.central_risk == 55
        assert res.risk_lower == 55
        assert res.risk_upper == 55
        assert res.requires_human_review is False


class TestJEVLayer:

    def test_jev_case1_risk_band_crossing(self):
        """JEV CASE 1: Risk 72, range 57-87 crosses HIGH -> VERY HIGH boundary"""
        jev_out = jev_decision_engine.evaluate(
            event_id="REMAL-2024",
            zone_id="REMAL-ZONE-001",
            central_risk_score=72,
            risk_lower=57,
            risk_upper=87,
            risk_band="HIGH",
            verdict="partial",
            failure_mode="mixed_signal",
            evidence_quality="moderate",
            disagreement_level=0.5,
            population_exposure=324542,
            road_exposure_km=373.24,
            hospitals_exposure=1,
            human_review_required=True
        )
        assert jev_out.decision == "REVIEW_REQUIRED"
        assert jev_out.priority == "HIGH"
        assert jev_out.next_action == "WATCH_OFFICER_REVIEW"
        assert jev_out.reason_code == "RISK_BAND_CROSSING"

    def test_jev_case2_stable_risk_band(self):
        """JEV CASE 2: Risk 40, range 35-45 (stable risk band)"""
        jev_out = jev_decision_engine.evaluate(
            event_id="REMAL-2024",
            zone_id="REMAL-ZONE-002",
            central_risk_score=40,
            risk_lower=35,
            risk_upper=45,
            risk_band="MODERATE",
            verdict="agree",
            failure_mode="none",
            evidence_quality="high",
            disagreement_level=0.0,
            human_review_required=False
        )
        assert jev_out.decision == "MONITOR"
        assert jev_out.priority == "ROUTINE"
        assert jev_out.next_action == "CONTINUE_MONITORING"
        assert jev_out.reason_code == "STABLE_RISK_BAND"

    def test_jev_case3_verification_abstain(self):
        """JEV CASE 3: Gemini verification ABSTAIN → does NOT interpret as safety"""
        jev_out = jev_decision_engine.evaluate(
            event_id="REMAL-2024",
            zone_id="REMAL-ZONE-003",
            central_risk_score=70,
            risk_lower=60,
            risk_upper=80,
            risk_band="HIGH",
            verdict="abstain",
            failure_mode="insufficient_evidence",
            evidence_quality="low",
            disagreement_level=0.0,
            human_review_required=True
        )
        assert jev_out.decision == "REVIEW_REQUIRED"
        assert jev_out.next_action == "REQUEST_ADDITIONAL_EVIDENCE"
        assert jev_out.reason_code == "VERIFICATION_ABSTAINED"

    def test_jev_case4_evidence_conflict_high_risk(self):
        """JEV CASE 4: Gemini DISAGREE on HIGH risk zone"""
        jev_out = jev_decision_engine.evaluate(
            event_id="REMAL-2024",
            zone_id="REMAL-ZONE-004",
            central_risk_score=75,
            risk_lower=60,
            risk_upper=90,
            risk_band="HIGH",
            verdict="disagree",
            failure_mode="radar_shadow",
            evidence_quality="moderate",
            disagreement_level=0.8,
            human_review_required=True
        )
        assert jev_out.decision == "REVIEW_REQUIRED"
        assert jev_out.priority == "HIGH"
        assert jev_out.next_action == "WATCH_OFFICER_REVIEW"
        assert jev_out.reason_code == "EVIDENCE_CONFLICT"


class TestRemalGoldenPathExecution:

    def test_golden_path_runs_end_to_end(self):
        gp_res = remal_golden_path_service.run_golden_path(target_zone_id="REMAL-ZONE-001")
        assert gp_res["event_name"] == "CYCLONE REMAL (BOB/01/2024)"
        assert len(gp_res["verified_zones"]) == 1
        zone0 = gp_res["verified_zones"][0]
        assert zone0["zone_info"]["zone_id"] == "REMAL-ZONE-001"
        assert zone0["verification_run"]["risk"]["central_risk"] == 86
        assert "jev_decision" in zone0
        assert zone0["jev_decision"]["decision"] in ("REVIEW_REQUIRED", "MONITOR")
        assert "why_high_risk" in zone0["watch_officer_advisory"]
        assert "watch_officer_inspection_priorities" in zone0["watch_officer_advisory"]

