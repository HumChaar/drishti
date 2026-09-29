/**
 * DRISHTI IMD Alert & Emergency Notification Service
 *
 * Strict Provenance Standard:
 * - DEMO / SIMULATED: Static demonstration bulletins & alerts
 * - DRISHTI DERIVED: Multi-factor synthesized indicators
 * - HISTORICAL SIMULATION — CYCLONE REMAL 2024: Replay scenarios
 *
 * DATA INTEGRITY RULES:
 * - Never synthesize timestamps with local clock and present them as official observation times.
 * - Never present unverified depressions or arbitrary coordinates.
 * - Static/demo alerts and bulletins must be explicitly classified as DEMO / SIMULATED METEOROLOGICAL DATA.
 */

export const ACTIVE_EMERGENCY_ALERTS = [
  {
    id: "alert-monsoon-trough-2026",
    title: "WEATHER WARNING: MONSOON CONVECTION & HEAVY RAINFALL",
    category: "SYNOPTIC CONVECTION",
    severity: "WARNING", // CRITICAL | WARNING | ALERT | WATCH | INFORMATION
    severityColor: "#dc2626", // Red / Orange
    region: "Central India, Gangetic Plain & Adjoining Riverine Basins",
    issuedAt: "DEMO SCENARIO ADVISORY",
    validUntil: "ROUTINE ADVISORY CYCLE",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    summary:
      "Active monsoon trough across Central India. Isolated heavy to very heavy rainfall likely in low-lying riverine basins with localized waterlogging.",
    action: "VIEW SITUATION",
    targetStateId: "IN-MP",
    link: "https://mausam.imd.gov.in/"
  },
  {
    id: "alert-sea-bob-2026",
    title: "SQUALLY WEATHER & MARINE CAUTION",
    category: "COASTAL / MARINE",
    severity: "ALERT",
    severityColor: "#ea580c",
    region: "North & Central Bay of Bengal (Odisha & West Bengal Coastal Sectors)",
    issuedAt: "DEMO MARINE ADVISORY",
    validUntil: "CONTINUOUS OBSERVATION",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    summary:
      "Squally wind speed reaching 45-55 km/h gusting to 65 km/h over North BoB. Sea condition rough to very rough. Fishermen advised not to venture into deep sea.",
    action: "VIEW MARINE BULLETIN",
    targetStateId: "IN-OD",
    link: "https://mausam.imd.gov.in/"
  },
  {
    id: "alert-nowcast-jh-2026",
    title: "NOWCAST: THUNDERSTORM WITH LIGHTNING",
    category: "NOWCAST",
    severity: "WATCH",
    severityColor: "#d97706",
    region: "Jharkhand, Vidarbha & Coastal Andhra Pradesh",
    issuedAt: "DEMO RADAR NOWCAST",
    validUntil: "NEXT 3 HOURS",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    summary:
      "Moderate to intense convective clouds observed on Paradip & Nagpur DWR. Lightning strikes with gusty winds 30-40 km/h expected during next 3 hours.",
    action: "VIEW RADAR",
    targetStateId: "IN-JH",
    link: "https://mausam.imd.gov.in/"
  },
  {
    id: "alert-remal-exercise",
    title: "OPERATIONAL DRILL: CYCLONE REMAL (BOB/01/2024)",
    category: "SIMULATION BENCHMARK",
    severity: "INFORMATION",
    severityColor: "#0284c7",
    region: "Bay of Bengal Coastal Arc (Odisha & West Bengal)",
    issuedAt: "HISTORICAL CALIBRATION (MAY 2024)",
    validUntil: "SESSION REPLAY",
    source: "DRISHTI",
    provenance: "HISTORICAL SIMULATION — CYCLONE REMAL 2024",
    summary:
      "Calibrated storm trajectory exercise with deterministic 8-district risk scoring, SegFormer inundation inference, and Gemini multilingual decision support.",
    action: "LAUNCH CYCLONE MODE",
    targetStateId: "IN-WB",
    link: null
  }
];

export const SYSTEM_NOTIFICATIONS = [
  {
    id: "notif-1",
    type: "WARNING",
    title: "Monsoon Convection Advisory: Central India & Gangetic Plain",
    time: "DEMO CYCLE",
    region: "Central India",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    isRead: false
  },
  {
    id: "notif-2",
    type: "MODEL UPDATE",
    title: "Open-Meteo High-Resolution Wind Field Ingested",
    time: "MODEL CYCLE",
    region: "Pan-India (36 States & UTs)",
    source: "OPEN-METEO",
    provenance: "LIVE WEATHER — CURRENT MODEL DATA",
    isRead: false
  },
  {
    id: "notif-3",
    type: "BULLETIN",
    title: "IMD Sea Bulletin IMD-SEA-BOB Active",
    time: "DEMO CYCLE",
    region: "Bay of Bengal",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    isRead: false
  },
  {
    id: "notif-4",
    type: "SATELLITE",
    title: "INSAT-3DS Rapid Scan IR1 Composite Available",
    time: "IMAGERY CYCLE",
    region: "South Asia Oceanic Domain",
    source: "MOSDAC / ISRO",
    provenance: "OBSERVED / SATELLITE PRODUCT",
    isRead: true
  }
];

export const ACTIVE_BULLETINS = [
  {
    id: "bul-imd-syn-01",
    bulletinNo: "IMD-ALL-INDIA-WEATHER-SUMMARY",
    headline: "All India Daily Weather Summary & Synoptic Features",
    issuedAt: "DEMO / SIMULATED REPORT",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    region: "Indian Subcontinent & Oceanic Basins",
    details: "Monsoon trough is active across Central and Northern India. Multiple embedded cyclonic circulations along the trough axis. No verified cyclonic depression or cyclone currently officially designated in the Bay of Bengal or Arabian Sea basin in this bulletin cycle.",
    seaCondition: "Moderate to Rough over Central & North Bay of Bengal",
    significantWaveHeightMeters: 2.8,
    waveDirection: "South-Southwesterly",
    squallWarning: "Squally wind speed reaching 40-50 km/h along coastal stretches.",
    fishermenAdvisory: "Fishermen advised to exercise caution while venturing into offshore deep-sea waters."
  },
  {
    id: "bul-imd-syn-02",
    bulletinNo: "IMD-SEA-BOB-2026-18",
    headline: "Marine Weather Bulletin for Coastal Waters of Odisha & West Bengal",
    issuedAt: "DEMO / SIMULATED BULLETIN",
    source: "DEMO / SIMULATED DATA",
    provenance: "DEMO / SIMULATED METEOROLOGICAL DATA",
    region: "Coastal Odisha, Coastal West Bengal & North Bay of Bengal",
    details: "Monsoon is vigorous over North Bay of Bengal. Southwest monsoon current strong with intermittent gale squalls. Port signals: Distant Warning Signal No. II hoisted at Paradip, Dhamra and Sagar Island ports.",
    seaCondition: "High to Very High in offshore reaches",
    significantWaveHeightMeters: 4.1,
    waveDirection: "Southwesterly",
    squallWarning: "Wind speed 50-60 km/h gusting to 70 km/h along coastal stretches.",
    fishermenAdvisory: "Fishermen out at deep sea are strongly advised to return to nearest coastal harbour immediately."
  }
];
