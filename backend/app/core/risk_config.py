"""
DRISHTI Risk Engine Configuration
Defines explicit weights, normalization thresholds, and risk classification bands.
Zero ML black-boxes: completely transparent, deterministic, and auditable.
"""

from typing import Dict, Any
from pydantic import BaseModel, Field

class RiskWeightsConfig(BaseModel):
    """
    Multi-criteria risk weighting distribution (must sum to 1.00).
    Aligns with NDMA / OSDMA / IMD coastal cyclone vulnerability guidelines.
    """
    flood_hazard: float = Field(0.25, description="Weight for SegFormer SAR flood perception + 24h rainfall (25%)")
    storm_surge: float = Field(0.20, description="Weight for ocean storm surge and coastal shoreline exposure (20%)")
    wind_hazard: float = Field(0.20, description="Weight for sustained wind, gusts, and storm eye proximity (20%)")
    vulnerability: float = Field(0.20, description="Weight for vulnerable coastal population and shelter capacity deficit (20%)")
    infrastructure_exposure: float = Field(0.15, description="Weight for critical ports, grid substations, and shelter stress (15%)")

    @property
    def total_weight(self) -> float:
        return round(
            self.flood_hazard + 
            self.storm_surge + 
            self.wind_hazard + 
            self.vulnerability + 
            self.infrastructure_exposure, 
            4
        )

class NormalizationThresholds(BaseModel):
    """
    Empirical domain thresholds used to normalize raw physical metrics to a standard 0-100 sub-score.
    """
    max_surge_meters: float = Field(5.0, description="Critical storm surge ceiling in meters")
    max_rainfall_mm_24h: float = Field(300.0, description="Extreme 24-hour rainfall accumulation threshold (mm)")
    max_sustained_wind_kmh: float = Field(160.0, description="Super Cyclonic Storm wind velocity scaling ceiling (km/h)")
    max_wind_gust_kmh: float = Field(200.0, description="Peak gust ceiling (km/h)")
    max_coastline_km: float = Field(120.0, description="Max district open sea frontage (km)")
    max_critical_assets_count: int = Field(6, description="Max assets count for 100% infrastructure density")
    max_eye_influence_radius_km: float = Field(400.0, description="Radius within which cyclone eye proximity adds hazard points")

class RiskBandDefinition(BaseModel):
    name: str
    min_score: int
    max_score: int
    color: str
    urgency_label: str

    @property
    def urgencyLabel(self) -> str:
        return self.urgency_label

RISK_BANDS: Dict[str, RiskBandDefinition] = {
    "EXTREME": RiskBandDefinition(
        name="EXTREME",
        min_score=80,
        max_score=100,
        color="#dc2626",
        urgency_label="Immediate Evacuation & Red Alert"
    ),
    "HIGH": RiskBandDefinition(
        name="HIGH",
        min_score=65,
        max_score=79,
        color="#ea580c",
        urgency_label="Evacuation Mobilization & Orange Alert"
    ),
    "MODERATE": RiskBandDefinition(
        name="MODERATE",
        min_score=45,
        max_score=64,
        color="#ca8a04",
        urgency_label="Shelter Standby & Yellow Alert"
    ),
    "LOW": RiskBandDefinition(
        name="LOW",
        min_score=0,
        max_score=44,
        color="#16a34a",
        urgency_label="Surveillance & Green Alert"
    )
}

# Global default configuration instance
DEFAULT_RISK_WEIGHTS = RiskWeightsConfig()
DEFAULT_THRESHOLDS = NormalizationThresholds()
