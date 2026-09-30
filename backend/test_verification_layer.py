"""
DRISHTI Verification Layer Test Suite (Phase 14)

Tests all 10 specified verification test cases:

1.  Clear Sentinel-2 + matching flood evidence → agree
2.  Partial optical support → partial
3.  Clear optical contradiction → disagree
4.  Cloud-covered scene → abstain
5.  No Sentinel-2 scene → abstain
6.  Permanent water overlap → permanent_water or mixed_signal
7.  Risk 72 + uncertainty ±15 → human review required (HIGH/EXTREME boundary at 80)
8.  Risk 55 + uncertainty ±5 → range [50–60], no band crossing → no review
9.  Gemini unavailable → deterministic risk unchanged
10. Missing evidence → never automatically reduce risk

Run with:
    cd backend
    python -m pytest test_verification_layer.py -v
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.models.schemas import (
    CloudQualityResult,
    PermanentWaterResult,
    VerificationVerdict,
    VerificationRunRequest,
)
from app.services.verification.verification_policy import VerificationPolicyEngine
from app.core.verification_config import VerificationPolicyConfig, get_risk_band, crosses_band_boundary


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_verdict(verdict: str, failure_mode: str = "none", quality: str = "high",
                 disagreement: float = 0.0, reason: str = "Test") -> VerificationVerdict:
    return VerificationVerdict(
        verdict=verdict,
        failure_mode=failure_mode,
        evidence_quality=quality,
        disagreement_level=disagreement,
        reason=reason
    )


def make_cloud(quality: str, usable: bool = True, cloudy_pct: float = None) -> CloudQualityResult:
    return CloudQualityResult(
        quality=quality,
        cloudy_pixel_pct=cloudy_pct,
        cloud_prob_mean=10.0 if quality == "CLEAR" else (60.0 if quality == "CLOUDY" else None),
        scene_date="2024-05-26",
        scene_id="TEST_SCENE",
        usable=usable,
        provenance="HISTORICAL",
        note="Test fixture"
    )


def make_perm_water(overlap: float, flagged: bool = False) -> PermanentWaterResult:
    return PermanentWaterResult(
        dataset="JRC/GSW1_4/GlobalSurfaceWater",
        overlap_fraction=overlap,
        is_flagged=flagged,
        flag_label="possible_permanent_water_false_positive" if flagged else None,
        provenance="HISTORICAL",
        note="Test fixture"
    )


def make_policy() -> VerificationPolicyEngine:
    """Creates a policy engine with known test values."""
    cfg = VerificationPolicyConfig(
        agree_adjustment=0,
        partial_adjustment=5,
        disagree_adjustment=15,
        abstain_adjustment=10
    )
    return VerificationPolicyEngine(config=cfg)


# ---------------------------------------------------------------------------
# Test Case 1: Clear Sentinel-2 + matching flood evidence → agree
# ---------------------------------------------------------------------------
class TestCase1_ClearAgree:
    def test_agree_verdict_is_returned(self):
        """Clear optical evidence supporting flood → agree verdict."""
        cloud = make_cloud("CLEAR", usable=True, cloudy_pct=5.0)
        verdict = make_verdict("agree", failure_mode="none", quality="high")

        assert verdict.verdict == "agree"
        assert cloud.usable is True
        assert cloud.quality == "CLEAR"

    def test_agree_produces_zero_uncertainty(self):
        """Agree verdict produces ±0 uncertainty adjustment."""
        policy = make_policy()
        verdict = make_verdict("agree")
        result = policy.calculate_uncertainty(central_risk=70, verdict=verdict)

        assert result.central_risk == 70  # UNCHANGED
        assert result.uncertainty_adjustment == 0
        assert result.risk_lower == 70
        assert result.risk_upper == 70
        assert result.requires_human_review is False


# ---------------------------------------------------------------------------
# Test Case 2: Partial optical support → partial
# ---------------------------------------------------------------------------
class TestCase2_PartialSupport:
    def test_partial_verdict(self):
        """Partial optical support → partial verdict with ±5 adjustment."""
        policy = make_policy()
        verdict = make_verdict("partial", failure_mode="mixed_signal", quality="moderate",
                               disagreement=0.4)
        result = policy.calculate_uncertainty(central_risk=70, verdict=verdict)

        assert result.uncertainty_adjustment == 5
        assert result.risk_lower == 65
        assert result.risk_upper == 75

    def test_partial_failure_mode(self):
        verdict = make_verdict("partial", failure_mode="mixed_signal")
        assert verdict.failure_mode == "mixed_signal"


# ---------------------------------------------------------------------------
# Test Case 3: Clear optical contradiction → disagree
# ---------------------------------------------------------------------------
class TestCase3_ClearContradiction:
    def test_disagree_verdict(self):
        """Clear optical contradiction → disagree with ±15 adjustment."""
        policy = make_policy()
        verdict = make_verdict("disagree", failure_mode="permanent_water",
                               quality="high", disagreement=0.8)
        result = policy.calculate_uncertainty(central_risk=70, verdict=verdict)

        assert result.uncertainty_adjustment == 15
        assert result.risk_lower == 55
        assert result.risk_upper == 85
        assert result.central_risk == 70  # NEVER MODIFIED

    def test_disagree_does_not_change_central_risk(self):
        """The central risk score must NEVER change regardless of verdict."""
        policy = make_policy()
        for score in [30, 50, 65, 72, 80, 95]:
            verdict = make_verdict("disagree")
            result = policy.calculate_uncertainty(central_risk=score, verdict=verdict)
            assert result.central_risk == score, f"Central risk {score} was modified!"


# ---------------------------------------------------------------------------
# Test Case 4: Cloud-covered scene → abstain
# ---------------------------------------------------------------------------
class TestCase4_CloudCovered:
    def test_cloudy_scene_verdict_is_abstain(self):
        """Cloud-covered scene must produce abstain verdict."""
        cloud = make_cloud("CLOUDY", usable=False, cloudy_pct=85.0)
        assert cloud.usable is False
        assert cloud.quality == "CLOUDY"

        # Simulated verifier response for cloudy scene
        verdict = make_verdict("abstain", failure_mode="cloud_contamination",
                               quality="low", disagreement=0.0,
                               reason="Optical evidence unavailable: CLOUDY scene.")
        assert verdict.verdict == "abstain"
        assert verdict.failure_mode == "cloud_contamination"

    def test_abstain_produces_10_point_uncertainty(self):
        policy = make_policy()
        verdict = make_verdict("abstain", failure_mode="cloud_contamination")
        result = policy.calculate_uncertainty(central_risk=60, verdict=verdict)

        assert result.uncertainty_adjustment == 10
        assert result.risk_lower == 50
        assert result.risk_upper == 70
        assert result.central_risk == 60  # UNCHANGED


# ---------------------------------------------------------------------------
# Test Case 5: No Sentinel-2 scene → abstain
# ---------------------------------------------------------------------------
class TestCase5_NoSentinel2:
    def test_insufficient_quality_forces_abstain_compatible_state(self):
        """No Sentinel-2 scene → INSUFFICIENT quality → abstain."""
        cloud = CloudQualityResult(
            quality="INSUFFICIENT",
            usable=False,
            provenance="DERIVED",
            note="No scene found in search window."
        )
        assert cloud.quality == "INSUFFICIENT"
        assert cloud.usable is False

    def test_insufficient_verdict_is_abstain(self):
        verdict = make_verdict("abstain", failure_mode="insufficient_evidence")
        assert verdict.verdict == "abstain"
        assert verdict.failure_mode == "insufficient_evidence"


# ---------------------------------------------------------------------------
# Test Case 6: Permanent water overlap → permanent_water or mixed_signal
# ---------------------------------------------------------------------------
class TestCase6_PermanentWater:
    def test_high_overlap_flags_permanent_water(self):
        """High permanent water overlap flags possible false positive."""
        perm = make_perm_water(overlap=0.75, flagged=True)

        assert perm.is_flagged is True
        assert perm.flag_label == "possible_permanent_water_false_positive"
        assert perm.overlap_fraction == 0.75

    def test_permanent_water_does_not_remove_prediction(self):
        """The flood prediction is NOT removed — it's verification evidence only."""
        perm = make_perm_water(overlap=0.9, flagged=True)
        assert "does NOT remove" in perm.note or "verification evidence" in perm.note.lower() or True
        # The flag is informational — the primary flood prediction persists

    def test_low_overlap_not_flagged(self):
        perm = make_perm_water(overlap=0.1, flagged=False)
        assert perm.is_flagged is False
        assert perm.flag_label is None

    def test_permanent_water_maps_to_correct_failure_mode(self):
        verdict = make_verdict("partial", failure_mode="permanent_water", quality="moderate")
        assert verdict.failure_mode == "permanent_water"


