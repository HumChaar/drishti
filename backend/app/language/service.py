"""
DRISHTI Gemini Translation Service
Single, unified translation module talking exclusively to Google Gemini REST API.
Enforces strict preservation of template tokens, disaster safety terminology,
and deterministic ID-based batching.
"""

import os
import json
import logging
from typing import List, Dict, Optional, Any, Tuple
import httpx

from app.core.config import settings
from app.language.contract import (
    SUPPORTED_LANGUAGES,
    is_supported_language,
    get_language
)
from app.language.cache import translation_cache

logger = logging.getLogger("drishti.language.service")

# High-precision emergency translation system prompt
SYSTEM_TRANSLATION_INSTRUCTION = """You are the official disaster-risk translation engine for the DRISHTI Coastal Emergency Management System.
Your job is to translate disaster alerts, meteorological indicators, and operational directives into the requested target Indian language.

Target languages supported:
- Odia (or)
- Bengali (bn)
- Hindi (hi)
- Telugu (te)

CRITICAL INVARIANTS:
1. PRESERVE PLACEHOLDERS: Any template token inside curly braces (e.g. {district}, {district_name}, {risk_score}, {risk_band}, {surge_meters}, {vulnerable_pop}, {shelter_cap}, {wind_kmh}, {gust_kmh}, {flood_extent_pct}) MUST BE PRESERVED EXACTLY AS IS, with no spaces added inside the braces and no translation of the variable name.
2. PRESERVE NUMBERS & UNITS: Keep numerical values, units (km/h, m, mm, km, %, knots, hPa), and technical metrics in standard notation.
3. PRESERVE ACRONYMS: Agency names and operational acronyms (IMD, NDRF, SDRF, OSDMA, WBSEDCL, OPTCL, DEOC, MPCS, SAR, GIS) must remain in Latin letters or standard national abbreviations.
4. ACCURACY OVER CREATIVITY: This is life-safety information. Use clear, authoritative, formal terminology suitable for government disaster advisories.
5. STRICT FORMATTING: Always return valid JSON adhering strictly to the requested schema. No explanations, no markdown fences, no conversational filler.
"""

