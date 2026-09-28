from typing import List, Optional, Any, Dict, Union
from enum import Enum
from pydantic import BaseModel, Field

# Health Model
class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    app_name: str = Field(..., example="DRISHTI FastAPI Backend")
    version: str = Field(..., example="1.0.0-rc1")
    environment: str = Field(..., example="development")
    provenance: str = Field(..., example="HISTORICAL SIMULATION — CYCLONE REMAL 2024")
    timestamp: str

# Cyclone Models
class CycloneMetadata(BaseModel):
    stormId: str
    name: str
    basin: str
    category: str
    classificationCode: str
    provenance: str
    isSimulated: bool
    advisoryNumber: str
    targetRegion: str
    referenceYear: int

class TimelineStep(BaseModel):
    id: str
    label: str
    timestamp: str
    dateDisplay: str
    stage: str

class TrackPoint(BaseModel):
    lat: float
    lon: float
    label: str
    windKt: int
    isSimulated: bool = False

class CurrentCycloneState(BaseModel):
    latitude: float
    longitude: float
    timestamp: str
    windKt: int
    windKmh: int
    gustKmh: int
    pressureMb: int
    category: str
    movementDirection: str
    movementSpeedKmh: int
    intensityTrend: str
    landfallExpectedTime: str
    distanceToCoastKm: int

class WindRadii(BaseModel):
    r34Km: int
    r50Km: int
    r64Km: int

class CycloneScenario(BaseModel):
    stepId: str
    current: CurrentCycloneState
    windRadii: WindRadii
    pastTrack: List[TrackPoint]
    forecastTrack: List[TrackPoint]
    coneCoordinates: List[List[float]]

class CycloneScenarioResponse(BaseModel):
    success: bool
    data: CycloneScenario
    metadata: dict

# District Risk Models
class DistrictRiskMetrics(BaseModel):
    riskScore: int
    riskBand: str
    color: str
    surgeMeters: float
    rainMm24h: int
    windKmh: int
    gustKmh: int
    inundationProbPct: int
    evacuatedCount: int
    evacuationTarget: int
    shelterOccupancyPct: int
    primaryDrivers: List[str]
    contributingFactors: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    provenanceSummary: Optional[Dict[str, str]] = None
    evidenceSummary: Optional[Dict[str, Any]] = None

class DistrictBase(BaseModel):
    id: str
    name: str
    state: str
    headquarters: str
    lat: float
    lon: float
    coastalLineKm: int
    population: int
    vulnerablePopulation: int
    totalShelters: int
    shelterCapacityPersons: int
    criticalAssets: List[str]

class DistrictWithRisk(DistrictBase):
    risk: DistrictRiskMetrics

class DistrictRiskMatrixResponse(BaseModel):
    stepId: str
    provenance: str
    totalDistrictsMonitored: int
    districts: List[DistrictWithRisk]

# Infrastructure Models
class InfrastructureAsset(BaseModel):
    id: str
    name: str
    category: str
    type: str
    districtId: str
    lat: float
    lon: float
    status: str
    statusLevel: str
    riskLevel: str
    details: str
    capacityMetric: str
    contactUnit: str

class InfrastructureResponse(BaseModel):
    provenance: str
    totalAssets: int
    assets: List[InfrastructureAsset]

# Emergency Directives Models
class WarningSignal(BaseModel):
    port: str
    signal: str
    status: str

class PreparednessMetrics(BaseModel):
    totalEvacuated: int
    targetEvacuation: int
    activeShelters: int
    reliefStocksAvailableDays: int
    ndrfOdrafTeamsDeployed: int
    boatsPositioned: int
    satellitePhonesActive: int
    warningSignals: List[WarningSignal]

class EmergencyDirective(BaseModel):
    id: str
    code: str
    title: str
    target: str
    department: str
    priority: str
    status: str
    progressPct: int
    completionNote: str
    actionType: str

class EmergencyDirectivesResponse(BaseModel):
    provenance: str
    metrics: PreparednessMetrics
    directives: List[EmergencyDirective]

class UpdateDirectiveStatusRequest(BaseModel):
    status: str

# Weather Models
class MarineBulletinResponse(BaseModel):
    bulletinNo: str
    issuedAt: str
    provenance: str
    seaCondition: str
    significantWaveHeightMeters: float
    waveDirection: str
    surfaceWaterTempC: float
    squallWarning: str
    fishermenAdvisory: str

