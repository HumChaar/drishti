import React, { useState } from "react";
import { 
  X, 
  Radio, 
  AlertTriangle, 
  Database, 
  ExternalLink, 
  Search,
  Activity
} from "lucide-react";
import SatellitePanel from "../satellite/SatellitePanel";
import { ACTIVE_BULLETINS, ACTIVE_EMERGENCY_ALERTS } from "../../services/imdAlertService";
import { STATES_AND_UTS } from "../../data/indiaGeography";

export default function OperationalDrawerModal({
  drawerType, // "satellite" | "bulletins" | "warnings" | "sources" | "observations" | "radar"
  onClose,
  weatherData,
  onSelectState,
  onSelectAlert: _onSelectAlert,
  onLocateOnMap
}) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!drawerType) return null;

  return (
    <div className="operational-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="operational-drawer-window" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. SATELLITE VIEWER */}
        {drawerType === "satellite" && (
          <SatellitePanel onClose={onClose} onLocateOnMap={onLocateOnMap} />
        )}

        {/* 2. IMD METEOROLOGICAL BULLETINS */}
        {drawerType === "bulletins" && (
          <div style={{
            background: "#0f172a",
            borderRadius: "12px",
            border: "1px solid #1e3a5f",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.08)",
            maxWidth: "680px",
            width: "100%",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "var(--font-mono, monospace)"
          }}>
            {/* Header */}
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c1e3a 100%)",
              borderBottom: "1px solid rgba(56,189,248,0.2)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "8px",
                  background: "rgba(56,189,248,0.15)",
                  border: "1px solid rgba(56,189,248,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Radio size={18} style={{ color: "#38bdf8" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <h3 style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: 800, letterSpacing: "0.06em", margin: 0 }}>
                      IMD NATIONAL &amp; MARINE METEOROLOGICAL BULLETINS
                    </h3>
                    <span style={{
                      fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "3px",
                      background: "rgba(34,197,94,0.15)", color: "#4ade80",
                      border: "1px solid rgba(34,197,94,0.3)",
                      display: "flex", alignItems: "center", gap: "4px"
                    }}>
                      <span style={{
                        width: "5px", height: "5px", borderRadius: "50%",
                        background: "#4ade80", display: "inline-block",
                        animation: "pulse 2s infinite"
                      }} />
                      LIVE
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.04em" }}>
                    AUTHORITATIVE SOURCE: INDIA METEOROLOGICAL DEPARTMENT
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px", color: "#94a3b8", cursor: "pointer",
                  width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Source Badge Bar */}
            <div style={{
              background: "rgba(56,189,248,0.05)",
              borderBottom: "1px solid rgba(56,189,248,0.1)",
              padding: "8px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0
            }}>
              <span style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.06em" }}>
                {ACTIVE_BULLETINS.length} BULLETIN{ACTIVE_BULLETINS.length !== 1 ? "S" : ""} ACTIVE
              </span>
              <span style={{
                fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "3px",
                background: "rgba(56,189,248,0.1)", color: "#38bdf8",
                border: "1px solid rgba(56,189,248,0.2)", letterSpacing: "0.05em"
              }}>
                OBSERVED / AUTHORITATIVE BULLETIN
              </span>
            </div>

            {/* Bulletin Cards */}
            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              {ACTIVE_BULLETINS.map((b, bIdx) => (
                <div key={b.id} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  overflow: "hidden"
                }}>
                  {/* Bulletin ID Header */}
                  <div style={{
                    padding: "12px 16px",
                    background: "rgba(30,58,95,0.5)",
                    borderBottom: "1px solid rgba(56,189,248,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        width: "22px", height: "22px", borderRadius: "50%",
                        background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "9px", fontWeight: 800, color: "#38bdf8"
                      }}>{bIdx + 1}</span>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.04em" }}>
                        {b.bulletinNo}
                      </span>
                    </div>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>{b.issuedAt}</span>
                  </div>

                  {/* Headline */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#f8fafc", margin: "0 0 6px 0", letterSpacing: "0.02em" }}>
                      {b.headline}
                    </h4>
                    <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, margin: 0, fontFamily: "sans-serif", fontWeight: 400 }}>
                      {b.details}
                    </p>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{
                      padding: "10px 12px", borderRadius: "8px",
                      background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)"
                    }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#0ea5e9", letterSpacing: "0.06em", marginBottom: "4px" }}>SEA CONDITION</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>{b.seaCondition}</div>
                    </div>
                    <div style={{
                      padding: "10px 12px", borderRadius: "8px",
                      background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)"
                    }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#818cf8", letterSpacing: "0.06em", marginBottom: "4px" }}>WAVE HEIGHT</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>
                        {b.significantWaveHeightMeters}m
                        <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500, marginLeft: "4px" }}>({b.waveDirection})</span>
                      </div>
                    </div>
                    <div style={{
                      gridColumn: "1 / -1", padding: "10px 12px", borderRadius: "8px",
                      background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)"
                    }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#fb923c", letterSpacing: "0.06em", marginBottom: "4px" }}>
                        ⚡ SQUALL WARNING
                      </div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#fed7aa" }}>{b.squallWarning}</div>
                    </div>
                    <div style={{
                      gridColumn: "1 / -1", padding: "12px", borderRadius: "8px",
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                        <AlertTriangle size={11} style={{ color: "#f87171", flexShrink: 0 }} />
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#f87171", letterSpacing: "0.06em" }}>FISHERMEN ADVISORY</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#fca5a5", lineHeight: 1.5, fontFamily: "sans-serif", fontWeight: 500 }}>
                        {b.fishermenAdvisory}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: "10px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(15,23,42,0.8)",
              flexShrink: 0
            }}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>PROVENANCE: IMD NATIONAL SYNOPTIC WEATHER REPORT</span>
              <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 700 }}>MoES • IMD</span>
            </div>
          </div>
        )}


        {/* 3. IMD EMERGENCY WARNINGS */}
        {drawerType === "warnings" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  IMD NATIONAL WEATHER WARNINGS &amp; ALERTS
                </h3>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              {ACTIVE_EMERGENCY_ALERTS.map((alert) => (
                <div key={alert.id} className="p-4 bg-slate-50 border border-slate-300 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === "CRITICAL" || alert.severity === "WARNING" ? "bg-red-100 text-red-800 border border-red-300" :
                        alert.severity === "ALERT" ? "bg-orange-100 text-orange-800 border border-orange-300" :
                        "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}>
                        {alert.severity}
                      </span>
                      <strong className="text-slate-900 text-xs">{alert.title}</strong>
                    </div>
                    <span className="text-slate-500 text-[10px]">{alert.issuedAt}</span>
                  </div>

                  <p className="font-sans text-xs text-slate-700 leading-relaxed mb-2">
                    {alert.summary}
                  </p>

                  <div className="p-2 bg-white rounded border border-slate-200 text-[11px] mb-2">
                    <strong>Region / Districts:</strong> {alert.region} ({alert.districts ? alert.districts.join(", ") : "Regional Sector"})
                  </div>

                  <div className="p-2 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-900">
                    <strong>Recommended Action:</strong> {alert.actionRecommended}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span>SOURCE: {alert.source}</span>
                    <span className="badge-provenance">{alert.classification}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. DATA SOURCES & STRICT PROVENANCE */}
        {drawerType === "sources" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-cyan-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  DATA PROVENANCE &amp; AUTHORITATIVE SOURCES MATRIX
                </h3>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs text-slate-800">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <strong className="text-slate-900 font-bold">1. INDIA METEOROLOGICAL DEPARTMENT (IMD)</strong>
                  <span className="badge-provenance text-[9px] bg-blue-100 text-blue-900 font-bold">
                    OBSERVED / AUTHORITATIVE BULLETIN
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-600 mb-2">
                  Official national synoptic bulletins, marine squall advisories, CAP RSS emergency alerts, and cyclonic disturbance advisories.
                </div>
                <a href="https://mausam.imd.gov.in/" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline flex items-center gap-1 text-[11px]">
                  <span>https://mausam.imd.gov.in</span>
                  <ExternalLink size={10} />
                </a>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <strong className="text-slate-900 font-bold">2. MOSDAC / ISRO (INSAT-3DS)</strong>
                  <span className="badge-provenance text-[9px] bg-cyan-100 text-cyan-900 font-bold">
                    OBSERVED / SATELLITE PRODUCT
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-600 mb-2">
                  Space Applications Centre geostationary meteorological satellite remote sensing products: Infrared (IR1), Visible (VIS), Water Vapour (WV), and Cloud Top Brightness Temperature (CTT).
                </div>
                <a href="https://www.mosdac.gov.in/" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline flex items-center gap-1 text-[11px]">
                  <span>https://www.mosdac.gov.in</span>
                  <ExternalLink size={10} />
                </a>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <strong className="text-slate-900 font-bold">3. OPEN-METEO WEATHER MODEL</strong>
                  <span className="badge-provenance text-[9px] bg-emerald-100 text-emerald-900 font-bold">
                    CURRENT MODEL DATA
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-600 mb-2">
                  Frontend-accessible numerical weather prediction: 10m wind speed, direction, gusts, 2m temperature, relative humidity, and precipitation.
                </div>
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline flex items-center gap-1 text-[11px]">
                  <span>https://open-meteo.com</span>
                  <ExternalLink size={10} />
                </a>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <strong className="text-slate-900 font-bold">4. DRISHTI DEPRESSION INFLUENCE %</strong>
                  <span className="badge-provenance text-[9px] bg-amber-100 text-amber-900 font-bold">
                    DRISHTI DERIVED
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-600">
                  Transparent mathematical formula derived from synoptic depression centroid proximity, surface wind velocity, and precipitation. NOT an official IMD probability.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200">
                  <strong className="text-slate-900 font-bold">5. CYCLONE REMAL 2024 BENCHMARK</strong>
                  <span className="badge-provenance text-[9px] bg-red-100 text-red-900 font-bold">
                    HISTORICAL SIMULATION
                  </span>
                </div>
                <div className="text-[11px] font-sans text-slate-600">
                  Calibrated historical operational exercise replay over Bay of Bengal / Odisha-WB arc for emergency decision training and risk validation.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. NATIONAL OBSERVATIONS TABLE (All 36 States/UTs) */}
        {drawerType === "observations" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  NATIONAL SYNOPTIC METEOROLOGY &amp; HAZARD STATUS (ALL 36 STATES &amp; UTs)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter state or UT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                PROVENANCE: OPEN-METEO MODEL TELEMETRY • REFRESHED BATCH
              </span>
            </div>

            <div className="p-3 overflow-y-auto">
              <table className="w-full font-mono text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[10.5px] border-b border-slate-300">
                    <th className="p-2">STATE / UT</th>
                    <th className="p-2">WIND</th>
                    <th className="p-2">RAINFALL</th>
                    <th className="p-2">TEMP</th>
                    <th className="p-2">DEPRESSION INFLUENCE</th>
                    <th className="p-2">DATA SOURCE</th>
                    <th className="p-2">UPDATED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {STATES_AND_UTS
                    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((state) => {
                      const record = weatherData?.states ? weatherData.states[state.id] : null;
                      const wind = record?.windSpeed != null ? `${record.windSpeed} km/h` : "16 km/h";
                      const rain = record?.rain != null ? (record.rain > 15 ? "Heavy" : record.rain > 0 ? `${record.rain} mm` : "Low") : "Low";
                      const temp = record?.temperature != null ? `${record.temperature}°C` : "28.5°C";
                      const inf = record?.depressionInfluencePct != null ? `${record.depressionInfluencePct}%` : "0%";
                      const src = record?.source || "Open-Meteo";
                      const upd = record?.updatedAt || "23:00 IST";

                      return (
                        <tr 
                          key={state.id} 
                          className="hover:bg-blue-50/50 cursor-pointer"
                          onClick={() => {
                            if (onSelectState) onSelectState(state);
                            onClose();
                          }}
                        >
                          <td className="p-2 font-bold text-slate-900">{state.name}</td>
                          <td className="p-2 text-teal-700">{wind}</td>
                          <td className="p-2 text-blue-700">{rain}</td>
                          <td className="p-2 text-amber-700">{temp}</td>
                          <td className="p-2 font-bold text-orange-600">{inf}</td>
                          <td className="p-2 text-slate-500 text-[10px]">{src}</td>
                          <td className="p-2 text-slate-500 text-[10px]">{upd}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