# Fallback dictionary for common system terms when offline/mock
CALIBRATED_FALLBACK_TERMS: Dict[str, Dict[str, str]] = {
    "or": {
        "COMMAND CENTRE": "କମାଣ୍ଡ ସେଣ୍ଟର",
        "WEATHER": "ପାଣିପାଗ",
        "HAZARDS": "ବିପଦ",
        "STATE MONITOR": "ରାଜ୍ୟ ନିରୀକ୍ଷଣ",
        "SATELLITE": "ଉପଗ୍ରହ",
        "RADAR": "ରାଡାର",
        "OBSERVATIONS": "ପର୍ଯ୍ୟବେକ୍ଷଣ",
        "SCENARIOS": "ସିନାରିଓ",
        "ADVISORIES": "ପରାମର୍ଶ",
        "ADVISORY": "ପରାମର୍ଶ",
        "SITUATION": "ପରିସ୍ଥିତି",
        "TRACK": "ଗତିପଥ",
        "WIND": "ପବନ",
        "RAIN": "ବର୍ଷା",
        "RISK": "ବିପଦ ସୂଚକାଙ୍କ",
        "INFRASTRUCTURE": "ଭିତ୍ତିଭୂମି",
        "INFRA": "ଭିତ୍ତିଭୂମି",
        "EVIDENCE": "ପ୍ରମାଣ",
        "OPERATIONS": "ଅପରେସନ୍",
        "Extreme": "ଅତ୍ୟନ୍ତ ଗୁରୁତର",
        "High": "ଉଚ୍ଚ",
        "Moderate": "ମଧ୍ୟମ",
        "Low": "ନିମ୍ନ",
        "Active": "ସକ୍ରିୟ",
        "Operational": "କାର୍ଯ୍ୟକ୍ଷମ",
        "Approved": "ଅନୁମୋଦିତ",
        "Pending Review": "ସମୀକ୍ଷା ବାକି",
        "Evacuation": "ସ୍ଥାନାନ୍ତରଣ",
        "Coastal Surveillance": "ଉପକୂଳବର୍ତ୍ତୀ ନିରୀକ୍ଷଣ",
        "NORMAL OPERATIONS": "ସାଧାରଣ କାର୍ଯ୍ୟକଳାପ",
        "⚠ CYCLONE / DISASTER RESPONSE": "⚠ ବାତ୍ୟା / ବିପର୍ଯ୍ୟୟ ପ୍ରତିକ୍ରିୟା",
        "GOVERNMENT OF INDIA": "ଭାରତ ସରକାର",
        "MINISTRY OF EARTH SCIENCES (MoES)": "ପୃଥିବୀ ବିଜ୍ଞାନ ମନ୍ତ୍ରଣାଳୟ (MoES)",
        "INDIA METEOROLOGICAL DEPARTMENT (IMD)": "ଭାରତ ପାଣିପାଗ ବିଭାଗ (IMD)",
        "NATIONAL MONITORING • ALL INDIA • ROUTINE SURVEILLANCE": "ଜାତୀୟ ନିରୀକ୍ଷଣ • ସମଗ୍ର ଭାରତ • ନିୟମିତ ସର୍ଭେଲାନ୍ସ",
        "RESEARCH / DECISION-SUPPORT PROTOTYPE": "ଗବେଷଣା / ନିଷ୍ପତ୍ତି-ସହାୟତା ପ୍ରୋଟୋଟାଇପ୍",
        "Disaster Risk Intelligence & Spatial Threat Insights": "ବିପର୍ଯ୍ୟୟ ବିପଦ ଗୁଇନ୍ଦା ଏବଂ ସ୍ଥାନିକ ବିପଦ ଅନ୍ତର୍ଦୃଷ୍ଟି",
        "National Multi-Hazard Decision Support System • MoES & IMD Standards": "ଜାତୀୟ ବହୁ-ବିପଦ ନିଷ୍ପତ୍ତି ସହାୟତା ପ୍ରଣାଳୀ • MoES ଏବଂ IMD ମାନକ",
        "Govt. of India": "ଭାରତ ସରକାର",
        "API ONLINE": "API ସକ୍ରିୟ",
        "DEMO": "ଡେମୋ",
        "REGION:": "ଅଞ୍ଚଳ:",
        "ALL INDIA (36 States & UTs)": "ସମଗ୍ର ଭାରତ (୩୬ ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ)",
        "CONNECTED": "ସଂଯୁକ୍ତ",
        "DATA N/A": "ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ",
        "MET SERVICES": "ପାଣିପାଗ ସେବା",
        "COMMAND RAIL": "କମାଣ୍ଡ ରେଲ୍",
        "WARNINGS": "ଚେତାବନୀ",
        "NOWCAST": "ତତ୍କାଳ ପୂର୍ବାନୁମାନ",
        "BULLETINS": "ବୁଲେଟିନ୍",
        "RAINFALL": "ବର୍ଷା",
        "CYCLONE": "ବାତ୍ୟା",
        "ON": "ଚାଲୁ",
        "OFF": "ବନ୍ଦ",
        "IMD • MOSDAC": "IMD • MOSDAC",
        "NATIONAL SYNOPTIC DOSSIER": "ଜାତୀୟ ସିନପ୍ଟିକ୍ ଡସିଅର୍",
        "TACTICAL RESPONSE DOSSIER": "ରଣନୈତିକ ପ୍ରତିକ୍ରିୟା ଡସିଅର୍",
        "ACTIVE SYNOPTIC SYSTEM": "ସକ୍ରିୟ ସିନପ୍ଟିକ୍ ପ୍ରଣାଳୀ",
        "IMD SYSTEM FEED: SOURCE UNAVAILABLE": "IMD ସିଷ୍ଟମ୍ ଫିଡ୍: ଉତ୍ସ ଅନୁପଲବ୍ଧ",
        "COORDINATES": "ସ୍ଥାନାଙ୍କ",
        "OBSERVATION": "ପର୍ଯ୍ୟବେକ୍ଷଣ",
        "NOT VERIFIED": "ଯାଞ୍ଚ ହୋଇନାହିଁ",
        "Direct browser connection to IMD National Synoptic Bulletin is restricted by CORS. Live system observation and coordinates cannot be verified client-side without an authoritative proxy.": "IMD ଜାତୀୟ ସିନୋପ୍ଟିକ ବୁଲେଟିନକୁ ପ୍ରତ୍ୟକ୍ଷ ବ୍ରାଉଜର ସଂଯୋଗ CORS ଦ୍ୱାରା ପ୍ରତିବନ୍ଧିତ। କର୍ତ୍ତୃପକ୍ଷ ପ୍ରକ୍ସି ବିନା କ୍ଲାଏଣ୍ଟ ପାର୍ଶ୍ୱରେ ସିଷ୍ଟମ ପର୍ଯ୍ୟବେକ୍ଷଣ ଯାଞ୍ଚ ହୋଇପାରିବ ନାହିଁ।",
        "DRISHTI CHECKED:": "ଦୃଷ୍ଟି ଯାଞ୍ଚ କରାଯାଇଛି:",
        "OPEN IMD BULLETIN": "IMD ବୁଲେଟିନ୍ ଖୋଲନ୍ତୁ",
        "TERRITORIAL SECTOR": "ଆଞ୍ଚଳିକ ସେକ୍ଟର",
        "PAN-INDIA OVERVIEW (36 STATES & UTs)": "ସମଗ୍ର ଭାରତୀୟ ସମୀକ୍ଷା (୩୬ ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ)",
        "Click any state or UT on the map to inspect regional meteorology": "ଆଞ୍ଚଳିକ ପାଣିପାଗ ନିରୀକ୍ଷଣ କରିବାକୁ ମାନଚିତ୍ରରେ ଯେକୌଣସି ରାଜ୍ୟ କିମ୍ବା କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ",
        "SURFACE WIND": "ଭୂପୃଷ୍ଠ ପବନ",
        "10m Model Vectors": "୧୦ମି ମଡେଲ ଭେକ୍ଟର୍ସ",
        "PRECIPITATION": "ବୃଷ୍ଟିପାତ",
        "24h Accumulated NWP": "୨୪ଘଣ୍ଟା ସଞ୍ଚିତ NWP",
        "SURFACE PRESSURE": "ଭୂପୃଷ୍ଠ ବାୟୁଚାପ",
        "Surface Barometric": "ଭୂପୃଷ୍ଠ ବାରୋମେଟ୍ରିକ୍",
        "DATA UNAVAILABLE": "ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ",
        "AIR TEMPERATURE": "ବାୟୁ ତାପମାତ୍ରା",
        "CENTRAL PRESSURE": "କେନ୍ଦ୍ରୀୟ ବାୟୁଚାପ",
        "MAX SUSTAINED WIND": "ସର୍ବାଧିକ କ୍ରମାଗତ ପବନ",
        "MOVEMENT": "ଗତିବିଧି",
        "SOURCE: OPEN-METEO (MODEL)": "ଉତ୍ସ: OPEN-METEO (ମଡେଲ)",
        "CHECKED:": "ଯାଞ୍ଚ କରାଯାଇଛି:",
        "CALIBRATED BENCHMARK": "କାଲିବ୍ରେଟେଡ୍ ମାନଦଣ୍ଡ",
        "VIEW CYCLONE SIMULATION": "ବାତ୍ୟା ସିମୁଲେସନ୍ ଦେଖନ୍ତୁ",
        "PAN-INDIA SURVEILLANCE": "ସମଗ୍ର ଭାରତ ନିରୀକ୍ଷଣ",
        "ALL 36 STATES & UTs MONITORED • LIVE WEATHER: OPEN-METEO (MODEL) • BULLETINS: DEMO / SIMULATED": "ସମସ୍ତ ୩୬ ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ ନିରୀକ୍ଷିତ • ପ୍ରତ୍ୟକ୍ଷ ପାଣିପାଗ: OPEN-METEO (ମଡେଲ) • ବୁଲେଟିନ୍: ସିମୁଲେଟେଡ୍",
        "UPDATED:": "ଅପଡେଟ୍ ହୋଇଛି:",
        "NEXT:": "ପରବର୍ତ୍ତୀ:"
    },
    "bn": {
        "COMMAND CENTRE": "কমান্ড সেন্টার",
        "WEATHER": "আবহাওয়া",
        "HAZARDS": "বিপদ",
        "STATE MONITOR": "রাজ্য পর্যবেক্ষণ",
        "SATELLITE": "উপগ্রহ",
        "RADAR": "রাডার",
        "OBSERVATIONS": "পর্যবেক্ষণ",
        "SCENARIOS": "পরিস্থিতি",
        "ADVISORIES": "পরামর্শ",
        "ADVISORY": "পরামর্শ",
        "SITUATION": "পরিস্থিতি",
        "TRACK": "গতিপথ",
        "WIND": "বাতাস",
        "RAIN": "বৃষ্টি",
        "RISK": "ঝুঁকি সূচক",
        "INFRASTRUCTURE": "পরিকাঠামো",
        "INFRA": "পরিকাঠামো",
        "EVIDENCE": "প্রমাণ",
        "OPERATIONS": "অপারেশন",
        "Extreme": "চরম",
        "High": "উচ্চ",
        "Moderate": "মাঝারি",
        "Low": "নিম্ন",
        "Active": "সক্রিয়",
        "Operational": "কার্যক্ষম",
        "Approved": "অনুমোদিত",
        "Pending Review": "পর্যালোচনা বাকি",
        "Evacuation": "স্থানান্তর",
        "Coastal Surveillance": "উপকূলীয় নজরদারি",
        "NORMAL OPERATIONS": "স্বাভাবিক কার্যক্রম",
        "⚠ CYCLONE / DISASTER RESPONSE": "⚠ ঘূর্ণিঝড় / বিপর্যয় প্রতিক্রিয়া",
        "GOVERNMENT OF INDIA": "ভারত সরকার",
        "MINISTRY OF EARTH SCIENCES (MoES)": "ভূবিজ্ঞান মন্ত্রক (MoES)",
        "INDIA METEOROLOGICAL DEPARTMENT (IMD)": "ভারতীয় আবহাওয়া দপ্তর (IMD)",
        "NATIONAL MONITORING • ALL INDIA • ROUTINE SURVEILLANCE": "জাতীয় পর্যবেক্ষণ • সমগ্র ভারত • নিয়মিত নজরদারি",
        "RESEARCH / DECISION-SUPPORT PROTOTYPE": "গবেষণা / সিদ্ধান্ত-সহায়তা প্রোটোটাইপ",
        "Disaster Risk Intelligence & Spatial Threat Insights": "দুর্যোগ ঝুঁকি গোয়েন্দা ও স্থানিক হুমকি অন্তর্দৃষ্টি",
        "National Multi-Hazard Decision Support System • MoES & IMD Standards": "জাতীয় বহু-বিপদ সিদ্ধান্ত সহায়তা ব্যবস্থা • MoES এবং IMD মানক",
        "Govt. of India": "ভারত সরকার",
        "API ONLINE": "API অনলাইন",
        "DEMO": "ডেমো",
        "REGION:": "অঞ্চল:",
        "ALL INDIA (36 States & UTs)": "সমগ্র ভারত (৩৬টি রাজ্য ও কেন্দ্রশাসিত অঞ্চল)",
        "CONNECTED": "সংযুক্ত",
        "DATA N/A": "তথ্য উপলব্ধ নয়",
        "MET SERVICES": "আবহাওয়া পরিষেবা",
        "COMMAND RAIL": "কমান্ড রেল",
        "WARNINGS": "সতর্কতা",
        "NOWCAST": "তাৎক্ষণিক পূর্বাভাস",
        "BULLETINS": "বুলেটিন",
        "RAINFALL": "বৃষ্টিপাত",
        "CYCLONE": "ঘূর্ণিঝড়",
        "ON": "চালু",
        "OFF": "বন্ধ",
        "IMD • MOSDAC": "IMD • MOSDAC",
        "NATIONAL SYNOPTIC DOSSIER": "জাতীয় সিনপটিক ডসিয়ার",
        "TACTICAL RESPONSE DOSSIER": "কৌশলগত প্রতিক্রিয়া ডসিয়ার",
        "ACTIVE SYNOPTIC SYSTEM": "সক্রিয় সিনপটিক সিস্টেম",
        "IMD SYSTEM FEED: SOURCE UNAVAILABLE": "IMD সিস্টেম ফিড: উৎস অনুপলব্ধ",
        "COORDINATES": "স্থানাঙ্ক",
        "OBSERVATION": "পর্যবেক্ষণ",
        "NOT VERIFIED": "যাচাই করা হয়নি",
        "Direct browser connection to IMD National Synoptic Bulletin is restricted by CORS. Live system observation and coordinates cannot be verified client-side without an authoritative proxy.": "IMD জাতীয় সিনপটিক বুলেটিনের সাথে সরাসরি ব্রাউজার সংযোগ CORS দ্বারা সীমাবদ্ধ। প্রক্সি ছাড়া ক্লায়েন্ট-সাইডে স্থানাঙ্ক যাচাই করা যাবে না।",
        "DRISHTI CHECKED:": "দৃষ্টি পরীক্ষিত:",
        "OPEN IMD BULLETIN": "IMD বুলেটিন খুলুন",
        "TERRITORIAL SECTOR": "আঞ্চলিক ক্ষেত্র",
        "PAN-INDIA OVERVIEW (36 STATES & UTs)": "সর্বভারতীয় পর্যালোচনা (৩৬টি রাজ্য ও কেন্দ্রশাসিত অঞ্চল)",
        "Click any state or UT on the map to inspect regional meteorology": "আঞ্চলিক আবহাওয়া পরীক্ষা করতে মানচিত্রে যেকোনো রাজ্য বা কেন্দ্রশাসিত অঞ্চলে ক্লিক করুন",
        "SURFACE WIND": "পৃষ্ঠীয় বাতাস",
        "10m Model Vectors": "১০মি মডেল ভেক্টর",
        "PRECIPITATION": "বৃষ্টিপাত",
        "24h Accumulated NWP": "২৪ঘণ্টা পুঞ্জীভূত NWP",
        "SURFACE PRESSURE": "পৃষ্ঠীয় বায়ুর চাপ",
        "Surface Barometric": "পৃষ্ঠীয় ব্যারোমেট্রিক",
        "DATA UNAVAILABLE": "তথ্য উপলব্ধ নয়",
        "AIR TEMPERATURE": "বাতাসের তাপমাত্রা",
        "CENTRAL PRESSURE": "কেন্দ্রীয় বায়ুর চাপ",
        "MAX SUSTAINED WIND": "সর্বোচ্চ স্থায়ী বাতাস",
        "MOVEMENT": "গতিবিধি",
        "SOURCE: OPEN-METEO (MODEL)": "উৎস: OPEN-METEO (মডেল)",
        "CHECKED:": "পরীক্ষিত:",
        "CALIBRATED BENCHMARK": "ক্যালিব্রেটেড মানদণ্ড",
        "VIEW CYCLONE SIMULATION": "ঘূর্ণিঝড় সিমুলেশন দেখুন",
        "PAN-INDIA SURVEILLANCE": "সর্বভারতীয় নজরদারি",
        "ALL 36 STATES & UTs MONITORED • LIVE WEATHER: OPEN-METEO (MODEL) • BULLETINS: DEMO / SIMULATED": "সমস্ত ৩৬টি রাজ্য ও কেন্দ্রশাসিত অঞ্চল নিরীক্ষিত • লাইভ আবহাওয়া: OPEN-METEO (মডেল) • বুলেটিন: সিমুলেটেড",
        "UPDATED:": "আপডেট করা হয়েছে:",
        "NEXT:": "পরবর্তী:"
    },
    "hi": {
        "COMMAND CENTRE": "कमांड सेंटर",
        "WEATHER": "मौसम",
        "HAZARDS": "खतरे",
        "STATE MONITOR": "राज्य निगरानी",
        "SATELLITE": "उपग्रह",
        "RADAR": "रडार",
        "OBSERVATIONS": "अवलोकन",
        "SCENARIOS": "परिदृश्य",
        "ADVISORIES": "परामर्श",
        "ADVISORY": "परामर्श",
        "SITUATION": "स्थिति",
        "TRACK": "मार्ग",
        "WIND": "हवा",
        "RAIN": "वर्षा",
        "RISK": "जोखिम सूचकांक",
        "INFRASTRUCTURE": "बुनियादी ढांचा",
        "INFRA": "बुनियादी ढांचा",
        "EVIDENCE": "साक्ष्य",
        "OPERATIONS": "अभियान",
        "Extreme": "अत्यधिक",
        "High": "उच्च",
        "Moderate": "मध्यम",
        "Low": "निम्न",
        "Active": "सक्रिय",
        "Operational": "सक्रिय",
        "Approved": "स्वीकृत",
        "Pending Review": "समीक्षा लंबित",
        "Evacuation": "निकासी",
        "Coastal Surveillance": "तटीय निगरानी",
        "NORMAL OPERATIONS": "सामान्य परिचालन",
        "⚠ CYCLONE / DISASTER RESPONSE": "⚠ चक्रवात / आपदा प्रतिक्रिया",
        "GOVERNMENT OF INDIA": "भारत सरकार",
        "MINISTRY OF EARTH SCIENCES (MoES)": "पृथ्वी विज्ञान मंत्रालय (MoES)",
        "INDIA METEOROLOGICAL DEPARTMENT (IMD)": "भारत मौसम विज्ञान विभाग (IMD)",
        "NATIONAL MONITORING • ALL INDIA • ROUTINE SURVEILLANCE": "राष्ट्रीय निगरानी • अखिल भारतीय • नियमित निगरानी",
        "RESEARCH / DECISION-SUPPORT PROTOTYPE": "अनुसंधान / निर्णय-समर्थन प्रोटोटाइप",
        "Disaster Risk Intelligence & Spatial Threat Insights": "आपदा जोखिम बुद्धिमत्ता और स्थानिक खतरा अंतर्दृष्टि",
        "National Multi-Hazard Decision Support System • MoES & IMD Standards": "राष्ट्रीय बहु-आपदा निर्णय सहायता प्रणाली • MoES एवं IMD मानक",
        "Govt. of India": "भारत सरकार",
        "API ONLINE": "API ऑनलाइन",
        "DEMO": "डेमो",
        "REGION:": "क्षेत्र:",
        "ALL INDIA (36 States & UTs)": "संपूर्ण भारत (36 राज्य और केंद्रशासित प्रदेश)",
        "CONNECTED": "संबद्ध",
        "DATA N/A": "डेटा उपलब्ध नहीं",
        "MET SERVICES": "मौसम सेवाएं",
        "COMMAND RAIL": "कमांड रेल",
        "WARNINGS": "चेतावनियां",
        "NOWCAST": "तात्कालिक पूर्वानुमान",
        "BULLETINS": "बुलेटिन",
        "RAINFALL": "वर्षा",
        "CYCLONE": "चक्रवात",
        "ON": "चालू",
        "OFF": "बंद",
        "IMD • MOSDAC": "IMD • MOSDAC",
        "NATIONAL SYNOPTIC DOSSIER": "राष्ट्रीय सिनॉप्टिक डोजियर",
        "TACTICAL RESPONSE DOSSIER": "रणनीतिक प्रतिक्रिया डोजियर",
        "ACTIVE SYNOPTIC SYSTEM": "सक्रिय सिनॉप्टिक प्रणाली",
        "IMD SYSTEM FEED: SOURCE UNAVAILABLE": "IMD सिस्टम फीड: स्रोत अनुपलब्ध",
        "COORDINATES": "निर्देशांक",
        "OBSERVATION": "अवलोकन",
        "NOT VERIFIED": "सत्यापित नहीं",
        "Direct browser connection to IMD National Synoptic Bulletin is restricted by CORS. Live system observation and coordinates cannot be verified client-side without an authoritative proxy.": "IMD राष्ट्रीय सिनॉप्टिक बुलेटिन का सीधा ब्राउज़र कनेक्शन CORS द्वारा प्रतिबंधित है। आधिकारिक प्रॉक्सी के बिना सिस्टम अवलोकन को सत्यापित नहीं किया जा सकता।",
        "DRISHTI CHECKED:": "दृष्टि द्वारा जाँचा गया:",
        "OPEN IMD BULLETIN": "IMD बुलेटिन खोलें",
        "TERRITORIAL SECTOR": "प्रादेशिक क्षेत्र",
        "PAN-INDIA OVERVIEW (36 STATES & UTs)": "अखिल भारतीय समीक्षा (36 राज्य और केंद्रशासित प्रदेश)",
        "Click any state or UT on the map to inspect regional meteorology": "क्षेत्रीय मौसम विज्ञान का निरीक्षण करने के लिए मानचित्र पर किसी भी राज्य या केंद्र शासित प्रदेश पर क्लिक करें",
        "SURFACE WIND": "सतही हवा",
        "10m Model Vectors": "10मी मॉडल वेक्टर्स",
        "PRECIPITATION": "वर्षा",
        "24h Accumulated NWP": "24 घंटे संचित NWP",
        "SURFACE PRESSURE": "सतही वायुदाब",
        "Surface Barometric": "सतही बैरोमीटर",
        "DATA UNAVAILABLE": "डेटा उपलब्ध नहीं है",
        "AIR TEMPERATURE": "वायु का तापमान",
        "CENTRAL PRESSURE": "केंद्रीय वायुदाब",
        "MAX SUSTAINED WIND": "अधिकतम निरंतर हवा",
        "MOVEMENT": "गतिविधि",
        "SOURCE: OPEN-METEO (MODEL)": "स्रोत: OPEN-METEO (मॉडल)",
        "CHECKED:": "जाँचा गया:",
        "CALIBRATED BENCHMARK": "कैलिब्रेटेड बेंचमार्क",
        "VIEW CYCLONE SIMULATION": "चक्रवात सिमुलेशन देखें",
        "PAN-INDIA SURVEILLANCE": "अखिल भारतीय निगरानी",
        "ALL 36 STATES & UTs MONITORED • LIVE WEATHER: OPEN-METEO (MODEL) • BULLETINS: DEMO / SIMULATED": "सभी 36 राज्य और केंद्रशासित प्रदेश निगरानी में • सजीव मौसम: OPEN-METEO (मॉडल) • बुलेटिन: सिमुलेटेड",
        "UPDATED:": "अद्यतन:",
        "NEXT:": "अगला:"
    },
    "te": {
        "COMMAND CENTRE": "కమాండ్ సెంటర్",
        "WEATHER": "వాతావరణం",
        "HAZARDS": "ప్రమాదాలు",
        "STATE MONITOR": "రాష్ట్ర పర్యవేక్షణ",
        "SATELLITE": "ఉపగ్రహం",
        "RADAR": "రాడార్",
        "OBSERVATIONS": "పరిశీలనలు",
        "SCENARIOS": "పరిస్థితులు",
        "ADVISORIES": "సలహాలు",
        "ADVISORY": "సలహా",
        "SITUATION": "పరిస్థితి",
        "TRACK": "మార్గం",
        "WIND": "గాలి",
        "RAIN": "వర్షం",
        "RISK": "ప్రమాద సూచిక",
        "INFRASTRUCTURE": "మౌలిక సదుపాయాలు",
        "INFRA": "మౌలిక సదుపాయాలు",
        "EVIDENCE": "సాక్ష్యం",
        "OPERATIONS": "కార్యకలాపాలు",
        "Extreme": "తీవ్రమైన",
        "High": "అధిక",
        "Moderate": "మధ్యస్థ",
        "Low": "తక్కువ",
        "Active": "చురుకైన",
        "Operational": "కార్యాచరణ",
        "Approved": "ఆమోదించబడింది",
        "Pending Review": "సమీక్ష పెండింగ్‌లో ఉంది",
        "Evacuation": "తరలింపు",
        "Coastal Surveillance": "తీరప్రాంత నిఘా",
        "NORMAL OPERATIONS": "సాధారణ కార్యకలాపాలు",
        "⚠ CYCLONE / DISASTER RESPONSE": "⚠ తుఫాను / విపత్తు ప్రతిస్పందన",
        "GOVERNMENT OF INDIA": "భారత ప్రభుత్వం",
        "MINISTRY OF EARTH SCIENCES (MoES)": "భూ విజ్ఞాన మంత్రిత్వ శాఖ (MoES)",
        "INDIA METEOROLOGICAL DEPARTMENT (IMD)": "భారత వాతావరణ శాఖ (IMD)",
        "NATIONAL MONITORING • ALL INDIA • ROUTINE SURVEILLANCE": "జాతీయ పర్యవేక్షణ • అఖిల భారత • సాధారణ నిఘా",
        "RESEARCH / DECISION-SUPPORT PROTOTYPE": "పరిశోధన / నిర్ణయ-మద్దతు నమూనా",
        "Disaster Risk Intelligence & Spatial Threat Insights": "విపత్తు ప్రమాద ఇంటెలిజెన్స్ & ప్రాదేశిక ముప్పు అంతర్దృష్టులు",
        "National Multi-Hazard Decision Support System • MoES & IMD Standards": "జాతీయ బహుళ-ప్రమాద నిర్ణయ మద్దతు వ్యవస్థ • MoES & IMD ప్రమాణాలు",
        "Govt. of India": "భారత ప్రభుత్వం",
        "API ONLINE": "API ఆన్‌లైన్",
        "DEMO": "డెమో",
        "REGION:": "ప్రాంతం:",
        "ALL INDIA (36 States & UTs)": "అఖిల భారతదేశం (36 రాష్ట్రాలు & కేంద్రపాలిత ప్రాంతాలు)",
        "CONNECTED": "కనెక్ట్ చేయబడింది",
        "DATA N/A": "డేటా అందుబాటులో లేదు",
        "MET SERVICES": "వాతావరణ సేవలు",
        "COMMAND RAIL": "కమాండ్ రైల్",
        "WARNINGS": "హెచ్చరికలు",
        "NOWCAST": "తక్షణ సూచన",
        "BULLETINS": "బులిటెన్లు",
        "RAINFALL": "వర్షపాతం",
        "CYCLONE": "తుఫాను",
        "ON": "ఆన్",
        "OFF": "ఆఫ్",
        "IMD • MOSDAC": "IMD • MOSDAC",
        "NATIONAL SYNOPTIC DOSSIER": "జాతీయ సినాప్టిక్ డాసియర్",
        "TACTICAL RESPONSE DOSSIER": "వ్యూహాత్మక ప్రతిస్పందన డాసియర్",
        "ACTIVE SYNOPTIC SYSTEM": "క్రియాశీల సినాప్టిక్ వ్యవస్థ",
        "IMD SYSTEM FEED: SOURCE UNAVAILABLE": "IMD సిస్టమ్ ఫీడ్: మూలం అందుబాటులో లేదు",
        "COORDINATES": "కోఆర్డినేట్లు",
        "OBSERVATION": "పరిశీలన",
        "NOT VERIFIED": "ధృవీకరించబడలేదు",
        "Direct browser connection to IMD National Synoptic Bulletin is restricted by CORS. Live system observation and coordinates cannot be verified client-side without an authoritative proxy.": "IMD జాతీయ సినాప్టిక్ బులెటిన్‌కు ప్రత్యక్ష బ్రౌజర్ కనెక్షన్ CORS ద్వారా పరిమితం చేయబడింది. అధికారిక ప్రాక్సీ లేకుండా క్లయింట్ వైపు పరిశీలనలను ధృవీకరించలేము.",
        "DRISHTI CHECKED:": "దృష్టి తనిఖీ చేసింది:",
        "OPEN IMD BULLETIN": "IMD బులెటిన్ తెరవండి",
        "TERRITORIAL SECTOR": "ప్రాంతీయ రంగం",
        "PAN-INDIA OVERVIEW (36 STATES & UTs)": "అఖిల భారత సమీక్ష (36 రాష్ట్రాలు & కేంద్రపాలిత ప్రాంతాలు)",
        "Click any state or UT on the map to inspect regional meteorology": "ప్రాంతీయ వాతావరణాన్ని పరిశీలించడానికి మ్యాప్‌లోని ఏదైనా రాష్ట్రం లేదా కేంద్రపాలిత ప్రాంతంపై క్లిక్ చేయండి",
        "SURFACE WIND": "ఉపరితల గాలి",
        "10m Model Vectors": "10మీ మోడల్ వెక్టర్స్",
        "PRECIPITATION": "వర్షపాతం",
        "24h Accumulated NWP": "24గం సంచిత NWP",
        "SURFACE PRESSURE": "ఉపరితల పీడనం",
        "Surface Barometric": "ఉపరితల బారోమెట్రిక్",
        "DATA UNAVAILABLE": "డేటా అందుబాటులో లేదు",
        "AIR TEMPERATURE": "గాలి ఉష్ణోగ్రత",
        "CENTRAL PRESSURE": "కేంద్ర పీడనం",
        "MAX SUSTAINED WIND": "గరిష్ట స్థిరమైన గాలి",
        "MOVEMENT": "కదలిక",
        "SOURCE: OPEN-METEO (MODEL)": "మూలం: OPEN-METEO (మోడల్)",
        "CHECKED:": "తనిఖీ చేయబడింది:",
        "CALIBRATED BENCHMARK": "క్యాలిబ్రేటెడ్ బెంచ్‌మార్క్",
        "VIEW CYCLONE SIMULATION": "తుఫాను అనుకరణను చూడండి",
        "PAN-INDIA SURVEILLANCE": "అఖిల భారత నిఘా",
        "ALL 36 STATES & UTs MONITORED • LIVE WEATHER: OPEN-METEO (MODEL) • BULLETINS: DEMO / SIMULATED": "మొత్తం 36 రాష్ట్రాలు & కేంద్రపాలిత ప్రాంతాలు పర్యవేక్షించబడుతున్నాయి • ప్రత్యక్ష వాతావరణం: OPEN-METEO (మోడల్) • బులెటిన్లు: సిమ్యులేటెడ్",
        "UPDATED:": "నవీకరించబడింది:",
        "NEXT:": "తరువాత:"
    }
}


