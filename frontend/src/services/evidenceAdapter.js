/**
 * DRISHTI Evidence & Factor Decomposition Adapter
 *
 * Normalizes backend responses from /api/risk/districts, /api/risk/district/{id},
 * and /api/cyclone/scenario/{step} into a structured, government-grade evidence contract.
 *
 * CORE CONTRACT:
 * 1. WHAT is the current risk? (Authoritative deterministic score & band from backend).
 * 2. WHY is the risk high? (Primary vulnerability drivers from backend).
 * 3. WHICH hazard/exposure factors contribute? (Wind, Rain, Surge, Inundation, Infra, Population).
 * 4. WHAT evidence supports those factors? (Concrete values, units, thresholds, sources).
 * 5. HOW is evidence classified? (OBSERVED, DERIVED, or SIMULATED).
 *
 * ARCHITECTURAL RULE:
 * The deterministic risk score is generated exclusively by the backend rule engine.
 * This adapter and any AI assistance strictly explain the supplied evidence without
 * modifying or recalculating the score.
 */

/**
 * Categorize severity level based on score or metric
 */
function getSeverity(level) {
  if (level === "CRITICAL" || level === "EXTREME") return "CRITICAL";
  if (level === "VERY HIGH" || level === "HIGH") return "HIGH";
  if (level === "MODERATE") return "MODERATE";
  return "NOMINAL";
}

/**
 * Normalizes district, scenario, and infrastructure data into an authoritative evidence dossier.
 *
 * @param {Object} district - Selected district object from backend
 * @param {Object} scenario - Current scenario step telemetry from backend
 * @param {Array} infraData - Infrastructure asset list from backend
 * @param {string} stepId - Current timeline step identifier (e.g., "T00", "T06")
 * @returns {Object} Normalized evidence dossier
 */