# SegFormer SAR Flood Inference Models
class FloodPreprocessingMetadata(BaseModel):
    vv_clip_min: float = -35.0
    vv_clip_max: float = 5.0
    vh_clip_min: float = -40.0
    vh_clip_max: float = 0.0
    input_resolution: List[int] = [224, 224]
    input_channels: List[str] = ["VV", "VH"]
    normalization_applied: str = "clipping_and_fp32_tensor_formatting"

class FloodInferenceEvidence(BaseModel):
    model: str = "SegFormer-B0"
    model_identifier: str = "SegFormer-B0 (best_clean)"
    base_model: str = "nvidia/mit-b0"
    checkpoint_path: str
    provenance: str = "SegFormer-B0 inference"
    timestamp: str
    input_shape: List[int]
    output_shape: List[int]
    total_pixels: int
    flood_pixels: int = 0
    flood_pixel_count: int = 0
    non_flood_pixel_count: int = 0
    flood_percentage: float
    flood_probability: float = Field(..., description="Mean model confidence / probability")
    classes: Union[List[str], dict] = ["NON_FLOOD", "FLOOD"]
    preprocessing: FloodPreprocessingMetadata
    flood_mask: Optional[List[List[int]]] = None
    confidence_mean: Optional[float] = None
    inference_time_ms: float
    is_genuine_sar_sample: bool = False
    validation_note: str = "Tensor fixture / synthetic benchmark. Real-world accuracy requires Sentinel-1 SAR dual-pol input."

class FloodInferenceRequest(BaseModel):
    district_id: Optional[str] = Field(None, description="Target district ID, e.g. 'od_balasore', 'od_kendrapara'")
    vv_values: Optional[List[List[float]]] = Field(None, description="2D matrix of VV backscatter values in dB")
    vh_values: Optional[List[List[float]]] = Field(None, description="2D matrix of VH backscatter values in dB")
    include_mask: bool = Field(True, description="Whether to include full 224x224 segmentation mask in response")

class FloodInferenceStatusResponse(BaseModel):
    model_loaded: bool
    model_identifier: str
    checkpoint_exists: bool
    weights_path: str
    num_parameters: int
    input_channels: int
    input_size: int
    onnx_exported: bool
    device: str

# ==========================================
# STAGE 4: EVIDENCE LAYER & TRANSPARENT RISK
# ==========================================

class ContributingFactor(BaseModel):
    name: str = Field(..., description="Factor label, e.g. 'Flood Inundation & SAR Perception'")
    category: str = Field(..., description="High-level category, e.g. 'flood_hazard'")
    rawValueDisplay: str = Field(..., description="Human readable raw value, e.g. '96.9% flood extent'")
    subScore: float = Field(..., description="Normalized 0-100 sub-score for this factor")
    weight: float = Field(..., description="Configured weight (0.0 to 1.0)")
    weightedPoints: float = Field(..., description="Contribution to composite score (subScore * weight)")
    driverSummary: str = Field(..., description="Specific hazard or vulnerability driver description")

class RiskExplanation(BaseModel):
    compositeScore: int
    riskBand: str
    color: str
    urgencyLabel: str
    formula: str
    contributingFactors: Dict[str, ContributingFactor]
    plainTextExplanation: str
    provenanceTiers: Dict[str, str]

class CycloneHazardEvidence(BaseModel):
    stormName: str = "REMAL"
    category: str = "Severe Cyclonic Storm (SCS)"
    eyeDistanceKm: float
    eyeLatitude: float
    eyeLongitude: float
    centralPressureMb: int
    maxWindKmh: int
    provenance: str = "HISTORICAL_SIMULATION_REMAL_2024"

class PerceptionEvidenceSummary(BaseModel):
    modelIdentifier: str = "SegFormer-B0 (best_clean)"
    floodPercentage: float
    floodProbability: float
    confidenceMean: Optional[float] = None
    isGenuineSar: bool = False
    provenance: str = "[AI INFERENCE] SegFormer-B0 SAR Flood Perception"
    validationNote: str

class MeteorologicalHazardEvidence(BaseModel):
    rainMm24h: float
    surgeMeters: float
    windKmh: int
    gustKmh: int
    inundationProbPct: int
    provenance: str = "HISTORICAL_SIMULATION_METEOROLOGY"

