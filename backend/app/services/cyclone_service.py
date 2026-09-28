import os
import csv
from typing import Dict, List, Optional
from app.models.schemas import CycloneMetadata, TimelineStep, CycloneScenario

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CSV_PATH = os.path.join(DATA_DIR, "remal_2024.csv")

CYCLONE_METADATA = {
    "stormId": "BOB-01-2024-REMAL",
    "name": "Cyclone REMAL",
    "basin": "Bay of Bengal (North)",
    "category": "Severe Cyclonic Storm (SCS)",
    "classificationCode": "IMD-SCS-T3.5",
    "provenance": "HISTORICAL SIMULATION — CYCLONE REMAL 2024",
    "isSimulated": True,
    "advisoryNumber": "IMD-BOB-07",
    "targetRegion": "Odisha - West Bengal - Bangladesh Coastal Arc",
    "referenceYear": 2024
}

TIMELINE_STEPS = [
    {"id": "T-24h", "label": "T - 24h", "timestamp": "2024-05-25T00:00:00Z", "dateDisplay": "25 May, 05:30 IST", "stage": "Deep Depression"},
    {"id": "T-12h", "label": "T - 12h", "timestamp": "2024-05-25T12:00:00Z", "dateDisplay": "25 May, 17:30 IST", "stage": "Cyclonic Storm"},
    {"id": "NOW", "label": "CURRENT (NOW)", "timestamp": "2024-05-26T00:00:00Z", "dateDisplay": "26 May, 05:30 IST", "stage": "Severe Cyclonic Storm"},
    {"id": "+12h", "label": "+ 12h", "timestamp": "2024-05-26T12:00:00Z", "dateDisplay": "26 May, 17:30 IST", "stage": "Severe Cyclonic Storm (Peak)"},
    {"id": "+24h", "label": "+ 24h", "timestamp": "2024-05-27T00:00:00Z", "dateDisplay": "27 May, 05:30 IST", "stage": "Post-Landfall Depression"},
    {"id": "+48h", "label": "+ 48h", "timestamp": "2024-05-27T12:00:00Z", "dateDisplay": "27 May, 17:30 IST", "stage": "Deep Depression Inland"},
    {"id": "+72h", "label": "+ 72h", "timestamp": "2024-05-28T00:00:00Z", "dateDisplay": "28 May, 05:30 IST", "stage": "Well-Marked Low (Dissipating)"}
]

