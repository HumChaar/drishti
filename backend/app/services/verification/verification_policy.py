"""
DRISHTI Verification Policy + Uncertainty Engine (Phases 6–8)

Implements deterministic post-Gemini policy:

1. Maps verification verdict → uncertainty adjustment (±points on 0–100 scale)
2. Calculates risk_lower and risk_upper (central score is NEVER modified)
3. Detects risk-band boundary crossings → flags for human review

CRITICAL RULE: The central deterministic risk score is NEVER changed.
Only an uncertainty range [risk_lower, risk_upper] is added around it.

Engineering Baselines (NOT scientifically validated):
    agree    → ±0 points
    partial  → ±5 points
    disagree → ±15 points
    abstain  → ±10 points

Risk Band Boundaries (existing DRISHTI bands, preserved):
    LOW:      0–44
    MODERATE: 45–64
    HIGH:     65–79
    EXTREME:  80–100
    Boundaries: {45, 65, 80}
"""

from __future__ import annotations
from typing import Dict, Any

from app.models.schemas import VerificationVerdict, RiskUncertaintyResult
from app.core.verification_config import (
    DEFAULT_POLICY_CONFIG,
    RISK_BAND_BOUNDARIES,
    get_risk_band,
    crosses_band_boundary
)


class VerificationPolicyEngine:
    """
    Deterministic policy engine: converts Gemini verdict into risk uncertainty range.

    Completely deterministic — no AI inference in this step.
    """

    def __init__(self, config=None):
        self._cfg = config or DEFAULT_POLICY_CONFIG

    def calculate_uncertainty(
        self,
        central_risk: int,
        verdict: VerificationVerdict
    ) -> RiskUncertaintyResult:
        """
        Applies the deterministic verification policy to produce an uncertainty range.

        Args:
            central_risk: The original deterministic risk score (0–100). UNCHANGED.
            verdict: Structured Gemini verifier output.

        Returns:
            RiskUncertaintyResult with:
                - central_risk preserved exactly
                - risk_lower and risk_upper as bounded uncertainty range
                - requires_human_review = True if band boundary is crossed
        """
        central_risk = max(0, min(100, central_risk))
        adjustment = self._cfg.get_adjustment(verdict.verdict)

        risk_lower = max(0, central_risk - adjustment)
        risk_upper = min(100, central_risk + adjustment)

        central_band = get_risk_band(central_risk)
        lower_band = get_risk_band(risk_lower)
        upper_band = get_risk_band(risk_upper)

        crossed_boundaries = crosses_band_boundary(risk_lower, risk_upper)
        requires_review = len(crossed_boundaries) > 0

        # Build human-readable reason for review flag
        if requires_review:
            boundary_strs = []
            for b in crossed_boundaries:
                lower_b = get_risk_band(b - 1)
                upper_b = get_risk_band(b)
                boundary_strs.append(f"{lower_b}/{upper_b} boundary ({b})")
            review_reason = (
                f"Uncertainty interval [{risk_lower}–{risk_upper}] crosses "
                f"risk-band {'boundary' if len(crossed_boundaries) == 1 else 'boundaries'}: "
                f"{', '.join(boundary_strs)}. "
                f"Verification verdict: {verdict.verdict.upper()}. "
                f"Human review required before final decision."
            )
        else:
            review_reason = None

        formula = (
            f"central_risk={central_risk} ± {adjustment} (verdict='{verdict.verdict}') "
            f"→ lower=max(0, {central_risk}-{adjustment})={risk_lower}, "
            f"upper=min(100, {central_risk}+{adjustment})={risk_upper}"
        )

        return RiskUncertaintyResult(
            central_risk=central_risk,
            risk_band=central_band,
            uncertainty_adjustment=adjustment,
            risk_lower=risk_lower,
            risk_upper=risk_upper,
            risk_lower_band=lower_band,
            risk_upper_band=upper_band,
            band_boundaries_crossed=crossed_boundaries,
            requires_human_review=requires_review,
            human_review_reason=review_reason,
            formula=formula,
            policy_note=(
                "Uncertainty adjustments are MVP engineering baselines — not scientifically calibrated values. "
                f"Current adjustments: agree=±{self._cfg.agree_adjustment}, "
                f"partial=±{self._cfg.partial_adjustment}, "
                f"disagree=±{self._cfg.disagree_adjustment}, "
                f"abstain=±{self._cfg.abstain_adjustment}."
            )
        )

    def get_policy_summary(self) -> Dict[str, Any]:
        """Returns the current policy configuration for transparency."""
        return {
            "policy": "DETERMINISTIC_VERIFICATION_POLICY",
            "note": "MVP engineering baselines — not scientifically calibrated.",
            "risk_band_boundaries": RISK_BAND_BOUNDARIES,
            "adjustments_pts": {
                "agree": self._cfg.agree_adjustment,
                "partial": self._cfg.partial_adjustment,
                "disagree": self._cfg.disagree_adjustment,
                "abstain": self._cfg.abstain_adjustment,
            },
            "risk_bands": {
                "LOW": "0–44",
                "MODERATE": "45–64",
                "HIGH": "65–79",
                "EXTREME": "80–100"
            },
            "invariants": {
                "central_risk_never_modified": True,
                "gemini_cannot_change_risk": True,
                "human_review_on_band_crossing": True,
                "abstain_widens_not_lowers": True
            }
        }


verification_policy_engine = VerificationPolicyEngine()