class VulnerabilityEvidence(BaseModel):
    totalPopulation: int
    vulnerablePopulation: int
    vulnerabilityRatioPct: float
    coastalLineKm: int
    shelterCapacityPersons: int
    shelterDeficitPersons: int
    provenance: str = "CENSUS_2011_PROJECTED_SDMA"

class InfrastructureExposureEvidence(BaseModel):
    totalCriticalAssets: int
    criticalAssetsList: List[str]
    shelterOccupancyPct: int
    evacuationProgressPct: float
    provenance: str = "NDMA_SDMA_COASTAL_REGISTRY"

class DistrictEvidence(BaseModel):
    districtId: str
    districtName: str
    state: str
    stepId: str
    timestamp: str
    cycloneHazard: CycloneHazardEvidence
    floodPerception: PerceptionEvidenceSummary
    meteorology: MeteorologicalHazardEvidence
    vulnerability: VulnerabilityEvidence
    infrastructure: InfrastructureExposureEvidence
    riskExplanation: Optional[RiskExplanation] = None

class DistrictEvidenceResponse(BaseModel):
    stepId: str
    provenance: str
    district: DistrictEvidence

class AllDistrictsEvidenceResponse(BaseModel):
    stepId: str
    provenance: str
    totalDistricts: int
    districts: List[DistrictEvidence]

class RiskEvaluationRequest(BaseModel):
    districtId: str = Field(..., description="Target district ID, e.g. 'od_balasore'")
    stepId: Optional[str] = Field("NOW", description="Timeline step identifier")
    customRainMm24h: Optional[float] = Field(None, description="Optional override for 24h rainfall (mm)")
    customSurgeMeters: Optional[float] = Field(None, description="Optional override for storm surge (m)")
    customWindKmh: Optional[int] = Field(None, description="Optional override for sustained wind (km/h)")
    customFloodPct: Optional[float] = Field(None, description="Optional override for flood extent %")
    sarVvValues: Optional[List[List[float]]] = Field(None, description="Optional custom VV backscatter grid (224x224)")
    sarVhValues: Optional[List[List[float]]] = Field(None, description="Optional custom VH backscatter grid (224x224)")

# ========================================================
# STAGE 5: DECISION INTELLIGENCE & GEMINI ADVISORY MODELS
# ========================================================

class DecisionIntelligenceProfile(BaseModel):
    """
    Standardized, validated profile feeding Decision Intelligence & Advisory systems.
    Designed for plug-and-play TypeSafe / JEV integration.
    """
    profile_id: str
    district_id: str
    district_name: str
    state: str
    step_id: str
    risk_score: int
    risk_band: str
    color: str
    surge_meters: float
    rain_mm_24h: float
    wind_kmh: int
    gust_kmh: int
    eye_distance_km: float
    flood_extent_pct: float
    flood_probability: float
    is_genuine_sar: bool
    total_population: int
    vulnerable_population: int
    shelter_capacity: int
    shelter_deficit: int
    critical_assets_count: int
    critical_assets: List[str]
    shelter_occupancy_pct: int
    evacuation_progress_pct: float
    contributing_factors_summary: Dict[str, float]
    provenance_chain: Dict[str, str]
    evidence_references: List[str]
    timestamp: str

class AdvisoryPriorityAction(BaseModel):
    action_id: str
    priority: str = Field(..., description="'CRITICAL', 'HIGH', or 'MEDIUM'")
    action_type: str = Field(..., description="e.g. 'Evacuation', 'Maritime', 'Power Grid', 'Shelter Relief'")
    title: str
    description: str
    target_agency: str = Field(..., description="e.g. 'OSDMA / Police', 'Port Authority', 'OPTCL / SLDC'")
    rationale: str

class StructuredAdvisoryContent(BaseModel):
    summary: str
    risk_explanation: str
    priority_actions: List[AdvisoryPriorityAction]
    affected_population: str
    infrastructure_concerns: List[str]
    confidence: str
    evidence_used: List[str]
    provenance: str
    requires_human_approval: bool = True

class AdvisoryReviewRecord(BaseModel):
    advisory_id: str
    status: str = Field("PENDING", description="'PENDING', 'APPROVED', 'REJECTED', 'MODIFIED'")
    reviewer_name: Optional[str] = "Incident Commander"
    reviewer_notes: Optional[str] = None
    reviewed_at: Optional[str] = None
    modified_actions: Optional[List[AdvisoryPriorityAction]] = None

