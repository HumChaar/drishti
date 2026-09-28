"""
DRISHTI Transparent Risk Engine
Implements deterministic, fully auditable multi-hazard coastal risk quantification.
Transforms structured DistrictEvidence into:
- 0-100 Composite Risk Score
- Standardized Risk Bands (EXTREME, HIGH, MODERATE, LOW)
- Detailed Contributing Factors Breakdown with weights and weighted points
- Human-readable explanation of why the risk score was generated.
"""

from typing import Dict, Tuple, Optional
from app.core.risk_config import (
    RiskWeightsConfig,
    NormalizationThresholds,
    DEFAULT_RISK_WEIGHTS,
    DEFAULT_THRESHOLDS,
    RISK_BANDS,
    RiskBandDefinition
)
from app.models.schemas import (
    DistrictEvidence,
    ContributingFactor,
    RiskExplanation
)


class TransparentRiskEngine:
    def __init__(
        self,
        weights: Optional[RiskWeightsConfig] = None,
        thresholds: Optional[NormalizationThresholds] = None
    ):
        self.weights = weights or DEFAULT_RISK_WEIGHTS
        self.thresholds = thresholds or DEFAULT_THRESHOLDS

    def calculate_flood_subscore(self, evidence: DistrictEvidence) -> Tuple[float, str, str]:
        flood_pct = evidence.floodPerception.floodPercentage
        conf = evidence.floodPerception.floodProbability
        rain_mm = evidence.meteorology.rainMm24h

        # Normalize rainfall against critical 24h ceiling
        norm_rain = min(100.0, (rain_mm / self.thresholds.max_rainfall_mm_24h) * 100.0)
        
        # Perception score weighted by confidence
        perception_effective = flood_pct * (0.7 + 0.3 * max(0.0, min(1.0, conf)))
        
        sub_score = min(100.0, 0.60 * perception_effective + 0.40 * norm_rain)
        raw_display = f"{flood_pct:.1f}% flood extent (SAR), {rain_mm:.0f}mm rain/24h"
        
        driver = (
            f"Severe SAR-detected inundation ({flood_pct:.1f}%) combined with {rain_mm:.0f}mm heavy rainfall"
            if sub_score > 60 else
            f"Moderate flood inundation ({flood_pct:.1f}%) and {rain_mm:.0f}mm rainfall accumulation"
        )
        return round(sub_score, 2), raw_display, driver

    def calculate_surge_subscore(self, evidence: DistrictEvidence) -> Tuple[float, str, str]:
        surge_m = evidence.meteorology.surgeMeters
        coast_km = evidence.vulnerability.coastalLineKm

        norm_surge = min(100.0, (surge_m / self.thresholds.max_surge_meters) * 100.0)
        norm_coast = min(100.0, (coast_km / self.thresholds.max_coastline_km) * 100.0)

        sub_score = min(100.0, 0.75 * norm_surge + 0.25 * norm_coast)
        raw_display = f"{surge_m:.1f}m storm surge, {coast_km}km coastline"

        driver = (
            f"Dangerous tidal surge of {surge_m:.1f}m along an extensive {coast_km}km open sea face"
            if surge_m >= 2.0 else
            f"Moderate surge of {surge_m:.1f}m affecting {coast_km}km coastline"
        )
        return round(sub_score, 2), raw_display, driver

    def calculate_wind_subscore(self, evidence: DistrictEvidence) -> Tuple[float, str, str]:
        wind_kmh = evidence.meteorology.windKmh
        gust_kmh = evidence.meteorology.gustKmh
        eye_dist = evidence.cycloneHazard.eyeDistanceKm

        norm_wind = min(100.0, (wind_kmh / self.thresholds.max_sustained_wind_kmh) * 100.0)
        norm_gust = min(100.0, (gust_kmh / self.thresholds.max_wind_gust_kmh) * 100.0)
        proximity_score = max(0.0, 100.0 - (eye_dist / self.thresholds.max_eye_influence_radius_km) * 100.0)

        sub_score = min(100.0, 0.50 * norm_wind + 0.25 * norm_gust + 0.25 * proximity_score)
        raw_display = f"{wind_kmh} km/h wind (gust {gust_kmh}), eye at {eye_dist:.0f}km"

        driver = (
            f"High-velocity gale winds ({wind_kmh} km/h) in close proximity ({eye_dist:.0f}km) to cyclone eye"
            if sub_score > 60 else
            f"Moderate peripheral winds ({wind_kmh} km/h) with cyclone eye at {eye_dist:.0f}km"
        )
        return round(sub_score, 2), raw_display, driver

    def calculate_vulnerability_subscore(self, evidence: DistrictEvidence) -> Tuple[float, str, str]:
        vuln_pop = evidence.vulnerability.vulnerablePopulation
        total_pop = evidence.vulnerability.totalPopulation
        shelter_deficit = evidence.vulnerability.shelterDeficitPersons

        vuln_ratio = vuln_pop / total_pop if total_pop > 0 else 0.0
        norm_vuln_ratio = min(100.0, vuln_ratio * 250.0)  # 40% vulnerable pop gives 100
        norm_deficit = min(100.0, (shelter_deficit / vuln_pop) * 100.0) if vuln_pop > 0 else 0.0

        sub_score = min(100.0, 0.60 * norm_vuln_ratio + 0.40 * norm_deficit)
        raw_display = f"{vuln_pop:,} vulnerable residents ({evidence.vulnerability.vulnerabilityRatioPct:.1f}%), shelter deficit: {shelter_deficit:,}"

        driver = (
            f"{vuln_pop:,} residents exposed in coastal buffer with shelter deficit of {shelter_deficit:,}"
            if shelter_deficit > 100000 else
            f"Baseline demographic vulnerability with {vuln_pop:,} vulnerable citizens"
        )
        return round(sub_score, 2), raw_display, driver

    def calculate_infrastructure_subscore(self, evidence: DistrictEvidence) -> Tuple[float, str, str]:
        asset_count = evidence.infrastructure.totalCriticalAssets
        shelter_occ = evidence.infrastructure.shelterOccupancyPct

        norm_assets = min(100.0, (asset_count / self.thresholds.max_critical_assets_count) * 100.0)
        norm_occ = min(100.0, float(shelter_occ))

        sub_score = min(100.0, 0.60 * norm_assets + 0.40 * norm_occ)
        raw_display = f"{asset_count} critical coastal assets, {shelter_occ}% shelter occupancy"

        driver = (
            f"High infrastructure exposure with {asset_count} key installations and {shelter_occ}% shelter occupancy"
            if sub_score > 50 else
            f"Standard infrastructure profile ({asset_count} critical assets)"
        )
        return round(sub_score, 2), raw_display, driver

    def evaluate_risk(self, evidence: DistrictEvidence) -> RiskExplanation:
        """
        Executes deterministic multi-criteria risk evaluation and synthesizes explainability evidence.
        """
        # 1. Calculate factor sub-scores
        s_flood, raw_flood, drv_flood = self.calculate_flood_subscore(evidence)
        s_surge, raw_surge, drv_surge = self.calculate_surge_subscore(evidence)
        s_wind, raw_wind, drv_wind = self.calculate_wind_subscore(evidence)
        s_vuln, raw_vuln, drv_vuln = self.calculate_vulnerability_subscore(evidence)
        s_infra, raw_infra, drv_infra = self.calculate_infrastructure_subscore(evidence)

        # 2. Weighted points
        pts_flood = round(s_flood * self.weights.flood_hazard, 2)
        pts_surge = round(s_surge * self.weights.storm_surge, 2)
        pts_wind = round(s_wind * self.weights.wind_hazard, 2)
        pts_vuln = round(s_vuln * self.weights.vulnerability, 2)
        pts_infra = round(s_infra * self.weights.infrastructure_exposure, 2)

        raw_composite = pts_flood + pts_surge + pts_wind + pts_vuln + pts_infra
        composite_score = int(max(0, min(100, round(raw_composite))))

        # 3. Determine Risk Band
        if composite_score >= RISK_BANDS["EXTREME"].min_score:
            band_def = RISK_BANDS["EXTREME"]
        elif composite_score >= RISK_BANDS["HIGH"].min_score:
            band_def = RISK_BANDS["HIGH"]
        elif composite_score >= RISK_BANDS["MODERATE"].min_score:
            band_def = RISK_BANDS["MODERATE"]
        else:
            band_def = RISK_BANDS["LOW"]

        # 4. Construct Contributing Factors map
        factors: Dict[str, ContributingFactor] = {
            "flood_hazard": ContributingFactor(
                name="Flood Inundation & SAR Perception",
                category="flood_hazard",
                rawValueDisplay=raw_flood,
                subScore=s_flood,
                weight=self.weights.flood_hazard,
                weightedPoints=pts_flood,
                driverSummary=drv_flood
            ),
            "storm_surge": ContributingFactor(
                name="Storm Surge & Coastal Exposure",
                category="storm_surge",
                rawValueDisplay=raw_surge,
                subScore=s_surge,
                weight=self.weights.storm_surge,
                weightedPoints=pts_surge,
                driverSummary=drv_surge
            ),
            "wind_hazard": ContributingFactor(
                name="Wind Gale & Eye Proximity",
                category="wind_hazard",
                rawValueDisplay=raw_wind,
                subScore=s_wind,
                weight=self.weights.wind_hazard,
                weightedPoints=pts_wind,
                driverSummary=drv_wind
            ),
            "vulnerability": ContributingFactor(
                name="Demographic Vulnerability & Shelter Deficit",
                category="vulnerability",
                rawValueDisplay=raw_vuln,
                subScore=s_vuln,
                weight=self.weights.vulnerability,
                weightedPoints=pts_vuln,
                driverSummary=drv_vuln
            ),
            "infrastructure_exposure": ContributingFactor(
                name="Critical Assets & Shelter Stress",
                category="infrastructure_exposure",
                rawValueDisplay=raw_infra,
                subScore=s_infra,
                weight=self.weights.infrastructure_exposure,
                weightedPoints=pts_infra,
                driverSummary=drv_infra
            )
        }

        # 5. Rank top drivers for explanation
        sorted_factors = sorted(factors.values(), key=lambda f: f.weightedPoints, reverse=True)
        top1 = sorted_factors[0]
        top2 = sorted_factors[1]

        explanation_text = (
            f"Risk score of {composite_score}/100 ({band_def.name}) is primarily driven by "
            f"{top1.name} ({top1.weightedPoints:.1f} pts, {top1.subScore:.0f}/100) and "
            f"{top2.name} ({top2.weightedPoints:.1f} pts, {top2.subScore:.0f}/100). "
            f"Key triggers: {top1.driverSummary}; {top2.driverSummary}."
        )

        formula_str = (
            f"CompositeScore = round({self.weights.flood_hazard} × S_flood + "
            f"{self.weights.storm_surge} × S_surge + "
            f"{self.weights.wind_hazard} × S_wind + "
            f"{self.weights.vulnerability} × S_vuln + "
            f"{self.weights.infrastructure_exposure} × S_infra)"
        )

        provenance_tiers = {
            "cyclone_hazard": evidence.cycloneHazard.provenance,
            "flood_perception": evidence.floodPerception.provenance,
            "meteorology": evidence.meteorology.provenance,
            "vulnerability": evidence.vulnerability.provenance,
            "infrastructure": evidence.infrastructure.provenance
        }

        return RiskExplanation(
            compositeScore=composite_score,
            riskBand=band_def.name,
            color=band_def.color,
            urgencyLabel=band_def.urgencyLabel,
            formula=formula_str,
            contributingFactors=factors,
            plainTextExplanation=explanation_text,
            provenanceTiers=provenance_tiers
        )


transparent_risk_engine = TransparentRiskEngine()
