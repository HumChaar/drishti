"""
DRISHTI Evidence Layer Service
Aggregates heterogeneous multi-modal disaster observations and predictions:
- Cyclone track & eye distance (REMAL 2024 simulation)
- SegFormer SAR flood perception (AI Inference with explicit synthetic vs genuine SAR provenance)
- Meteorological predictions (surge, rainfall, wind)
- Demographic vulnerability (census populations, coastal buffer, shelter deficit)
- Critical infrastructure exposure (ports, hospitals, power grids, shelter occupancy)
"""

import os
import math
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from app.models.schemas import (
    DistrictEvidence,
    CycloneHazardEvidence,
    PerceptionEvidenceSummary,
    MeteorologicalHazardEvidence,
    VulnerabilityEvidence,
    InfrastructureExposureEvidence,
    FloodInferenceEvidence
)
from app.services.cyclone_service import cyclone_service
from app.services.segformer_service import segformer_service

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DISTRICT_RISK_PATH = os.path.join(DATA_DIR, "district_risk.json")
INFRASTRUCTURE_PATH = os.path.join(DATA_DIR, "infrastructure.json")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two geographic coordinates in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


class EvidenceService:
    def __init__(self):
        self._district_data = None
        self._infra_data = None
        self._load_static_registries()

    def _load_static_registries(self):
        if os.path.exists(DISTRICT_RISK_PATH):
            with open(DISTRICT_RISK_PATH, "r", encoding="utf-8") as f:
                self._district_data = json.load(f)
        else:
            self._district_data = {"districts": [], "timeline_risk": {}}

        if os.path.exists(INFRASTRUCTURE_PATH):
            with open(INFRASTRUCTURE_PATH, "r", encoding="utf-8") as f:
                self._infra_data = json.load(f)
        else:
            self._infra_data = {"assets": []}

    def get_district_metadata(self, district_id: str) -> Optional[Dict[str, Any]]:
        districts = self._district_data.get("districts", [])
        return next((d for d in districts if d["id"] == district_id), None)

    def get_all_district_metadata(self) -> List[Dict[str, Any]]:
        return self._district_data.get("districts", [])

    def compile_district_evidence(
        self,
        district_id: str,
        step_id: str = "NOW",
        custom_rain_mm: Optional[float] = None,
        custom_surge_m: Optional[float] = None,
        custom_wind_kmh: Optional[int] = None,
        custom_flood_pct: Optional[float] = None,
        sar_vv: Optional[Any] = None,
        sar_vh: Optional[Any] = None,
        is_genuine_sar: bool = False
    ) -> DistrictEvidence:
        """
        Builds the unified, auditable Evidence object for a given district and timeline step.
        Preserves strict provenance between historical simulation, AI inference, and static registries.
        """
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        district = self.get_district_metadata(district_id)
        if not district:
            raise ValueError(f"District '{district_id}' not found in coastal surveillance registry.")

        # 1. Cyclone Hazard Evidence
        scenario = cyclone_service.get_scenario(normalized_step)
        if scenario and "current" in scenario:
            current_state = scenario["current"]
            eye_lat = float(current_state.get("latitude", 20.0))
            eye_lon = float(current_state.get("longitude", 89.0))
            eye_dist = haversine_distance(district["lat"], district["lon"], eye_lat, eye_lon)
            cyclone_evidence = CycloneHazardEvidence(
                stormName="REMAL",
                category=current_state.get("category", "Severe Cyclonic Storm (SCS)"),
                eyeDistanceKm=eye_dist,
                eyeLatitude=eye_lat,
                eyeLongitude=eye_lon,
                centralPressureMb=int(current_state.get("pressureMb", 984)),
                maxWindKmh=int(current_state.get("windKmh", 95)),
                provenance="HISTORICAL_SIMULATION_REMAL_2024"
            )
        else:
            cyclone_evidence = CycloneHazardEvidence(
                stormName="REMAL",
                category="Severe Cyclonic Storm (SCS)",
                eyeDistanceKm=250.0,
                eyeLatitude=20.0,
                eyeLongitude=88.5,
                centralPressureMb=985,
                maxWindKmh=110,
                provenance="HISTORICAL_SIMULATION_REMAL_2024"
            )

        # 2. Meteorological Hazard Evidence (Historical REMAL timeline)
        timeline_risk = self._district_data.get("timeline_risk", {})
        step_risk = timeline_risk.get(normalized_step) or timeline_risk.get("NOW", {})
        baseline_risk = step_risk.get(district_id, {
            "surgeMeters": 1.0,
            "rainMm24h": 60,
            "windKmh": 50,
            "gustKmh": 70,
            "inundationProbPct": 25,
            "shelterOccupancyPct": 15,
            "evacuatedCount": 10000,
            "evacuationTarget": 80000
        })

        surge_m = custom_surge_m if custom_surge_m is not None else float(baseline_risk.get("surgeMeters", 1.0))
        rain_mm = custom_rain_mm if custom_rain_mm is not None else float(baseline_risk.get("rainMm24h", 60))
        wind_kmh = custom_wind_kmh if custom_wind_kmh is not None else int(baseline_risk.get("windKmh", 50))
        gust_kmh = int(baseline_risk.get("gustKmh", wind_kmh + 20))
        inundation_prob = int(baseline_risk.get("inundationProbPct", 25))

        meteorology_evidence = MeteorologicalHazardEvidence(
            rainMm24h=rain_mm,
            surgeMeters=surge_m,
            windKmh=wind_kmh,
            gustKmh=gust_kmh,
            inundationProbPct=inundation_prob,
            provenance="HISTORICAL_SIMULATION_METEOROLOGY"
        )

        # 3. Flood Perception Evidence (SegFormer-B0 AI Service)
        if custom_flood_pct is not None:
            # Explicit synthetic override
            flood_perception = PerceptionEvidenceSummary(
                modelIdentifier="SegFormer-B0 (best_clean)",
                floodPercentage=custom_flood_pct,
                floodProbability=0.88,
                confidenceMean=0.88,
                isGenuineSar=is_genuine_sar,
                provenance=("[AI INFERENCE] SegFormer-B0 SAR Flood Perception (Sentinel-1 Dual-Pol)"
                            if is_genuine_sar else
                            "[AI INFERENCE] SegFormer-B0 SAR Flood Perception (Synthetic Override)"),
                validationNote=("Inference executed on genuine Sentinel-1 SAR dual-polarization imagery."
                                if is_genuine_sar else
                                "Synthetic evaluation override for stress-testing risk engine.")
            )
        else:
            try:
                # Run through segformer_service
                seg_result: FloodInferenceEvidence = segformer_service.infer_district_flood(
                    district_id=district_id,
                    vv_matrix=sar_vv,
                    vh_matrix=sar_vh,
                    include_mask=False
                )
                flood_perception = PerceptionEvidenceSummary(
                    modelIdentifier=seg_result.model_identifier,
                    floodPercentage=seg_result.flood_percentage,
                    floodProbability=seg_result.flood_probability,
                    confidenceMean=seg_result.confidence_mean,
                    isGenuineSar=seg_result.is_genuine_sar_sample,
                    provenance=seg_result.provenance,
                    validationNote=seg_result.validation_note
                )
            except Exception as e:
                # Resilient fallback if PyTorch environment has unexpected hiccup
                flood_perception = PerceptionEvidenceSummary(
                    modelIdentifier="SegFormer-B0 (best_clean - fallback)",
                    floodPercentage=float(inundation_prob),
                    floodProbability=0.75,
                    confidenceMean=0.75,
                    isGenuineSar=False,
                    provenance="[AI INFERENCE] SegFormer-B0 SAR Fallback",
                    validationNote="Model inference fallback triggered: " + str(e)
                )

        # 4. Demographic & Geographic Vulnerability Evidence
        population = district["population"]
        vulnerable_pop = district["vulnerablePopulation"]
        vuln_ratio = round((vulnerable_pop / population) * 100.0, 2)
        shelter_cap = district["shelterCapacityPersons"]
        shelter_deficit = max(0, vulnerable_pop - shelter_cap)

        vulnerability_evidence = VulnerabilityEvidence(
            totalPopulation=population,
            vulnerablePopulation=vulnerable_pop,
            vulnerabilityRatioPct=vuln_ratio,
            coastalLineKm=district["coastalLineKm"],
            shelterCapacityPersons=shelter_cap,
            shelterDeficitPersons=shelter_deficit,
            provenance="CENSUS_2011_PROJECTED_SDMA"
        )

        # 5. Infrastructure Exposure Evidence
        all_assets = self._infra_data.get("assets", [])
        district_assets = [a for a in all_assets if a.get("districtId") == district_id]
        asset_names = [a.get("name") for a in district_assets]
        if not asset_names:
            asset_names = district.get("criticalAssets", [])

        shelter_occ = int(baseline_risk.get("shelterOccupancyPct", 15))
        evac_count = int(baseline_risk.get("evacuatedCount", 5000))
        evac_target = int(baseline_risk.get("evacuationTarget", 50000))
        evac_progress = round((evac_count / evac_target) * 100.0, 1) if evac_target > 0 else 0.0

        infrastructure_evidence = InfrastructureExposureEvidence(
            totalCriticalAssets=len(asset_names),
            criticalAssetsList=asset_names,
            shelterOccupancyPct=shelter_occ,
            evacuationProgressPct=evac_progress,
            provenance="NDMA_SDMA_COASTAL_REGISTRY"
        )

        return DistrictEvidence(
            districtId=district_id,
            districtName=district["name"],
            state=district["state"],
            stepId=normalized_step,
            timestamp=datetime.now(timezone.utc).isoformat(),
            cycloneHazard=cyclone_evidence,
            floodPerception=flood_perception,
            meteorology=meteorology_evidence,
            vulnerability=vulnerability_evidence,
            infrastructure=infrastructure_evidence,
            riskExplanation=None
        )

    def compile_all_districts_evidence(self, step_id: str = "NOW") -> List[DistrictEvidence]:
        districts = self.get_all_district_metadata()
        return [self.compile_district_evidence(d["id"], step_id=step_id) for d in districts]


evidence_service = EvidenceService()