class AdvisoryGenerationRequest(BaseModel):
    district_id: str = Field(..., description="Target district ID, e.g. 'od_balasore'")
    step_id: Optional[str] = Field("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")
    language: Optional[str] = Field("en", description="Target advisory language: 'en', 'or', 'bn', 'hi'")
    include_sar_perception: Optional[bool] = Field(True, description="Whether to include SegFormer SAR flood evidence")

class AdvisoryResponse(BaseModel):
    advisory_id: str
    district_id: str
    district_name: str
    language: str
    risk_score: int
    risk_band: str
    mode: str = Field(..., description="'LIVE_GEMINI' or 'DEMO_FALLBACK'")
    advisory: StructuredAdvisoryContent
    review: AdvisoryReviewRecord
    decision_profile: DecisionIntelligenceProfile
    generated_at: str

class AdvisoryReviewRequest(BaseModel):
    action: str = Field(..., description="'APPROVE', 'REJECT', or 'MODIFY'")
    reviewer_name: Optional[str] = Field("Command Center Duty Officer", description="Name/callsign of reviewing officer")
    reviewer_notes: Optional[str] = Field(None, description="Operational notes or modification rationale")
    modified_actions: Optional[List[AdvisoryPriorityAction]] = Field(None, description="Modified actions list if action is 'MODIFY'")


# ========================================================
# STAGE 5: JEV / TYPESAFE DECISION INTELLIGENCE ENUMS & SCHEMAS
# ========================================================

class DecisionRiskBand(str, Enum):
    EXTREME = "EXTREME"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class DecisionType(str, Enum):
    EVACUATION_ALERT = "EVACUATION_ALERT"
    SHELTER_ACTIVATION = "SHELTER_ACTIVATION"
    EMERGENCY_RESOURCE_MOBILIZATION = "EMERGENCY_RESOURCE_MOBILIZATION"
    PORT_OPERATION_RESTRICTION = "PORT_OPERATION_RESTRICTION"
    INFRASTRUCTURE_PROTECTION = "INFRASTRUCTURE_PROTECTION"
    PUBLIC_WARNING = "PUBLIC_WARNING"
    # Specific operational policies
    PREPARE_EVACUATION = "PREPARE_EVACUATION"
    INCREASE_SHELTER_READINESS = "INCREASE_SHELTER_READINESS"
    INFRASTRUCTURE_MONITORING = "INFRASTRUCTURE_MONITORING"
    EMERGENCY_COORDINATION = "EMERGENCY_COORDINATION"
    ENHANCED_MONITORING = "ENHANCED_MONITORING"
    PREPAREDNESS_ACTIONS = "PREPAREDNESS_ACTIONS"
    SHELTER_READINESS_CHECK = "SHELTER_READINESS_CHECK"
    ROUTINE_MONITORING = "ROUTINE_MONITORING"


class DecisionPriority(str, Enum):
    CRITICAL = "CRITICAL"
    IMMEDIATE = "IMMEDIATE"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    ROUTINE = "ROUTINE"


class RecommendationStatus(str, Enum):
    RECOMMENDED = "RECOMMENDED"
    REQUIRES_APPROVAL = "REQUIRES_APPROVAL"
    READY = "READY"
    DEFERRED = "DEFERRED"
    REJECTED = "REJECTED"
    NOT_TRIGGERED = "NOT_TRIGGERED"


class QualificationState(str, Enum):
    QUALIFIED = "QUALIFIED"
    UNQUALIFIED = "UNQUALIFIED"
    CONSTRAINED = "CONSTRAINED"


class ExecutionStatus(str, Enum):
    NOT_EXECUTED = "NOT_EXECUTED"
    RECOMMENDED = "RECOMMENDED"
    PENDING_APPROVAL = "PENDING_APPROVAL"


class DecisionConstraint(BaseModel):
    constraint_name: str = Field(..., description="Name of the constraint, e.g. 'min_risk_threshold', 'population_exposure_threshold', 'shelter_availability'")
    required_condition: str = Field(..., description="Target threshold/condition expression, e.g. 'risk_score >= 80'")
    actual_value: Any = Field(..., description="Actual observed metric value from Evidence/Risk layer")
    is_satisfied: bool = Field(..., description="True if constraint threshold is met, False otherwise")
    explanation: Optional[str] = Field(None, description="Human-readable audit explanation of why constraint passed or failed")


