"""
DRISHTI Verification Configuration
Defines configurable thresholds for the AI Flood Evidence Verification + Uncertainty Layer.

All thresholds are ENGINEERING / MVP DEFAULTS.
They are NOT calibrated scientific values and must not be presented as such.
Override via environment variables before deployment to production.
"""

import os
from dataclasses import dataclass, field
from typing import Dict


# ---------------------------------------------------------------------------
# Cloud Gate Thresholds
# ---------------------------------------------------------------------------
# These govern when Sentinel-2 optical evidence is deemed usable.
# MVP engineering defaults — must be calibrated against reference data.
# ---------------------------------------------------------------------------

@dataclass
class CloudGateConfig:
    """
    Configurable cloud quality gate thresholds.
    CLOUDY_PIXEL_PERCENTAGE and mean cloud probability from S2_CLOUD_PROBABILITY.
    
    MVP ENGINEERING DEFAULTS — NOT SCIENTIFICALLY VALIDATED.
    """
    # CLEAR: both conditions must be met
    clear_max_cloudy_pct: float = float(os.getenv("CLOUD_GATE_CLEAR_PCT", "20"))
    clear_max_cloud_prob_mean: float = float(os.getenv("CLOUD_GATE_CLEAR_PROB", "25"))

    # PARTIAL: scene has some useful pixels
    partial_max_cloudy_pct: float = float(os.getenv("CLOUD_GATE_PARTIAL_PCT", "50"))
    partial_max_cloud_prob_mean: float = float(os.getenv("CLOUD_GATE_PARTIAL_PROB", "50"))

    # Look-back window for finding a usable S2 scene (days)
    search_window_days: int = int(os.getenv("S2_SEARCH_WINDOW_DAYS", "14"))

    # Minimum scene coverage fraction required (0–1)
    min_coverage_fraction: float = float(os.getenv("S2_MIN_COVERAGE", "0.3"))


DEFAULT_CLOUD_GATE_CONFIG = CloudGateConfig()


# ---------------------------------------------------------------------------
# Verification Policy Adjustments
# ---------------------------------------------------------------------------
# Uncertainty adjustments applied to the deterministic risk score.
# These are NOT scientifically calibrated. They are engineering baselines.
# The central risk score is NEVER modified — only an uncertainty range is added.
# ---------------------------------------------------------------------------

@dataclass
class VerificationPolicyConfig:
    """
    Deterministic uncertainty adjustment per Gemini verification verdict.

    MVP ENGINEERING BASELINES — NOT SCIENTIFICALLY VALIDATED.
    Must be calibrated against reference event data before operational use.
    """
    # Uncertainty adjustment in risk-score points (0–100 scale)
    agree_adjustment: int = int(os.getenv("VERIFICATION_AGREE_ADJ", "0"))
    partial_adjustment: int = int(os.getenv("VERIFICATION_PARTIAL_ADJ", "5"))
    disagree_adjustment: int = int(os.getenv("VERIFICATION_DISAGREE_ADJ", "15"))
    abstain_adjustment: int = int(os.getenv("VERIFICATION_ABSTAIN_ADJ", "10"))

    def get_adjustment(self, verdict: str) -> int:
        """Returns uncertainty adjustment (in risk-score points) for a verdict."""
        mapping = {
            "agree": self.agree_adjustment,
            "partial": self.partial_adjustment,
            "disagree": self.disagree_adjustment,
            "abstain": self.abstain_adjustment,
        }
        return mapping.get(verdict.lower(), self.abstain_adjustment)


DEFAULT_POLICY_CONFIG = VerificationPolicyConfig()


# ---------------------------------------------------------------------------
# Risk Band Boundaries (existing bands — must not be changed)
# ---------------------------------------------------------------------------
# Existing DRISHTI bands on 0–100 scale:
#   LOW:      0–44
#   MODERATE: 45–64
#   HIGH:     65–79
#   EXTREME:  80–100
# Band-crossing boundaries = {45, 65, 80}
# ---------------------------------------------------------------------------

RISK_BAND_BOUNDARIES = [45, 65, 80]

RISK_BAND_NAMES: Dict[str, str] = {
    "LOW": "LOW",
    "MODERATE": "MODERATE",
    "HIGH": "HIGH",
    "EXTREME": "EXTREME",
}


def get_risk_band(score: int) -> str:
    """Returns risk band name for an integer risk score (0–100)."""
    if score >= 80:
        return "EXTREME"
    elif score >= 65:
        return "HIGH"
    elif score >= 45:
        return "MODERATE"
    else:
        return "LOW"


def crosses_band_boundary(lower: int, upper: int) -> list:
    """
    Returns a list of boundary values that fall strictly inside [lower, upper].
    An empty list means no risk-band boundary is crossed.
    """
    return [b for b in RISK_BAND_BOUNDARIES if lower < b < upper]


# ---------------------------------------------------------------------------
# Permanent Water Configuration
# ---------------------------------------------------------------------------

@dataclass
class PermanentWaterConfig:
    """Configuration for permanent water reference check."""
    # Minimum overlap fraction to flag as possible permanent water false positive
    overlap_flag_threshold: float = float(os.getenv("PERM_WATER_OVERLAP_THRESHOLD", "0.3"))

    # GEE collection to use for permanent water reference
    jrc_collection: str = "JRC/GSW1_4/GlobalSurfaceWater"

    # JRC occurrence band threshold (0–100) above which pixel is "permanent water"
    jrc_occurrence_threshold: int = int(os.getenv("JRC_OCCURRENCE_THRESHOLD", "80"))


DEFAULT_PERM_WATER_CONFIG = PermanentWaterConfig()


# ---------------------------------------------------------------------------
# Sentinel-2 Retrieval Configuration
# ---------------------------------------------------------------------------

@dataclass
class Sentinel2Config:
    """Configuration for Sentinel-2 GEE retrieval."""
    collection: str = "COPERNICUS/S2_SR_HARMONIZED"
    cloud_prob_collection: str = "COPERNICUS/S2_CLOUD_PROBABILITY"

    # RGB + optional NIR bands
    rgb_bands: list = field(default_factory=lambda: ["B4", "B3", "B2"])
    nir_band: str = "B8"

    # Export parameters
    target_resolution_m: int = int(os.getenv("S2_RESOLUTION_M", "20"))
    max_tile_pixels: int = int(os.getenv("S2_MAX_TILE_PIXELS", "65536"))

    # Scale for thumbnail retrieval (degrees)
    verification_tile_buffer_deg: float = float(os.getenv("S2_TILE_BUFFER_DEG", "0.05"))


DEFAULT_S2_CONFIG = Sentinel2Config()
