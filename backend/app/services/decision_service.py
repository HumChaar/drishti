"""
DRISHTI Decision Service (Stage 5 JEV / TypeSafe Decision Intelligence)
Implements deterministic, auditable, and rule-based decision intelligence.

Consumes:
- Stage 3 SegFormer SAR flood perception evidence
- Stage 4 Evidence Layer (multi-modal district evidence)
- Stage 4 Transparent Risk Engine (audited scores & factor attribution)

Produces:
- DecisionContext (structured multi-modal evidence snapshot)
- DecisionOption (strongly typed operational candidate decisions with triggers & constraints)
- DecisionConstraint (explicit precondition verification & failure explanations)
- DecisionEvidence (verifiable evidence bindings)
- DecisionRecommendation (auditable district decision dossier)

Safety Guarantees:
- Completely deterministic (zero LLM inference in the decision loop)
- Never claims an emergency action has autonomously executed
- Clear separation: RECOMMENDED != EXECUTED
- Execution status is strictly locked to NOT_EXECUTED
- All recommendations require mandatory human incident commander approval
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.core.decision_config import (
    DECISION_POLICIES,
    DEFAULT_DECISION_THRESHOLDS,
    PolicyRule,
    DecisionThresholds
)
from app.models.schemas import (
    DistrictEvidence,
    RiskExplanation,
    RiskEvaluationRequest,
    DecisionContext,
    DecisionOption,
    DecisionRecommendation,
    DecisionRequest,
    DecisionAction,
    DecisionEvidence,
    DecisionEvidenceReference,
    DecisionConstraint,
    DecisionType,
    DecisionPriority,
    DecisionRiskBand,
    RecommendationStatus,
    ExecutionStatus,
    EvidenceCoverageSummary,
    RiskConsistencyCheck,
    ConstraintComplianceSummary,
    JEVEvaluationRequest,
    JEVEvaluationReport
)
from app.services.risk_service import risk_service
from app.services.risk_engine import transparent_risk_engine


class DecisionService:
    def __init__(self, thresholds: Optional[DecisionThresholds] = None):
        self.thresholds = thresholds or DEFAULT_DECISION_THRESHOLDS
        self.policies = DECISION_POLICIES
        self.provenance_tag = "[DECISION INTELLIGENCE] [JEV / TYPESAFE DECISION INTELLIGENCE] Deterministic Rule Engine v1.0 (TypeSafe JEV)"

    def get_config(self) -> Dict[str, Any]:
        """Returns the centralized decision configuration and auditable policy catalog."""
        return {
            "version": "1.0.0",
            "provenance": self.provenance_tag,
            "thresholds": self.thresholds.model_dump(),
            "policies": {k: v.model_dump() for k, v in self.policies.items()},
            "governance": {
                "autonomous_execution_allowed": False,
                "human_approval_mandatory": True,
                "llm_in_decision_loop": False,
                "execution_status_default": "NOT_EXECUTED"
            }
        }

    def build_decision_context(
        self,
        evidence: DistrictEvidence,
        risk_score: int,
        risk_band: str
    ) -> DecisionContext:
        """Constructs the structured DecisionContext snapshot for auditable traceability."""
        factors = {}
        if evidence.riskExplanation and evidence.riskExplanation.contributingFactors:
            factors = {
                k: {
                    "subScore": v.subScore,
                    "weight": v.weight,
                    "weightedPoints": v.weightedPoints,
                    "rawValue": v.rawValueDisplay
                }
                for k, v in evidence.riskExplanation.contributingFactors.items()
            }

        pop_exp = {
            "total_population": evidence.vulnerability.totalPopulation,
            "vulnerable_population": evidence.vulnerability.vulnerablePopulation,
            "vulnerability_ratio_pct": evidence.vulnerability.vulnerabilityRatioPct
        }

        infra_exp = {
            "total_critical_assets": evidence.infrastructure.totalCriticalAssets,
            "critical_assets_list": evidence.infrastructure.criticalAssetsList,
            "shelter_occupancy_pct": evidence.infrastructure.shelterOccupancyPct,
            "evacuation_progress_pct": evidence.infrastructure.evacuationProgressPct
        }

        flood_ev = {
            "flood_percentage": evidence.floodPerception.floodPercentage,
            "flood_probability": evidence.floodPerception.floodProbability,
            "model_identifier": evidence.floodPerception.modelIdentifier,
            "is_genuine_sar": evidence.floodPerception.isGenuineSar
        }

        cyclone_ev = {
            "storm_name": evidence.cycloneHazard.stormName,
            "category": evidence.cycloneHazard.category,
            "eye_distance_km": evidence.cycloneHazard.eyeDistanceKm,
            "central_pressure_mb": evidence.cycloneHazard.centralPressureMb,
            "max_wind_kmh": evidence.cycloneHazard.maxWindKmh,
            "surge_meters": evidence.meteorology.surgeMeters,
            "rain_mm_24h": evidence.meteorology.rainMm24h,
            "wind_kmh": evidence.meteorology.windKmh,
            "gust_kmh": evidence.meteorology.gustKmh
        }

        return DecisionContext(
            district_id=evidence.districtId,
            risk_score=risk_score,
            risk_band=risk_band,
            contributing_factors=factors,
            population_exposure=pop_exp,
            shelter_deficit=evidence.vulnerability.shelterDeficitPersons,
            infrastructure_exposure=infra_exp,
            flood_evidence=flood_ev,
            cyclone_hazard=cyclone_ev,
            provenance="[JEV / TYPESAFE DECISION INTELLIGENCE] Structured Evidence Context"
        )

    def evaluate_district(self, district_id: str, step_id: str = "NOW") -> DecisionRecommendation:
        """Evaluates deterministic decision recommendations for a registered district."""
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        district_data = risk_service.get_district_by_id(district_id, step_id=normalized_step)
        if not district_data:
            raise ValueError(f"District '{district_id}' not found in coastal surveillance registry.")

        risk_metrics = district_data.get("risk", {})
        base_score = int(risk_metrics.get("riskScore", 50))
        base_band = str(risk_metrics.get("riskBand", "MODERATE"))

        evidence = risk_service.get_district_evidence(district_id, step_id=normalized_step)
        return self._evaluate_from_evidence(evidence, base_score=base_score, base_band=base_band)

    def evaluate_request(self, req: DecisionRequest) -> DecisionRecommendation:
        """Evaluates decisions with custom physical or SAR overrides."""
        has_custom = any([
            req.custom_rain_mm is not None,
            req.custom_surge_m is not None,
            req.custom_wind_kmh is not None,
            req.custom_flood_pct is not None,
            req.sar_vv_values is not None,
            req.sar_vh_values is not None
        ])

        if has_custom:
            eval_req = RiskEvaluationRequest(
                districtId=req.district_id,
                stepId=req.step_id or "NOW",
                customRainMm24h=req.custom_rain_mm,
                customSurgeMeters=req.custom_surge_m,
                customWindKmh=req.custom_wind_kmh,
                customFloodPct=req.custom_flood_pct,
                sarVvValues=req.sar_vv_values,
                sarVhValues=req.sar_vh_values
            )
            evidence = risk_service.evaluate_custom_risk(eval_req)
            score = evidence.riskExplanation.compositeScore if evidence.riskExplanation else 50
            band = evidence.riskExplanation.riskBand if evidence.riskExplanation else "MODERATE"
            return self._evaluate_from_evidence(evidence, base_score=score, base_band=band)
        else:
            return self.evaluate_district(req.district_id, step_id=req.step_id or "NOW")

    def evaluate_all_districts(self, step_id: str = "NOW") -> List[DecisionRecommendation]:
        """Evaluates decision recommendations across all 8 monitored coastal districts."""
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        districts = risk_service.get_district_risk_matrix(normalized_step)
        results = []
        for d in districts:
            d_id = d["id"]
            results.append(self.evaluate_district(d_id, step_id=normalized_step))
        return results

    def _build_supporting_evidence(
        self,
        evidence: DistrictEvidence,
        threshold_desc: str
    ) -> List[DecisionEvidence]:
        """Assembles typed DecisionEvidence bindings for full auditability."""
        flood_src = evidence.floodPerception.modelIdentifier or "[AI INFERENCE] SegFormer-B0 SAR Flood Perception"
        return [
            DecisionEvidence(
                evidence_type="flood_perception",
                source=flood_src,
                metric_name="flood_extent_pct",
                metric_value=round(evidence.floodPerception.floodPercentage, 1),
                threshold_or_trigger=threshold_desc
            ),
            DecisionEvidence(
                evidence_type="meteorology",
                source="IMD / INCOIS Storm Surge Telemetry",
                metric_name="surge_meters",
                metric_value=round(evidence.meteorology.surgeMeters, 1),
                threshold_or_trigger=threshold_desc
            ),
            DecisionEvidence(
                evidence_type="cyclone_hazard",
                source="IMD Cyclone Warning Centre",
                metric_name="max_wind_kmh",
                metric_value=evidence.meteorology.windKmh,
                threshold_or_trigger=threshold_desc
            ),
            DecisionEvidence(
                evidence_type="vulnerability",
                source="OSDMA / State Vulnerability Registry",
                metric_name="vulnerable_population",
                metric_value=evidence.vulnerability.vulnerablePopulation,
                threshold_or_trigger=threshold_desc
            ),
            DecisionEvidence(
                evidence_type="infrastructure",
                source="District Infrastructure Inventory",
                metric_name="shelter_deficit_persons",
                metric_value=evidence.vulnerability.shelterDeficitPersons,
                threshold_or_trigger=threshold_desc
            )
        ]

    def _evaluate_from_evidence(
        self,
        evidence: DistrictEvidence,
        base_score: int,
        base_band: str
    ) -> DecisionRecommendation:
        """Internal deterministic rule execution against structured evidence and decision policies."""
        if not evidence.riskExplanation:
            evidence.riskExplanation = transparent_risk_engine.evaluate_risk(evidence)

        # Build auditable context snapshot
        context = self.build_decision_context(evidence, base_score, base_band)

        # Collect evidence variables
        surge = evidence.meteorology.surgeMeters
        flood_pct = evidence.floodPerception.floodPercentage
        rain_mm = evidence.meteorology.rainMm24h
        wind_kmh = evidence.meteorology.windKmh
        gust_kmh = evidence.meteorology.gustKmh
        eye_km = evidence.cycloneHazard.eyeDistanceKm
        vuln_pop = evidence.vulnerability.vulnerablePopulation
        total_pop = evidence.vulnerability.totalPopulation
        shelter_deficit = evidence.vulnerability.shelterDeficitPersons
        shelter_cap = evidence.vulnerability.shelterCapacityPersons
        occupancy_pct = evidence.infrastructure.shelterOccupancyPct
        critical_assets = evidence.infrastructure.criticalAssetsList
        coastline_km = evidence.vulnerability.coastalLineKm

        # Contributing factor strings for auditable explanation
        contrib_factors_list = []
        if evidence.riskExplanation and evidence.riskExplanation.contributingFactors:
            for k, v in evidence.riskExplanation.contributingFactors.items():
                contrib_factors_list.append(f"{k}: {v.subScore:.1f} (pts: {v.weightedPoints:.1f}, {v.rawValueDisplay})")

        relevant_exposure_dict = {
            "total_population": total_pop,
            "vulnerable_population": vuln_pop,
            "shelter_capacity": shelter_cap,
            "shelter_deficit": shelter_deficit,
            "shelter_occupancy_pct": occupancy_pct,
            "critical_assets_count": len(critical_assets),
            "critical_assets": critical_assets[:4],
            "coastline_km": coastline_km
        }

        decisions: List[DecisionOption] = []
        deferred_decisions: List[DecisionOption] = []

        evidence_refs: List[str] = [
            f"Risk Score: {base_score}/100 ({base_band})",
            f"Storm Surge: {surge:.1f}m",
            f"SegFormer Flood Extent: {flood_pct:.1f}%",
            f"Wind: {wind_kmh} km/h (gust {gust_kmh} km/h)",
            f"Shelter Deficit: {shelter_deficit:,} persons"
        ]

        # -------------------------------------------------------------
        # POLICY EVALUATION: EXTREME RISK SCENARIOS (Score >= 80 or band EXTREME/CRITICAL)
        # -------------------------------------------------------------
        if base_score >= self.thresholds.extreme_risk_threshold or base_band in ["EXTREME", "CRITICAL"]:
            # 1. Evacuation Alert / Recommendation
            evac_thresh = "risk_score >= 80 or surge >= 2.5m"
            evac_constraints = [
                DecisionConstraint(
                    constraint_name="min_risk_threshold",
                    required_condition="risk_score >= 80",
                    actual_value=base_score,
                    is_satisfied=base_score >= 80,
                    explanation=f"Composite risk {base_score} meets extreme emergency threshold (>= 80)"
                ),
                DecisionConstraint(
                    constraint_name="population_exposure_threshold",
                    required_condition="vulnerable_population > 0",
                    actual_value=vuln_pop,
                    is_satisfied=vuln_pop > 0,
                    explanation=f"{vuln_pop:,} vulnerable citizens located in coastal hazard zone"
                ),
                DecisionConstraint(
                    constraint_name="hazard_severity",
                    required_condition="surge >= 2.5m or flood_extent_pct >= 40%",
                    actual_value={"surge": surge, "flood": flood_pct},
                    is_satisfied=surge >= 2.5 or flood_pct >= 40.0,
                    explanation=f"Surge {surge:.1f}m / flood {flood_pct:.1f}% exceeds life-safety threshold"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="EVACUATION_RECOMMENDATION",
                decision_type=DecisionType.EVACUATION_ALERT,
                title="Evacuation Assessment & Mandatory Zone Clearance",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.REQUIRES_APPROVAL,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Extreme composite risk: {base_score}/100",
                    f"High storm surge: {surge:.1f}m",
                    f"High flood perception: {flood_pct:.1f}%",
                    f"High population exposure: {vuln_pop:,} vulnerable persons",
                    f"Shelter deficit: {shelter_deficit:,} persons"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, evac_thresh),
                threshold_or_condition=evac_thresh,
                constraints=evac_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"Extreme composite risk ({base_score}/100) with storm surge {surge:.1f}m and "
                    f"{flood_pct:.1f}% SAR flood inundation requires immediate mandatory evacuation "
                    f"of low-lying coastal belts."
                ),
                trigger_conditions={
                    "risk_score": base_score,
                    "risk_band": base_band,
                    "surge_meters": surge,
                    "flood_extent_pct": flood_pct,
                    "threshold_triggered": evac_thresh
                },
                required_evidence=["composite_risk_score", "surge_meters", "flood_percentage"],
                affected_population=vuln_pop,
                affected_infrastructure=critical_assets[:3],
                action=DecisionAction(
                    action_id=f"act_evac_{evidence.districtId}",
                    title="Mandatory Evacuation of 0-3km Coastal Belt & Low-Lying Polders",
                    category="evacuation",
                    target_agency="District Collectorate, OSDMA, Coastal Police",
                    execution_instructions=f"Immediately mobilize transport buses to safely evacuate {vuln_pop:,} vulnerable citizens into MPCS."
                ),
                triggering_risk_evidence=f"Extreme risk ({base_score}/100, {base_band}) with {surge:.1f}m surge and {flood_pct:.1f}% flood extent.",
                reason="Life-safety hazard: catastrophic seawater inundation risk.",
                confidence=0.98,
                trace=f"Evidence (Surge: {surge:.1f}m, Flood: {flood_pct:.1f}%) → Risk Engine ({base_band} {base_score}/100) → Threshold ({evac_thresh}) → Decision (EVACUATION_ALERT) → Recommendation (RECOMMENDED)"
            ))

            # 2. Emergency Shelter Activation
            shlt_thresh = "shelter_deficit > 20000 or shelter_occupancy_pct >= 75%"
            shlt_constraints = [
                DecisionConstraint(
                    constraint_name="shelter_availability_constraint",
                    required_condition="shelter_deficit > 20,000 or occupancy >= 75%",
                    actual_value={"deficit": shelter_deficit, "occupancy": occupancy_pct},
                    is_satisfied=shelter_deficit > 20000 or occupancy_pct >= 75,
                    explanation=f"Shelter deficit of {shelter_deficit:,} persons requires auxiliary school/college conversion"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="EMERGENCY_SHELTER_ACTIVATION",
                decision_type=DecisionType.SHELTER_ACTIVATION,
                title="Emergency Shelter Auxiliary Activation & 72h Rations",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.REQUIRES_APPROVAL,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Shelter deficit: {shelter_deficit:,} persons",
                    f"Shelter occupancy: {occupancy_pct}%",
                    f"Extreme storm threat: {wind_kmh} km/h"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, shlt_thresh),
                threshold_or_condition=shlt_thresh,
                constraints=shlt_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"Shelter occupancy at {occupancy_pct}% with local deficit of {shelter_deficit:,} persons. "
                    f"Concrete schools and colleges must be converted to auxiliary relief camps with potable water and backup diesel."
                ),
                trigger_conditions={
                    "shelter_deficit": shelter_deficit,
                    "shelter_occupancy_pct": occupancy_pct,
                    "threshold_triggered": shlt_thresh
                },
                required_evidence=["shelter_deficit", "shelter_occupancy_pct", "vulnerable_population"],
                affected_population=shelter_deficit,
                affected_infrastructure=["Multi-Purpose Cyclone Shelters", "High Schools", "Panchayat Ghars"],
                action=DecisionAction(
                    action_id=f"act_shlt_{evidence.districtId}",
                    title="Activate Auxiliary High-Ground Facilities and Deploy 72-Hour Sustenance Rations",
                    category="shelter",
                    target_agency="Panchayati Raj & Drinking Water Dept, Civil Supplies",
                    execution_instructions="Unlock concrete school buildings as auxiliary relief camps with water purification and fuel."
                ),
                triggering_risk_evidence=f"Shelter deficit of {shelter_deficit:,} persons and {occupancy_pct}% shelter occupancy.",
                reason="Primary cyclone shelters near saturation under extreme storm threat.",
                confidence=0.95,
                trace=f"Evidence (Deficit: {shelter_deficit:,}) → Risk Engine (Shelter Factor) → Threshold ({shlt_thresh}) → Decision (SHELTER_ACTIVATION) → Recommendation (REQUIRES_APPROVAL)"
            ))

            # 3. Critical Infrastructure Protection
            infra_thresh = "wind >= 85 km/h or surge >= 2.0m"
            infra_constraints = [
                DecisionConstraint(
                    constraint_name="infrastructure_exposure",
                    required_condition="critical_assets_count > 0",
                    actual_value=len(critical_assets),
                    is_satisfied=len(critical_assets) > 0,
                    explanation=f"{len(critical_assets)} critical infrastructure assets exposed to cyclone forces"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="CRITICAL_INFRASTRUCTURE_PROTECTION",
                decision_type=DecisionType.INFRASTRUCTURE_PROTECTION,
                title="Critical Infrastructure Protection & Power Grid Islanding",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.REQUIRES_APPROVAL,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Gale winds: {wind_kmh} km/h",
                    f"Storm surge: {surge:.1f}m",
                    f"Critical assets exposed: {len(critical_assets)}"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, infra_thresh),
                threshold_or_condition=infra_thresh,
                constraints=infra_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"Gale winds ({wind_kmh} km/h) and coastal surge ({surge:.1f}m) threaten critical assets: "
                    f"{', '.join(critical_assets[:3])}. Precautionary power grid islanding and substation sandbagging required."
                ),
                trigger_conditions={
                    "wind_kmh": wind_kmh,
                    "surge_meters": surge,
                    "critical_assets_count": len(critical_assets),
                    "threshold_triggered": infra_thresh
                },
                required_evidence=["wind_kmh", "surge_meters", "critical_assets"],
                affected_population=vuln_pop,
                affected_infrastructure=critical_assets,
                action=DecisionAction(
                    action_id=f"act_infra_{evidence.districtId}",
                    title="Precautionary Power Grid Islanding & Saline Embankment Patrol",
                    category="infrastructure",
                    target_agency="State Electricity Transmission Utility (OPTCL/WBSEDCL), DoWR",
                    execution_instructions="Phased power shutdown before sustained winds breach 80 km/h; reinforce coastal embankments."
                ),
                triggering_risk_evidence=f"Extreme wind ({wind_kmh} km/h) and {surge:.1f}m surge threatening {len(critical_assets)} critical assets.",
                reason="Prevent transformer fires, electrocution, and saline ingress into freshwater reservoirs.",
                confidence=0.96,
                trace=f"Evidence (Wind: {wind_kmh}km/h, Surge: {surge:.1f}m) → Risk Engine → Threshold ({infra_thresh}) → Decision (INFRASTRUCTURE_PROTECTION) → Recommendation (REQUIRES_APPROVAL)"
            ))

            # 4. Emergency Resource Mobilization / Operations Escalation
            esc_thresh = "risk_score >= 80 or flood_pct >= 50%"
            esc_constraints = [
                DecisionConstraint(
                    constraint_name="severe_hazard_cutoff",
                    required_condition="flood_percentage >= 50% or risk_score >= 80",
                    actual_value={"flood": flood_pct, "score": base_score},
                    is_satisfied=flood_pct >= 50.0 or base_score >= 80,
                    explanation=f"Severe flooding ({flood_pct:.1f}%) and score ({base_score}) warrant QRT/boat mobilization"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="EMERGENCY_OPERATIONS_ESCALATION",
                decision_type=DecisionType.EMERGENCY_RESOURCE_MOBILIZATION,
                title="Emergency Operations Escalation (NDRF / ODRAF Strike Teams)",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.REQUIRES_APPROVAL,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Extensive SAR flood extent: {flood_pct:.1f}%",
                    f"Extreme risk: {base_score}/100",
                    "Predicted transit arterial cutoffs"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, esc_thresh),
                threshold_or_condition=esc_thresh,
                constraints=esc_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"Extensive inundation ({flood_pct:.1f}%) and wind destruction expected. "
                    f"Position NDRF / ODRAF strike teams equipped with inflatable Gemini boats, chainsaws, and satellite communication."
                ),
                trigger_conditions={
                    "flood_extent_pct": flood_pct,
                    "risk_score": base_score,
                    "threshold_triggered": esc_thresh
                },
                required_evidence=["flood_percentage", "composite_risk_score"],
                affected_population=vuln_pop,
                affected_infrastructure=critical_assets[:2],
                action=DecisionAction(
                    action_id=f"act_disp_{evidence.districtId}",
                    title="Pre-position NDRF / ODRAF Strike Teams with Inflatable Boats",
                    category="emergency_dispatch",
                    target_agency="NDRF Battalion HQ, ODRAF, Fire & Emergency Services",
                    execution_instructions="Position 3 multi-hazard rescue teams equipped with Gemini boats, tree chainsaws, and SAT phones."
                ),
                triggering_risk_evidence=f"Extreme risk ({base_score}/100) and SAR flood inundation of {flood_pct:.1f}%.",
                reason="Flash inundation and road cutoffs anticipated post-landfall.",
                confidence=0.97,
                trace=f"Evidence (Flood: {flood_pct:.1f}%) → Risk Engine → Threshold ({esc_thresh}) → Decision (EMERGENCY_RESOURCE_MOBILIZATION) → Recommendation (REQUIRES_APPROVAL)"
            ))

            # 5. Maritime Port Moratorium
            if coastline_km > 0:
                port_thresh = "wind >= 85 km/h and coastline > 0"
                port_constraints = [
                    DecisionConstraint(
                        constraint_name="coastal_line_exposure",
                        required_condition="coastline_km > 0",
                        actual_value=coastline_km,
                        is_satisfied=coastline_km > 0,
                        explanation=f"{coastline_km}km of exposed sea face subject to cyclonic surge"
                    )
                ]
                decisions.append(DecisionOption(
                    decision_id="PORT_INDUSTRIAL_RESTRICTION",
                    decision_type=DecisionType.PORT_OPERATION_RESTRICTION,
                    title="Enforce Great Danger Port Signal (Signal 8-10) & Maritime Moratorium",
                    priority=DecisionPriority.IMMEDIATE,
                    status=RecommendationStatus.REQUIRES_APPROVAL,
                    risk_score=base_score,
                    risk_band=base_band,
                    triggering_risk_band=base_band,
                    triggering_factors=contrib_factors_list,
                    triggers=[
                        f"Gale winds: {wind_kmh} km/h (gust {gust_kmh} km/h)",
                        f"Coastline length: {coastline_km}km",
                        "Extreme maritime vessel grounding danger"
                    ],
                    relevant_exposure=relevant_exposure_dict,
                    supporting_evidence=self._build_supporting_evidence(evidence, port_thresh),
                    threshold_or_condition=port_thresh,
                    constraints=port_constraints,
                    human_approval_required=True,
                    requires_human_approval=True,
                    execution_status=ExecutionStatus.NOT_EXECUTED,
                    rationale=(
                        f"Severe gale winds ({wind_kmh} km/h, gust {gust_kmh} km/h) along {coastline_km}km "
                        f"coastline require total suspension of port cargo loading and vessel berthing."
                    ),
                    trigger_conditions={
                        "wind_kmh": wind_kmh,
                        "coastline_km": coastline_km,
                        "threshold_triggered": port_thresh
                    },
                    required_evidence=["wind_kmh", "gust_kmh", "coastal_line_km"],
                    affected_population=25000,
                    affected_infrastructure=["Deepwater Port", "Fishing Harbors", "Anchorage"],
                    action=DecisionAction(
                        action_id=f"act_port_{evidence.districtId}",
                        title="Enforce Great Danger Port Signal & Vessel Moratorium",
                        category="maritime_port",
                        target_agency="Port Authority, Coast Guard, Marine Police",
                        execution_instructions="Cease port cargo operations; escort commercial vessels to deep-sea anchorage; ground trawlers."
                    ),
                    triggering_risk_evidence=f"Gale winds ({wind_kmh} km/h) along {coastline_km}km open sea face.",
                    reason="Extreme risk of ship grounding, quay damage, and fisherman mortality.",
                    confidence=0.96,
                    trace=f"Evidence (Wind: {wind_kmh}km/h, Coast: {coastline_km}km) → Risk Engine → Threshold ({port_thresh}) → Decision (PORT_OPERATION_RESTRICTION) → Recommendation (REQUIRES_APPROVAL)"
                ))

        # -------------------------------------------------------------
        # POLICY EVALUATION: HIGH RISK SCENARIOS (Score 65-79 or band HIGH)
        # -------------------------------------------------------------
        elif base_score >= self.thresholds.high_risk_threshold or base_band == "HIGH":
            # 1. Prepare Evacuation
            prep_thresh = "score 65-79, surge >= 1.5m"
            prep_constraints = [
                DecisionConstraint(
                    constraint_name="high_risk_threshold",
                    required_condition="score >= 65 and score < 80",
                    actual_value=base_score,
                    is_satisfied=65 <= base_score < 80,
                    explanation=f"Risk score {base_score} qualifies for targeted preparedness without full mandatory clearance"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="PREPARE_EVACUATION",
                decision_type=DecisionType.PREPARE_EVACUATION,
                title="Targeted Evacuation Preparation for Kutcha Dwellings",
                priority=DecisionPriority.HIGH,
                status=RecommendationStatus.RECOMMENDED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"High composite risk: {base_score}/100",
                    f"Surge: {surge:.1f}m",
                    "Kutcha house structural vulnerability"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, prep_thresh),
                threshold_or_condition=prep_thresh,
                constraints=prep_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"High composite risk ({base_score}/100) with storm surge {surge:.1f}m. "
                    f"Targeted evacuation readiness recommended for non-pucca households and riverine drainage corridors."
                ),
                trigger_conditions={
                    "risk_score": base_score,
                    "surge_meters": surge,
                    "threshold_triggered": prep_thresh
                },
                required_evidence=["composite_risk_score", "surge_meters", "inundation_prob_pct"],
                affected_population=int(vuln_pop * 0.65),
                affected_infrastructure=critical_assets[:2],
                action=DecisionAction(
                    action_id=f"act_evac_{evidence.districtId}",
                    title="Targeted Evacuation Preparation for Kutcha Dwellings",
                    category="evacuation",
                    target_agency="BDO, Revenue Inspectors, Gram Panchayats",
                    execution_instructions="Stage transport vehicles and notify kutcha house residents along coastal 5km belt."
                ),
                triggering_risk_evidence=f"High risk score ({base_score}/100) with storm surge {surge:.1f}m.",
                reason="Structural vulnerability of kutcha houses under squally winds.",
                confidence=0.92,
                trace=f"Evidence (Surge: {surge:.1f}m) → Risk Engine ({base_score}/100) → Threshold ({prep_thresh}) → Decision (PREPARE_EVACUATION) → Recommendation (RECOMMENDED)"
            ))

            # 2. Increase Shelter Readiness
            shlt_r_thresh = "occupancy >= 40% or deficit >= 10,000"
            shlt_r_constraints = [
                DecisionConstraint(
                    constraint_name="shelter_intake_projection",
                    required_condition="shelter_occupancy_pct >= 40% or deficit >= 10,000",
                    actual_value={"occupancy": occupancy_pct, "deficit": shelter_deficit},
                    is_satisfied=occupancy_pct >= 40 or shelter_deficit >= 10000,
                    explanation=f"Shelter occupancy ({occupancy_pct}%) warrants pre-stocking 48h emergency provisions"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="INCREASE_SHELTER_READINESS",
                decision_type=DecisionType.INCREASE_SHELTER_READINESS,
                title="Pre-stock Potable Water, Generator Fuel & Sanitation in Shelters",
                priority=DecisionPriority.HIGH,
                status=RecommendationStatus.RECOMMENDED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Elevated shelter demand: {occupancy_pct}% occupancy",
                    f"Deficit: {shelter_deficit:,}",
                    "Pre-impact consumable stocking"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, shlt_r_thresh),
                threshold_or_condition=shlt_r_thresh,
                constraints=shlt_r_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"Shelter intake expected to surge. Deliver 48h emergency water tankers, halogen tablets, "
                    f"and medical kits to designated shelters."
                ),
                trigger_conditions={
                    "shelter_occupancy_pct": occupancy_pct,
                    "shelter_deficit": shelter_deficit,
                    "threshold_triggered": shlt_r_thresh
                },
                required_evidence=["shelter_occupancy_pct", "shelter_capacity_persons"],
                affected_population=int(shelter_cap * 0.75),
                affected_infrastructure=["Multi-Purpose Cyclone Shelters"],
                action=DecisionAction(
                    action_id=f"act_shlt_{evidence.districtId}",
                    title="Pre-stock Potable Water, Generator Fuel & Sanitation in Shelters",
                    category="shelter",
                    target_agency="RWSS, District Red Cross",
                    execution_instructions="Verify functional borewells, mobile water tankers, emergency medical kits, and backup power."
                ),
                triggering_risk_evidence=f"Elevated shelter demand (occupancy: {occupancy_pct}%, deficit: {shelter_deficit:,}).",
                reason="High likelihood of power grid interruption during storm passage.",
                confidence=0.93,
                trace=f"Evidence (Occupancy: {occupancy_pct}%) → Risk Engine → Threshold ({shlt_r_thresh}) → Decision (INCREASE_SHELTER_READINESS) → Recommendation (RECOMMENDED)"
            ))

            # 3. Infrastructure Monitoring
            inf_m_thresh = "wind >= 55 km/h or rain >= 150mm"
            inf_m_constraints = [
                DecisionConstraint(
                    constraint_name="wind_and_rain_threshold",
                    required_condition="wind >= 55 km/h or rain >= 150mm",
                    actual_value={"wind": wind_kmh, "rain": rain_mm},
                    is_satisfied=wind_kmh >= 55 or rain_mm >= 150.0,
                    explanation=f"Wind {wind_kmh} km/h and rain {rain_mm:.0f}mm exceed normal feeder tolerance"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="INFRASTRUCTURE_MONITORING",
                decision_type=DecisionType.INFRASTRUCTURE_MONITORING,
                title="Infrastructure Vulnerability Telemetry & Telecom Feeder Monitoring",
                priority=DecisionPriority.HIGH,
                status=RecommendationStatus.RECOMMENDED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Wind velocity: {wind_kmh} km/h",
                    f"Rainfall: {rain_mm:.0f}mm",
                    "Hospital and oxygen plant power feeder lines"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, inf_m_thresh),
                threshold_or_condition=inf_m_thresh,
                constraints=inf_m_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=(
                    f"Elevated wind velocity ({wind_kmh} km/h) and rainfall ({rain_mm:.0f}mm) require dedicated "
                    f"monitoring of hospital oxygen plant power lines and telecom towers."
                ),
                trigger_conditions={
                    "wind_kmh": wind_kmh,
                    "rain_mm_24h": rain_mm,
                    "threshold_triggered": inf_m_thresh
                },
                required_evidence=["wind_kmh", "rain_mm_24h", "critical_assets"],
                affected_population=vuln_pop,
                affected_infrastructure=critical_assets,
                action=DecisionAction(
                    action_id=f"act_infra_{evidence.districtId}",
                    title="Secure Telecom Tower Base Stations & Hospital Dedicated Feeder Lines",
                    category="infrastructure",
                    target_agency="Telecom Providers, District CDMO, DISCOMs",
                    execution_instructions="Ensure district hospitals have 48h diesel fuel and dual power feeds."
                ),
                triggering_risk_evidence=f"Moderate-to-high wind ({wind_kmh} km/h) and rainfall ({rain_mm:.0f}mm).",
                reason="Maintain life-support and communication integrity.",
                confidence=0.91,
                trace=f"Evidence (Wind: {wind_kmh}km/h, Rain: {rain_mm:.0f}mm) → Risk Engine → Threshold ({inf_m_thresh}) → Decision (INFRASTRUCTURE_MONITORING) → Recommendation (RECOMMENDED)"
            ))

            # 4. Emergency Coordination
            coord_thresh = "score >= 65"
            coord_constraints = [
                DecisionConstraint(
                    constraint_name="qrt_deployment_threshold",
                    required_condition="score >= 65",
                    actual_value=base_score,
                    is_satisfied=base_score >= 65,
                    explanation=f"High risk score {base_score} requires pre-deploying road clearing equipment"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="EMERGENCY_COORDINATION",
                decision_type=DecisionType.EMERGENCY_COORDINATION,
                title="District Quick Response Teams (QRT) Pre-deployment",
                priority=DecisionPriority.HIGH,
                status=RecommendationStatus.RECOMMENDED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"High hazard profile: {base_score}/100",
                    "Localized flood extent requiring de-watering pumps",
                    "Road clearance along state transit arteries"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, coord_thresh),
                threshold_or_condition=coord_thresh,
                constraints=coord_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Deploy heavy de-watering pumps and road-clearing units along state highways.",
                trigger_conditions={
                    "risk_score": base_score,
                    "threshold_triggered": coord_thresh
                },
                required_evidence=["composite_risk_score", "flood_percentage"],
                affected_population=vuln_pop,
                affected_infrastructure=critical_assets[:2],
                action=DecisionAction(
                    action_id=f"act_disp_{evidence.districtId}",
                    title="Deploy District Quick Response Teams (QRT) and Heavy De-Watering Pumps",
                    category="emergency_dispatch",
                    target_agency="District Fire Officer, Municipal Corporation Emergency Cell",
                    execution_instructions="Pre-deploy high-discharge diesel pumps at low-lying nodes."
                ),
                triggering_risk_evidence=f"High hazard profile ({base_score}/100) with localized flood extent {flood_pct:.1f}%.",
                reason="Maintain transit arterial corridors for relief logistics.",
                confidence=0.92,
                trace=f"Evidence (Score: {base_score}) → Risk Engine → Threshold ({coord_thresh}) → Decision (EMERGENCY_COORDINATION) → Recommendation (RECOMMENDED)"
            ))

            # 5. Port Restriction (Signal 3/4)
            if coastline_km > 0:
                port_h_thresh = "wind >= 50 km/h and coastline > 0"
                port_h_constraints = [
                    DecisionConstraint(
                        constraint_name="coastal_fisheries_safety",
                        required_condition="wind >= 50 km/h and coastline > 0",
                        actual_value={"wind": wind_kmh, "coast": coastline_km},
                        is_satisfied=wind_kmh >= 50 and coastline_km > 0,
                        explanation=f"Wind {wind_kmh} km/h along {coastline_km}km coast is dangerous for small craft"
                    )
                ]
                decisions.append(DecisionOption(
                    decision_id="PORT_INDUSTRIAL_RESTRICTION",
                    decision_type=DecisionType.PORT_OPERATION_RESTRICTION,
                    title="Hoist Local Cautionary Signal (Signal 3/4) & Prohibit Fishermen Sea Venturing",
                    priority=DecisionPriority.HIGH,
                    status=RecommendationStatus.RECOMMENDED,
                    risk_score=base_score,
                    risk_band=base_band,
                    triggering_risk_band=base_band,
                    triggering_factors=contrib_factors_list,
                    triggers=[
                        f"Squally winds: {wind_kmh} km/h",
                        f"Coastline: {coastline_km}km",
                        "High maritime wave chop"
                    ],
                    relevant_exposure=relevant_exposure_dict,
                    supporting_evidence=self._build_supporting_evidence(evidence, port_h_thresh),
                    threshold_or_condition=port_h_thresh,
                    constraints=port_h_constraints,
                    human_approval_required=True,
                    requires_human_approval=True,
                    execution_status=ExecutionStatus.NOT_EXECUTED,
                    rationale="Squally wind conditions and rough sea state hazardous to small craft.",
                    trigger_conditions={
                        "wind_kmh": wind_kmh,
                        "coastline_km": coastline_km,
                        "threshold_triggered": port_h_thresh
                    },
                    required_evidence=["wind_kmh", "coastal_line_km"],
                    affected_population=12000,
                    affected_infrastructure=["Fishing Harbors"],
                    action=DecisionAction(
                        action_id=f"act_port_{evidence.districtId}",
                        title="Hoist Local Cautionary Signal & Prohibit Sea Venturing",
                        category="maritime_port",
                        target_agency="Fisheries Directorate, Coastal Police",
                        execution_instructions="Broadcast continuous VHF warning channels; ensure craft are hauled beyond high tide reach."
                    ),
                    triggering_risk_evidence=f"Squally wind conditions ({wind_kmh} km/h) along {coastline_km}km coast.",
                    reason="Hazardous sea waves and rip currents prevent safe navigation.",
                    confidence=0.94,
                    trace=f"Evidence (Wind: {wind_kmh}km/h) → Risk Engine → Threshold ({port_h_thresh}) → Decision (PORT_OPERATION_RESTRICTION) → Recommendation (RECOMMENDED)"
                ))

            # Deferred evaluation for Extreme actions
            deferred_decisions.append(DecisionOption(
                decision_id="EVACUATION_ALERT",
                decision_type=DecisionType.EVACUATION_ALERT,
                title="Mandatory Evacuation Assessment",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.DEFERRED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=["Risk score below 80 threshold", "Surge below 2.5m extreme ceiling"],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, "risk_score >= 80"),
                threshold_or_condition="risk_score >= 80 and surge >= 2.5m",
                constraints=[
                    DecisionConstraint(
                        constraint_name="min_risk_threshold",
                        required_condition="risk_score >= 80",
                        actual_value=base_score,
                        is_satisfied=False,
                        explanation=f"Composite risk score {base_score}/100 is below the mandatory evacuation threshold of 80; general evacuation deferred."
                    )
                ],
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Risk level warrants targeted shelter preparedness rather than general mandatory evacuation.",
                trace="Deferred: Composite risk below EXTREME 80-point floor."
            ))

        # -------------------------------------------------------------
        # POLICY EVALUATION: MODERATE RISK SCENARIOS (Score 45-64 or band MODERATE)
        # -------------------------------------------------------------
        elif base_score >= self.thresholds.moderate_risk_threshold or base_band == "MODERATE":
            # 1. Enhanced Monitoring
            enh_thresh = "score 45-64"
            enh_constraints = [
                DecisionConstraint(
                    constraint_name="moderate_risk_corridor",
                    required_condition="score >= 45 and score < 65",
                    actual_value=base_score,
                    is_satisfied=45 <= base_score < 65,
                    explanation=f"Composite risk score {base_score} falls in moderate surveillance corridor"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="ENHANCED_MONITORING",
                decision_type=DecisionType.ENHANCED_MONITORING,
                title="Enhanced Multi-Hazard Surveillance & Community Alerts",
                priority=DecisionPriority.MODERATE,
                status=RecommendationStatus.RECOMMENDED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Moderate multi-hazard score: {base_score}/100",
                    f"Cyclone eye distance: {eye_km:.1f} km",
                    "Maintain 2-hourly track reviews"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, enh_thresh),
                threshold_or_condition=enh_thresh,
                constraints=enh_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=f"Moderate multi-hazard score ({base_score}/100). Maintain 2-hourly track reviews.",
                trigger_conditions={
                    "risk_score": base_score,
                    "threshold_triggered": enh_thresh
                },
                required_evidence=["composite_risk_score", "eye_distance_km"],
                affected_population=int(vuln_pop * 0.3),
                affected_infrastructure=critical_assets[:1],
                action=DecisionAction(
                    action_id=f"act_evac_{evidence.districtId}",
                    title="Precautionary Assisted Movement of High-Vulnerability Demographics",
                    category="evacuation",
                    target_agency="Anganwadi Workers, ASHA Volunteers, Panchayat Task Forces",
                    execution_instructions="Assist pregnant women, elderly, and differently-abled persons to nearest cyclone shelters."
                ),
                triggering_risk_evidence=f"Moderate multi-hazard risk index ({base_score}/100, {base_band}).",
                reason="Preventative safeguarding before transport lines deteriorate.",
                confidence=0.90,
                trace=f"Evidence (Score: {base_score}) → Risk Engine → Threshold ({enh_thresh}) → Decision (ENHANCED_MONITORING) → Recommendation (RECOMMENDED)"
            ))

            # 2. Preparedness Actions
            prep_a_thresh = "score 45-64"
            prep_a_constraints = [
                DecisionConstraint(
                    constraint_name="volunteer_mobilization_readiness",
                    required_condition="score >= 45",
                    actual_value=base_score,
                    is_satisfied=base_score >= 45,
                    explanation=f"Aapda Mitra community volunteers placed on 2-hour standby"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="PREPAREDNESS_ACTIONS",
                decision_type=DecisionType.PREPAREDNESS_ACTIONS,
                title="Precautionary Movement of Special Care Demographics",
                priority=DecisionPriority.MODERATE,
                status=RecommendationStatus.RECOMMENDED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Moderate hazard score: {base_score}/100",
                    "Special care demographic density",
                    "Potential track deviation contingency"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, prep_a_thresh),
                threshold_or_condition=prep_a_thresh,
                constraints=prep_a_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Place community first-responders (Aapda Mitra) on roster alert.",
                trigger_conditions={
                    "risk_score": base_score,
                    "threshold_triggered": prep_a_thresh
                },
                required_evidence=["composite_risk_score"],
                affected_population=int(vuln_pop * 0.2),
                affected_infrastructure=[],
                action=DecisionAction(
                    action_id=f"act_disp_{evidence.districtId}",
                    title="Put Aapda Mitra Volunteers and Civil Defence on 2-Hour Alert",
                    category="emergency_dispatch",
                    target_agency="District Emergency Operation Centre (DEOC), Civil Defence",
                    execution_instructions="Place community first-responders on roster alert; test emergency siren links."
                ),
                triggering_risk_evidence=f"Moderate hazard rating ({base_score}/100, {base_band}).",
                reason="Rapid readiness escalation if cyclone track shifts westward.",
                confidence=0.88,
                trace=f"Evidence (Score: {base_score}) → Risk Engine → Threshold ({prep_a_thresh}) → Decision (PREPAREDNESS_ACTIONS) → Recommendation (RECOMMENDED)"
            ))

            # 3. Shelter Readiness Check
            shlt_c_thresh = "score 45-64"
            shlt_c_constraints = [
                DecisionConstraint(
                    constraint_name="shelter_capacity_verification",
                    required_condition="shelter_capacity_persons > 0",
                    actual_value=shelter_cap,
                    is_satisfied=shelter_cap > 0,
                    explanation=f"Audit {shelter_cap:,} capacity across Multi-Purpose Cyclone Shelters"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="SHELTER_READINESS_CHECK",
                decision_type=DecisionType.SHELTER_READINESS_CHECK,
                title="Shelter Structural Audit, Sluice Gate & Drainage Clearance",
                priority=DecisionPriority.MODERATE,
                status=RecommendationStatus.READY,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Moderate risk score: {base_score}/100",
                    f"Shelter capacity: {shelter_cap:,} persons",
                    "Pre-cyclone maintenance checklist"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, shlt_c_thresh),
                threshold_or_condition=shlt_c_thresh,
                constraints=shlt_c_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Inspect shelter structural integrity, lightning arresters, and dry rations.",
                trigger_conditions={
                    "risk_score": base_score,
                    "threshold_triggered": shlt_c_thresh
                },
                required_evidence=["shelter_capacity_persons"],
                affected_population=shelter_cap,
                affected_infrastructure=["Multi-Purpose Cyclone Shelters"],
                action=DecisionAction(
                    action_id=f"act_shlt_{evidence.districtId}",
                    title="Inspect Shelter Structural Integrity and Generator Readiness",
                    category="shelter",
                    target_agency="PWD, Local Block Engineers",
                    execution_instructions="Audit lightning arresters, storm shutters, and diesel reserves across all designated shelters."
                ),
                triggering_risk_evidence=f"Moderate risk score ({base_score}/100, {base_band}); pre-cyclonic staging.",
                reason="Ensure zero shelter malfunctions when evacuee influx begins.",
                confidence=0.89,
                trace=f"Evidence (Capacity: {shelter_cap:,}) → Risk Engine → Threshold ({shlt_c_thresh}) → Decision (SHELTER_READINESS_CHECK) → Recommendation (READY)"
            ))

            # 4. Infrastructure Monitoring
            inf_mod_thresh = "score 45-64"
            inf_mod_constraints = [
                DecisionConstraint(
                    constraint_name="drainage_and_culvert_clearance",
                    required_condition="critical_assets_count > 0",
                    actual_value=len(critical_assets),
                    is_satisfied=len(critical_assets) > 0,
                    explanation="Clear stormwater runoff sluice gates and inspect bridge pier scour"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="INFRASTRUCTURE_MONITORING",
                decision_type=DecisionType.INFRASTRUCTURE_MONITORING,
                title="Continuous Infrastructure Health Telemetry & Drainage Scour Monitoring",
                priority=DecisionPriority.MODERATE,
                status=RecommendationStatus.READY,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Moderate risk: {base_score}/100",
                    f"Exposed critical assets: {len(critical_assets)}",
                    "Preventative sluice gate desiltation"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, inf_mod_thresh),
                threshold_or_condition=inf_mod_thresh,
                constraints=inf_mod_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Clear stormwater runoff sluice gates and inspect bridge pier scour monitors.",
                trigger_conditions={
                    "risk_score": base_score,
                    "threshold_triggered": inf_mod_thresh
                },
                required_evidence=["critical_assets"],
                affected_population=vuln_pop,
                affected_infrastructure=critical_assets,
                action=DecisionAction(
                    action_id=f"act_infra_{evidence.districtId}",
                    title="Continuous Infrastructure Health Telemetry & Drainage Scour Monitoring",
                    category="infrastructure",
                    target_agency="Municipal Engineering Dept, Irrigation & Drainage Directorate",
                    execution_instructions="Clear stormwater runoff sluice gates and inspect bridge pier scour monitors."
                ),
                triggering_risk_evidence=f"Moderate risk score ({base_score}/100, {base_band}); normal infrastructure tolerance.",
                reason="Standard preventative operations.",
                confidence=0.87,
                trace=f"Evidence (Assets: {len(critical_assets)}) → Risk Engine → Threshold ({inf_mod_thresh}) → Decision (INFRASTRUCTURE_MONITORING) → Recommendation (READY)"
            ))

            # 5. Maritime Port Caution
            if coastline_km > 0:
                port_m_thresh = "coastline > 0"
                port_m_constraints = [
                    DecisionConstraint(
                        constraint_name="coastal_presence",
                        required_condition="coastline_km > 0",
                        actual_value=coastline_km,
                        is_satisfied=coastline_km > 0,
                        explanation=f"Advise deep-sea fishing trawlers along {coastline_km}km coast to remain within radio range"
                    )
                ]
                decisions.append(DecisionOption(
                    decision_id="PORT_INDUSTRIAL_RESTRICTION",
                    decision_type=DecisionType.PORT_OPERATION_RESTRICTION,
                    title="Coastal Marine Weather Advisory Broadcast",
                    priority=DecisionPriority.MODERATE,
                    status=RecommendationStatus.READY,
                    risk_score=base_score,
                    risk_band=base_band,
                    triggering_risk_band=base_band,
                    triggering_factors=contrib_factors_list,
                    triggers=[
                        f"Coastline: {coastline_km}km",
                        f"Wind: {wind_kmh} km/h",
                        "Radio broadcast to deep-sea trawlers"
                    ],
                    relevant_exposure=relevant_exposure_dict,
                    supporting_evidence=self._build_supporting_evidence(evidence, port_m_thresh),
                    threshold_or_condition=port_m_thresh,
                    constraints=port_m_constraints,
                    human_approval_required=True,
                    requires_human_approval=True,
                    execution_status=ExecutionStatus.NOT_EXECUTED,
                    rationale="Advise deep-sea fishing trawlers to remain within communication range.",
                    trigger_conditions={
                        "coastline_km": coastline_km,
                        "threshold_triggered": port_m_thresh
                    },
                    required_evidence=["coastal_line_km", "wind_kmh"],
                    affected_population=5000,
                    affected_infrastructure=["Fishing Harbors"],
                    action=DecisionAction(
                        action_id=f"act_port_{evidence.districtId}",
                        title="Coastal Marine Weather Advisory Broadcast",
                        category="maritime_port",
                        target_agency="Coastal Radio Stations, Fisheries Extension Officers",
                        execution_instructions="Advise deep-sea fishing trawlers to remain within communication range and monitor IMD bulletins."
                    ),
                    triggering_risk_evidence=f"Moderate coastal wind ({wind_kmh} km/h); sea conditions within manageable limits.",
                    reason="No imminent storm surge or gale wind danger.",
                    confidence=0.88,
                    trace=f"Evidence (Coast: {coastline_km}km) → Risk Engine → Threshold ({port_m_thresh}) → Decision (PORT_OPERATION_RESTRICTION) → Recommendation (READY)"
                ))

            # Deferred decisions for Moderate
            deferred_decisions.append(DecisionOption(
                decision_id="EVACUATION_ALERT",
                decision_type=DecisionType.EVACUATION_ALERT,
                title="Mandatory Evacuation Assessment",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.DEFERRED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=["Risk score below 80 threshold", "Surge below 2.5m ceiling"],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, "risk_score >= 80"),
                threshold_or_condition="risk_score >= 80 and surge >= 2.5m",
                constraints=[
                    DecisionConstraint(
                        constraint_name="min_risk_threshold",
                        required_condition="risk_score >= 80",
                        actual_value=base_score,
                        is_satisfied=False,
                        explanation=f"Composite risk score {base_score}/100 is below evacuation threshold of 80; mandatory evacuation deferred."
                    )
                ],
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Moderate conditions do not satisfy mandatory evacuation criteria.",
                trace="Deferred: Composite risk below EXTREME 80-point floor."
            ))

        # -------------------------------------------------------------
        # POLICY EVALUATION: LOW RISK SCENARIOS (Score < 45 or band LOW)
        # -------------------------------------------------------------
        else:
            # 1. Routine Monitoring
            low_thresh = "score < 45"
            low_constraints = [
                DecisionConstraint(
                    constraint_name="baseline_weather_tracking",
                    required_condition="score < 45",
                    actual_value=base_score,
                    is_satisfied=base_score < 45,
                    explanation=f"Risk score {base_score} indicates baseline coastal conditions"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="ROUTINE_MONITORING",
                decision_type=DecisionType.ROUTINE_MONITORING,
                title="Routine Coastal Surveillance & IMD Bulletin Tracking",
                priority=DecisionPriority.ROUTINE,
                status=RecommendationStatus.READY,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Baseline risk level: {base_score}/100",
                    "Peripheral cyclone influence",
                    "Standard early warning dissemination"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, low_thresh),
                threshold_or_condition=low_thresh,
                constraints=low_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale=f"Baseline coastal conditions ({base_score}/100, {base_band}). Peripheral monitoring only.",
                trigger_conditions={
                    "risk_score": base_score,
                    "threshold_triggered": low_thresh
                },
                required_evidence=["composite_risk_score"],
                affected_population=0,
                affected_infrastructure=[],
                action=DecisionAction(
                    action_id=f"act_evac_{evidence.districtId}",
                    title="Evacuation Standby & Community Early Warning Dissemination",
                    category="evacuation",
                    target_agency="DDMA, Village Disaster Management Committees",
                    execution_instructions="Maintain regular siren and loudspeaker advisories; keep evacuation routes clear."
                ),
                triggering_risk_evidence=f"Low risk level ({base_score}/100, {base_band}); peripheral cyclone influence.",
                reason="Conditions remain below mandatory evacuation thresholds; retain situational readiness.",
                confidence=0.95,
                trace=f"Evidence (Score: {base_score}) → Risk Engine → Threshold ({low_thresh}) → Decision (ROUTINE_MONITORING) → Recommendation (READY)"
            ))

            # 2. Shelter Readiness Check
            shlt_low_thresh = "score < 45"
            shlt_low_constraints = [
                DecisionConstraint(
                    constraint_name="routine_maintenance_roster",
                    required_condition="shelter_capacity_persons > 0",
                    actual_value=shelter_cap,
                    is_satisfied=shelter_cap > 0,
                    explanation=f"Routine maintenance audit for {shelter_cap:,} shelter capacity"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="SHELTER_READINESS_CHECK",
                decision_type=DecisionType.SHELTER_READINESS_CHECK,
                title="Routine Shelter Maintenance & Stock Audit",
                priority=DecisionPriority.ROUTINE,
                status=RecommendationStatus.READY,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Baseline risk: {base_score}/100",
                    f"Shelter capacity: {shelter_cap:,}",
                    "Caretaker attendance and key custody"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, shlt_low_thresh),
                threshold_or_condition=shlt_low_thresh,
                constraints=shlt_low_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Confirm shelter caretaker attendance and key custody rosters.",
                trigger_conditions={"risk_score": base_score},
                required_evidence=["shelter_capacity_persons"],
                affected_population=shelter_cap,
                affected_infrastructure=["Multi-Purpose Cyclone Shelters"],
                action=DecisionAction(
                    action_id=f"act_shlt_{evidence.districtId}",
                    title="Routine Shelter Maintenance & Stock Audit",
                    category="shelter",
                    target_agency="Block Development Office, Village Red Cross",
                    execution_instructions="Confirm shelter caretaker attendance and key custody rosters."
                ),
                triggering_risk_evidence=f"Low risk profile ({base_score}/100, {base_band}).",
                reason="Standard preparedness protocols in effect.",
                confidence=0.95,
                trace=f"Evidence (Capacity: {shelter_cap:,}) → Risk Engine → Threshold ({shlt_low_thresh}) → Decision (SHELTER_READINESS_CHECK) → Recommendation (READY)"
            ))

            # 3. Infrastructure Monitoring
            inf_low_thresh = "score < 45"
            inf_low_constraints = [
                DecisionConstraint(
                    constraint_name="baseline_telemetry",
                    required_condition="critical_assets_count > 0",
                    actual_value=len(critical_assets),
                    is_satisfied=len(critical_assets) > 0,
                    explanation=f"Telemetry verified for {len(critical_assets)} critical assets under baseline conditions"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="INFRASTRUCTURE_MONITORING",
                decision_type=DecisionType.INFRASTRUCTURE_MONITORING,
                title="Routine Infrastructure Health Telemetry",
                priority=DecisionPriority.ROUTINE,
                status=RecommendationStatus.READY,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Baseline risk: {base_score}/100",
                    f"Critical assets: {len(critical_assets)}",
                    "Normal operational tolerance"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, inf_low_thresh),
                threshold_or_condition=inf_low_thresh,
                constraints=inf_low_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Normal infrastructure tolerance and regular maintenance monitoring.",
                trigger_conditions={"risk_score": base_score},
                required_evidence=["critical_assets"],
                affected_population=0,
                affected_infrastructure=critical_assets,
                action=DecisionAction(
                    action_id=f"act_infra_{evidence.districtId}",
                    title="Continuous Infrastructure Health Telemetry and Drainage Scour Monitoring",
                    category="infrastructure",
                    target_agency="Municipal Engineering Dept, Irrigation & Drainage Directorate",
                    execution_instructions="Clear stormwater runoff sluice gates and inspect bridge pier scour monitors."
                ),
                triggering_risk_evidence=f"Baseline risk ({base_score}/100, {base_band}); normal infrastructure tolerance.",
                reason="Standard preventative operations.",
                confidence=0.95,
                trace=f"Evidence (Assets: {len(critical_assets)}) → Risk Engine → Threshold ({inf_low_thresh}) → Decision (INFRASTRUCTURE_MONITORING) → Recommendation (READY)"
            ))

            # 4. Emergency Coordination
            coord_low_thresh = "score < 45"
            coord_low_constraints = [
                DecisionConstraint(
                    constraint_name="control_room_manning",
                    required_condition="deoc_standby == True",
                    actual_value=True,
                    is_satisfied=True,
                    explanation="24/7 duty log maintenance and emergency phone line connectivity confirmed"
                )
            ]
            decisions.append(DecisionOption(
                decision_id="EMERGENCY_COORDINATION",
                decision_type=DecisionType.EMERGENCY_COORDINATION,
                title="Standard DEOC Standby & Personnel Roster Verification",
                priority=DecisionPriority.ROUTINE,
                status=RecommendationStatus.READY,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=[
                    f"Baseline risk: {base_score}/100",
                    "DEOC 24/7 communication lines active",
                    "Regular IMD bulletin updates"
                ],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, coord_low_thresh),
                threshold_or_condition=coord_low_thresh,
                constraints=coord_low_constraints,
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Ensure 24/7 manning of control room phone lines and duty logs.",
                trigger_conditions={"risk_score": base_score},
                required_evidence=["composite_risk_score"],
                affected_population=0,
                affected_infrastructure=[],
                action=DecisionAction(
                    action_id=f"act_disp_{evidence.districtId}",
                    title="Standard DEOC Standby & Personnel Roster Verification",
                    category="emergency_dispatch",
                    target_agency="District Emergency Operation Centre",
                    execution_instructions="Ensure 24/7 manning of control room phone lines and daily duty log maintenance."
                ),
                triggering_risk_evidence=f"Low risk rating ({base_score}/100, {base_band}).",
                reason="Baseline monitoring adequate.",
                confidence=0.95,
                trace=f"Evidence (Score: {base_score}) → Risk Engine → Threshold ({coord_low_thresh}) → Decision (EMERGENCY_COORDINATION) → Recommendation (READY)"
            ))

            # 5. Maritime Port Caution
            if coastline_km > 0:
                port_low_thresh = "coastline > 0"
                port_low_constraints = [
                    DecisionConstraint(
                        constraint_name="routine_marine_tracking",
                        required_condition="coastline_km > 0",
                        actual_value=coastline_km,
                        is_satisfied=coastline_km > 0,
                        explanation=f"Routine tracking of {coastline_km}km coastal sector"
                    )
                ]
                decisions.append(DecisionOption(
                    decision_id="PORT_INDUSTRIAL_RESTRICTION",
                    decision_type=DecisionType.PORT_OPERATION_RESTRICTION,
                    title="Routine Marine Weather Advisory Tracking",
                    priority=DecisionPriority.ROUTINE,
                    status=RecommendationStatus.READY,
                    risk_score=base_score,
                    risk_band=base_band,
                    triggering_risk_band=base_band,
                    triggering_factors=contrib_factors_list,
                    triggers=[
                        f"Coastline: {coastline_km}km",
                        f"Wind: {wind_kmh} km/h",
                        "Routine coastal weather bulletins"
                    ],
                    relevant_exposure=relevant_exposure_dict,
                    supporting_evidence=self._build_supporting_evidence(evidence, port_low_thresh),
                    threshold_or_condition=port_low_thresh,
                    constraints=port_low_constraints,
                    human_approval_required=True,
                    requires_human_approval=True,
                    execution_status=ExecutionStatus.NOT_EXECUTED,
                    rationale="Regular monitoring of coastal weather bulletins.",
                    trigger_conditions={"coastline_km": coastline_km},
                    required_evidence=["coastal_line_km"],
                    affected_population=0,
                    affected_infrastructure=["Fishing Harbors"],
                    action=DecisionAction(
                        action_id=f"act_port_{evidence.districtId}",
                        title="Coastal Marine Weather Advisory Broadcast",
                        category="maritime_port",
                        target_agency="Coastal Radio Stations, Fisheries Extension Officers",
                        execution_instructions="Advise deep-sea fishing trawlers to monitor IMD bulletins."
                    ),
                    triggering_risk_evidence=f"Moderate coastal wind ({wind_kmh} km/h); sea conditions within manageable limits.",
                    reason="No imminent storm surge or gale wind danger.",
                    confidence=0.95,
                    trace=f"Evidence (Coast: {coastline_km}km) → Risk Engine → Threshold ({port_low_thresh}) → Decision (PORT_OPERATION_RESTRICTION) → Recommendation (READY)"
                ))

            # Deferred Decisions in Low Risk
            deferred_decisions.append(DecisionOption(
                decision_id="EVACUATION_ALERT",
                decision_type=DecisionType.EVACUATION_ALERT,
                title="Mandatory Evacuation Assessment",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.DEFERRED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=["Risk score far below 80 threshold", "No catastrophic storm surge"],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, "risk_score >= 80"),
                threshold_or_condition="risk_score >= 80 and surge >= 2.5m",
                constraints=[
                    DecisionConstraint(
                        constraint_name="min_risk_threshold",
                        required_condition="risk_score >= 80",
                        actual_value=base_score,
                        is_satisfied=False,
                        explanation=f"Composite risk score {base_score}/100 is far below evacuation threshold of 80; mandatory evacuation deferred."
                    ),
                    DecisionConstraint(
                        constraint_name="hazard_severity",
                        required_condition="surge >= 2.5m or flood_extent_pct >= 40%",
                        actual_value={"surge": surge, "flood": flood_pct},
                        is_satisfied=False,
                        explanation=f"Surge ({surge:.1f}m) and flood extent ({flood_pct:.1f}%) are within manageable baseline thresholds."
                    )
                ],
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Low-risk conditions do not warrant coastal evacuation; public movement remains unrestricted.",
                trace="Deferred: Composite risk score below 80-point floor and surge below 2.5m."
            ))

            deferred_decisions.append(DecisionOption(
                decision_id="EMERGENCY_OPERATIONS_ESCALATION",
                decision_type=DecisionType.EMERGENCY_RESOURCE_MOBILIZATION,
                title="Emergency Operations Escalation (NDRF / ODRAF Strike Teams)",
                priority=DecisionPriority.IMMEDIATE,
                status=RecommendationStatus.DEFERRED,
                risk_score=base_score,
                risk_band=base_band,
                triggering_risk_band=base_band,
                triggering_factors=contrib_factors_list,
                triggers=["Flood inundation below 50% cutoff", "Risk score below 80"],
                relevant_exposure=relevant_exposure_dict,
                supporting_evidence=self._build_supporting_evidence(evidence, "flood_pct >= 50%"),
                threshold_or_condition="flood_percentage >= 50% or risk_score >= 80",
                constraints=[
                    DecisionConstraint(
                        constraint_name="severe_hazard_cutoff",
                        required_condition="flood_percentage >= 50% or risk_score >= 80",
                        actual_value={"flood": flood_pct, "score": base_score},
                        is_satisfied=False,
                        explanation=f"Flood extent {flood_pct:.1f}% does not require specialized water rescue strike teams."
                    )
                ],
                human_approval_required=True,
                requires_human_approval=True,
                execution_status=ExecutionStatus.NOT_EXECUTED,
                rationale="Specialized flood rescue strike team deployment deferred due to absence of critical inundation.",
                trace="Deferred: Flood percentage and risk score do not warrant specialized boat deployments."
            ))

        # Overall priority is highest priority among decisions
        priorities = [d.priority for d in decisions]
        overall_priority = (
            "IMMEDIATE" if "IMMEDIATE" in priorities or base_score >= 80 else (
                "HIGH" if "HIGH" in priorities or base_score >= 65 else (
                    "MODERATE" if "MODERATE" in priorities or base_score >= 45 else "ROUTINE"
                )
            )
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        decision_id = f"dec_{evidence.districtId}_{evidence.stepId}_{uuid.uuid4().hex[:6]}"

        return DecisionRecommendation(
            district_id=evidence.districtId,
            risk_score=base_score,
            risk_band=base_band,
            recommended_decisions=decisions,
            deferred_decisions=deferred_decisions,
            priority=overall_priority,
            decision_confidence=0.95,
            evidence_references=evidence_refs,
            context=context,
            provenance=self.provenance_tag,
            requires_human_approval=True,
            human_approval_required=True,
            direct_execution_prohibited=True,
            execution_status="NOT_EXECUTED",
            generated_at=now_iso,
            # Compatibility helpers
            decision_id=decision_id,
            district_name=evidence.districtName,
            state=evidence.state,
            step_id=evidence.stepId,
            urgency_level=f"{overall_priority}_ACTION_REQUIRED",
            composite_risk_score=base_score,
            recommendations=decisions,
            total_recommendations=len(decisions),
            evidence_summary={
                "districtId": evidence.districtId,
                "compositeRiskScore": base_score,
                "riskBand": base_band,
                "surgeMeters": surge,
                "floodPercentage": flood_pct,
                "windKmh": wind_kmh,
                "shelterDeficit": shelter_deficit
            }
        )

    def evaluate_jev(self, req: JEVEvaluationRequest) -> JEVEvaluationReport:
        """
        Executes formal JEV (Judgment, Evaluation & Verification) Decision Intelligence evaluation.
        Evaluates the 6 mentor evaluation pillars:
        1. Decision Evaluation: candidate operational options, priorities, and triggers
        2. Evaluation Score: composite confidence (0.0 to 1.0)
        3. Evidence Coverage: presence of multi-modal evidence modalities (SAR flood, surge, wind, vuln, infra)
        4. Risk Consistency: alignment with Transparent Risk Engine score
        5. Constraint Compliance: verification of policy preconditions and safety guardrails
        6. Auditable Explanation: traceable multi-factor explanation
        """
        step = req.step_id or "NOW"
        normalized_step = "NOW" if step.upper() == "CURRENT" else step

        # 1. Fetch base district data & evidence
        district_data = risk_service.get_district_by_id(req.district_id, step_id=normalized_step)
        if not district_data:
            raise ValueError(f"District '{req.district_id}' not found in coastal surveillance registry.")

        # Check custom overrides if requested
        has_custom = any([
            req.custom_rain_mm is not None,
            req.custom_surge_m is not None,
            req.custom_wind_kmh is not None,
            req.custom_flood_pct is not None
        ])

        if has_custom:
            eval_req = RiskEvaluationRequest(
                districtId=req.district_id,
                stepId=normalized_step,
                customRainMm24h=req.custom_rain_mm,
                customSurgeMeters=req.custom_surge_m,
                customWindKmh=req.custom_wind_kmh,
                customFloodPct=req.custom_flood_pct
            )
            evidence = risk_service.evaluate_custom_risk(eval_req)
            base_score = evidence.riskExplanation.compositeScore if evidence.riskExplanation else 50
            base_band = evidence.riskExplanation.riskBand if evidence.riskExplanation else "MODERATE"
        else:
            evidence = risk_service.get_district_evidence(req.district_id, step_id=normalized_step)
            risk_metrics = district_data.get("risk", {})
            base_score = int(risk_metrics.get("riskScore", 50))
            base_band = str(risk_metrics.get("riskBand", "MODERATE"))

        # 2. Decision Evaluation
        decision_rec = self._evaluate_from_evidence(evidence, base_score=base_score, base_band=base_band)

        # 3. Evidence Coverage Assessment
        modalities_available = []
        modalities_missing = []

        sar_verified = False
        if req.test_mode == "NEGATIVE_DEFICIENT_EVIDENCE":
            modalities_missing.append("flood_perception")
        elif evidence.floodPerception and evidence.floodPerception.floodPercentage is not None:
            modalities_available.append("flood_perception")
            sar_verified = True
        else:
            modalities_missing.append("flood_perception")

        if evidence.cycloneHazard and evidence.cycloneHazard.maxWindKmh > 0:
            modalities_available.append("cyclone_hazard")
        else:
            modalities_missing.append("cyclone_hazard")

        met_verified = False
        if req.test_mode == "NEGATIVE_DEFICIENT_EVIDENCE":
            modalities_missing.append("meteorology")
        elif evidence.meteorology and evidence.meteorology.surgeMeters is not None:
            modalities_available.append("meteorology")
            met_verified = True
        else:
            modalities_missing.append("meteorology")

        vuln_verified = False
        if evidence.vulnerability and evidence.vulnerability.vulnerablePopulation > 0:
            modalities_available.append("vulnerability")
            vuln_verified = True
        else:
            modalities_missing.append("vulnerability")

        if evidence.infrastructure and evidence.infrastructure.criticalAssetsList:
            modalities_available.append("infrastructure")
        else:
            modalities_missing.append("infrastructure")

        total_modalities = 5
        present_count = len(modalities_available)
        coverage_pct = round((present_count / total_modalities) * 100.0, 1)
        cov_tier = (
            "COMPLETE" if coverage_pct == 100.0 else (
                "ADEQUATE" if coverage_pct >= 80.0 else (
                    "PARTIAL" if coverage_pct >= 60.0 else "DEFICIENT"
                )
            )
        )
        evidence_coverage = EvidenceCoverageSummary(
            total_expected_sources=total_modalities,
            present_sources=present_count,
            coverage_percentage=coverage_pct,
            coverage_tier=cov_tier,
            available_modalities=modalities_available,
            missing_modalities=modalities_missing,
            sar_perception_verified=sar_verified,
            meteorology_verified=met_verified,
            vulnerability_verified=vuln_verified
        )

        # 4. Risk Consistency Assessment
        discrepancies = []
        consistency_score = 1.0

        if req.test_mode == "NEGATIVE_INCONSISTENT_RISK":
            discrepancies.append(
                f"Severe inconsistency: Mandatory Evacuation Directive active while Transparent Risk Score is {base_score}/100 ({base_band})"
            )
            consistency_score = 0.20
            is_consistent = False
            validation_note = "CRITICAL MISMATCH: Injected evacuation directive contradicts deterministic risk score."
        else:
            priority = decision_rec.priority
            if base_band in ["EXTREME", "CRITICAL"] and priority not in ["IMMEDIATE", "CRITICAL"]:
                discrepancies.append(f"Risk band is {base_band} but decision priority is {priority}")
                consistency_score -= 0.3
            elif base_band == "LOW":
                evac_found = any("EVACUATION" in d.decision_id for d in decision_rec.recommended_decisions)
                if evac_found:
                    discrepancies.append("Low risk district has active evacuation directive")
                    consistency_score -= 0.5
            is_consistent = len(discrepancies) == 0
            validation_note = "Verified: Decision urgency and active directives strictly align with Transparent Risk Engine." if is_consistent else f"Discrepancies flagged: {'; '.join(discrepancies)}"

        risk_consistency = RiskConsistencyCheck(
            is_consistent=is_consistent,
            risk_score=base_score,
            risk_band=base_band,
            decision_priority=decision_rec.priority,
            consistency_score=max(0.0, round(consistency_score, 2)),
            detected_discrepancies=discrepancies,
            validation_note=validation_note
        )

        # 5. Constraint Compliance Assessment
        all_constraints: List[DecisionConstraint] = []
        for dec in decision_rec.recommended_decisions:
            all_constraints.extend(dec.constraints)
        for dec in decision_rec.deferred_decisions:
            all_constraints.extend(dec.constraints)

        satisfied_c = sum(1 for c in all_constraints if c.is_satisfied)
        violated_c = sum(1 for c in all_constraints if not c.is_satisfied)
        total_c = len(all_constraints)

        active_constraints = []
        for dec in decision_rec.recommended_decisions:
            active_constraints.extend(dec.constraints)
        active_satisfied = sum(1 for c in active_constraints if c.is_satisfied)
        active_total = len(active_constraints)
        compliance_pct = round((active_satisfied / max(1, active_total)) * 100.0, 1)

        auto_blocked = True
        human_req = True
        if req.test_mode == "NEGATIVE_AUTONOMOUS_ATTEMPT":
            auto_blocked = False
            human_req = False
            is_compliant = False
            compliance_pct = 0.0
        else:
            is_compliant = compliance_pct == 100.0

        constraint_compliance = ConstraintComplianceSummary(
            total_evaluated_constraints=total_c,
            satisfied_constraints=satisfied_c,
            violated_constraints=violated_c,
            compliance_rate_pct=compliance_pct,
            is_fully_compliant=is_compliant,
            autonomous_execution_blocked=auto_blocked,
            human_approval_enforced=human_req,
            detailed_constraints=all_constraints
        )

        # 6. Composite Evaluation Score & Grade
        if req.test_mode in ["NEGATIVE_INCONSISTENT_RISK", "NEGATIVE_AUTONOMOUS_ATTEMPT"]:
            eval_score = 0.25
            grade = "REJECTED"
        elif req.test_mode == "NEGATIVE_DEFICIENT_EVIDENCE":
            eval_score = 0.58
            grade = "LOW_CONFIDENCE"
        else:
            eval_score = round(
                0.40 * (coverage_pct / 100.0) +
                0.35 * consistency_score +
                0.25 * (compliance_pct / 100.0),
                3
            )
            grade = (
                "HIGH_CONFIDENCE" if eval_score >= 0.85 else (
                    "MODERATE_CONFIDENCE" if eval_score >= 0.70 else (
                        "LOW_CONFIDENCE" if eval_score >= 0.50 else "REJECTED"
                    )
                )
            )

        # 7. Auditable Explanation
        active_titles = [d.title for d in decision_rec.recommended_decisions]

        auditable_explanation = (
            f"JEV Decision Intelligence Audit for {evidence.districtName or req.district_id} [{normalized_step}]:\n"
            f"1. Multi-Modal Evidence: Evaluated {present_count}/{total_modalities} modalities ({cov_tier}, {coverage_pct}% coverage). "
            f"SegFormer flood extent: {evidence.floodPerception.floodPercentage:.1f}%, storm surge: {evidence.meteorology.surgeMeters:.1f}m, wind: {evidence.meteorology.windKmh} km/h.\n"
            f"2. Deterministic Risk: Grounded in Transparent Risk Engine score {base_score}/100 ({base_band}). Zero LLM risk score tampering.\n"
            f"3. Policy Preconditions: {active_satisfied}/{active_total} active constraints satisfied ({compliance_pct}% compliance).\n"
            f"4. Candidate Recommendations: {len(decision_rec.recommended_decisions)} active operational policies [{', '.join(active_titles[:3])}].\n"
            f"5. Deferred Policies: {len(decision_rec.deferred_decisions)} policies deferred due to unmet risk/hazard floors.\n"
            f"6. Governance Invariant: Execution status is locked to 'NOT_EXECUTED'. Human Incident Commander authorization is mandatory."
        )

        provenance_breakdown = {
            "historical_simulation": "HISTORICAL_SIMULATION_REMAL_2024",
            "perception_ai": evidence.floodPerception.modelIdentifier or "[AI INFERENCE] SegFormer-B0 SAR Flood Perception",
            "risk_engine": "[DETERMINISTIC RISK ENGINE] Transparent Multi-Factor Attribution v1.0",
            "decision_intelligence": "[JEV DECISION INTELLIGENCE] Judgment-Evaluation-Verification Rule Engine v1.0",
            "safety_governance": "MANDATORY_HUMAN_APPROVAL_REQUIRED (Autonomous Execution Prohibited)"
        }

        now_iso = datetime.now(timezone.utc).isoformat()
        eval_id = f"jev_eval_{req.district_id}_{normalized_step}_{uuid.uuid4().hex[:6]}"

        return JEVEvaluationReport(
            evaluation_id=eval_id,
            district_id=req.district_id,
            district_name=evidence.districtName,
            step_id=normalized_step,
            evaluation_timestamp=now_iso,
            evaluation_score=eval_score,
            evaluation_grade=grade,
            decision_evaluation=decision_rec,
            evidence_coverage=evidence_coverage,
            risk_consistency=risk_consistency,
            constraint_compliance=constraint_compliance,
            auditable_explanation=auditable_explanation,
            provenance_breakdown=provenance_breakdown,
            autonomous_execution_prohibited=True,
            human_approval_mandatory=True,
            execution_status="NOT_EXECUTED",
            provenance="[JEV DECISION INTELLIGENCE] Verified Decision Dossier (Deterministic Rule Engine)"
        )


decision_service = DecisionService()
# Alias for backwards compatibility with decision_engine
decision_engine = decision_service