class DecisionEvidence(BaseModel):
    evidence_type: str = Field(..., description="Category of evidence (flood_perception, cyclone_hazard, meteorology, vulnerability, infrastructure)")
    source: str = Field(..., description="Provenance source, e.g. '[AI INFERENCE] SegFormer-B0 SAR Flood Perception'")
    metric_name: str = Field(..., description="Specific metric, e.g. 'flood_extent_pct', 'storm_surge_m', 'vulnerable_population'")
    metric_value: Any = Field(..., description="Observed or inferred value")
    threshold_or_trigger: str = Field(..., description="Rule threshold that triggered or informed this action")


# Backward compatibility alias
DecisionEvidenceReference = DecisionEvidence


class DecisionContext(BaseModel):
    district_id: str
    risk_score: int
    risk_band: str
    contributing_factors: Dict[str, Any]
    population_exposure: Dict[str, Any]
    shelter_deficit: Any
    infrastructure_exposure: Dict[str, Any]
    flood_evidence: Dict[str, Any]
    cyclone_hazard: Dict[str, Any]
    provenance: str = "[JEV / TYPESAFE DECISION INTELLIGENCE] Structured Evidence Context"


class DecisionAction(BaseModel):
    action_id: str
    title: str
    category: str = Field(..., description="'evacuation', 'shelter', 'maritime_port', 'emergency_dispatch', 'infrastructure'")
    target_agency: str = Field(..., description="Designated nodal agency responsible for operational execution")
    execution_instructions: str


class DecisionOption(BaseModel):
    decision_id: str
    decision_type: Union[DecisionType, str] = DecisionType.PUBLIC_WARNING
    title: str
    priority: Union[DecisionPriority, str] = Field("IMMEDIATE", description="'CRITICAL', 'IMMEDIATE', 'HIGH', 'MODERATE', or 'ROUTINE'")
    status: Union[RecommendationStatus, str] = Field("REQUIRES_APPROVAL", description="'REQUIRES_APPROVAL', 'RECOMMENDED', 'READY', 'DEFERRED', or 'REJECTED'")
    risk_score: Optional[int] = None
    risk_band: Optional[Union[DecisionRiskBand, str]] = None
    triggering_risk_band: Optional[Union[DecisionRiskBand, str]] = None
    triggering_factors: List[str] = Field(default_factory=list, description="Risk engine factors that contributed to triggering this decision")
    triggers: List[str] = Field(default_factory=list, description="High-level triggering conditions, e.g. ['high flood perception', 'high storm surge']")
    relevant_exposure: Dict[str, Any] = Field(default_factory=dict, description="Population and infrastructure exposure relevant to this decision")
    supporting_evidence: List[DecisionEvidence] = Field(default_factory=list, description="Structured supporting evidence elements")
    threshold_or_condition: str = Field("", description="Explicit threshold or condition that triggered this decision")
    constraints: List[DecisionConstraint] = Field(default_factory=list, description="Preconditions and threshold constraints evaluated")
    human_approval_required: bool = Field(True, description="Strict safety constraint: True because autonomous execution is prohibited")
    requires_human_approval: bool = Field(True, description="Backwards compatibility alias for human approval requirement")
    execution_status: Union[ExecutionStatus, str] = Field("NOT_EXECUTED", description="Strictly 'NOT_EXECUTED' to distinguish recommendations from execution")
    rationale: str = ""
    trigger_conditions: Dict[str, Any] = Field(default_factory=dict)
    required_evidence: List[str] = Field(default_factory=list)
    affected_population: int = 0
    affected_infrastructure: List[str] = Field(default_factory=list)
    action: Optional[DecisionAction] = None
    triggering_risk_evidence: Optional[str] = None
    triggering_evidence: Optional[List[DecisionEvidence]] = Field(default_factory=list)
    reason: Optional[str] = None
    confidence: Optional[float] = 0.95
    trace: Optional[str] = Field(None, description="Auditable trace: Evidence -> Risk factor -> Threshold -> Decision -> Recommendation")


class DecisionRequest(BaseModel):
    district_id: str = Field(..., description="Target district ID, e.g. 'od_balasore'")
    step_id: Optional[str] = Field("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")
    custom_rain_mm: Optional[float] = Field(None, description="Optional override for 24h rainfall (mm)")
    custom_surge_m: Optional[float] = Field(None, description="Optional override for storm surge (m)")
    custom_wind_kmh: Optional[int] = Field(None, description="Optional override for sustained wind (km/h)")
    custom_flood_pct: Optional[float] = Field(None, description="Optional override for flood extent %")
    sar_vv_values: Optional[List[List[float]]] = Field(None, description="Optional custom VV backscatter grid")
    sar_vh_values: Optional[List[List[float]]] = Field(None, description="Optional custom VH backscatter grid")