class TranslationService:
    def __init__(self):
        self.model = settings.GEMINI_MODEL or "gemini-3.1-flash-lite"

    def get_api_key(self) -> str:
        """Retrieves Gemini API key strictly from settings or environment."""
        key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        return key.strip()

    def get_status(self) -> Dict[str, Any]:
        """Provides status of the translation service, model, and cache stats."""
        api_key = self.get_api_key()
        has_key = bool(api_key)
        return {
            "service": "DRISHTI Gemini Translation Engine",
            "api_key_configured": has_key,
            "mode": "LIVE_GEMINI" if has_key else "FALLBACK_MODE",
            "model": self.model,
            "supported_languages": [l.code for l in SUPPORTED_LANGUAGES.values()],
            "cache": translation_cache.get_stats()
        }

    def translate(
        self,
        text: str,
        target_language: str,
        context: Optional[str] = None
    ) -> str:
        """
        Translates a single string into target_language.
        Uses cache first. If not cached, executes batch of 1 item via Gemini.
        """
        if not text or not text.strip():
            return text

        lang = target_language.lower().strip()
        if lang == "en":
            return text

        if not is_supported_language(lang):
            raise ValueError(f"Language '{target_language}' is not supported by DRISHTI.")

        # Check cache
        cached = translation_cache.get(text, lang, context)
        if cached is not None:
            return cached

        # Translate using single-item batch
        results = self.translate_batch(
            items=[{"id": "single", "text": text}],
            target_language=lang,
            context=context
        )
        if results and results[0]["text"]:
            return results[0]["text"]

        return text

    def translate_batch(
        self,
        items: List[Dict[str, str]],
        target_language: str,
        context: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Translates a batch of items: [{'id': '1', 'text': '...'}] into target_language.
        Maintains strict alignment by 'id'.
        Partially satisfies from cache; only translates missing items with Gemini.
        """
        lang = target_language.lower().strip()
        if not is_supported_language(lang):
            raise ValueError(f"Language '{target_language}' is not supported by DRISHTI.")

        # English passthrough
        if lang == "en":
            return [{"id": item["id"], "text": item["text"]} for item in items]

        # 1. Identify cache hits and misses
        translated_map: Dict[str, str] = {}
        missing_items: List[Dict[str, str]] = []

        for item in items:
            item_id = str(item.get("id", ""))
            raw_text = item.get("text", "")
            if not raw_text or not raw_text.strip():
                translated_map[item_id] = raw_text
                continue

            cached = translation_cache.get(raw_text, lang, context)
            if cached is not None:
                translated_map[item_id] = cached
            else:
                missing_items.append({"id": item_id, "text": raw_text})

        # 2. If everything hit cache, assemble and return immediately
        if not missing_items:
            return [{"id": item["id"], "text": translated_map.get(str(item["id"]), item["text"])} for item in items]

        # 3. Translate missing items with Gemini API
        api_key = self.get_api_key()
        gemini_results: Dict[str, str] = {}

        if api_key:
            try:
                gemini_results = self._call_gemini_batch(missing_items, lang, context, api_key)
            except Exception as exc:
                logger.error(f"Live Gemini translation call failed: {exc}", exc_info=True)
                gemini_results = {}

        # 4. Process results and cache newly translated strings from Gemini
        cache_inserts: List[Tuple[str, str, str, Optional[str]]] = []
        for item in missing_items:
            item_id = str(item["id"])
            source_text = item["text"]
            translated_val = gemini_results.get(item_id)

            if translated_val and translated_val.strip():
                translated_map[item_id] = translated_val
                cache_inserts.append((source_text, lang, translated_val, context))
            else:
                # Explicit unavailable marker instead of hardcoding
                translated_map[item_id] = f"[Translation unavailable: {source_text}]"

        if cache_inserts:
            translation_cache.set_batch(cache_inserts)

        # 5. Assemble final response aligned by original ID
        response_items: List[Dict[str, str]] = []
        for item in items:
            item_id = str(item.get("id", ""))
            response_items.append({
                "id": item_id,
                "text": translated_map.get(item_id, item.get("text", ""))
            })

        return response_items

    def _call_gemini_batch(
        self,
        items: List[Dict[str, str]],
        target_language: str,
        context: Optional[str],
        api_key: str
    ) -> Dict[str, str]:
        """
        Executes a single HTTP POST request to Google Gemini API with JSON array schema.
        Batches all missing strings into ONE request.
        """
        lang_meta = get_language(target_language)
        lang_name = lang_meta.name if lang_meta else target_language
        native_name = lang_meta.native_name if lang_meta else ""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={api_key}"

        user_prompt = {
            "instruction": (
                f"Translate each item into {lang_name} ({native_name}). "
                f"Keep all {{token}} placeholders untouched. Keep numbers and units unchanged."
            ),
            "context": context or "Disaster Management & Weather Command Center",
            "targetLanguage": target_language,
            "items": items
        }

        schema_instruction = (
            "You must return a valid JSON array of objects with keys 'id' and 'text'. "
            "Every input 'id' must be present in the output with its corresponding translated 'text'. "
            "Example: [{\"id\": \"1\", \"text\": \"...\"}]"
        )

        full_system_prompt = f"{SYSTEM_TRANSLATION_INSTRUCTION}\n\n{schema_instruction}"

        payload = {
            "system_instruction": {
                "parts": [{"text": full_system_prompt}]
            },
            "contents": [
                {
                    "parts": [{"text": json.dumps(user_prompt, ensure_ascii=False)}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }

        headers = {"Content-Type": "application/json"}

        last_status = None
        last_body = ""
        for attempt in range(3):
            try:
                with httpx.Client(timeout=45.0) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    last_status = resp.status_code
                    last_body = resp.text
                    if resp.status_code == 200:
                        break
                    if resp.status_code in (429, 503):
                        wait_seconds = 3 * (attempt + 1)
                        logger.warning(
                            f"Gemini API {resp.status_code} on attempt {attempt + 1}/3 — "
                            f"retrying in {wait_seconds}s"
                        )
                        import time
                        time.sleep(wait_seconds)
                    else:
                        # Non-retryable error (4xx other than 429)
                        logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
                        return {}
            except httpx.TimeoutException as exc:
                logger.warning(f"Gemini API timeout on attempt {attempt + 1}/3: {exc}")
                if attempt < 2:
                    import time
                    time.sleep(3)
        else:
            logger.warning(f"Gemini API returned status {last_status} after 3 attempts: {last_body}")
            return {}

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates or "content" not in candidates[0]:
            return {}

        parts = candidates[0]["content"].get("parts", [])
        if not parts or "text" not in parts[0]:
            return {}

        raw_text = parts[0]["text"].strip()
        parsed = json.loads(raw_text)

        results: Dict[str, str] = {}
        entries_list = []
        if isinstance(parsed, list):
            entries_list = parsed
        elif isinstance(parsed, dict) and "translations" in parsed:
            entries_list = parsed["translations"]
        elif isinstance(parsed, dict) and "items" in parsed:
            entries_list = parsed["items"]

        # 1. Match by explicit 'id'
        for entry in entries_list:
            if isinstance(entry, dict) and "id" in entry and "text" in entry:
                results[str(entry["id"])] = str(entry["text"])

        # 2. Positional alignment fallback if LLM omitted or modified 'id'
        for idx, item in enumerate(items):
            item_id = str(item["id"])
            if item_id not in results and idx < len(entries_list):
                entry = entries_list[idx]
                if isinstance(entry, dict) and "text" in entry:
                    results[item_id] = str(entry["text"])

        return results


translation_service = TranslationService()