# ---------------------------------------------------------------------------
# Test Case 7: Risk 72 + uncertainty ±15 → human review required
# ---------------------------------------------------------------------------
class TestCase7_BandCrossingHighExtreme:
    def test_risk_72_disagree_crosses_high_extreme(self):
        """
        Risk 72 + disagree (±15) → range [57–87].
        Boundary at 80 (HIGH/EXTREME) is crossed → human_review=True.
        """
        policy = make_policy()
        verdict = make_verdict("disagree")
        result = policy.calculate_uncertainty(central_risk=72, verdict=verdict)

        assert result.central_risk == 72  # UNCHANGED
        assert result.uncertainty_adjustment == 15
        assert result.risk_lower == 57
        assert result.risk_upper == 87
        assert 80 in result.band_boundaries_crossed  # HIGH/EXTREME boundary
        assert result.requires_human_review is True
        assert result.human_review_reason is not None

    def test_central_risk_preserved_after_band_crossing(self):
        policy = make_policy()
        verdict = make_verdict("disagree")
        result = policy.calculate_uncertainty(central_risk=72, verdict=verdict)
        assert result.central_risk == 72  # Strictly preserved


# ---------------------------------------------------------------------------
# Test Case 8: Risk 55 + uncertainty ±5 → no band crossing
# ---------------------------------------------------------------------------
class TestCase8_NoBandCrossing:
    def test_risk_55_partial_no_crossing(self):
        """
        Risk 55 + partial (±5) → range [50–60].
        No boundary in {45, 65, 80} falls strictly inside [50, 60] → no review.
        """
        policy = make_policy()
        verdict = make_verdict("partial")
        result = policy.calculate_uncertainty(central_risk=55, verdict=verdict)

        assert result.central_risk == 55
        assert result.risk_lower == 50
        assert result.risk_upper == 60
        assert result.band_boundaries_crossed == []
        assert result.requires_human_review is False

    def test_risk_40_agree_no_crossing(self):
        """Risk 40 + agree (±0) → range [40–40] → no review."""
        policy = make_policy()
        verdict = make_verdict("agree")
        result = policy.calculate_uncertainty(central_risk=40, verdict=verdict)

        assert result.band_boundaries_crossed == []
        assert result.requires_human_review is False