class DecisionRecommendation(BaseModel):
    district_id: str
    risk_score: int
    risk_band: str
    recommended_decisions: List[DecisionOption]
    deferred_decisions: List[DecisionOption] = Field(default_factory=list, description="Candidate decisions evaluated but deferred/not recommended due to unsatisfied constraints")
    priority: str = Field(..., description="Highest urgency among recommended decisions: 'IMMEDIATE', 'HIGH', 'MODERATE', 'ROUTINE'")
    decision_confidence: float = Field(0.95, description="Deterministic rule confidence (0.0 to 1.0)")
    evidence_references: List[str] = Field(default_factory=list)
    context: Optional[DecisionContext] = None
    provenance: str = Field(
        "[DECISION INTELLIGENCE] [JEV / TYPESAFE DECISION INTELLIGENCE] Deterministic Rule Engine v1.0 (TypeSafe JEV)",
        description="Explicit provenance indicating deterministic rule evaluation"
    )
    requires_human_approval: bool = Field(
        True,
        description="Mandatory Human-in-the-Loop policy. Direct emergency execution is prohibited."
    )
    human_approval_required: bool = True
    direct_execution_prohibited: bool = True
    execution_status: str = Field("NOT_EXECUTED", description="Distinguishes candidate recommendations from executed operational directives")
    generated_at: str

    # Compatibility properties/fields for existing endpoints and tests
    decision_id: Optional[str] = None
    district_name: Optional[str] = None
    state: Optional[str] = None
    step_id: Optional[str] = "NOW"
    urgency_level: Optional[str] = None
    composite_risk_score: Optional[int] = None
    recommendations: Optional[List[DecisionOption]] = None
    total_recommendations: Optional[int] = None
    evidence_summary: Optional[Dict[str, Any]] = None


# Response alias
DecisionResponse = DecisionRecommendation


# ========================================================
# STAGE 5: JEV (JUDGMENT, EVALUATION & VERIFICATION) SCHEMAS
# ========================================================

class EvidenceCoverageSummary(BaseModel):
    total_expected_sources: int = Field(5, description="Number of expected multi-modal evidence modalities")
    present_sources: int = Field(..., description="Number of successfully bound evidence modalities")
    coverage_percentage: float = Field(..., description="Evidence coverage percentage (0.0 to 100.0%)")
    coverage_tier: str = Field(..., description="'COMPLETE', 'ADEQUATE', 'PARTIAL', 'DEFICIENT'")
    available_modalities: List[str] = Field(default_factory=list)
    missing_modalities: List[str] = Field(default_factory=list)
    sar_perception_verified: bool = Field(False, description="True if SegFormer flood perception evidence is present")
    meteorology_verified: bool = Field(False, description="True if wind and surge telemetry is present")
    vulnerability_verified: bool = Field(False, description="True if population & shelter deficit metrics are present")


class RiskConsistencyCheck(BaseModel):
    is_consistent: bool = Field(..., description="True if decision urgency aligns with Transparent Risk Engine score")
    risk_score: int
    risk_band: str
    decision_priority: str
    consistency_score: float = Field(..., description="Quantified score alignment from 0.0 to 1.0")
    detected_discrepancies: List[str] = Field(default_factory=list, description="Any detected risk-decision priority mismatches")
    validation_note: str


class ConstraintComplianceSummary(BaseModel):
    total_evaluated_constraints: int
    satisfied_constraints: int
    violated_constraints: int
    compliance_rate_pct: float
    is_fully_compliant: bool
    autonomous_execution_blocked: bool = Field(True, description="Safety invariant: confirms direct execution is blocked")
    human_approval_enforced: bool = Field(True, description="Safety invariant: confirms human approval is required")
    detailed_constraints: List[DecisionConstraint] = Field(default_factory=list)


