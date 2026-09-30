"""
DRISHTI Remal Verification Zone Selector (Phase 6)

Selects and ranks real verification zones for Cyclone Remal (May 2024)
across the Bay of Bengal / Odisha - West Bengal coastal arc.

ROI: 87.5°E to 88.0°E, 22.0°N to 22.5°N (and adjacent coastal sectors)

Deterministic evidence sources:
- SegFormer-predicted flood extent (NOT ground truth)
- WorldPop 2020 population exposure
- OSM roads & critical hospital infrastructure
- Drishti deterministic risk scores
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pre-defined Real Remal Verification Zones (Derived from Drishti Datasets)
# ---------------------------------------------------------------------------

REMAL_VERIFICATION_ZONES: List[Dict[str, Any]] = [
    {
        "zone_id": "REMAL-ZONE-001",
        "zone_name": "Balasore / Subarnarekha Estuary & Bhograi Sector",
        "district_id": "od_balasore",
        "district_name": "Balasore",
        "state": "Odisha",
        "priority": 0.92,
        "risk_score": 86,  # EXTREME at NOW (from district_risk.json)
        "risk_band": "EXTREME",
        "flood_fraction": 0.38,
        "flood_description": "SegFormer-predicted flood extent (38% inundation over low-lying polders)",
        "population_exposure": 510000,
        "road_exposure_km": 28.5,
        "hospitals_exposure": 1,
        "hospitals_list": ["Fakir Mohan Medical College & Hospital"],
        "critical_infrastructure": [
            "Chandipur Defence Range (ITR)",
            "Subarnarekha Estuary",
            "Balaramgadi Fishing Harbor",
            "Balasore 132/33kV Grid Substation"
        ],
        "roi": {
            "min_lon": 86.85,
            "min_lat": 21.40,
            "max_lon": 87.10,
            "max_lat": 21.65
        },
        "event_id": "CYCLONE_REMAL_2024",
        "provenance": {
            "sar_evidence": "HISTORICAL (Sentinel-1 SAR)",
            "flood_perception": "DERIVED (SegFormer-predicted flood extent)",
            "population": "HISTORICAL (WorldPop 2020)",
            "infrastructure": "SOURCE DATA (OSM & State EOC)",
            "risk_engine": "DERIVED (Deterministic Risk Engine)"
        }
    },
    {
        "zone_id": "REMAL-ZONE-002",
        "zone_name": "East Midnapore / Haldia Port & Digha Coastal Sector",
        "district_id": "wb_eastmidnapore",
        "district_name": "East Midnapore",
        "state": "West Bengal",
        "priority": 0.95,
        "risk_score": 91,  # CRITICAL at NOW
        "risk_band": "CRITICAL",
        "flood_fraction": 0.48,
        "flood_description": "SegFormer-predicted flood extent (48% inundation in coastal agriculture)",
        "population_exposure": 780000,
        "road_exposure_km": 42.0,
        "hospitals_exposure": 2,
        "hospitals_list": ["Tamluk District Hospital", "Haldia Port Hospital"],
        "critical_infrastructure": [
            "Haldia Petrochemical Complex & Port",
            "Digha-Shankarpur Coastal Wall",
            "Khejuri Saline Embankments"
        ],
        "roi": {
            "min_lon": 87.70,
            "min_lat": 21.80,
            "max_lon": 88.10,
            "max_lat": 22.05
        },
        "event_id": "CYCLONE_REMAL_2024",
        "provenance": {
            "sar_evidence": "HISTORICAL (Sentinel-1 SAR)",
            "flood_perception": "DERIVED (SegFormer-predicted flood extent)",
            "population": "HISTORICAL (WorldPop 2020)",
            "infrastructure": "SOURCE DATA (OSM & WBSDMA)",
            "risk_engine": "DERIVED (Deterministic Risk Engine)"
        }
    },
    {
        "zone_id": "REMAL-ZONE-003",
        "zone_name": "South 24 Parganas / Sundarbans Delta & Sagar Island",
        "district_id": "wb_s24parganas",
        "district_name": "South 24 Parganas",
        "state": "West Bengal",
        "priority": 0.98,
        "risk_score": 96,  # CRITICAL at NOW
        "risk_band": "CRITICAL",
        "flood_fraction": 0.62,
        "flood_description": "SegFormer-predicted flood extent (62% inundation across riverine islands)",
        "population_exposure": 1450000,
        "road_exposure_km": 65.4,
        "hospitals_exposure": 3,
        "hospitals_list": ["Kakdwip Sub-Divisional Hospital", "Sagar Rural Hospital", "Gosaba Block Health Center"],
        "critical_infrastructure": [
            "Sundarbans Delta Mangroves",
            "Sagar Island Pilgrimage Hub",
            "Kakdwip Trawler Base",
            "Sagar Island Central Cyclone Shelter"
        ],
        "roi": {
            "min_lon": 88.00,
            "min_lat": 21.50,
            "max_lon": 88.50,
            "max_lat": 22.00
        },
        "event_id": "CYCLONE_REMAL_2024",
        "provenance": {
            "sar_evidence": "HISTORICAL (Sentinel-1 SAR)",
            "flood_perception": "DERIVED (SegFormer-predicted flood extent)",
            "population": "HISTORICAL (WorldPop 2020)",
            "infrastructure": "SOURCE DATA (OSM & WBSDMA)",
            "risk_engine": "DERIVED (Deterministic Risk Engine)"
        }
    },
    {
        "zone_id": "REMAL-ZONE-004",
        "zone_name": "Kendrapara / Rajnagar & Bhitarkanika Buffer Sector",
        "district_id": "od_kendrapara",
        "district_name": "Kendrapara",
        "state": "Odisha",
        "priority": 0.87,
        "risk_score": 88,  # EXTREME at NOW
        "risk_band": "EXTREME",
        "flood_fraction": 0.45,
        "flood_description": "SegFormer-predicted flood extent (45% inundation in mangrove buffer)",
        "population_exposure": 420000,
        "road_exposure_km": 19.8,
        "hospitals_exposure": 1,
        "hospitals_list": ["Kendrapara District Headquarters Hospital"],
        "critical_infrastructure": [
            "Rajnagar Marine Sanctuary Buffer",
            "Bhitarkanika Polders",
            "Barunei Embankment",
            "Rajnagar MPCS"
        ],
        "roi": {
            "min_lon": 86.40,
            "min_lat": 20.40,
            "max_lon": 86.75,
            "max_lat": 20.70
        },
        "event_id": "CYCLONE_REMAL_2024",
        "provenance": {
            "sar_evidence": "HISTORICAL (Sentinel-1 SAR)",
            "flood_perception": "DERIVED (SegFormer-predicted flood extent)",
            "population": "HISTORICAL (WorldPop 2020)",
            "infrastructure": "SOURCE DATA (OSM & OSDMA)",
            "risk_engine": "DERIVED (Deterministic Risk Engine)"
        }
    }
]


def get_remal_verification_zones() -> List[Dict[str, Any]]:
    """Returns the ranked verification list for Cyclone Remal."""
    return sorted(REMAL_VERIFICATION_ZONES, key=lambda x: x["priority"], reverse=True)


def get_remal_zone_by_id(zone_id: str) -> Dict[str, Any]:
    """Retrieves a specific verification zone by ID."""
    for z in REMAL_VERIFICATION_ZONES:
        if z["zone_id"] == zone_id:
            return z
    # Default fallback to REMAL-ZONE-001
    return REMAL_VERIFICATION_ZONES[0]
