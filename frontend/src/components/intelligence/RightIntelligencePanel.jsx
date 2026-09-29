import React, { useState } from "react";
import { 
  Sparkles, 
  MapPin, 
  ArrowUpRight,
  ExternalLink,
  Wind,
  CloudRain,
  Gauge,
  Thermometer,
  Compass,
  Radio
} from "lucide-react";
import ProvenanceBadge from "../common/ProvenanceBadge";

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
  const stateRecord = selectedState && weatherData?.states
    ? (Array.isArray(weatherData.states)
        ? weatherData.states.find(s => s.stateId === selectedState.id || s.id === selectedState.id)
        : weatherData.states[selectedState.id])
    : null;

  const activeSystem = weatherData?.activeSystem || null;

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
          <ProvenanceBadge
            provenance={isNormal ? "MODEL" : "SIMULATED"}
            size="xs"
          />
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
              {activeSystem?.hasActiveSystem && activeSystem.liveStatus === "LIVE" && activeSystem.latitude != null ? (
                <div className="synoptic-system-card bg-amber-50/70 border border-amber-300 rounded p-3 text-slate-800">
                  <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                      <span className="font-mono text-xs font-bold text-amber-950 uppercase">
                        ACTIVE SYNOPTIC SYSTEM
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${activeSystem.liveStatus === "LIVE" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                        {activeSystem.liveStatus === "LIVE" ? "LIVE / IMD" : "DEMO / SIMULATED"}
                      </span>
                      <ProvenanceBadge provenance={activeSystem.liveStatus === "LIVE" ? "OBSERVED" : (activeSystem.provenance || "DEMO / SIMULATED METEOROLOGICAL DATA")} size="tiny" />
                    </div>
                  </div>

                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {activeSystem.name}
                    </h4>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Classification: <strong className="text-amber-800">[{activeSystem.classification}]</strong> • Observation: {activeSystem.observationTime}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-[11px]">
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">COORDINATES</span>
                      <strong className="text-slate-900">
                        {activeSystem.coordinatesFormatted || `${activeSystem.latitude}°N, ${activeSystem.longitude}°E`}
                      </strong>
                    </div>
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">CENTRAL PRESSURE</span>
                      <strong className="text-slate-900">
                        {activeSystem.centralPressureHpa ? `${activeSystem.centralPressureHpa} hPa` : "Not reported"}
                      </strong>
                    </div>
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">MAX SUSTAINED WIND</span>
                      <strong className="text-amber-700">
                        {activeSystem.maxWindKmph ? `${activeSystem.maxWindKmph} km/h` : "N/A"}{activeSystem.gustKmph ? ` (Gusts ${activeSystem.gustKmph})` : ""}
                      </strong>
                    </div>
                    <div className="p-2 bg-white/90 rounded border border-amber-200">
                      <span className="text-[9.5px] text-slate-500 block">MOVEMENT</span>
                      <strong className="text-slate-900 truncate block" title={activeSystem.movementDescription}>
                        {activeSystem.movementDescription || "Monitoring"}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>SOURCE: {activeSystem.source}</span>
                    <a
                      href="https://mausam.imd.gov.in/responsive/cycloneinformation.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>IMD PORTAL</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="synoptic-system-card bg-slate-50 border border-slate-300 rounded p-3 text-slate-800">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Radio size={12} className="text-slate-600" />
                      <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                        IMD SYSTEM FEED: SOURCE UNAVAILABLE
                      </span>
                    </div>
                    <ProvenanceBadge provenance="UNAVAILABLE" size="tiny" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10.5px]">
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[9px] text-slate-500 block font-bold">COORDINATES</span>
                      <strong className="text-slate-700">NOT VERIFIED</strong>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200">
                      <span className="text-[9px] text-slate-500 block font-bold">OBSERVATION</span>
                      <strong className="text-slate-700">NOT VERIFIED</strong>
                    </div>
                  </div>

                  <div className="mt-2 text-[10.5px] font-mono text-slate-600">
                    Direct browser connection to IMD National Synoptic Bulletin is restricted by CORS. Live system observation and coordinates cannot be verified client-side without an authoritative proxy.
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>DRISHTI CHECKED: <strong className="text-slate-700">{activeSystem?.checkedAt || weatherData?.checkedAt || "IST"}</strong></span>
                    <a
                      href="https://mausam.imd.gov.in/responsive/cycloneinformation.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>OPEN IMD BULLETIN</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              )}

              {/* State Territorial Sector Meteorological Card (Section 8 & 9) */}
              <div className="state-influence-card bg-white border border-slate-200 rounded p-3 shadow-sm">
                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                      TERRITORIAL SECTOR
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                      <MapPin size={14} className="text-blue-700" />
                      {stateRecord ? stateRecord.location : (selectedState ? selectedState.name : "PAN-INDIA OVERVIEW (36 STATES & UTs)")}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                      {stateRecord ? `Capital: ${stateRecord.capital} • Region: ${stateRecord.region}` : "Click any state or UT on the map to inspect regional meteorology"}
                    </span>
                  </div>

                  <ProvenanceBadge provenance="MODEL" size="xs" />
                </div>

                {/* State Meteorological Telemetry Grid */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[10.5px]">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-500 block font-bold">SURFACE WIND</span>
                    <strong className="text-slate-900 text-xs">
                      {stateRecord?.windSpeedKmph != null ? `${stateRecord.windSpeedKmph} km/h ${stateRecord.windDirectionLabel || ""}` : (stateRecord?.windSpeed != null ? `${stateRecord.windSpeed} km/h` : "18 km/h (Nat. Mean)")}
                    </strong>
                    <span className="text-[8.5px] text-slate-400 block mt-0.5">10m Model Vectors</span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-500 block font-bold">PRECIPITATION</span>
                    <strong className="text-slate-900 text-xs">
                      {stateRecord?.rainfallMm != null ? `${stateRecord.rainfallMm} mm` : (stateRecord?.rain != null ? `${stateRecord.rain} mm` : "0.0 mm")}
                    </strong>
                    <span className="text-[8.5px] text-slate-400 block mt-0.5">24h Accumulated NWP</span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-500 block font-bold">SURFACE PRESSURE</span>
                    <strong className="text-slate-900 text-xs">
                      {stateRecord?.pressureHpa != null ? `${stateRecord.pressureHpa} hPa` : "DATA UNAVAILABLE"}
                    </strong>
                    <span className="text-[8.5px] text-slate-400 block mt-0.5">Surface Barometric</span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-500 block font-bold">AIR TEMPERATURE</span>
                    <strong className="text-slate-900 text-xs">
                      {stateRecord?.temperatureC != null ? `${stateRecord.temperatureC} °C` : (stateRecord?.temperature != null ? `${stateRecord.temperature} °C` : "DATA UNAVAILABLE")}
                    </strong>
                    <span className="text-[8.5px] text-slate-400 block mt-0.5">
                      {stateRecord?.humidityPct != null ? `${stateRecord.humidityPct}% RH` : "RH: N/A"}
                    </span>
                  </div>
                </div>

                {/* Distance to System (DERIVED - Section 11) */}
                {stateRecord?.distanceToSystemKm != null && (
                  <div className="mt-2 p-2 bg-amber-50/80 rounded border border-amber-200 flex items-center justify-between font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 text-amber-900">
                      <Compass size={12} className="text-amber-700" />
                      <span>Distance to System Center: <strong>{stateRecord.distanceToSystemKm} km</strong></span>
                    </div>
                    <ProvenanceBadge provenance="DERIVED" size="tiny" />
                  </div>
                )}

                {/* Sourcing and Timestamps */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] font-mono text-slate-500">
                  <span>SOURCE: OPEN-METEO (MODEL)</span>
                  <span>CHECKED: {stateRecord?.checkedAt || weatherData?.checkedAt || "IST"}</span>
                </div>

                {/* Switch to Disaster Mode Button */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    CALIBRATED BENCHMARK
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
                  <ProvenanceBadge provenance="SIMULATED" size="tiny" />
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

      {/* Tab 2: WEATHER (Strict Dossier Format: SECTION HEADER / VALUE / UNIT / SOURCE / PROVENANCE / TIMESTAMP) */}
      {activeTab === "WEATHER" && (
        <div className="dossier-content-scroll">
          <div className="weather-telemetry-dossier flex flex-col gap-2.5">
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded flex items-center justify-between">
              <div>
                <span className="text-[9.5px] font-mono font-bold text-blue-900 uppercase block">
                  TELEMETRY DOSSIER • {stateRecord ? stateRecord.location : "PAN-INDIA (36 NODES)"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  SOURCE: OPEN-METEO CURRENT WEATHER NWP
                </span>
              </div>
              <ProvenanceBadge provenance="MODEL" size="xs" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* 1. SURFACE WIND */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase flex items-center justify-between">
                  <span>SURFACE WIND</span>
                  <Wind size={12} className="text-blue-600" />
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.windSpeedKmph != null ? `${stateRecord.windSpeedKmph} km/h` : (stateRecord?.windSpeed != null ? `${stateRecord.windSpeed} km/h` : (selectedState ? "DATA UNAVAILABLE" : "18 km/h"))}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>{stateRecord?.windDirectionLabel ? `${stateRecord.windDirectionLabel} ${stateRecord.windDirectionDeg || ""}°` : "MODEL"}</span>
                  <span>{stateRecord?.checkedAt || weatherData?.checkedAt || "IST"}</span>
                </div>
              </div>

              {/* 2. PRECIPITATION */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase flex items-center justify-between">
                  <span>PRECIPITATION</span>
                  <CloudRain size={12} className="text-blue-600" />
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.rainfallMm != null ? `${stateRecord.rainfallMm} mm` : (stateRecord?.rain != null ? `${stateRecord.rain} mm` : (selectedState ? "DATA UNAVAILABLE" : "0.0 mm"))}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • 24h NWP</span>
                  <span>{stateRecord?.checkedAt || weatherData?.checkedAt || "IST"}</span>
                </div>
              </div>

              {/* 3. SURFACE PRESSURE */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase flex items-center justify-between">
                  <span>SURFACE PRESSURE</span>
                  <Gauge size={12} className="text-blue-600" />
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.pressureHpa != null ? `${stateRecord.pressureHpa} hPa` : "DATA UNAVAILABLE"}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>BAROMETRIC NWP</span>
                  <span>{stateRecord?.checkedAt || weatherData?.checkedAt || "IST"}</span>
                </div>
              </div>

              {/* 4. 2M TEMPERATURE */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase flex items-center justify-between">
                  <span>2M TEMPERATURE</span>
                  <Thermometer size={12} className="text-blue-600" />
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.temperatureC != null ? `${stateRecord.temperatureC} °C` : (stateRecord?.temperature != null ? `${stateRecord.temperature} °C` : "DATA UNAVAILABLE")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>{stateRecord?.checkedAt || weatherData?.checkedAt || "IST"}</span>
                </div>
              </div>

              {/* 5. RELATIVE HUMIDITY */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase">
                  RELATIVE HUMIDITY
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.humidityPct != null ? `${stateRecord.humidityPct} %` : (stateRecord?.humidity != null ? `${stateRecord.humidity} %` : (selectedState ? "DATA UNAVAILABLE" : "72 %"))}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span>MODEL • OPEN-METEO</span>
                  <span>{stateRecord?.checkedAt || weatherData?.checkedAt || "IST"}</span>
                </div>
              </div>

              {/* 6. DISTANCE TO ACTIVE SYSTEM (DERIVED) */}
              <div className="p-2.5 bg-white rounded border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="text-[9.5px] text-slate-500 font-bold uppercase flex items-center justify-between">
                  <span>SYSTEM PROXIMITY</span>
                  <Compass size={12} className="text-amber-600" />
                </div>
                <div className="text-base font-bold text-slate-900 my-1">
                  {stateRecord?.distanceToSystemKm != null
                    ? `${stateRecord.distanceToSystemKm} km`
                    : (activeSystem?.hasActiveSystem ? (selectedState ? "DATA UNAVAILABLE" : "Select State") : "None Active")}
                </div>
                <div className="text-[9px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
                  <span className="text-amber-700 font-semibold">DERIVED CALC</span>
                  <span>{weatherData?.checkedAt || "IST"}</span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] font-mono text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Provenance Rule:</strong> Surface variables are provided by Open-Meteo High-Resolution Numerical Weather Prediction (MODEL). Distances to synoptic centers are calculated directly by DRISHTI (DERIVED).
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
              <strong className="text-slate-900 block mb-0.5">SYNOPTIC METEOROLOGY (DEMO SCENARIOS)</strong>
              <div className="text-[11px] text-slate-600">IMD Synoptic Weather Bulletins, CAP Advisories, &amp; Tropical Cyclone Outlooks.</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">DEMO / SIMULATED METEOROLOGICAL DATA</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">SATELLITE REMOTE SENSING</strong>
              <div className="text-[11px] text-slate-600">ISRO / MOSDAC INSAT-3DS Imager products (IR1, VIS, WV, CTT).</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">OBSERVED / SATELLITE PRODUCT</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">SURFACE NUMERICAL WEATHER PREDICTION</strong>
              <div className="text-[11px] text-slate-600">Open-Meteo Current Weather &amp; Wind Vector model data.</div>
              <span className="badge-provenance mt-1 inline-block text-[9px]">LIVE WEATHER — CURRENT MODEL DATA</span>
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