class JEVEvaluationRequest(BaseModel):
    district_id: str = Field(..., description="Target coastal district ID, e.g. 'od_balasore'")
    step_id: Optional[str] = Field("NOW", description="Timeline step, e.g. 'NOW', '+12h'")
    custom_rain_mm: Optional[float] = None
    custom_surge_m: Optional[float] = None
    custom_wind_kmh: Optional[int] = None
    custom_flood_pct: Optional[float] = None
    injected_decision_ids: Optional[List[str]] = None
    test_mode: Optional[str] = Field("STANDARD", description="'STANDARD', 'NEGATIVE_INCONSISTENT_RISK', 'NEGATIVE_DEFICIENT_EVIDENCE', 'NEGATIVE_AUTONOMOUS_ATTEMPT'")


class JEVEvaluationReport(BaseModel):
    evaluation_id: str
    district_id: str
    district_name: Optional[str] = None
    step_id: str = "NOW"
    evaluation_timestamp: str
    evaluation_score: float = Field(..., description="Composite JEV evaluation & verification score (0.0 to 1.0)")
    evaluation_grade: str = Field(..., description="'HIGH_CONFIDENCE', 'MODERATE_CONFIDENCE', 'LOW_CONFIDENCE', 'REJECTED'")
    
    # 6 Core Evaluation Pillars
    decision_evaluation: DecisionRecommendation
    evidence_coverage: EvidenceCoverageSummary
    risk_consistency: RiskConsistencyCheck
    constraint_compliance: ConstraintComplianceSummary
    auditable_explanation: str
    provenance_breakdown: Dict[str, str]

    # Explicit Safety & Governance
    autonomous_execution_prohibited: bool = True
    human_approval_mandatory: bool = True
    execution_status: str = "NOT_EXECUTED"
    provenance: str = Field(
        "[JEV DECISION INTELLIGENCE] Verified Decision Dossier (Deterministic Rule Engine)",
        description="Explicit provenance annotation"
    )


# ========================================================
# STAGE 6: GEMINI REASONING LAYER SCHEMAS
# ========================================================

class GeminiReasoningRequest(BaseModel):
    district_id: str = Field(..., description="Target district identifier, e.g. 'od_balasore'")
    risk_score: int = Field(..., description="Deterministic composite risk score (0-100) from Risk Engine")
    risk_band: str = Field(..., description="Deterministic risk classification (EXTREME, HIGH, MODERATE, LOW)")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Structured multi-modal evidence from Evidence Layer")
    contributing_factors: Dict[str, Any] = Field(default_factory=dict, description="Risk Engine factor attribution breakdown")
    decision_recommendations: List[Any] = Field(default_factory=list, description="Verified recommendations from Decision Intelligence")
    provenance: str = Field("[DECISION INTELLIGENCE] Deterministic Rule Engine v1.0 (TypeSafe JEV)", description="Upstream provenance")
    scenario: Optional[str] = Field("REMAL_2024", description="Cyclone scenario name")
    step_id: Optional[str] = Field("NOW", description="Timeline step identifier, e.g. 'NOW', '+12h'")


class GeminiAdvisory(BaseModel):
    district_id: str = Field(..., description="Target district identifier")
    headline: str = Field(..., description="Synthesized executive hazard headline")
    situation_summary: str = Field(..., description="Grounded situational narrative explaining evidence")
    key_risk_drivers: List[str] = Field(..., description="Primary contributing factors driving the risk score")
    exposure_summary: str = Field(..., description="Synthesized population and critical infrastructure exposure")
    recommended_actions: List[str] = Field(..., description="Grounded operational recommendations originating from Decision Engine")
    uncertainty_notes: str = Field(..., description="Explicit uncertainty communication (SAR resolution, timeline drift)")
    evidence_references: List[str] = Field(..., description="Traceable citations to multi-modal evidence sources")
    risk_score: int = Field(..., description="Strictly preserved deterministic risk score. Never modified.")
    risk_band: str = Field(..., description="Strictly preserved deterministic risk band. Never modified.")
    decision_ids: List[str] = Field(..., description="Traceable IDs of operational decisions. Never overridden.")
    requires_human_approval: bool = Field(True, description="Strict governance constraint. Human authority is mandatory.")
    provenance: str = Field(..., description="Provenance tag indicating [GEMINI REASONING] or [MOCK GEMINI REASONING]")
    generated_at: str = Field(..., description="ISO 8601 timestamp of generation")
    model: str = Field(..., description="Gemini model name or mock identifier")
    is_mock: bool = Field(..., description="True if generated via deterministic mock mode, False if live Gemini API")
    provenance_chain: Optional[Dict[str, str]] = Field(None, description="Explicit 5-tier pipeline provenance trace")