TIMELINE_SCENARIOS = {
    "T-24h": {
        "stepId": "T-24h",
        "current": {
            "latitude": 17.6,
            "longitude": 90.0,
            "timestamp": "2024-05-25 00:00:00 UTC",
            "windKt": 30,
            "windKmh": 55,
            "gustKmh": 75,
            "pressureMb": 993,
            "category": "Deep Depression",
            "movementDirection": "North-Northwest (350°)",
            "movementSpeedKmh": 12,
            "intensityTrend": "Rapidly Intensifying over warm sea surface (SST 30.5°C)",
            "landfallExpectedTime": "26 May, ~22:00 IST",
            "distanceToCoastKm": 380
        },
        "windRadii": {"r34Km": 120, "r50Km": 0, "r64Km": 0},
        "pastTrack": [
            {"lat": 13.6, "lon": 86.6, "label": "23 May 12:00", "windKt": 15},
            {"lat": 14.3, "lon": 87.7, "label": "23 May 18:00", "windKt": 15},
            {"lat": 15.2, "lon": 88.6, "label": "24 May 00:00", "windKt": 20},
            {"lat": 16.4, "lon": 89.6, "label": "24 May 12:00", "windKt": 25},
            {"lat": 17.6, "lon": 90.0, "label": "25 May 00:00", "windKt": 30}
        ],
        "forecastTrack": [
            {"lat": 18.7, "lon": 89.3, "label": "+12h (25 May 12:00)", "windKt": 35},
            {"lat": 19.6, "lon": 89.2, "label": "+24h (26 May 00:00)", "windKt": 50},
            {"lat": 21.2, "lon": 89.1, "label": "+36h (26 May 12:00)", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "+42h Landfall (26 May 18:00)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "+48h (27 May 00:00)", "windKt": 45},
            {"lat": 23.6, "lon": 89.6, "label": "+60h (27 May 12:00)", "windKt": 35}
        ],
        "coneCoordinates": [
            [17.6, 90.0], [18.9, 88.1], [21.5, 87.6], [22.8, 87.5], [23.9, 88.5],
            [24.0, 90.5], [22.5, 90.6], [20.8, 90.4], [18.5, 90.8], [17.6, 90.0]
        ]
    },
    "T-12h": {
        "stepId": "T-12h",
        "current": {
            "latitude": 18.7,
            "longitude": 89.3,
            "timestamp": "2024-05-25 12:00:00 UTC",
            "windKt": 35,
            "windKmh": 65,
            "gustKmh": 85,
            "pressureMb": 989,
            "category": "Cyclonic Storm",
            "movementDirection": "North (005°)",
            "movementSpeedKmh": 14,
            "intensityTrend": "Upgraded to Cyclonic Storm. High convective burst around center.",
            "landfallExpectedTime": "26 May, 22:30 IST",
            "distanceToCoastKm": 270
        },
        "windRadii": {"r34Km": 180, "r50Km": 70, "r64Km": 0},
        "pastTrack": [
            {"lat": 13.6, "lon": 86.6, "label": "23 May 12:00", "windKt": 15},
            {"lat": 15.2, "lon": 88.6, "label": "24 May 00:00", "windKt": 20},
            {"lat": 16.4, "lon": 89.6, "label": "24 May 12:00", "windKt": 25},
            {"lat": 17.6, "lon": 90.0, "label": "25 May 00:00", "windKt": 30},
            {"lat": 18.7, "lon": 89.3, "label": "25 May 12:00", "windKt": 35}
        ],
        "forecastTrack": [
            {"lat": 19.6, "lon": 89.2, "label": "+12h (26 May 00:00)", "windKt": 50},
            {"lat": 21.2, "lon": 89.1, "label": "+24h (26 May 12:00)", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "+30h Landfall (26 May 18:00)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "+36h (27 May 00:00)", "windKt": 45},
            {"lat": 23.6, "lon": 89.6, "label": "+48h (27 May 12:00)", "windKt": 35}
        ],
        "coneCoordinates": [
            [18.7, 89.3], [19.8, 88.2], [21.6, 87.8], [22.8, 87.9], [23.8, 88.9],
            [23.7, 90.4], [22.3, 90.3], [20.7, 90.2], [18.7, 89.3]
        ]
    },
    "NOW": {
        "stepId": "NOW",
        "current": {
            "latitude": 19.6,
            "longitude": 89.2,
            "timestamp": "2024-05-26 00:00:00 UTC",
            "windKt": 50,
            "windKmh": 95,
            "gustKmh": 120,
            "pressureMb": 984,
            "category": "Severe Cyclonic Storm (SCS)",
            "movementDirection": "North (000°)",
            "movementSpeedKmh": 16,
            "intensityTrend": "Severe Cyclonic Storm. High eye-wall condensation, dangerous sea state.",
            "landfallExpectedTime": "26 May, 22:30 IST (~16 hours remaining)",
            "distanceToCoastKm": 185
        },
        "windRadii": {"r34Km": 240, "r50Km": 130, "r64Km": 45},
        "pastTrack": [
            {"lat": 13.6, "lon": 86.6, "label": "23 May 12:00", "windKt": 15},
            {"lat": 15.2, "lon": 88.6, "label": "24 May 00:00", "windKt": 20},
            {"lat": 16.4, "lon": 89.6, "label": "24 May 12:00", "windKt": 25},
            {"lat": 17.6, "lon": 90.0, "label": "25 May 00:00", "windKt": 30},
            {"lat": 18.7, "lon": 89.3, "label": "25 May 12:00", "windKt": 35},
            {"lat": 19.6, "lon": 89.2, "label": "NOW (26 May 00:00)", "windKt": 50}
        ],
        "forecastTrack": [
            {"lat": 20.3, "lon": 89.1, "label": "+6h (26 May 06:00)", "windKt": 50},
            {"lat": 21.2, "lon": 89.1, "label": "+12h (26 May 12:00)", "windKt": 60},
            {"lat": 21.6, "lon": 89.0, "label": "+15h (26 May 15:00)", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "+18h Landfall (26 May 18:00)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "+24h (27 May 00:00)", "windKt": 45},
            {"lat": 23.6, "lon": 89.6, "label": "+36h (27 May 12:00)", "windKt": 35}
        ],
        "coneCoordinates": [
            [19.6, 89.2], [20.5, 88.3], [21.6, 88.0], [22.5, 88.1], [23.2, 88.8],
            [23.4, 90.1], [22.2, 90.0], [21.1, 89.9], [19.6, 89.2]
        ]
    },
    "+12h": {
        "stepId": "+12h",
        "current": {
            "latitude": 21.2,
            "longitude": 89.1,
            "timestamp": "2024-05-26 12:00:00 UTC",
            "windKt": 60,
            "windKmh": 110,
            "gustKmh": 135,
            "pressureMb": 978,
            "category": "Severe Cyclonic Storm (Peak Intensity)",
            "movementDirection": "North (355°)",
            "movementSpeedKmh": 18,
            "intensityTrend": "PEAK INTENSITY. Approaching coast. Catastrophic storm surge potential.",
            "landfallExpectedTime": "26 May, 22:30 IST (~4 hours to landfall)",
            "distanceToCoastKm": 65
        },
        "windRadii": {"r34Km": 280, "r50Km": 160, "r64Km": 70},
        "pastTrack": [
            {"lat": 15.2, "lon": 88.6, "label": "24 May 00:00", "windKt": 20},
            {"lat": 17.6, "lon": 90.0, "label": "25 May 00:00", "windKt": 30},
            {"lat": 18.7, "lon": 89.3, "label": "25 May 12:00", "windKt": 35},
            {"lat": 19.6, "lon": 89.2, "label": "26 May 00:00", "windKt": 50},
            {"lat": 20.3, "lon": 89.1, "label": "26 May 06:00", "windKt": 50},
            {"lat": 21.2, "lon": 89.1, "label": "+12h (26 May 12:00)", "windKt": 60}
        ],
        "forecastTrack": [
            {"lat": 21.6, "lon": 89.0, "label": "+3h (26 May 15:00)", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "+6h Landfall (26 May 18:00)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "+12h (27 May 00:00)", "windKt": 45},
            {"lat": 23.1, "lon": 89.1, "label": "+18h (27 May 06:00)", "windKt": 35},
            {"lat": 23.6, "lon": 89.6, "label": "+24h (27 May 12:00)", "windKt": 35}
        ],
        "coneCoordinates": [
            [21.2, 89.1], [21.8, 88.4], [22.6, 88.3], [23.4, 88.9],
            [23.4, 89.8], [22.5, 89.7], [21.2, 89.1]
        ]
    },
    "+24h": {
        "stepId": "+24h",
        "current": {
            "latitude": 22.6,
            "longitude": 89.0,
            "timestamp": "2024-05-27 00:00:00 UTC",
            "windKt": 45,
            "windKmh": 85,
            "gustKmh": 105,
            "pressureMb": 982,
            "category": "Cyclonic Storm (Post-Landfall)",
            "movementDirection": "North-Northeast (020°)",
            "movementSpeedKmh": 15,
            "intensityTrend": "Weakening overland. Heavy freshwater inundation and gale-force squalls.",
            "landfallExpectedTime": "Landfall Occurred (26 May 21:30 - 23:30 IST)",
            "distanceToCoastKm": 0
        },
        "windRadii": {"r34Km": 210, "r50Km": 80, "r64Km": 0},
        "pastTrack": [
            {"lat": 17.6, "lon": 90.0, "label": "25 May 00:00", "windKt": 30},
            {"lat": 19.6, "lon": 89.2, "label": "26 May 00:00", "windKt": 50},
            {"lat": 21.2, "lon": 89.1, "label": "26 May 12:00", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "26 May 18:00 (Landfall)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "+24h (27 May 00:00)", "windKt": 45}
        ],
        "forecastTrack": [
            {"lat": 23.1, "lon": 89.1, "label": "+6h (27 May 06:00)", "windKt": 35},
            {"lat": 23.6, "lon": 89.6, "label": "+12h (27 May 12:00)", "windKt": 35},
            {"lat": 24.1, "lon": 90.5, "label": "+18h (27 May 18:00)", "windKt": 30},
            {"lat": 24.5, "lon": 91.1, "label": "+24h (28 May 00:00)", "windKt": 20}
        ],
        "coneCoordinates": [
            [22.6, 89.0], [23.2, 88.6], [24.0, 89.5], [24.7, 91.0],
            [24.5, 91.8], [23.7, 91.0], [23.0, 89.8], [22.6, 89.0]
        ]
    },
    "+48h": {
        "stepId": "+48h",
        "current": {
            "latitude": 23.6,
            "longitude": 89.6,
            "timestamp": "2024-05-27 12:00:00 UTC",
            "windKt": 35,
            "windKmh": 65,
            "gustKmh": 80,
            "pressureMb": 987,
            "category": "Deep Depression",
            "movementDirection": "Northeast (045°)",
            "movementSpeedKmh": 16,
            "intensityTrend": "Further weakened to Deep Depression. Widespread rainfall warning in effect.",
            "landfallExpectedTime": "Post-Landfall Stage",
            "distanceToCoastKm": 120
        },
        "windRadii": {"r34Km": 130, "r50Km": 0, "r64Km": 0},
        "pastTrack": [
            {"lat": 19.6, "lon": 89.2, "label": "26 May 00:00", "windKt": 50},
            {"lat": 21.2, "lon": 89.1, "label": "26 May 12:00", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "Landfall (26 May 18:00)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "27 May 00:00", "windKt": 45},
            {"lat": 23.6, "lon": 89.6, "label": "+48h (27 May 12:00)", "windKt": 35}
        ],
        "forecastTrack": [
            {"lat": 24.1, "lon": 90.5, "label": "+6h (27 May 18:00)", "windKt": 30},
            {"lat": 24.5, "lon": 91.1, "label": "+12h (28 May 00:00)", "windKt": 20},
            {"lat": 25.1, "lon": 91.8, "label": "+18h (28 May 06:00)", "windKt": 20}
        ],
        "coneCoordinates": [
            [23.6, 89.6], [24.2, 89.9], [24.8, 90.7], [25.5, 92.2],
            [24.8, 92.4], [24.0, 91.4], [23.6, 89.6]
        ]
    },
    "+72h": {
        "stepId": "+72h",
        "current": {
            "latitude": 24.5,
            "longitude": 91.1,
            "timestamp": "2024-05-28 00:00:00 UTC",
            "windKt": 20,
            "windKmh": 37,
            "gustKmh": 50,
            "pressureMb": 991,
            "category": "Well-Marked Low Pressure Area",
            "movementDirection": "Northeast (050°)",
            "movementSpeedKmh": 18,
            "intensityTrend": "Dissipating over Meghalaya / Assam terrain. Flash flood advisories active.",
            "landfallExpectedTime": "System Degraded",
            "distanceToCoastKm": 260
        },
        "windRadii": {"r34Km": 60, "r50Km": 0, "r64Km": 0},
        "pastTrack": [
            {"lat": 21.2, "lon": 89.1, "label": "26 May 12:00", "windKt": 60},
            {"lat": 22.0, "lon": 88.9, "label": "Landfall (26 May 18:00)", "windKt": 60},
            {"lat": 22.6, "lon": 89.0, "label": "27 May 00:00", "windKt": 45},
            {"lat": 23.6, "lon": 89.6, "label": "27 May 12:00", "windKt": 35},
            {"lat": 24.5, "lon": 91.1, "label": "+72h (28 May 00:00)", "windKt": 20}
        ],
        "forecastTrack": [
            {"lat": 25.1, "lon": 91.8, "label": "+6h (28 May 06:00)", "windKt": 20}
        ],
        "coneCoordinates": [
            [24.5, 91.1], [25.0, 91.2], [25.6, 92.4], [24.9, 92.6], [24.5, 91.1]
        ]
    }
}

class CycloneService:
    @staticmethod
    def get_metadata() -> dict:
        return CYCLONE_METADATA

    @staticmethod
    def get_timeline_steps() -> List[dict]:
        return TIMELINE_STEPS

    @staticmethod
    def get_scenario(step_id: str) -> Optional[dict]:
        normalized_step = step_id.strip()
        if normalized_step.upper() == "CURRENT":
            normalized_step = "NOW"
        # Direct lookup or fallback to NOW
        if normalized_step in TIMELINE_SCENARIOS:
            sc = TIMELINE_SCENARIOS[normalized_step]
            return {
                **sc,
                "pastTrack": [{**p, "isSimulated": False} for p in sc.get("pastTrack", [])],
                "forecastTrack": [{**p, "isSimulated": True} for p in sc.get("forecastTrack", [])]
            }
        return None

    @staticmethod
    def get_raw_csv_track() -> List[dict]:
        points = []
        if os.path.exists(CSV_PATH):
            with open(CSV_PATH, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    points.append(row)
        return points

cyclone_service = CycloneService()
