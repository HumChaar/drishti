import React, { useState, useMemo } from "react";
import { 
  AlertTriangle, 
  Waves, 
  CloudRain, 
  Wind, 
  Users, 
  ChevronRight, 
  Search, 
  Building2,
  Activity,
  Sparkles,
  ShieldCheck,
  Database
} from "lucide-react";
import EvidencePanel from "../evidence/EvidencePanel";
import { normalizeDistrictEvidence } from "../../services/evidenceAdapter";

export default function RiskPanel({ 
  districtsData = [], 
  selectedDistrict, 
  onSelectDistrict,
  activeStepId,
  onNavigateTab,
  currentScenario = null,
  infraData = []
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBand, setFilterBand] = useState("ALL");
  const [inspectorView, setInspectorView] = useState("evidence"); // "evidence" | "dossier"

  const filteredDistricts = districtsData.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.state.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBand = filterBand === "ALL" || d.risk.riskBand === filterBand;
    return matchesSearch && matchesBand;
  });

  const activeDistrict = selectedDistrict || districtsData[0] || null;
  const activeRisk = activeDistrict?.risk || {};

  // Compute normalized evidence dossier for selected district
  const districtEvidence = useMemo(() => {
    return normalizeDistrictEvidence(activeDistrict, currentScenario, infraData, activeStepId);
  }, [activeDistrict, currentScenario, infraData, activeStepId]);

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
            {/* Subview Navigation: EVIDENCE & RISK FACTORS vs IMPACT DOSSIER */}
            <div className="inspector-subview-nav">
              <button
                type="button"
                className={`inspector-nav-tab ${inspectorView === "evidence" ? "active" : ""}`}
                onClick={() => setInspectorView("evidence")}
              >
                <Database size={13} className={inspectorView === "evidence" ? "text-indigo-600" : "text-slate-400"} />
                <span>EVIDENCE & RISK FACTORS</span>
                <span className="badge-tab-indicator">6 FACTORS</span>
              </button>
              <button
                type="button"
                className={`inspector-nav-tab ${inspectorView === "dossier" ? "active" : ""}`}
                onClick={() => setInspectorView("dossier")}
              >
                <ShieldCheck size={13} className={inspectorView === "dossier" ? "text-orange-600" : "text-slate-400"} />
                <span>IMPACT DOSSIER</span>
              </button>
            </div>

            {/* View 1: Evidence & Risk Factor Decomposition */}
            {inspectorView === "evidence" && (
              <EvidencePanel
                evidence={districtEvidence}
                onNavigateTab={onNavigateTab}
              />
            )}

            {/* View 2: Impact Dossier (Overview) */}
            {inspectorView === "dossier" && (
              <div className="dossier-view-content">
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

            {onNavigateTab && (
              <button
                type="button"
                className="btn-dossier-advisory"
                onClick={() => onNavigateTab("advisories")}
                title={`Generate AI advisory for ${activeDistrict.name}`}
              >
                <Sparkles size={14} />
                <span>SYNTHESIZE AI ADVISORY FOR {activeDistrict.name.toUpperCase()}</span>
              </button>
            )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