export function normalizeDistrictEvidence(district, scenario = null, infraData = [], stepId = "T00") {
  if (!district) return null;

  const risk = district.risk || {};
  const currentCyclone = scenario?.current || {};
  const windRadii = scenario?.windRadii || {};

  const windKmh = Number(risk.windKmh || 0);
  const gustKmh = Number(risk.gustKmh || 0);
  const rainMm24h = Number(risk.rainMm24h || 0);
  const surgeMeters = Number(risk.surgeMeters || 0);
  const inundationProbPct = Number(risk.inundationProbPct || 0);
  const vulnerablePop = Number(district.vulnerablePopulation || 0);
  const totalPop = Number(district.population || 0);
  const evacuatedCount = Number(risk.evacuatedCount || 0);
  const evacuationTarget = Number(risk.evacuationTarget || 1);
  const shelterOccupancy = Number(risk.shelterOccupancyPct || 0);
  const coastalLineKm = Number(district.coastalLineKm || 0);
  const criticalAssets = Array.isArray(district.criticalAssets) ? district.criticalAssets : [];

  // Match relevant infrastructure assets for this district
  const districtInfra = (infraData || []).filter(
    (item) => item.districtId === district.id || item.location?.toLowerCase().includes(district.name?.toLowerCase())
  );

  // Parse Primary Drivers with explicit ranking
  const rawDrivers = Array.isArray(risk.primaryDrivers) && risk.primaryDrivers.length > 0
    ? risk.primaryDrivers
    : [
        surgeMeters >= 1.5 ? `Severe storm surge threat exceeding ${surgeMeters}m along ${coastalLineKm}km coastline` : null,
        windKmh >= 90 ? `Peak sustained gale-force winds of ${windKmh} km/h with gusts to ${gustKmh} km/h` : null,
        rainMm24h >= 150 ? `Heavy to extreme precipitation accumulation forecasted at ${rainMm24h} mm / 24h` : null,
        inundationProbPct >= 50 ? `High inundation probability of ${inundationProbPct}% in low-lying coastal polders` : null,
        vulnerablePop >= 100000 ? `High exposure with ${vulnerablePop.toLocaleString()} residents in 5km coastal hazard zone` : null
      ].filter(Boolean);

  const primaryDrivers = rawDrivers.slice(0, 3).map((driverText, idx) => {
    let severity = "MODERATE";
    const textLower = driverText.toLowerCase();
    if (textLower.includes("surge") || textLower.includes("storm surge") || textLower.includes("extreme") || textLower.includes("critical")) {
      severity = "CRITICAL";
    } else if (textLower.includes("wind") || textLower.includes("heavy") || textLower.includes("gust") || textLower.includes("inundation")) {
      severity = "HIGH";
    }

    return {
      rank: `0${idx + 1}`,
      title: driverText.split(":")[0] || driverText,
      fullText: driverText,
      severity
    };
  });

  // Build the 6-Factor Decomposition Grid
  const factors = [
    {
      id: "wind",
      factorName: "PEAK SUSTAINED WIND & GUSTS",
      shortLabel: "Wind Hazard",
      value: windKmh,
      unit: "km/h",
      subvalue: `Gusts up to ${gustKmh} km/h`,
      severity: windKmh >= 100 ? "CRITICAL" : windKmh >= 80 ? "HIGH" : windKmh >= 55 ? "MODERATE" : "NOMINAL",
      severityLabel: windKmh >= 100 ? "Violent Storm" : windKmh >= 80 ? "Severe Gale" : windKmh >= 55 ? "Squally Wind" : "Moderate",
      classification: "OBSERVED",
      classificationLabel: "OBSERVED",
      source: "IMD Doppler Weather Radar (DWR Paradip/Kolkata) & Coastal AWS Network",
      threshold: "Warning threshold: > 62 km/h (Gale); > 89 km/h (Storm force)",
      operationalNote: "Direct structural threat to thatched roofs, overhead power transmission lines, and communication towers."
    },
    {
      id: "rain",
      factorName: "24-HOUR PRECIPITATION ACCUMULATION",
      shortLabel: "Precipitation",
      value: rainMm24h,
      unit: "mm",
      subvalue: rainMm24h >= 204.4 ? "Extremely Heavy (>204.4 mm)" : rainMm24h >= 115.6 ? "Very Heavy (115.6 - 204.4 mm)" : "Heavy (64.5 - 115.5 mm)",
      severity: rainMm24h >= 200 ? "CRITICAL" : rainMm24h >= 140 ? "HIGH" : rainMm24h >= 70 ? "MODERATE" : "NOMINAL",
      severityLabel: rainMm24h >= 200 ? "Extremely Heavy" : rainMm24h >= 140 ? "Very Heavy" : rainMm24h >= 70 ? "Heavy" : "Moderate",
      classification: "DERIVED",
      classificationLabel: "DERIVED",
      source: "IMD NWFC Multi-Model Ensemble WRF/GFS & GPM Satellite Quantitative Precipitation",
      threshold: "IMD Red Warning benchmark: > 204.4 mm / 24 hours",
      operationalNote: "Triggers localized flash-flooding, drainage choking in urban settlements, and waterlogging of agricultural paddy beds."
    },
    {
      id: "surge",
      factorName: "COASTAL STORM SURGE AMPLIFICATION",
      shortLabel: "Storm Surge",
      value: surgeMeters,
      unit: "meters",
      subvalue: `Peak astronomical tide offset (+${surgeMeters}m above datum)`,
      severity: surgeMeters >= 2.0 ? "CRITICAL" : surgeMeters >= 1.4 ? "HIGH" : surgeMeters >= 0.7 ? "MODERATE" : "NOMINAL",
      severityLabel: surgeMeters >= 2.0 ? "Breach Imminent" : surgeMeters >= 1.4 ? "High Surge Threat" : surgeMeters >= 0.7 ? "Moderate Surge" : "Nominal",
      classification: "SIMULATED",
      classificationLabel: "SIMULATED",
      source: "INCOIS Storm Surge Early Warning System (SS-EWS) & IIT-D Hydrodynamic Model",
      threshold: "Coastal seawall threshold: > 1.5 m (saline embankment overtopping risk)",
      operationalNote: "High probability of saline water intrusion across coastal estuaries and aquaculture enclosures."
    },
    {
      id: "inundation",
      factorName: "LOW-LAND INUNDATION PROBABILITY",
      shortLabel: "Inundation",
      value: inundationProbPct,
      unit: "%",
      subvalue: `Calculated across ${coastalLineKm} km active coastal frontage`,
      severity: inundationProbPct >= 70 ? "CRITICAL" : inundationProbPct >= 50 ? "HIGH" : inundationProbPct >= 30 ? "MODERATE" : "NOMINAL",
      severityLabel: inundationProbPct >= 70 ? "Extensive Submersion" : inundationProbPct >= 50 ? "High Inundation" : inundationProbPct >= 30 ? "Partial Polder Threat" : "Low Threat",
      classification: "DERIVED",
      classificationLabel: "DERIVED",
      source: "Delft3D / Hydrodynamic 2D Overland Model coupled with SRTM/Copernicus Digital Elevation",
      threshold: "Critical evacuation threshold: > 60% probability of low-land flooding",
      operationalNote: "Derived overlay combining surge height, tidal timing, and local slope topography (historical simulation calibrated)."
    },
    {
      id: "infrastructure",
      factorName: "CRITICAL INFRASTRUCTURE AT RISK",
      shortLabel: "Infrastructure",
      value: criticalAssets.length,
      unit: "assets",
      subvalue: criticalAssets.slice(0, 3).join(", ") || "Ports, Substations, Evacuation Centers",
      severity: criticalAssets.length >= 3 ? "CRITICAL" : criticalAssets.length >= 1 ? "HIGH" : "NOMINAL",
      severityLabel: criticalAssets.length >= 3 ? "High Impact" : criticalAssets.length >= 1 ? "Asset Alert" : "Stable",
      classification: "OBSERVED",
      classificationLabel: "OBSERVED",
      source: "OSDMA / WB-SDMA State Geographic Disaster Asset Registry",
      threshold: "Operational trigger: 1+ lifeline utilities inside high-wind / flood envelope",
      operationalNote: `${districtInfra.length > 0 ? `${districtInfra.length} mapped facility markers active.` : "Lifeline utilities flagged for backup diesel generator verification."}`
    },
    {
      id: "exposure",
      factorName: "COASTAL POPULATION EXPOSURE (5KM REACH)",
      shortLabel: "Population Exposure",
      value: vulnerablePop.toLocaleString(),
      unit: "residents",
      subvalue: `Evacuated: ${evacuatedCount.toLocaleString()} / ${evacuationTarget.toLocaleString()} target (${Math.round((evacuatedCount / evacuationTarget) * 100)}%)`,
      severity: vulnerablePop >= 200000 ? "CRITICAL" : vulnerablePop >= 100000 ? "HIGH" : vulnerablePop >= 50000 ? "MODERATE" : "NOMINAL",
      severityLabel: vulnerablePop >= 200000 ? "Extreme Exposure" : vulnerablePop >= 100000 ? "High Exposure" : "Moderate Exposure",
      classification: "DERIVED",
      classificationLabel: "DERIVED",
      source: "Census of India 2011/Updated Block Ledger & Dynamic Field Evacuation Tracker",
      threshold: "Priority 1 evacuation zone: Coastal habitation within 5km of high-tide line",
      operationalNote: `Multipurpose Cyclone Shelters occupancy currently at ${shelterOccupancy}%. Total district population: ${totalPop.toLocaleString()}.`
    }
  ];

  // Provenance Summary Statistics
  const observedCount = factors.filter((f) => f.classification === "OBSERVED").length;
  const derivedCount = factors.filter((f) => f.classification === "DERIVED").length;
  const simulatedCount = factors.filter((f) => f.classification === "SIMULATED").length;

  return {
    districtId: district.id,
    districtName: district.name,
    state: district.state,
    population: totalPop,
    vulnerablePopulation: vulnerablePop,
    coastalLineKm,
    coordinates: { lat: district.lat, lon: district.lon },

    // Authoritative Risk Score (Must match backend exactly)
    authoritativeRisk: {
      score: Number(risk.riskScore || 0),
      band: risk.riskBand || "NOMINAL",
      color: risk.color || "#0284c7",
      severity: getSeverity(risk.riskBand),
      ruleEngineStatement: "Risk score is deterministic (Rule-Engine v2.4). AI explains supplied evidence but does not modify the score.",
      operationalProvenance: "HISTORICAL SIMULATION • CYCLONE REMAL (MAY 2024) • CALIBRATED EXERCISE"
    },

    primaryDrivers,
    factors,

    // Cyclone Context
    cycloneContext: {
      category: currentCyclone.category || "Severe Cyclonic Storm",
      position: `${currentCyclone.latitude || 19.6}°N, ${currentCyclone.longitude || 89.2}°E`,
      distanceToCoastKm: currentCyclone.distanceToCoastKm ?? null,
      windKmh: currentCyclone.windKmh || 110,
      gustKmh: currentCyclone.gustKmh || 135,
      pressureMb: currentCyclone.pressureMb || 978,
      intensityTrend: currentCyclone.intensityTrend || "INTENSIFYING",
      windRadii: {
        r34Km: windRadii.r34Km || 240,
        r50Km: windRadii.r50Km || 130,
        r64Km: windRadii.r64Km || 45
      }
    },

    // Audit and Provenance Metrics
    provenance: {
      stepId,
      scenarioName: "CYCLONE REMAL (2024)",
      observedCount,
      derivedCount,
      simulatedCount,
      totalCount: factors.length,
      lastCalculated: new Date().toISOString()
    }
  };
}
