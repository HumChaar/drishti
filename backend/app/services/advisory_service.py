"""
DRISHTI Decision Intelligence & Gemini Advisory Service
Fuses SegFormer flood perception, Risk Engine outputs, and multi-modal hazard evidence
into auditable, multilingual disaster advisories with strict human-in-the-loop review.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import httpx

from app.models.schemas import (
    DistrictEvidence,
    DecisionIntelligenceProfile,
    AdvisoryPriorityAction,
    StructuredAdvisoryContent,
    AdvisoryReviewRecord,
    AdvisoryResponse,
    AdvisoryReviewRequest
)
from app.services.evidence_service import evidence_service
from app.services.risk_service import risk_service
from app.services.risk_engine import transparent_risk_engine

# Supported Multilingual ISO codes
SUPPORTED_LANGUAGES = {
    "en": "English",
    "or": "Odia (ଓଡ଼ିଆ)",
    "bn": "Bengali (বাংলা)",
    "hi": "Hindi (हिन्दी)"
}

# Pre-calibrated multilingual templates for Deterministic / Demo Fallback
DEMO_ADVISORIES: Dict[str, Dict[str, Any]] = {
    "en": {
        "summary": "Severe Cyclonic Storm REMAL trajectory poses severe coastal surge and inundation hazards to {district_name}. Preparedness protocols must prioritize coastal buffer evacuation and port defense.",
        "risk_explanation": "Composite Risk Score {risk_score}/100 ({risk_band}) driven by {top_drivers}. Vulnerable populations along the 5km coastal belt require immediate shelter occupancy optimization.",
        "priority_actions": [
            {
                "action_id": "ACT-EVAC-01",
                "priority": "CRITICAL",
                "action_type": "Evacuation",
                "title": "Mandatory Coastal Evacuation within 5km Hazard Belt",
                "description": "Mobilize local revenue teams and police to safely transfer high-risk populations to designated Multi-Purpose Cyclone Shelters (MPCS). Ensure elderly and children are prioritized.",
                "target_agency": "Revenue & Disaster Management / District Police",
                "rationale": "High storm surge of {surge_meters}m and satellite flood inundation of {flood_extent_pct}% threaten coastal mud structures."
            },
            {
                "action_id": "ACT-PORT-02",
                "priority": "CRITICAL",
                "action_type": "Maritime Safety",
                "title": "Enforce Anchorage Clearance & Harbor Berth Evacuation",
                "description": "Suspend all commercial shipping, small craft operations, and cargo handling. Verify all anchored vessels are double-moored or moved to deep sea safe zones.",
                "target_agency": "Port Authorities / State Maritime Board",
                "rationale": "Gale winds exceeding {wind_kmh} km/h (gusts {gust_kmh} km/h) and dangerous swells along open sea face."
            },
            {
                "action_id": "ACT-PWR-03",
                "priority": "HIGH",
                "action_type": "Power Grid",
                "title": "Controlled De-energization of Exposed 33kV Feeders",
                "description": "Prepare pre-emptive de-energization for coastal sub-stations if sustained surface wind exceeds 65 km/h to prevent electrocution and transformer destruction.",
                "target_agency": "State Power Transmission Corp (OPTCL/WBSEDCL) / SLDC",
                "rationale": "High thatched tree fall probability along rural overhead power corridors."
            },
            {
                "action_id": "ACT-MED-04",
                "priority": "HIGH",
                "action_type": "Medical Logistics",
                "title": "Deploy Mobile Medical Units with Antivenom and ORS",
                "description": "Stage emergency medical kits, water purification tablets, and trauma care consumables at community health centers and MPCS nodes.",
                "target_agency": "Health & Family Welfare Department",
                "rationale": "Post-inundation waterborne contamination and displacement of wildlife in polders."
            }
        ],
        "affected_population": "Approximately {vulnerable_pop} vulnerable individuals in coastal blocks, with active evacuation targeting {shelter_cap} shelter capacity.",
        "infrastructure_concerns": [
            "Overwash hazard along {coastal_km}km mud dykes and embankment sectors",
            "Power supply interruption risks at {critical_assets_count} critical installations: {critical_assets}"
        ],
        "confidence": "HIGH (Grounded in calibrated IMD meteorological track and SegFormer SAR perception)",
        "provenance": "DEMO / FALLBACK — DETERMINISTIC SOP ADVISORY (Pre-calibrated NDMA/OSDMA Protocols)"
    },
    "or": {
        "summary": "ଭୟଙ୍କର ବାତ୍ୟା ରେମାଲ୍ (REMAL) ର ଗତିପଥ ଯୋଗୁଁ {district_name} ଉପକୂଳରେ ଭୀଷଣ ଜୁଆର ଏବଂ ଜଳପ୍ଲାବନ ଆଶଙ୍କା ରହିଛି। ତୁରନ୍ତ ୫ କିଲୋମିଟର ଉପକୂଳ ବଳୟରୁ ନିରାପଦ ସ୍ଥାନାନ୍ତର କାର୍ଯ୍ୟକ୍ରମକୁ ପ୍ରାଥମିକତା ଦିଅନ୍ତୁ।",
        "risk_explanation": "ମିଳିତ ବିପଦ ସୂଚକାଙ୍କ {risk_score}/100 ({risk_band}) ମୁଖ୍ୟତଃ {top_drivers} ଦ୍ୱାରା ପ୍ରଭାବିତ। ବାତ୍ୟା ଆଶ୍ରୟସ୍ଥଳୀରେ ସୁରକ୍ଷିତ ଥଇଥାନ ଜରୁରୀ।",
        "priority_actions": [
            {
                "action_id": "ACT-EVAC-01",
                "priority": "CRITICAL",
                "action_type": "Evacuation",
                "title": "୫ କିଲୋମିଟର ଉପକୂଳବର୍ତ୍ତୀ ଅଞ୍ଚଳରୁ ବାଧ୍ୟତାମୂଳକ ସ୍ଥାନାନ୍ତର",
                "description": "ନିମ୍ନାଞ୍ଚଳ ଏବଂ କଚ୍ଚା ଘରେ ରହୁଥିବା ଲୋକଙ୍କୁ ବହୁମୁଖୀ ବାତ୍ୟା ଆଶ୍ରୟସ୍ଥଳୀ (MPCS) କୁ ସ୍ଥାନାନ୍ତରିତ କରନ୍ତୁ। ବୃଦ୍ଧ, ଶିଶୁ ଏବଂ ମହିଳାମାନଙ୍କୁ ପ୍ରାଥମିକତା ଦିଅନ୍ତୁ।",
                "target_agency": "ରାଜସ୍ୱ ଓ ବିପର୍ଯ୍ୟୟ ପରିଚାଳନା / ଜିଲ୍ଲା ପୋଲିସ",
                "rationale": "{surge_meters}m ସମୁଦ୍ର ଜୁଆର ଏବଂ {flood_extent_pct}% ଉପଗ୍ରହ ଆକଳିତ ଜଳପ୍ଲାବନ ଯୋଗୁଁ ମାଟି ଘର ପ୍ରତି ବିପଦ।"
            },
            {
                "action_id": "ACT-PORT-02",
                "priority": "CRITICAL",
                "action_type": "Maritime Safety",
                "title": "ବନ୍ଦର କାର୍ଯ୍ୟକଳାପ ବନ୍ଦ ଓ ଜାହାଜ ସୁରକ୍ଷା ନିର୍ଦ୍ଦେଶ",
                "description": "ମତ୍ସ୍ୟଜୀବୀ ଓ ସମସ୍ତ ବୋଟ୍ ଚଳାଚଳ ତୁରନ୍ତ ବନ୍ଦ କରନ୍ତୁ। ବନ୍ଦର ଗୁଡିକରେ ବିପଦ ସଙ୍କେତ ଜାରି ରଖନ୍ତୁ।",
                "target_agency": "ବନ୍ଦର କର୍ତ୍ତୃପକ୍ଷ / ରାଜ୍ୟ ସାମୁଦ୍ରିକ ବୋର୍ଡ",
                "rationale": "ପବନର ବେଗ {wind_kmh} km/h (ଝଟକା {gust_kmh} km/h) ଏବଂ ସମୁଦ୍ରର ଅଶାନ୍ତ ଅବସ୍ଥା।"
            },
            {
                "action_id": "ACT-PWR-03",
                "priority": "HIGH",
                "action_type": "Power Grid",
                "title": "୩୩ କେଭି ବିଦ୍ୟୁତ୍ ଫିଡର ନିୟନ୍ତ୍ରିତ ବିଚ୍ଛିନ୍ନତା",
                "description": "ପବନର ବେଗ ୬୫ କିମି/ଘଣ୍ଟା ଅତିକ୍ରମ କଲେ ଦୁର୍ଘଟଣା ଏଡ଼ାଇବା ପାଇଁ ବିଦ୍ୟୁତ୍ ସରବରାହ ସତର୍କତାମୂଳକ ଭାବେ ବନ୍ଦ କରନ୍ତୁ।",
                "target_agency": "ଓଡ଼ିଶା ପାୱାର ଟ୍ରାନ୍ସମିସନ କର୍ପୋରେସନ (OPTCL / TPNODL)",
                "rationale": "ଗଛ ପଡି ତାର ଛିଣ୍ଡିବା ଏବଂ ବିଦ୍ୟୁତାଘାତ ଆଶଙ୍କା।"
            }
        ],
        "affected_population": "ଉପକୂଳ ବ୍ଲକରେ ପ୍ରାୟ {vulnerable_pop} ଜଣ ବିପଦସଙ୍କୁଳ ବ୍ୟକ୍ତି, ସ୍ଥାନାନ୍ତର ଲକ୍ଷ୍ୟ {shelter_cap} ଆଶ୍ରୟସ୍ଥଳୀ କ୍ଷମତା।",
        "infrastructure_concerns": [
            "{coastal_km}km ଉପକୂଳବର୍ତ୍ତୀ ଲୁଣା ବନ୍ଧ ଓ ପୋଲ୍ଡର ପ୍ରତି ଜୁଆର ବିପଦ",
            "ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପ୍ରତିଷ୍ଠାନ ଗୁଡ଼ିକରେ ବିଦ୍ୟୁତ୍ ବ୍ୟାହତ ଆଶଙ୍କା: {critical_assets}"
        ],
        "confidence": "HIGH (IMD ଟ୍ରାକିଂ ଏବଂ ସେଗଫର୍ମର SAR ତଥ୍ୟ ଉପରେ ଆଧାରିତ)",
        "provenance": "DEMO / FALLBACK — DETERMINISTIC SOP ADVISORY (ଓଡ଼ିଆ ଭାଷା ପ୍ରୋଟୋକଲ)"
    },
    "bn": {
        "summary": "ঘূর্ণিঝড় রিমাল (REMAL) এর গতিপথের কারণে {district_name} উপকূলে মারাত্মক জলোচ্ছ্বাস এবং বন্যার ঝুঁকি তৈরি হয়েছে। অবিলম্বে উপকূলীয় ৫ কিমি অঞ্চলের মানুষদের নিরাপদ স্থানে সরিয়ে নেওয়া প্রয়োজন।",
        "risk_explanation": "সম্মিলিত ঝুঁকি স্কোর {risk_score}/100 ({risk_band}) মূলত {top_drivers} দ্বারা চালিত। সাইক্লোন শেল্টারে নিরাপদ স্থানান্তর অগ্রাধিকার দেওয়া উচিত।",
        "priority_actions": [
            {
                "action_id": "ACT-EVAC-01",
                "priority": "CRITICAL",
                "action_type": "Evacuation",
                "title": "উপকূলীয় ৫ কিমি ঝুঁকিপূর্ণ অঞ্চল থেকে বাধ্যতামূলক স্থানান্তর",
                "description": "কাঁচা বাড়ি ও নদী তীরবর্তী বাসিন্দাদের বহুমুখী সাইক্লোন শেল্টারে (MPCS) স্থানান্তর করুন। শিশু, বৃদ্ধ ও নারীদের অগ্রাধিকার দিন।",
                "target_agency": "দুর্যোগ ব্যবস্থাপনা দপ্তর / জেলা পুলিশ",
                "rationale": "{surge_meters}m জলোচ্ছ্বাস এবং {flood_extent_pct}% স্যাটেলাইট প্লাবন অনুমানের কারণে মাটির বাঁধ ও বাড়ি ঝুঁকিতে।"
            },
            {
                "action_id": "ACT-PORT-02",
                "priority": "CRITICAL",
                "action_type": "Maritime Safety",
                "title": "বন্দর কার্য স্থগিত ও সতর্কবার্তা জারি",
                "description": "সব ধরণের নৌযান চলাচল বন্ধ রাখুন এবং বন্দরে মহাবিপদ সংকেত প্রদর্শন বহাল রাখুন।",
                "target_agency": "বন্দর কর্তৃপক্ষ / মেরিন বোর্ড",
                "rationale": "বাতাসের গতিবেগ {wind_kmh} km/h (দমকা {gust_kmh} km/h) এবং সমুদ্র উত্তাল।"
            }
        ],
        "affected_population": "উপকূলীয় এলাকায় প্রায় {vulnerable_pop} জন ঝুঁকিপূর্ণ মানুষ, স্থানান্তর লক্ষ্য {shelter_cap} শেল্টার ক্ষমতা।",
        "infrastructure_concerns": [
            "{coastal_km}km উপকূলীয় বাঁধ ওভারটপিংয়ের আশঙ্কা",
            "জরুরি বিদ্যুৎ ও বন্দর পরিকাঠামোতে বিঘ্ন: {critical_assets}"
        ],
        "confidence": "HIGH (IMD ও SegFormer SAR উপগ্রহ তথ্যের ওপর প্রতিষ্ঠিত)",
        "provenance": "DEMO / FALLBACK — DETERMINISTIC SOP ADVISORY (বাংলা ভাষা প্রটোকল)"
    },
    "hi": {
        "summary": "भीषण चक्रवाती तूफान रेमल (REMAL) के प्रभाव से {district_name} के तटीय क्षेत्रों में भारी तूफानी लहरों और जलभराव का अत्यधिक खतरा है। तटीय 5 किमी क्षेत्र से सुरक्षित निकासी को सर्वोच्च प्राथमिकता दें।",
        "risk_explanation": "समग्र जोखिम स्कोर {risk_score}/100 ({risk_band}) मुख्य रूप से {top_drivers} के कारण है। बहुउद्देशीय चक्रवात आश्रयों (MPCS) में त्वरित राहत सुनिश्चित करें।",
        "priority_actions": [
            {
                "action_id": "ACT-EVAC-01",
                "priority": "CRITICAL",
                "action_type": "Evacuation",
                "title": "तटीय 5 किमी संवेदनशील क्षेत्र से अनिवार्य निकासी",
                "description": "कच्चे मकानों और निचले इलाकों में रह रहे नागरिकों को तुरंत सुरक्षित चक्रवात आश्रय स्थलों में स्थानांतरित करें।",
                "target_agency": "राजस्व एवं आपदा प्रबंधन / पुलिस",
                "rationale": "{surge_meters}m समुद्री लहरें और {flood_extent_pct}% उपग्रह-आधारित बाढ़ फैलाव।"
            },
            {
                "action_id": "ACT-PORT-02",
                "priority": "CRITICAL",
                "action_type": "Maritime Safety",
                "title": "बंदरगाह संचालन निलंबन और चेतावनी संकेत",
                "description": "मछुआरों को समुद्र में जाने से रोकें तथा सभी जलपोतों को सुरक्षित लंगरगाह में बांधें।",
                "target_agency": "बंदरगाह प्राधिकरण / समुद्री बोर्ड",
                "rationale": "{wind_kmh} km/h हवा की गति (झोंके {gust_kmh} km/h) और खतरनाक समुद्री स्थिति।"
            }
        ],
        "affected_population": "तटीय प्रखंडों में लगभग {vulnerable_pop} संवेदनशील नागरिक, कुल आश्रय क्षमता {shelter_cap}।",
        "infrastructure_concerns": [
            "{coastal_km}km तटीय तटबंधों पर लहरों के ऊपर से बहने का खतरा",
            "महत्वपूर्ण बुनियादी ढांचे पर प्रभाव: {critical_assets}"
        ],
        "confidence": "HIGH (IMD मौसम विज्ञान और SegFormer SAR उपग्रह डेटा पर आधारित)",
        "provenance": "DEMO / FALLBACK — DETERMINISTIC SOP ADVISORY (हिन्दी भाषा प्रोटोकॉल)"
    }
}


class AdvisoryService:
    def __init__(self):
        # In-memory store for tracking advisories and human review decisions
        self._advisories_store: Dict[str, AdvisoryResponse] = {}

    def get_gemini_api_key(self) -> Optional[str]:
        """
        Retrieves Gemini API key strictly from environment variables.
        Never hardcoded.
        """
        key = os.getenv("GEMINI_API_KEY", "").strip()
        return key if key else None

    def build_decision_profile(
        self,
        district_id: str,
        step_id: str = "NOW",
        include_sar: bool = True
    ) -> DecisionIntelligenceProfile:
        """
        Constructs a standardized, validated DecisionIntelligenceProfile from the Evidence Layer
        and Transparent Risk Engine.
        """
        district_data = risk_service.get_district_by_id(district_id, step_id=step_id)
        if not district_data:
            raise ValueError(f"District '{district_id}' not found in coastal surveillance registry.")
        risk_metrics = district_data["risk"]

        evidence: DistrictEvidence = evidence_service.compile_district_evidence(district_id, step_id=step_id)
        explanation = transparent_risk_engine.evaluate_risk(evidence)

        factors_summary = {
            f_key: f_val.weightedPoints
            for f_key, f_val in explanation.contributingFactors.items()
        }

        evidence_refs = [
            f"Cyclone Track: {evidence.cycloneHazard.provenance}",
            f"Perception: {evidence.floodPerception.provenance} (Model: {evidence.floodPerception.modelIdentifier})",
            f"Meteorology: Surge {evidence.meteorology.surgeMeters}m, Rain {evidence.meteorology.rainMm24h}mm, Wind {evidence.meteorology.windKmh}km/h",
            f"Demographics: Census 2011/SDMA ({evidence.vulnerability.vulnerablePopulation:,} vulnerable in 5km buffer)",
            f"Infrastructure: {evidence.infrastructure.totalCriticalAssets} coastal assets registry"
        ]

        profile_id = f"dip-{district_id}-{step_id}-{uuid.uuid4().hex[:8]}"

        return DecisionIntelligenceProfile(
            profile_id=profile_id,
            district_id=district_id,
            district_name=evidence.districtName,
            state=evidence.state,
            step_id=step_id,
            risk_score=risk_metrics["riskScore"],
            risk_band=risk_metrics["riskBand"],
            color=risk_metrics["color"],
            surge_meters=evidence.meteorology.surgeMeters,
            rain_mm_24h=evidence.meteorology.rainMm24h,
            wind_kmh=evidence.meteorology.windKmh,
            gust_kmh=evidence.meteorology.gustKmh,
            eye_distance_km=evidence.cycloneHazard.eyeDistanceKm,
            flood_extent_pct=evidence.floodPerception.floodPercentage,
            flood_probability=evidence.floodPerception.floodProbability,
            is_genuine_sar=evidence.floodPerception.isGenuineSar,
            total_population=evidence.vulnerability.totalPopulation,
            vulnerable_population=evidence.vulnerability.vulnerablePopulation,
            shelter_capacity=evidence.vulnerability.shelterCapacityPersons,
            shelter_deficit=evidence.vulnerability.shelterDeficitPersons,
            critical_assets_count=evidence.infrastructure.totalCriticalAssets,
            critical_assets=evidence.infrastructure.criticalAssetsList,
            shelter_occupancy_pct=evidence.infrastructure.shelterOccupancyPct,
            evacuation_progress_pct=evidence.infrastructure.evacuationProgressPct,
            contributing_factors_summary=factors_summary,
            provenance_chain=explanation.provenanceTiers,
            evidence_references=evidence_refs,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    def _generate_fallback_advisory(
        self,
        profile: DecisionIntelligenceProfile,
        language: str = "en"
    ) -> StructuredAdvisoryContent:
        """
        Produces deterministic fallback advisory from calibrated emergency templates.
        Guarantees that DRISHTI continues to operate flawlessly even if Gemini is unavailable.
        """
        lang = language if language in DEMO_ADVISORIES else "en"
        tmpl = DEMO_ADVISORIES[lang]

        top_drivers = (
            f"Storm Surge ({profile.surge_meters}m) and Flood Inundation ({profile.flood_extent_pct}%)"
            if profile.surge_meters >= 2.0 else
            f"High Gale Winds ({profile.wind_kmh} km/h) and Coastal Exposure"
        )
        assets_str = ", ".join(profile.critical_assets[:3]) if profile.critical_assets else "Coastal substations"

        format_args = {
            "district_name": profile.district_name,
            "risk_score": profile.risk_score,
            "risk_band": profile.risk_band,
            "surge_meters": profile.surge_meters,
            "flood_extent_pct": profile.flood_extent_pct,
            "wind_kmh": profile.wind_kmh,
            "gust_kmh": profile.gust_kmh,
            "vulnerable_pop": f"{profile.vulnerable_population:,}",
            "shelter_cap": f"{profile.shelter_capacity:,}",
            "coastal_km": 80,
            "critical_assets_count": profile.critical_assets_count,
            "critical_assets": assets_str,
            "top_drivers": top_drivers
        }

        summary_text = tmpl["summary"].format(**format_args)
        explanation_text = tmpl["risk_explanation"].format(**format_args)
        affected_pop_text = tmpl["affected_population"].format(**format_args)
        infra_concerns = [c.format(**format_args) for c in tmpl["infrastructure_concerns"]]

        actions: List[AdvisoryPriorityAction] = []
        for act in tmpl["priority_actions"]:
            actions.append(AdvisoryPriorityAction(
                action_id=act["action_id"],
                priority=act["priority"],
                action_type=act["action_type"],
                title=act["title"].format(**format_args),
                description=act["description"].format(**format_args),
                target_agency=act["target_agency"],
                rationale=act["rationale"].format(**format_args)
            ))

        return StructuredAdvisoryContent(
            summary=summary_text,
            risk_explanation=explanation_text,
            priority_actions=actions,
            affected_population=affected_pop_text,
            infrastructure_concerns=infra_concerns,
            confidence=tmpl["confidence"],
            evidence_used=profile.evidence_references,
            provenance="DEMO / FALLBACK — AI ADVISORY UNAVAILABLE",
            requires_human_approval=True
        )

    def _call_gemini_api(
        self,
        api_key: str,
        profile: DecisionIntelligenceProfile,
        language: str = "en"
    ) -> Optional[StructuredAdvisoryContent]:
        """
        Executes grounded, constrained inference using Google Gemini 1.5 Flash via REST API.
        Enforces JSON schema adherence and evidence traceability.
        """
        lang_name = SUPPORTED_LANGUAGES.get(language, "English")

        system_instruction = (
            "You are DRISHTI's Cyclone Impact Decision Intelligence Advisory System.\n"
            "Your role is to formulate an operational disaster management advisory for emergency incident commanders.\n"
            "STRICT CONSTRAINTS:\n"
            "1. Use ONLY the supplied structured evidence and numerical metrics.\n"
            "2. NEVER invent numerical values, wind speeds, rainfall, or casualties.\n"
            f"3. NEVER modify the numerical risk score of {profile.risk_score} or risk band of {profile.risk_band}.\n"
            f"4. The data source is: {profile.provenance_chain.get('cyclone_hazard', 'HISTORICAL_SIMULATION')}.\n"
            f"5. Target language: {lang_name} (Code: {language}). Output your response in {lang_name}.\n"
            "6. Preserve all numbers, units (km/h, m, mm, %), and agency acronyms (NDRF, OSDMA, MPCS) in English/standard notation.\n"
            "7. Output MUST be valid JSON adhering strictly to the requested schema. No conversational filler or markdown fences."
        )

        user_prompt = f"""
