from typing import List, Optional, Any, Dict, Union
from enum import Enum
from pydantic import BaseModel, Field, AliasChoices, ConfigDict

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


class ActiveDepressionSystem(BaseModel):
    hasActiveSystem: bool
    isAvailable: bool
    name: str
    shortName: str
    status: str
    observedDate: str
    centerLat: float
    centerLon: float
    centralPressureMb: int
    maxWindKmh: int
    gustKmh: int
    movement: str
    source: str
    classification: str


class StateWeatherRecord(BaseModel):
    id: str
    name: str
    region: str
    center: List[float]
    capital: str
    temperature: float
    humidity: int
    windSpeed: int
    windDirection: int
    windGust: int
    rain: float
    distanceToDepressionKm: int
    depressionInfluencePct: int
    source: str
    provenance: str = "LIVE WEATHER — CURRENT MODEL DATA (Open-Meteo)"
    updatedAt: str


class WindGridPoint(BaseModel):
    lat: float
    lon: float
    name: str
    speed: int
    direction: int
    gust: int


class IndiaWeatherResponse(BaseModel):
    provenance: str = "LIVE WEATHER — CURRENT MODEL DATA (Source: Open-Meteo NWP)"
    sourcing_note: str = "Live meteorological model data from Open-Meteo. NOT the REMAL historical cyclone simulation."
    states: Dict[str, StateWeatherRecord]
    windPoints: List[WindGridPoint]
    activeSystem: ActiveDepressionSystem
    lastUpdatedFormatted: str
    nextRefreshMinutes: int = 10
    fetchedAt: str


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
    model_config = ConfigDict(populate_by_name=True)

    district_id: str = Field(..., validation_alias=AliasChoices("district_id", "districtId"), description="Target district ID, e.g. 'od_balasore'")
    step_id: Optional[str] = Field("NOW", validation_alias=AliasChoices("step_id", "stepId"), description="Timeline step identifier")
    custom_rain_mm_24h: Optional[float] = Field(None, validation_alias=AliasChoices("custom_rain_mm_24h", "customRainMm24h"), description="Optional override for 24h rainfall (mm)")
    custom_surge_meters: Optional[float] = Field(None, validation_alias=AliasChoices("custom_surge_meters", "customSurgeMeters"), description="Optional override for storm surge (m)")
    custom_wind_kmh: Optional[int] = Field(None, validation_alias=AliasChoices("custom_wind_kmh", "customWindKmh"), description="Optional override for sustained wind (km/h)")
    custom_flood_pct: Optional[float] = Field(None, validation_alias=AliasChoices("custom_flood_pct", "customFloodPct"), description="Optional override for flood extent %")
    sar_vv_values: Optional[List[List[float]]] = Field(None, validation_alias=AliasChoices("sar_vv_values", "sarVvValues"), description="Optional custom VV backscatter grid (224x224)")
    sar_vh_values: Optional[List[List[float]]] = Field(None, validation_alias=AliasChoices("sar_vh_values", "sarVhValues"), description="Optional custom VH backscatter grid (224x224)")

    @property
    def districtId(self) -> str:
        return self.district_id

    @property
    def stepId(self) -> Optional[str]:
        return self.step_id

    @property
    def customRainMm24h(self) -> Optional[float]:
        return self.custom_rain_mm_24h

    @property
    def customSurgeMeters(self) -> Optional[float]:
        return self.custom_surge_meters

    @property
    def customWindKmh(self) -> Optional[int]:
        return self.custom_wind_kmh

    @property
    def customFloodPct(self) -> Optional[float]:
        return self.custom_flood_pct

    @property
    def sarVvValues(self) -> Optional[List[List[float]]]:
        return self.sar_vv_values

    @property
    def sarVhValues(self) -> Optional[List[List[float]]]:
        return self.sar_vh_values

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


# ========================================================
# VERIFICATION LAYER SCHEMAS
# AI Flood Evidence Verification + Uncertainty Layer
# ========================================================

