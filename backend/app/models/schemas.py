from typing import List, Optional, Any
from pydantic import BaseModel, Field

# Health Model
class HealthResponse(BaseModel):
    status: str = Field(..., example="healthy")
    app_name: str = Field(..., example="DRISHTI FastAPI Backend")
    version: str = Field(..., example="1.0.0-rc1")
    environment: str = Field(..., example="development")
    provenance: str = Field(..., example="HISTORICAL SIMULATION (REMAL 2024)")
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
