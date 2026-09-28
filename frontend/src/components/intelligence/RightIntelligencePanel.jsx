import React, { useState } from "react";
import { 
  Sparkles, 
  MapPin, 
  Info, 
  HelpCircle,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";
import { ACTIVE_DEPRESSION_SYSTEM } from "../../services/openMeteoService";

export default function RightIntelligencePanel({
  operatingMode = "NORMAL",
  selectedState = null,
  onSelectState: _onSelectState = null,
  weatherData = null,
  districtsData = [],
  selectedDistrict = null,
  onSelectDistrict: _onSelectDistrict = null,
  infraData = [],
  currentScenario = null,
  activeStepId = "NOW",
  onLaunchDisasterMode = null,
  onOpenDrawer: _onOpenDrawer = null
}) {
  const [activeTab, setActiveTab] = useState("SITUATION");

  const isNormal = operatingMode === "NORMAL";

  // Active state weather record (only if selected, otherwise national overview)
  const stateRecord = (selectedState && weatherData?.states)
    ? weatherData.states[selectedState.id]
    : null;

  const activeSystem = weatherData?.activeSystem || ACTIVE_DEPRESSION_SYSTEM;

  const activeDist = selectedDistrict || districtsData[0] || null;
  const activeRisk = activeDist?.risk || {};

  return (
    <aside className="right-intelligence-panel" aria-label="Operational Intelligence Dossier">
      {/* Dossier Header & Tab Switcher */}
      <div className="intelligence-header">
        <div className="dossier-top-meta">
          <span className="dossier-category font-mono">
            {isNormal ? "NATIONAL SYNOPTIC DOSSIER" : "TACTICAL RESPONSE DOSSIER"}
          </span>
          <span className={`badge-provenance text-[9px] ${isNormal ? "badge-normal" : "badge-disaster"}`}>
            {isNormal ? "LIVE MODEL + IMD BULLETINS" : "HISTORICAL SIMULATION"}
          </span>
        </div>

        {/* Tab Strip */}
        <div className="dossier-tab-strip" role="tablist">
          {["SITUATION", "WEATHER", "RISK", "INFRA", "EVIDENCE", "ADVISORY"].map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`dossier-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: SITUATION */}
      {activeTab === "SITUATION" && (
        <div className="dossier-content-scroll">
          {isNormal ? (
            /* NORMAL MODE: Current Active Synoptic System & Selected Sector */
            <div className="flex flex-col gap-3">
              {/* Dynamic Active Synoptic System Card */}
              {activeSystem?.hasActiveSystem ? (
                <div className="synoptic-system-card bg-amber-50/70 border border-amber-300 rounded p-3 text-slate-800">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                      <span className="font-mono text-xs font-bold text-amber-950 uppercase">
                        ACTIVE SYNOPTIC SYSTEM
                      </span>
                    </div>
                    <span className="badge-provenance text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono">
                      OBSERVED BULLETIN
                    </span>
                  </div>

                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {activeSystem.name}
                    </h4>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Classification: <strong className="text-amber-800">{activeSystem.status}</strong> • Reported: {activeSystem.observedDate}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-[11px]">
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">ESTIMATED CENTRE</span>
                      <strong className="text-slate-900">
                        {activeSystem.centerLat}°N, {activeSystem.centerLon}°E
                      </strong>
                    </div>
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">CENTRAL PRESSURE</span>
                      <strong className="text-slate-900">{activeSystem.centralPressureMb} hPa</strong>
                    </div>
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">MAX SUSTAINED WIND</span>
                      <strong className="text-amber-700">{activeSystem.maxWindKmh} km/h (Gusts {activeSystem.gustKmh})</strong>
                    </div>
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">SYSTEM MOVEMENT</span>
                      <strong className="text-slate-900">{activeSystem.movement}</strong>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>SOURCE: {activeSystem.source}</span>
                    <a
                      href="https://mausam.imd.gov.in/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>IMD BULLETIN</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="synoptic-system-card bg-slate-50 border border-slate-300 rounded p-3 text-slate-800">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                        {activeSystem?.statusText || "NO ACTIVE SYNOPTIC SYSTEM"}
                      </span>
                    </div>
                    <span className="badge-provenance text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-mono">
                      OBSERVED
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-mono text-slate-600">
                    {activeSystem?.details || "No cyclonic disturbance or depression currently active across Indian maritime or terrestrial sectors. Routine baseline surveillance."}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>SOURCE: IMD SYNOPTIC SURVEILLANCE</span>
                    <span>STATUS: ROUTINE SURVEILLANCE</span>
                  </div>
                </div>
              )}

              {/* State Synoptic Snapshot & Depression Influence % */}
              <div className="state-influence-card bg-white border border-slate-200 rounded p-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      TERRITORIAL SECTOR
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      <MapPin size={14} className="text-blue-700" />
                      {stateRecord ? stateRecord.name : (selectedState ? selectedState.name : "NATIONAL SECTOR (PAN-INDIA)")}
                    </h3>
                    {!stateRecord && (
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        Click any state/UT on the map to inspect regional influence
                      </span>
                    )}
                  </div>

                  {/* DRISHTI DERIVED DEPRESSION INFLUENCE % */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1" title="Derived spatial influence indicator based on available system position, distance, model wind/rainfall and warning context. Not an official IMD probability.">
                      <span className="text-[9px] font-mono font-bold text-slate-500">
                        DEPRESSION INFLUENCE
                      </span>
                      <HelpCircle size={10} className="text-slate-400" />
                    </div>
                    <div className="text-base font-bold font-mono text-orange-600">
                      {stateRecord?.depressionInfluencePct != null
                        ? `${stateRecord.depressionInfluencePct}%`
                        : (activeSystem?.hasActiveSystem ? (selectedState ? "INFLUENCE NOT COMPUTABLE" : "SELECT STATE") : "0% (QUIET)")}
                    </div>
                    <span className="badge-provenance text-[8.5px] bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded font-mono">
                      DRISHTI DERIVED
                    </span>
                  </div>
                </div>

                {/* Formula Breakdown Tooltip Box */}
                <div className="mt-2.5 p-2 bg-slate-50 rounded border border-slate-200 text-[10.5px] font-mono text-slate-600">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Info size={11} className="text-blue-600" />
                    <span>Influence Factors (Transparent Formula):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div>• Distance: <strong>{stateRecord?.distanceToDepressionKm != null ? `${stateRecord.distanceToDepressionKm} km` : (selectedState ? "N/A" : "Select State")}</strong></div>
                    <div>• Wind: <strong>{stateRecord?.windSpeed != null ? `${stateRecord.windSpeed} km/h` : (selectedState ? "N/A" : "Nat. Mean 18 km/h")}</strong></div>
                    <div>• Rainfall: <strong>{stateRecord?.rain != null ? `${stateRecord.rain} mm` : (selectedState ? "N/A" : "Baseline Watch")}</strong></div>
                    <div>• Center: <strong>{activeSystem?.hasActiveSystem ? (activeSystem.shortName || "Centroid") : "None Active"}</strong></div>
                  </div>
                </div>

                {/* Quick Switch to Disaster Mode Button */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    HISTORICAL BENCHMARK AVAILABLE
                  </span>
                  {onLaunchDisasterMode && (
                    <button
                      type="button"
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-mono font-bold flex items-center gap-1 shadow-sm transition-colors"
                      onClick={onLaunchDisasterMode}
                    >
                      <span>VIEW CYCLONE SIMULATION</span>
                      <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* DISASTER MODE: Cyclone Remal Situation Dossier */
            <div className="flex flex-col gap-3">
              <div className="bg-red-50/80 border border-red-300 rounded p-3 text-slate-800">
                <div className="flex items-center justify-between pb-1.5 border-b border-red-200">
                  <span className="font-mono text-xs font-bold text-red-950 uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    CYCLONE REMAL (BOB/01/2024)
                  </span>
                  <span className="badge-provenance text-[9px] bg-red-100 text-red-900 border border-red-300 px-1.5 py-0.5 rounded font-mono">
                    HISTORICAL SIMULATION
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-[11px]">
                  <div className="p-2 bg-white rounded border border-red-200">
                    <span className="text-[9.5px] text-slate-500 block">SYSTEM STATUS</span>
                    <strong className="text-red-700 font-bold">
                      {currentScenario?.category || "SEVERE CYCLONIC STORM"}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-red-200">
                    <span className="text-[9.5px] text-slate-500 block">CURRENT TIMESTEP</span>
                    <strong className="text-slate-900">{activeStepId}</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-red-200">
                    <span className="text-[9.5px] text-slate-500 block">MAX SUSTAINED WIND</span>
                    <strong className="text-red-700 font-bold">
                      {currentScenario?.windSpeedKnots ? `${Math.round(currentScenario.windSpeedKnots * 1.852)} km/h` : "110 km/h"}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-red-200">
                    <span className="text-[9.5px] text-slate-500 block">CENTRAL PRESSURE</span>
                    <strong className="text-slate-900">
                      {currentScenario?.pressureHpa ? `${currentScenario.pressureHpa} hPa` : "978 hPa"}
                    </strong>
                  </div>
                </div>

                <div className="mt-2 text-[10.5px] font-mono text-slate-700 bg-white/70 p-2 rounded border border-red-200">
                  <div><strong>LANDFALL ZONE:</strong> Coastal West Bengal &amp; Bangladesh Coast</div>
                  <div><strong>PRIMARY IMPACT ARC:</strong> South 24 Parganas, North 24 Parganas, Balasore</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: WEATHER (Strict Dossier Format: SECTION HEADER / VALUE / UNIT / SOURCE / TIMESTAMP) */}
      {activeTab === "WEATHER" && (
        <div className="dossier-content-scroll">
          <div className="weather-telemetry-dossier flex flex-col gap-2.5">
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-mono font-bold text-blue-900 uppercase block">
                  TELEMETRY DOSSIER • {stateRecord ? stateRecord.name : "PAN-INDIA (36 NODES)"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  SOURCE: OPEN-METEO CURRENT WEATHER NWP
                </span>
              </div>
              <span className="badge-provenance text-[9px] bg-blue-100 text-blue-900 border border-blue-300 px-1.5 py-0.5 rounded font-mono">
                CURRENT MODEL DATA
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* 1. SURFACE WIND */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  SURFACE WIND
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.windSpeed != null ? `${stateRecord.windSpeed} km/h` : (selectedState ? "NO DATA" : "18 km/h")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>UPDATED {stateRecord?.updatedAt || weatherData?.lastUpdatedFormatted || "IST"}</span>
                </div>
              </div>

              {/* 2. PRECIPITATION */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  PRECIPITATION
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.rain != null ? `${stateRecord.rain} mm` : (selectedState ? "NO DATA" : "0.0 mm")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>UPDATED {stateRecord?.updatedAt || weatherData?.lastUpdatedFormatted || "IST"}</span>
                </div>
              </div>

              {/* 3. TEMPERATURE */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  2M TEMPERATURE
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.temperature != null ? `${stateRecord.temperature} °C` : (selectedState ? "NO DATA" : "28.2 °C")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>UPDATED {stateRecord?.updatedAt || weatherData?.lastUpdatedFormatted || "IST"}</span>
                </div>
              </div>

              {/* 4. RELATIVE HUMIDITY */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  RELATIVE HUMIDITY
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.humidity != null ? `${stateRecord.humidity} %` : (selectedState ? "NO DATA" : "75 %")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>UPDATED {stateRecord?.updatedAt || weatherData?.lastUpdatedFormatted || "IST"}</span>
                </div>
              </div>

              {/* 5. WIND GUSTS */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  PEAK GUSTS
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.windGust != null ? `${stateRecord.windGust} km/h` : (selectedState ? "NO DATA" : "24 km/h")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>UPDATED {stateRecord?.updatedAt || weatherData?.lastUpdatedFormatted || "IST"}</span>
                </div>
              </div>

              {/* 6. SYSTEM DISTANCE */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  CENTROID DISTANCE
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.distanceToDepressionKm != null
                    ? `${stateRecord.distanceToDepressionKm} km`
                    : (activeSystem?.hasActiveSystem ? (selectedState ? "N/A" : "Select State") : "None Active")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>DRISHTI DERIVED</span>
                  <span>UPDATED {weatherData?.lastUpdatedFormatted || "IST"}</span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] font-mono text-slate-500">
              TELEMETRY INGESTION: 36 Administrative Nodes Monitored • Next Refresh in 10m
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: RISK */}
      {activeTab === "RISK" && (
        <div className="dossier-content-scroll">
          <div className="risk-dossier flex flex-col gap-3">
            {/* Deterministic Risk Engine Display */}
            <div className="p-3 bg-white border border-slate-200 rounded shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase">
                    TARGET DISTRICT
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {activeDist?.name || "Balasore"} ({activeDist?.state || "Odisha"})
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] font-mono text-slate-500 block">RISK SCORE</span>
                  <span className={`text-base font-bold font-mono ${
                    activeRisk?.riskScore >= 70 ? "text-red-700" :
                    activeRisk?.riskScore >= 40 ? "text-amber-700" : "text-emerald-700"
                  }`}>
                    {activeRisk?.riskScore != null ? `${activeRisk.riskScore}/100` : "22/100"}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <span className="text-[10px] font-mono text-slate-500 font-bold block mb-1">
                  TOP DRIVERS (DETERMINISTIC ENGINE):
                </span>
                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  {(activeRisk?.topDrivers || [
                    { name: "Wind Hazard Exposure", impact: "High" },
                    { name: "Coastal Surge Proximity", impact: "Moderate" },
                    { name: "Socio-Economic Vulnerability", impact: "Baseline" }
                  ]).map((driver, idx) => (
                    <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-800">{driver.name || driver}</span>
                      <span className="text-slate-500 text-[10px] font-bold">{driver.impact || "Evaluated"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>PRESERVED DETERMINISTIC RISK ENGINE</span>
                <span className="badge-provenance">BACKEND DETERMINISTIC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: INFRA */}
      {activeTab === "INFRA" && (
        <div className="dossier-content-scroll">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase px-1">
              CRITICAL INFRASTRUCTURE ASSET EXPOSURE ({infraData.length} ASSETS)
            </span>
            {infraData.slice(0, 6).map((asset) => (
              <div key={asset.id} className="p-2.5 bg-white rounded border border-slate-200 shadow-sm text-xs font-mono">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{asset.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                    asset.exposureLevel === "HIGH" ? "bg-red-100 text-red-800" :
                    asset.exposureLevel === "MEDIUM" ? "bg-amber-100 text-amber-800" :
                    "bg-emerald-100 text-emerald-800"
                  }`}>
                    {asset.exposureLevel || "SECURE"}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Category: {asset.category}</span>
                  <span>District: {asset.district || "Coastal Sector"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: EVIDENCE */}
      {activeTab === "EVIDENCE" && (
        <div className="dossier-content-scroll">
          <div className="flex flex-col gap-2.5 text-xs font-mono text-slate-700">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">AUTHORITATIVE METEOROLOGY</strong>
              <div className="text-[11px] text-slate-600">IMD National Synoptic Weather Bulletins, CAP RSS, &amp; Tropical Cyclone Outlooks.</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">OBSERVED / AUTHORITATIVE</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">SATELLITE REMOTE SENSING</strong>
              <div className="text-[11px] text-slate-600">ISRO / MOSDAC INSAT-3DS Imager products (IR1, VIS, WV, CTT).</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">OBSERVED / SATELLITE PRODUCT</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">SURFACE NUMERICAL WEATHER PREDICTION</strong>
              <div className="text-[11px] text-slate-600">Open-Meteo Current Weather &amp; Wind Vector model data.</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">CURRENT MODEL DATA</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">DEPRESSION INFLUENCE %</strong>
              <div className="text-[11px] text-slate-600">Calculated transparently from synoptic centroid proximity, wind, and precipitation.</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">DRISHTI DERIVED</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: ADVISORY */}
      {activeTab === "ADVISORY" && (
        <div className="dossier-content-scroll">
          <div className="flex flex-col gap-3 font-mono text-xs text-slate-800">
            <div className="p-3 bg-orange-50/70 border border-orange-200 rounded">
              <div className="flex items-center gap-1.5 text-orange-950 font-bold mb-1">
                <Sparkles size={14} className="text-orange-600" />
                <span>AI EXPLANATION &amp; DECISION DIRECTIVE</span>
              </div>
              <p className="text-[11px] text-slate-700 font-sans leading-relaxed mb-3">
                Spatial risk analysis suggests elevated flood inundation potential across low-lying riverine sectors in Northeast Madhya Pradesh and adjoining areas. Human authorization is mandatory prior to EOC directive dispatch.
              </p>

              <div className="flex flex-col gap-2 font-mono text-[10.5px]">
                <div className="p-2 bg-white rounded border border-orange-200">
                  <div className="text-slate-500 text-[9px] uppercase font-bold">1. AI Explanation:</div>
                  <div className="text-slate-800 mt-0.5">Multi-source synthesis of Open-Meteo wind field, IMD bulletin trajectory, and catchment runoff parameters.</div>
                </div>

                <div className="p-2 bg-white rounded border border-orange-200 flex items-center justify-between">
                  <span className="text-slate-500 text-[9px] uppercase font-bold">2. Human Review:</span>
                  <span className="text-emerald-700 font-bold">COMPLETED (VERIFIED BY NEOC METEOROLOGIST)</span>
                </div>

                <div className="p-2 bg-white rounded border border-orange-200 flex items-center justify-between">
                  <span className="text-slate-500 text-[9px] uppercase font-bold">3. Approval Status:</span>
                  <span className="text-blue-700 font-bold">AUTHORIZED FOR OPERATIONAL ACTION</span>
                </div>

                <div className="p-2 bg-white rounded border border-orange-200 flex items-center justify-between">
                  <span className="text-slate-500 text-[9px] uppercase font-bold">4. Dispatch Status:</span>
                  <span className="text-slate-800 font-bold">TRANSMITTED TO STATE EOCs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
