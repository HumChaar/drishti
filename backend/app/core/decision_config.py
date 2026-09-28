"""
DRISHTI Decision Engine Configuration (Stage 5 JEV / TypeSafe Decision Intelligence)
Centralizes policy rules, risk band thresholds, and operational trigger criteria.
Completely transparent, auditable, and decoupled from execution code.
"""

from typing import Dict, List, Any
from pydantic import BaseModel, Field


class PolicyRule(BaseModel):
    policy_id: str
    title: str
    target_risk_bands: List[str]
    min_risk_score: int
    priority: str  # "IMMEDIATE", "HIGH", "MODERATE", "ROUTINE"
    default_status: str = "REQUIRES_APPROVAL"
    trigger_criteria_description: str
    requires_human_approval: bool = True


class DecisionThresholds(BaseModel):
    # Risk Bands
    extreme_risk_threshold: int = Field(80, description="Minimum composite score for EXTREME risk policy activation")
    high_risk_threshold: int = Field(65, description="Minimum composite score for HIGH risk policy activation")
    moderate_risk_threshold: int = Field(45, description="Minimum composite score for MODERATE risk policy activation")

    # Specific Hazard / Exposure Thresholds
    critical_surge_meters: float = Field(2.5, description="Surge height triggering immediate coastal evacuation")
    moderate_surge_meters: float = Field(1.5, description="Surge height triggering targeted relocation")
    
    critical_flood_extent_pct: float = Field(50.0, description="SegFormer SAR flood extent % triggering rescue strike teams")
    moderate_flood_extent_pct: float = Field(25.0, description="SegFormer SAR flood extent % triggering QRT deployment")

    critical_shelter_deficit_ratio: float = Field(0.50, description="Shelter deficit to vulnerable population ratio triggering auxiliary shelters")
    high_shelter_occupancy_pct: int = Field(75, description="Shelter occupancy % triggering overflow staging")

    critical_wind_speed_kmh: int = Field(85, description="Wind velocity triggering maritime port moratorium")
    gale_wind_speed_kmh: int = Field(50, description="Wind velocity triggering cautionary maritime signal")