class VerificationVerdict(BaseModel):
    """
    Structured Gemini verifier output.
    Gemini returns ONLY this schema — it does not calculate risk scores.
    """
    verdict: str = Field(
        ...,
        description="agree | partial | disagree | abstain",
        examples=["agree", "partial", "disagree", "abstain"]
    )
    failure_mode: str = Field(
        ...,
        description=(
            "none | permanent_water | radar_shadow | wind_roughened_water | "
            "smooth_surface | cloud_contamination | mixed_signal | insufficient_evidence"
        )
    )
    evidence_quality: str = Field(
        ...,
        description="high | moderate | low"
    )
    disagreement_level: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Disagreement magnitude from 0.0 (full agreement) to 1.0 (full contradiction)"
    )
    reason: str = Field(
        ...,
        description="Short evidence-based explanation. Must not invent measurements or claim unavailable imagery exists."
    )


class CloudQualityResult(BaseModel):
    """
    Deterministic cloud quality assessment for a Sentinel-2 scene.
    MVP thresholds — not scientifically validated.
    """
    quality: str = Field(
        ...,
        description="CLEAR | PARTIAL | CLOUDY | INSUFFICIENT"
    )
    cloudy_pixel_pct: Optional[float] = Field(None, description="CLOUDY_PIXEL_PERCENTAGE from scene metadata")
    cloud_prob_mean: Optional[float] = Field(None, description="Mean cloud probability from S2_CLOUD_PROBABILITY")
    scene_date: Optional[str] = Field(None, description="ISO date of the best available Sentinel-2 scene")
    scene_id: Optional[str] = Field(None, description="Sentinel-2 scene system:index")
    usable: bool = Field(False, description="True if optical evidence is usable for verification")
    provenance: str = Field("DERIVED", description="Evidence category: LIVE | HISTORICAL | DERIVED | CACHED")
    note: str = Field(
        "Cloud gate thresholds are MVP engineering defaults — not scientifically calibrated.",
        description="Disclaimer on threshold calibration status"
    )


class PermanentWaterResult(BaseModel):
    """
    Deterministic permanent water reference check.
    Uses JRC Global Surface Water or equivalent authoritative dataset.
    """
    dataset: str = Field("JRC/GSW1_4/GlobalSurfaceWater", description="Reference dataset used")
    overlap_fraction: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Fraction of predicted flood area that overlaps known permanent water"
    )
    is_flagged: bool = Field(
        False,
        description="True if overlap exceeds threshold — possible permanent water false positive"
    )
    flag_label: Optional[str] = Field(
        None,
        description="'possible_permanent_water_false_positive' if flagged, else None"
    )
    provenance: str = Field("DERIVED", description="Evidence category")
    note: str = Field(
        "This check does NOT remove the flood prediction. It is verification evidence, not ground truth.",
        description="Safety disclaimer"
    )


class VerificationResult(BaseModel):
    """
    Complete structured output from the AI Flood Evidence Verification Layer.
    Contains the Gemini verdict, cloud quality, permanent water check, and provenance.
    """
    verification_id: str = Field(..., description="Unique verification run ID")
    event_id: str = Field(..., description="Event or scenario ID (e.g. 'CYCLONE_REMAL_2024')")
    roi: Dict[str, float] = Field(..., description="Region of interest: min_lon, min_lat, max_lon, max_lat")
    risk_zone_id: Optional[str] = Field(None, description="Risk zone or district ID")
    timestamp: str = Field(..., description="ISO 8601 timestamp of verification run")

    # Core verdict from Gemini verifier
    verdict: VerificationVerdict

    # Supporting evidence gates
    cloud_quality: CloudQualityResult
    permanent_water: PermanentWaterResult

    # Evidence quality flags
    sentinel2_available: bool = Field(False, description="True if Sentinel-2 imagery was retrieved")
    sentinel2_scene_date: Optional[str] = Field(None, description="Date of Sentinel-2 scene used")

    # Provenance
    provenance: Dict[str, str] = Field(
        default_factory=dict,
        description="Per-source provenance category: LIVE | HISTORICAL | DERIVED | SIMULATED | CACHED"
    )
    source_description: str = Field(
        "[AI VERIFICATION] Independent multimodal flood evidence cross-check. "
        "Gemini verified/challenged SegFormer-derived flood evidence.",
        description="Human-readable description of what this verification represents"
    )