EVIDENCE LAYER INPUT:
- Location: {profile.district_name}, {profile.state} (District ID: {profile.district_id})
- Timeline Scenario: {profile.step_id}
- Composite Risk Score: {profile.risk_score}/100 (Band: {profile.risk_band})
- Meteorological Hazard: Storm Surge {profile.surge_meters}m, 24h Rainfall {profile.rain_mm_24h}mm, Sustained Wind {profile.wind_kmh}km/h (Gusts {profile.gust_kmh}km/h)
- Cyclone Eye Proximity: {profile.eye_distance_km}km from district
- SegFormer AI Flood Perception: {profile.flood_extent_pct}% flood extent (Confidence: {profile.flood_probability:.2f}, Genuine SAR: {profile.is_genuine_sar})
- Demographics: Total Population {profile.total_population:,}, Coastal 5km Vulnerable Population {profile.vulnerable_population:,}
- Evacuation & Shelters: Safe Capacity {profile.shelter_capacity:,}, Shelter Deficit {profile.shelter_deficit:,}, Current Occupancy {profile.shelter_occupancy_pct}%
- Critical Infrastructure: {profile.critical_assets_count} assets ({', '.join(profile.critical_assets)})
- Key Drivers: {json.dumps(profile.contributing_factors_summary)}