# Auditable Master Policy Catalog
DECISION_POLICIES: Dict[str, PolicyRule] = {
    # EXTREME Risk Policies
    "EVACUATION_RECOMMENDATION": PolicyRule(
        policy_id="EVACUATION_RECOMMENDATION",
        title="Evacuation Assessment & Mandatory Zone Clearance",
        target_risk_bands=["EXTREME", "CRITICAL"],
        min_risk_score=80,
        priority="IMMEDIATE",
        default_status="REQUIRES_APPROVAL",
        trigger_criteria_description="Composite risk score >= 80, or storm surge >= 2.5m, or SAR flood inundation >= 50%"
    ),
    "EMERGENCY_SHELTER_ACTIVATION": PolicyRule(
        policy_id="EMERGENCY_SHELTER_ACTIVATION",
        title="Emergency Shelter Auxiliary Activation & 72h Rations",
        target_risk_bands=["EXTREME", "CRITICAL", "HIGH"],
        min_risk_score=65,
        priority="IMMEDIATE",
        default_status="REQUIRES_APPROVAL",
        trigger_criteria_description="Shelter occupancy >= 75%, shelter deficit >= 20,000, or composite risk >= 80"
    ),
    "CRITICAL_INFRASTRUCTURE_PROTECTION": PolicyRule(
        policy_id="CRITICAL_INFRASTRUCTURE_PROTECTION",
        title="Critical Infrastructure Protection & Power Grid Islanding",
        target_risk_bands=["EXTREME", "CRITICAL", "HIGH"],
        min_risk_score=65,
        priority="IMMEDIATE",
        default_status="REQUIRES_APPROVAL",
        trigger_criteria_description="High flood inundation >= 40%, surge >= 2.0m, or sustained winds >= 85 km/h"
    ),
    "EMERGENCY_OPERATIONS_ESCALATION": PolicyRule(
        policy_id="EMERGENCY_OPERATIONS_ESCALATION",
        title="Emergency Operations Escalation (NDRF / ODRAF Strike Teams)",
        target_risk_bands=["EXTREME", "CRITICAL"],
        min_risk_score=80,
        priority="IMMEDIATE",
        default_status="REQUIRES_APPROVAL",
        trigger_criteria_description="Composite risk score >= 80 or flood inundation >= 50% requiring boat rescues"
    ),

    # HIGH Risk Policies
    "PREPARE_EVACUATION": PolicyRule(
        policy_id="PREPARE_EVACUATION",
        title="Targeted Evacuation Preparation for Kutcha Dwellings",
        target_risk_bands=["HIGH"],
        min_risk_score=65,
        priority="HIGH",
        default_status="RECOMMENDED",
        trigger_criteria_description="Composite risk score 65-79 with storm surge >= 1.5m or flood inundation >= 25%"
    ),
    "INCREASE_SHELTER_READINESS": PolicyRule(
        policy_id="INCREASE_SHELTER_READINESS",
        title="Pre-stock Potable Water, Generator Fuel & Sanitation in Shelters",
        target_risk_bands=["HIGH"],
        min_risk_score=65,
        priority="HIGH",
        default_status="RECOMMENDED",
        trigger_criteria_description="Shelter occupancy >= 40% or projected vulnerable intake"
    ),
    "INFRASTRUCTURE_MONITORING": PolicyRule(
        policy_id="INFRASTRUCTURE_MONITORING",
        title="Infrastructure Vulnerability Telemetry & Telecom Feeder Monitoring",
        target_risk_bands=["HIGH", "MODERATE"],
        min_risk_score=45,
        priority="HIGH",
        default_status="RECOMMENDED",
        trigger_criteria_description="Sustained winds >= 55 km/h or localized inundation risk"
    ),
    "EMERGENCY_COORDINATION": PolicyRule(
        policy_id="EMERGENCY_COORDINATION",
        title="District Quick Response Teams (QRT) Pre-deployment",
        target_risk_bands=["HIGH"],
        min_risk_score=65,
        priority="HIGH",
        default_status="RECOMMENDED",
        trigger_criteria_description="Composite risk score 65-79 requiring multi-agency inter-departmental mobilization"
    ),

    # MODERATE Risk Policies
    "ENHANCED_MONITORING": PolicyRule(
        policy_id="ENHANCED_MONITORING",
        title="Enhanced Multi-Hazard Surveillance & Community Alerts",
        target_risk_bands=["MODERATE"],
        min_risk_score=45,
        priority="MODERATE",
        default_status="RECOMMENDED",
        trigger_criteria_description="Composite risk score 45-64; cyclone eye within influence buffer"
    ),
    "PREPAREDNESS_ACTIONS": PolicyRule(
        policy_id="PREPAREDNESS_ACTIONS",
        title="Precautionary Movement of Special Care Demographics",
        target_risk_bands=["MODERATE"],
        min_risk_score=45,
        priority="MODERATE",
        default_status="RECOMMENDED",
        trigger_criteria_description="Vulnerable elderly, infants, and pregnant mothers assisted to local centers"
    ),
    "SHELTER_READINESS_CHECK": PolicyRule(
        policy_id="SHELTER_READINESS_CHECK",
        title="Shelter Structural Audit, Sluice Gate & Drainage Clearance",
        target_risk_bands=["MODERATE"],
        min_risk_score=45,
        priority="MODERATE",
        default_status="READY",
        trigger_criteria_description="Standard pre-impact checklist verification before gale onset"
    ),

    # LOW Risk Policies
    "ROUTINE_MONITORING": PolicyRule(
        policy_id="ROUTINE_MONITORING",
        title="Routine Coastal Surveillance & IMD Bulletin Tracking",
        target_risk_bands=["LOW"],
        min_risk_score=0,
        priority="ROUTINE",
        default_status="READY",
        trigger_criteria_description="Baseline coastal weather conditions; peripheral monitoring only"
    )
}

DEFAULT_DECISION_THRESHOLDS = DecisionThresholds()