class RiskUncertaintyResult(BaseModel):
    """
    Deterministic risk uncertainty range calculated from the verification verdict.
    The central risk score is NEVER modified.
    Uncertainty is represented as a range around the central score.
    """
    central_risk: int = Field(..., description="Original deterministic risk score (0–100). NEVER MODIFIED.")
    risk_band: str = Field(..., description="Risk band of central score: LOW | MODERATE | HIGH | EXTREME")
    uncertainty_adjustment: int = Field(..., description="Uncertainty ±points applied based on verification verdict")
    risk_lower: int = Field(..., ge=0, le=100, description="Lower bound of risk range = max(0, central - adjustment)")
    risk_upper: int = Field(..., ge=0, le=100, description="Upper bound of risk range = min(100, central + adjustment)")
    risk_lower_band: str = Field(..., description="Risk band at lower bound")
    risk_upper_band: str = Field(..., description="Risk band at upper bound")
    band_boundaries_crossed: List[int] = Field(
        default_factory=list,
        description="Risk band boundary values {45, 65, 80} that fall inside [risk_lower, risk_upper]"
    )
    requires_human_review: bool = Field(
        False,
        description="True if uncertainty interval crosses a risk-band boundary"
    )
    human_review_reason: Optional[str] = Field(
        None,
        description="Explanation of why human review is required, e.g. 'Uncertainty interval crosses HIGH/EXTREME boundary'"
    )
    formula: str = Field(
        ...,
        description="Transparent formula used: central ± adjustment, bounded to [0, 100]"
    )
    policy_note: str = Field(
        "Uncertainty adjustments are MVP engineering baselines — not scientifically calibrated values.",
        description="Disclaimer on policy calibration status"
    )


class ReviewStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ESCALATED = "ESCALATED"


class ReviewItem(BaseModel):
    """
    Human review queue item for uncertain or band-crossing risk decisions.
    """
    review_id: str = Field(..., description="Unique review item ID")
    created_at: str = Field(..., description="ISO 8601 timestamp of queue entry")

    # Location
    location: Optional[str] = Field(None, description="Human-readable location or district name")
    roi: Optional[Dict[str, float]] = Field(None, description="Region of interest")
    risk_zone_id: Optional[str] = Field(None, description="Risk zone or district ID")

    # Event
    event_id: str = Field(..., description="Event ID")

    # Risk
    central_risk: int = Field(..., description="Central deterministic risk score (0–100)")
    risk_lower: int = Field(..., description="Risk uncertainty lower bound")
    risk_upper: int = Field(..., description="Risk uncertainty upper bound")
    risk_band: str = Field(..., description="Risk band of central score")
    uncertainty_adjustment: int = Field(..., description="Uncertainty ±points")

    # Verification
    verification_verdict: str = Field(..., description="Gemini verifier verdict")
    failure_mode: str = Field(..., description="Identified failure mode")
    evidence_quality: str = Field(..., description="Evidence quality level")
    disagreement_level: float = Field(..., description="Disagreement level 0–1")

    # Exposure
    affected_population: Optional[int] = Field(None, description="Estimated affected population")
    affected_road_km: Optional[float] = Field(None, description="Affected road length (km)")
    affected_hospitals: Optional[int] = Field(None, description="Number of affected hospitals")

    # Evidence sources
    evidence_sources: List[str] = Field(default_factory=list, description="List of evidence source descriptions")

    # Provenance
    model_version: str = Field("SegFormer-B0 (best_clean)", description="Primary flood model version")
    provenance: str = Field(..., description="Provenance string")

    # Review state
    review_status: ReviewStatus = Field(ReviewStatus.PENDING, description="Current review status")
    reviewer_name: Optional[str] = Field(None, description="Name of reviewer")
    reviewer_note: Optional[str] = Field(None, description="Optional reviewer note")
    reviewed_at: Optional[str] = Field(None, description="ISO 8601 timestamp of review decision")

    # Why flagged
    flag_reason: str = Field(..., description="Explanation of why this item requires human review")