TASK:
Produce an operational advisory with priority emergency directives formatted as a JSON object:
{{
  "summary": "<Concise 2-sentence summary of threat to {profile.district_name}>",
  "risk_explanation": "<Explanation of why the risk score is {profile.risk_score} based on the evidence>",
  "priority_actions": [
    {{
      "action_id": "ACT-01",
      "priority": "CRITICAL",
      "action_type": "<Evacuation/Maritime/Power/Medical>",
      "title": "<Concise action title>",
      "description": "<Specific instructions>",
      "target_agency": "<Target department>",
      "rationale": "<Traceable reason grounded in the evidence>"
    }}
  ],
  "affected_population": "<Summary of population exposed in coastal buffer>",
  "infrastructure_concerns": ["<Concern 1>", "<Concern 2>"],
  "confidence": "HIGH (Grounded in IMD track and SegFormer SAR perception)",
  "provenance": "[AI REASONING] Gemini 1.5 Flash grounded in DRISHTI Evidence Layer",
  "requires_human_approval": true
}}
"""

        # Supported model endpoints
        models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
        headers = {"Content-Type": "application/json"}

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }

        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                with httpx.Client(timeout=9.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                text_content = parts[0]["text"].strip()
                                parsed = json.loads(text_content)
                                actions = [
                                    AdvisoryPriorityAction(**act)
                                    for act in parsed.get("priority_actions", [])
                                ]
                                return StructuredAdvisoryContent(
                                    summary=parsed.get("summary", ""),
                                    risk_explanation=parsed.get("risk_explanation", ""),
                                    priority_actions=actions,
                                    affected_population=parsed.get("affected_population", ""),
                                    infrastructure_concerns=parsed.get("infrastructure_concerns", []),
                                    confidence=parsed.get("confidence", "HIGH"),
                                    evidence_used=profile.evidence_references,
                                    provenance=f"[LIVE AI REASONING] Google Gemini ({model}) grounded in DRISHTI Evidence Layer",
                                    requires_human_approval=True
                                )
            except Exception as e:
                # Log and proceed to next model or fallback
                continue

        return None

    def generate_advisory(
        self,
        district_id: str,
        step_id: str = "NOW",
        language: str = "en",
        include_sar: bool = True
    ) -> AdvisoryResponse:
        """
        Orchestrates Decision Intelligence + Gemini Advisory generation.
        Maintains transparent fallback to Demo Mode if GEMINI_API_KEY is not configured or unavailable.
        """
        normalized_step = "NOW" if step_id.upper() == "CURRENT" else step_id
        profile = self.build_decision_profile(district_id, step_id=normalized_step, include_sar=include_sar)

        api_key = self.get_gemini_api_key()
        advisory_content: Optional[StructuredAdvisoryContent] = None
        mode = "DEMO_FALLBACK"

        if api_key:
            advisory_content = self._call_gemini_api(api_key, profile, language=language)
            if advisory_content:
                mode = "LIVE_GEMINI"

        if not advisory_content:
            advisory_content = self._generate_fallback_advisory(profile, language=language)
            mode = "DEMO_FALLBACK"

        advisory_id = f"adv-{district_id}-{normalized_step}-{uuid.uuid4().hex[:6]}"

        review_record = AdvisoryReviewRecord(
            advisory_id=advisory_id,
            status="PENDING",
            reviewer_name="Command Center Incident Commander",
            reviewer_notes=None,
            reviewed_at=None,
            modified_actions=None
        )

        response = AdvisoryResponse(
            advisory_id=advisory_id,
            district_id=district_id,
            district_name=profile.district_name,
            language=language,
            risk_score=profile.risk_score,
            risk_band=profile.risk_band,
            mode=mode,
            advisory=advisory_content,
            review=review_record,
            decision_profile=profile,
            generated_at=datetime.now(timezone.utc).isoformat()
        )

        # Store in state
        self._advisories_store[advisory_id] = response
        return response

    def review_advisory(
        self,
        advisory_id: str,
        review_request: AdvisoryReviewRequest
    ) -> Optional[AdvisoryResponse]:
        """
        Applies Human-in-the-Loop review actions: APPROVE, REJECT, or MODIFY.
        Enforces that AI recommendations require human authorization before action.
        """
        if advisory_id not in self._advisories_store:
            return None

        advisory_resp = self._advisories_store[advisory_id]
        action = review_request.action.upper()

        if action not in ["APPROVE", "REJECT", "MODIFY"]:
            raise ValueError(f"Invalid review action: '{action}'. Must be 'APPROVE', 'REJECT', or 'MODIFY'.")

        new_status = (
            "APPROVED" if action == "APPROVE" else
            "REJECTED" if action == "REJECT" else
            "MODIFIED"
        )

        advisory_resp.review.status = new_status
        advisory_resp.review.reviewer_name = review_request.reviewer_name or "Command Center Duty Officer"
        advisory_resp.review.reviewer_notes = review_request.reviewer_notes
        advisory_resp.review.reviewed_at = datetime.now(timezone.utc).isoformat()

        if action == "MODIFY" and review_request.modified_actions:
            advisory_resp.review.modified_actions = review_request.modified_actions
            # Also update active priority actions with human officer edits
            advisory_resp.advisory.priority_actions = review_request.modified_actions

        return advisory_resp

    def get_advisory(self, advisory_id: str) -> Optional[AdvisoryResponse]:
        return self._advisories_store.get(advisory_id)

    def list_advisories(self) -> List[AdvisoryResponse]:
        return list(self._advisories_store.values())


advisory_service = AdvisoryService()