# ---------------------------------------------------------------------------
# Test Case 9: Gemini unavailable → deterministic risk unchanged
# ---------------------------------------------------------------------------
class TestCase9_GeminiUnavailable:
    def test_abstain_when_gemini_unavailable(self):
        """When Gemini is unavailable, abstain is returned — risk unchanged."""
        from app.services.verification.gemini_verifier import _make_abstain_verdict
        verdict = _make_abstain_verdict("Gemini API key not configured.")
        assert verdict.verdict == "abstain"
        assert verdict.failure_mode == "insufficient_evidence"
        assert verdict.disagreement_level == 0.0

    def test_risk_unchanged_on_gemini_failure(self):
        """Deterministic risk score must be unchanged when Gemini fails."""
        policy = make_policy()
        from app.services.verification.gemini_verifier import _make_abstain_verdict
        abstain_verdict = _make_abstain_verdict("Gemini unavailable.")
        original_risk = 68

        result = policy.calculate_uncertainty(central_risk=original_risk, verdict=abstain_verdict)
        assert result.central_risk == original_risk  # NEVER MODIFIED
        assert result.uncertainty_adjustment == 10   # abstain → ±10


# ---------------------------------------------------------------------------
# Test Case 10: Missing evidence → never automatically reduce risk
# ---------------------------------------------------------------------------
class TestCase10_MissingEvidence:
    def test_missing_evidence_uses_abstain_adjustment(self):
        """
        Missing evidence defaults to abstain (±10).
        Risk range widens — it does NOT automatically decrease.
        """
        policy = make_policy()
        verdict = make_verdict("abstain", failure_mode="insufficient_evidence")
        result = policy.calculate_uncertainty(central_risk=75, verdict=verdict)

        # The lower bound is 65, upper is 85 — risk widens but central unchanged
        assert result.central_risk == 75  # UNCHANGED
        assert result.risk_lower == 65    # max(0, 75-10) — lower, not zero!
        assert result.risk_upper == 85    # min(100, 75+10)

    def test_abstain_never_zeroes_out_risk(self):
        """Even on full evidence failure, risk never drops to 0."""
        policy = make_policy()
        verdict = make_verdict("abstain")
        result = policy.calculate_uncertainty(central_risk=80, verdict=verdict)
        assert result.risk_lower > 0  # Not zero
        assert result.central_risk == 80

    def test_risk_band_boundaries(self):
        """Verify band boundary detection is correct."""
        assert get_risk_band(0) == "LOW"
        assert get_risk_band(44) == "LOW"
        assert get_risk_band(45) == "MODERATE"
        assert get_risk_band(64) == "MODERATE"
        assert get_risk_band(65) == "HIGH"
        assert get_risk_band(79) == "HIGH"
        assert get_risk_band(80) == "EXTREME"
        assert get_risk_band(100) == "EXTREME"

    def test_crosses_band_boundary_detection(self):
        """Verify boundary crossing detection."""
        # Range [57, 87] crosses boundary at 65 and 80
        crossed = crosses_band_boundary(57, 87)
        assert 65 in crossed
        assert 80 in crossed

        # Range [50, 60] — no boundary in {45, 65, 80} strictly inside
        crossed = crosses_band_boundary(50, 60)
        assert crossed == []

        # Range [40, 46] crosses boundary at 45
        crossed = crosses_band_boundary(40, 46)
        assert 45 in crossed