class ReviewDecisionRequest(BaseModel):
    """Request body for submitting a human review decision."""
    action: str = Field(..., description="'APPROVE', 'REJECT', or 'ESCALATE'")
    reviewer_name: Optional[str] = Field("Watch Officer", description="Name or callsign of reviewer")
    reviewer_note: Optional[str] = Field(None, description="Optional reviewer note or rationale")


class VerificationRunRequest(BaseModel):
    """Request body for POST /api/verification/run"""
    event_id: str = Field("CYCLONE_REMAL_2024", description="Event or scenario identifier")
    roi: Dict[str, float] = Field(
        ...,
        description="Region of interest with keys: min_lon, min_lat, max_lon, max_lat",
        examples=[{"min_lon": 87.5, "min_lat": 22.0, "max_lon": 88.0, "max_lat": 22.5}]
    )
    risk_zone_id: Optional[str] = Field(None, description="Risk zone or district ID for review queue")
    risk_score: int = Field(..., ge=0, le=100, description="Central deterministic risk score from risk engine")
    use_sentinel2: bool = Field(True, description="Whether to attempt Sentinel-2 retrieval via GEE")
    use_permanent_water: bool = Field(True, description="Whether to check permanent water reference")

    # Optional context for Gemini verifier
    flood_percentage: Optional[float] = Field(None, description="SegFormer flood extent %")
    flood_probability: Optional[float] = Field(None, description="SegFormer mean flood probability")
    terrain_summary: Optional[str] = Field(None, description="Brief terrain description for verifier")
    event_metadata: Optional[Dict[str, Any]] = Field(None, description="Supplementary event context")

    # Exposure context for review queue
    affected_population: Optional[int] = Field(None)
    affected_road_km: Optional[float] = Field(None)
    affected_hospitals: Optional[int] = Field(None)


class VerificationRunResponse(BaseModel):
    """Response body for POST /api/verification/run"""
    verification: VerificationResult
    risk: RiskUncertaintyResult
    human_review: Dict[str, Any] = Field(
        ...,
        description="Human review requirement: {required, reason, review_id}"
    )
    provenance: Dict[str, str] = Field(default_factory=dict)
    pipeline_note: str = Field(
        "Drishti does not blindly trust a single AI flood prediction. It cross-checks "
        "model-derived evidence with independent observations, represents disagreement as "
        "uncertainty, and routes decision-sensitive cases to human review.",
        description="System communication statement"
    )


class AuditLogEntry(BaseModel):
    """Single audit log entry for a verification or review event."""
    entry_id: str
    timestamp: str
    event_type: str = Field(..., description="'VERIFICATION_RUN' | 'REVIEW_DECISION' | 'VERIFICATION_ERROR'")
    user_reviewer: Optional[str] = Field(None)
    event_id: str
    zone_id: Optional[str] = Field(None)
    model_version: str = Field("SegFormer-B0 (best_clean)")
    verification_verdict: Optional[str] = Field(None)
    risk_score: Optional[int] = Field(None)
    risk_lower: Optional[int] = Field(None)
    risk_upper: Optional[int] = Field(None)
    review_decision: Optional[str] = Field(None)
    reviewer_note: Optional[str] = Field(None)
    evidence_sources: List[str] = Field(default_factory=list)
    provenance: str = Field("[AUDIT] DRISHTI Verification Layer")
