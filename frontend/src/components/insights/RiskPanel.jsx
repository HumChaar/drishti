import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Waves, 
  CloudRain, 
  Wind, 
  Users, 
  Home, 
  ShieldCheck, 
  ChevronRight, 
  Search, 
  Filter,
  CheckCircle2,
  Building2,
  Activity,
  Satellite,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import perceptionApi from "../../services/perceptionApi";
import decisionApi from "../../services/decisionApi";
import reasoningApi from "../../services/reasoningApi";
import AdvisoryPanel from "./AdvisoryPanel";

export default function RiskPanel({ 
  districtsData = [], 
  selectedDistrict, 
  onSelectDistrict,
  activeStepId 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBand, setFilterBand] = useState("ALL");

  const filteredDistricts = districtsData.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBand = filterBand === "ALL" || d.risk.riskBand === filterBand;
    return matchesSearch && matchesBand;
  });

  const activeDistrict = selectedDistrict || districtsData[0] || null;
  const activeRisk = activeDistrict?.risk || {};

  const [perceptionData, setPerceptionData] = useState(null);
  const [decisionData, setDecisionData] = useState(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);
  const [reasoningData, setReasoningData] = useState(null);
  const [isReasoningLoading, setIsReasoningLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (activeDistrict?.id) {
      perceptionApi.getDistrictPerception(activeDistrict.id)
        .then((data) => {
          if (isMounted) setPerceptionData(data);
        })
        .catch((err) => console.warn("Perception fetch error:", err));

      setIsDecisionLoading(true);
      decisionApi.getDistrictDecision(activeDistrict.id, activeStepId)
        .then((data) => {
          if (isMounted) {
            setDecisionData(data);
            setIsDecisionLoading(false);
          }
        })
        .catch((err) => {
          console.warn("Decision fetch error:", err);
          if (isMounted) setIsDecisionLoading(false);
        });

      setIsReasoningLoading(true);
      reasoningApi.getDistrictAdvisory(activeDistrict.id, activeStepId)
        .then((data) => {
          if (isMounted) {
            setReasoningData(data);
            setIsReasoningLoading(false);
          }
        })
        .catch((err) => {
          console.warn("Reasoning fetch error:", err);
          if (isMounted) setIsReasoningLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [activeDistrict?.id, activeStepId]);

  return (
    <div className="risk-panel-container">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <h2 className="panel-title">DISTRICT RISK & VULNERABILITY MATRIX</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-provenance text-xs">MODEL: OSDMA-NDMA-SIM</span>
          <span className="text-xs text-slate-500 font-mono">[{activeStepId}]</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="matrix-filter-bar">
        <div className="search-input-wrap">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search district (e.g. Kendrapara, Balasore)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="matrix-search-input"
          />
        </div>

        <div className="band-filter-chips">
          {["ALL", "CRITICAL", "EXTREME", "VERY HIGH", "HIGH", "MODERATE"].map((band) => (
            <button
              key={band}
              className={`band-chip ${filterBand === band ? "active" : ""}`}
              onClick={() => setFilterBand(band)}
            >
              {band}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Split: Matrix Table + Deep Dive Inspector */}
      <div className="matrix-workspace-layout">
        {/* District List Overview */}
        <div className="district-cards-list">
          {filteredDistricts.length === 0 ? (
            <div className="p-4 text-xs text-slate-500 font-medium text-center">
              No districts match the selected filter criteria.
            </div>
          ) : (
            filteredDistricts.map((d) => {
              const isSelected = activeDistrict?.id === d.id;
              const r = d.risk;

              return (
                <div
                  key={d.id}
                  className={`district-card-row ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectDistrict(d)}
                >
                  <div className="district-primary-info">
                    <div className="flex items-center gap-2">
                      <span className="district-name font-bold text-slate-900">{d.name}</span>
                      <span className="district-state text-slate-500 text-xs">({d.state})</span>
                    </div>
                    <div className="district-sub-metrics font-mono text-xs text-slate-600 flex items-center gap-3 mt-1">
                      <span>Surge: <strong className="text-slate-800">{r.surgeMeters}m</strong></span>
                      <span>Rain: <strong className="text-slate-800">{r.rainMm24h}mm</strong></span>
                      <span>Wind: <strong className="text-orange-700">{r.windKmh} km/h</strong></span>
                    </div>
                  </div>

                  <div className="district-score-badge-wrap">
                    <div 
                      className="risk-band-pill"
                      style={{ 
                        color: r.color, 
                        borderColor: r.color, 
                        backgroundColor: `${r.color}15` 
                      }}
                    >
                      <span className="score-val font-mono font-bold">{r.riskScore}</span>
                      <span className="score-band text-[10px] font-bold">{r.riskBand}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected District Deep Dive */}
        {activeDistrict && (
          <div className="district-inspector-card">
            <div className="inspector-header">
              <div>
                <div className="inspector-pretitle text-slate-500 text-xs flex items-center gap-1.5 font-mono">
                  <span>DISTRICT IMPACT DOSSIER</span>
                  <span>•</span>
                  <span>{activeDistrict.state.toUpperCase()}</span>
                </div>
                <h3 className="inspector-title text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  {activeDistrict.name}
                  <span 
                    className="risk-tag-inline text-xs px-2 py-0.5 rounded font-mono font-bold"
                    style={{ 
                      backgroundColor: `${activeRisk.color}18`, 
                      color: activeRisk.color,
                      border: `1.5px solid ${activeRisk.color}`
                    }}
                  >
                    SCORE {activeRisk.riskScore}/100 [{activeRisk.riskBand}]
                  </span>
                </h3>
              </div>

              <div className="coastal-length-tag font-mono text-xs text-slate-600 font-semibold bg-white border border-slate-200 px-2 py-1 rounded">
                Coastline: {activeDistrict.coastalLineKm} km
              </div>
            </div>

            {/* Risk Gauge Bar */}
            <div className="risk-meter-section">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-600 font-semibold">COMPOSITE HAZARD & VULNERABILITY INDEX</span>
                <span style={{ color: activeRisk.color }} className="font-bold">{activeRisk.riskScore}%</span>
              </div>
              <div className="meter-track">
                <div 
                  className="meter-fill"
                  style={{ 
                    width: `${activeRisk.riskScore}%`, 
                    backgroundColor: activeRisk.color 
                  }}
                ></div>
              </div>
            </div>

            {/* Key Hazards Grid */}
            <div className="hazards-kpi-grid">
              <div className="hazard-kpi-card">
                <div className="kpi-icon-row text-slate-700">
                  <Waves size={16} className="text-blue-600" />
                  <span>STORM SURGE</span>
                </div>
                <div className="kpi-value font-mono text-slate-900">
                  {activeRisk.surgeMeters} <span className="kpi-unit font-normal">meters</span>
                </div>
                <div className="kpi-note text-slate-500">
                  High tide inundation risk
                </div>
              </div>

              <div className="hazard-kpi-card">
                <div className="kpi-icon-row text-slate-700">
                  <CloudRain size={16} className="text-blue-600" />
                  <span>24H PRECIPITATION</span>
                </div>
                <div className="kpi-value font-mono text-slate-900">
                  {activeRisk.rainMm24h} <span className="kpi-unit font-normal">mm</span>
                </div>
                <div className="kpi-note text-slate-500">
                  Heavy to extreme rainfall
                </div>
              </div>

              <div className="hazard-kpi-card">
                <div className="kpi-icon-row text-orange-700">
                  <Wind size={16} className="text-orange-600" />
                  <span>PEAK WINDS</span>
                </div>
                <div className="kpi-value font-mono text-orange-700">
                  {activeRisk.windKmh} <span className="kpi-unit font-normal">km/h</span>
                </div>
                <div className="kpi-note text-orange-700 font-medium">
                  Gusts to {activeRisk.gustKmh} km/h
                </div>
              </div>

              <div className="hazard-kpi-card">
                <div className="kpi-icon-row text-red-700">
                  <Activity size={16} className="text-red-600" />
                  <span>INUNDATION PROB.</span>
                </div>
                <div className="kpi-value font-mono text-red-700">
                  {activeRisk.inundationProbPct}%
                </div>
                <div className="kpi-note text-slate-500">
                  Low-lying salines & polders
                </div>
              </div>
            </div>

            {/* SegFormer SAR Flood Perception [AI INFERENCE] Section */}
            <div className="perception-card-section p-3.5 bg-slate-50 border border-slate-200 rounded-lg mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Satellite size={14} className="text-blue-600" />
                  <span className="text-xs font-mono font-bold text-slate-900">
                    SAR SATELLITE FLOOD PERCEPTION
                  </span>
                </div>
                <span className="badge-provenance text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                  [AI INFERENCE]
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-xs mb-2">
                <div className="bg-white p-2 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">MODEL</span>
                  <span className="text-xs font-bold text-slate-800">SegFormer-B0</span>
                </div>
                <div className="bg-white p-2 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">FLOOD EXTENT</span>
                  <span className="text-xs font-bold text-blue-700">
                    {perceptionData ? `${perceptionData.flood_percentage}%` : "Scanning..."}
                  </span>
                </div>
                <div className="bg-white p-2 border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">AI CONFIDENCE</span>
                  <span className="text-xs font-bold text-emerald-700">
                    {perceptionData ? `${Math.round((perceptionData.flood_probability || 0.96) * 100)}%` : "--"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Input: Dual-Pol SAR (VV/VH 224px)</span>
                <span className="text-slate-400">Latency: {perceptionData?.inference_time_ms || 65}ms (CPU)</span>
              </div>
              <div className="text-[10px] text-amber-700 font-mono mt-1">
                * Deterministic SAR benchmark fixture. Real-world validation requires Sentinel-1 dual-pol input.
              </div>
            </div>

            {/* Exposure & Evacuation Metrics */}
            <div className="exposure-metrics-block">
              <h4 className="section-subtitle flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold mb-2">
                <Users size={13} className="text-orange-600" />
                EXPOSURE & EVACUATION MANAGEMENT
              </h4>

              <div className="exposure-grid">
                <div className="exposure-stat">
                  <span className="stat-label">Total Population</span>
                  <span className="stat-val font-mono">{activeDistrict.population?.toLocaleString()}</span>
                </div>
                <div className="exposure-stat">
                  <span className="stat-label">Vulnerable in Coastal 5km</span>
                  <span className="stat-val font-mono text-orange-700 font-bold">
                    {activeDistrict.vulnerablePopulation?.toLocaleString()}
                  </span>
                </div>
                <div className="exposure-stat">
                  <span className="stat-label">Evacuation Target</span>
                  <span className="stat-val font-mono">
                    {activeRisk.evacuationTarget?.toLocaleString()}
                  </span>
                </div>
                <div className="exposure-stat">
                  <span className="stat-label">Safely Evacuated</span>
                  <span className="stat-val font-mono text-emerald-700 font-bold">
                    {activeRisk.evacuatedCount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Evacuation Progress Bar */}
              <div className="evacuation-progress-bar mt-2">
                <div className="flex justify-between text-xs font-mono text-slate-600 mb-1">
                  <span>Evacuation Progress ({Math.round((activeRisk.evacuatedCount / activeRisk.evacuationTarget) * 100)}%)</span>
                  <span>Shelter Occupancy: {activeRisk.shelterOccupancyPct}%</span>
                </div>
                <div className="meter-track">
                  <div 
                    className="meter-fill bg-emerald-600" 
                    style={{ width: `${Math.min(100, Math.round((activeRisk.evacuatedCount / activeRisk.evacuationTarget) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Primary Vulnerability Drivers */}
            <div className="drivers-section">
              <h4 className="section-subtitle flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold mb-2">
                <ShieldCheck size={13} className="text-orange-600" />
                KEY VULNERABILITY DRIVERS
              </h4>
              <ul className="drivers-list">
                {activeRisk.primaryDrivers?.map((driver, idx) => (
                  <li key={idx} className="driver-item flex items-start gap-2 text-xs text-slate-700">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Transparent Risk Engine Audit [Explainability] */}
            {activeRisk.explanation && (
              <div className="explainability-audit-section p-3.5 bg-slate-50 border border-slate-200 rounded-lg mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-amber-600" />
                    <span className="text-xs font-mono font-bold text-slate-900">
                      TRANSPARENT RISK ENGINE AUDIT
                    </span>
                  </div>
                  <span className="badge-provenance text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                    [AUDITABLE ENGINE]
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-white p-2.5 border border-slate-200 rounded mb-2.5 leading-relaxed">
                  <span className="font-bold text-slate-900">Score Audit: </span>
                  {activeRisk.explanation}
                </div>

                {activeRisk.contributingFactors && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                      Factor Weight & Point Attribution
                    </span>
                    {Object.entries(activeRisk.contributingFactors).map(([key, factor]) => (
                      <div key={key} className="bg-white p-2 border border-slate-200 rounded text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-slate-800 text-[11px]">{factor.name}</span>
                          <span className="font-mono text-[11px] font-bold text-slate-900">
                            +{factor.weightedPoints?.toFixed(1)} pts
                            <span className="text-slate-400 font-normal"> ({Math.round(factor.weight * 100)}% wt)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.round(factor.subScore || 0))}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>{factor.rawValueDisplay}</span>
                          <span>Sub-score: {Math.round(factor.subScore || 0)}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Critical Assets in District */}
            <div className="assets-section">
              <h4 className="section-subtitle flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold mb-2">
                <Building2 size={13} className="text-slate-700" />
                CRITICAL ASSETS & BUFFER ZONES
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activeDistrict.criticalAssets?.map((asset, i) => (
                  <span key={i} className="asset-tag font-mono text-xs">
                    {asset}
                  </span>
                ))}
              </div>
            </div>

            {/* STAGE 5: JEV / TYPESAFE DECISION INTELLIGENCE */}
            <div className="decision-intelligence-section p-3.5 bg-slate-50 border border-slate-200 rounded-lg mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-purple-600" />
                  <span className="text-xs font-mono font-bold text-slate-900">
                    DECISION INTELLIGENCE
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="badge-provenance text-[10px] bg-purple-50 text-purple-800 border-purple-200">
                    [DECISION INTELLIGENCE]
                  </span>
                  <span className="badge-provenance text-[10px] bg-rose-50 text-rose-800 border-rose-200">
                    [HUMAN APPROVAL REQUIRED]
                  </span>
                </div>
              </div>

              {/* Minimal Risk & Policy Summary */}
              <div className="bg-white p-2.5 border border-slate-200 rounded mb-2.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500 font-bold">Risk: </span>
                  <strong className="text-slate-900">
                    {activeRisk?.riskScore || decisionData?.risk_score} / {activeRisk?.riskBand || decisionData?.risk_band}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">Priority: </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    (decisionData?.priority || "IMMEDIATE") === "IMMEDIATE" ? "bg-red-100 text-red-800" :
                    (decisionData?.priority) === "HIGH" ? "bg-orange-100 text-orange-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>
                    {decisionData?.priority || "IMMEDIATE"}
                  </span>
                </div>
              </div>

              {isDecisionLoading ? (
                <div className="p-3 text-xs text-slate-500 font-mono text-center">
                  Synthesizing multi-modal risk evidence into decision recommendations...
                </div>
              ) : (decisionData?.recommended_decisions || decisionData?.recommendations)?.length > 0 ? (
                <div className="space-y-2">
                  {(decisionData.recommended_decisions || decisionData.recommendations).map((rec, idx) => {
                    const title = rec.title || rec.action?.title || "OPERATIONAL DIRECTIVE";
                    const priority = rec.priority || "IMMEDIATE";
                    const reason = rec.rationale || rec.reason || "Extreme composite risk + high flood/surge exposure + shelter deficit.";
                    const status = rec.status || "REQUIRES HUMAN APPROVAL";

                    const priorityBadge = 
                      priority === "IMMEDIATE" || priority === "CRITICAL" ? "bg-red-50 text-red-700 border-red-200" :
                      priority === "HIGH" ? "bg-orange-50 text-orange-700 border-orange-200" :
                      priority === "MODERATE" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-emerald-50 text-emerald-700 border-emerald-200";

                    return (
                      <div key={rec.decision_id || idx} className="bg-white p-3 border border-slate-200 rounded text-xs shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Recommended:</span>
                            <span className="font-bold text-slate-900 text-xs">{title}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Priority:</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${priorityBadge}`}>
                              {priority}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded border border-slate-100 text-[11px] text-slate-700">
                          <span className="font-semibold text-slate-900 font-mono text-[10px] block mb-0.5">Reason:</span>
                          <span>{reason}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
                          <span className="text-slate-500">
                            Policy: {rec.decision_id || "JEV Rule"}
                          </span>
                          <span className="text-rose-700 font-bold flex items-center gap-1">
                            <ShieldAlert size={11} />
                            Status: {status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-500 font-mono text-center">
                  No decision recommendations generated for this step.
                </div>
              )}
            </div>

            {/* STAGE 6: GEMINI REASONING LAYER */}
            <div className="gemini-reasoning-section p-3.5 bg-slate-50 border border-slate-200 rounded-lg mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-600" />
                  <span className="text-xs font-mono font-bold text-slate-900">
                    GEMINI REASONING
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`badge-provenance text-[10px] font-mono px-2 py-0.5 rounded border ${
                    reasoningData?.is_mock
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-blue-50 text-blue-800 border-blue-300"
                  }`}>
                    {reasoningData?.is_mock ? "[MOCK GEMINI REASONING]" : "[GEMINI REASONING]"}
                  </span>
                  <span className="badge-provenance text-[10px] bg-rose-50 text-rose-800 border-rose-200 font-mono">
                    [HUMAN APPROVAL REQUIRED]
                  </span>
                </div>
              </div>

              {isReasoningLoading ? (
                <div className="p-3 text-xs text-slate-500 font-mono text-center">
                  Synthesizing verified evidence and decision recommendations...
                </div>
              ) : reasoningData ? (
                <div className="space-y-2.5 text-xs">
                  {/* Headline */}
                  <div className="bg-white p-2.5 border border-slate-200 rounded">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">
                      Headline
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">
                      {reasoningData.headline}
                    </h4>
                  </div>

                  {/* Situation Summary */}
                  <div className="bg-white p-2.5 border border-slate-200 rounded text-slate-700 leading-relaxed text-[11px]">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                      Situation Summary
                    </span>
                    <p>{reasoningData.situation_summary}</p>
                  </div>

                  {/* Key Risk Drivers */}
                  {reasoningData.key_risk_drivers?.length > 0 && (
                    <div className="bg-white p-2.5 border border-slate-200 rounded">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                        Key Risk Drivers
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {reasoningData.key_risk_drivers.map((driver, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200"
                          >
                            • {driver}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Context */}
                  <div className="bg-white p-2.5 border border-slate-200 rounded">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                      Decision Context
                    </span>
                    <div className="text-[11px] text-slate-700 space-y-1">
                      <p className="text-slate-600 font-mono text-[10px]">
                        Linked Directives: {reasoningData.decision_ids?.join(", ") || "None"}
                      </p>
                      {reasoningData.recommended_actions?.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                          {reasoningData.recommended_actions.map((act, idx) => (
                            <li key={idx} className="text-slate-800">{act}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Uncertainty */}
                  {reasoningData.uncertainty_notes && (
                    <div className="bg-amber-50/70 p-2.5 border border-amber-200 rounded text-[11px] text-amber-900">
                      <span className="text-[10px] font-mono text-amber-800 uppercase tracking-wider block font-bold mb-0.5">
                        Uncertainty
                      </span>
                      <p>{reasoningData.uncertainty_notes}</p>
                    </div>
                  )}

                  {/* Grounding & Provenance Footer */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                    <span>Model: {reasoningData.model || "gemini"}</span>
                    <span>Status: {reasoningData.requires_human_approval ? "Requires Human Approval" : "Autonomous Execution Prohibited"}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-xs text-slate-500 font-mono text-center">
                  Reasoning synthesis unavailable for this district.
                </div>
              )}
            </div>

            {/* Decision Intelligence & AI Advisory [Human-in-the-Loop] */}
            <div className="mt-4">
              <AdvisoryPanel district={activeDistrict} stepId={activeStepId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