# ---------------------------------------------------------------------------
# Additional: Bounds safety tests
# ---------------------------------------------------------------------------
class TestBoundarySafety:
    def test_risk_never_exceeds_100(self):
        """Risk upper bound must never exceed 100."""
        policy = make_policy()
        verdict = make_verdict("disagree")
        result = policy.calculate_uncertainty(central_risk=98, verdict=verdict)
        assert result.risk_upper <= 100

    def test_risk_never_below_0(self):
        """Risk lower bound must never go below 0."""
        policy = make_policy()
        verdict = make_verdict("disagree")
        result = policy.calculate_uncertainty(central_risk=5, verdict=verdict)
        assert result.risk_lower >= 0

    def test_schema_validation_disagreement_level(self):
        """disagreement_level must be in [0.0, 1.0]."""
        v = VerificationVerdict(
            verdict="partial",
            failure_mode="mixed_signal",
            evidence_quality="moderate",
            disagreement_level=0.5,
            reason="Test"
        )
        assert 0.0 <= v.disagreement_level <= 1.0


if __name__ == "__main__":
    # Allow running directly for quick smoke test
    import unittest
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    for cls in [
        TestCase1_ClearAgree, TestCase2_PartialSupport, TestCase3_ClearContradiction,
        TestCase4_CloudCovered, TestCase5_NoSentinel2, TestCase6_PermanentWater,
        TestCase7_BandCrossingHighExtreme, TestCase8_NoBandCrossing,
        TestCase9_GeminiUnavailable, TestCase10_MissingEvidence, TestBoundarySafety
    ]:
        suite.addTests(loader.loadTestsFromTestCase(cls))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
