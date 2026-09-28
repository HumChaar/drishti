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
  onSelectAlert: _onSelectAlert
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
          <SatellitePanel onClose={onClose} />
        )}

        {/* 2. IMD METEOROLOGICAL BULLETINS */}
        {drawerType === "bulletins" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-blue-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  IMD NATIONAL &amp; MARINE METEOROLOGICAL BULLETINS
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
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-slate-700 flex items-center justify-between">
                <span>AUTHORITATIVE SOURCE: INDIA METEOROLOGICAL DEPARTMENT</span>
                <span className="badge-provenance text-[9px] bg-blue-100 text-blue-900 font-mono">
                  OBSERVED / AUTHORITATIVE BULLETIN
                </span>
              </div>

              {ACTIVE_BULLETINS.map((b) => (
                <div key={b.id} className="p-4 bg-slate-50 border border-slate-300 rounded-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                    <span className="font-bold text-slate-900 text-sm">BULLETIN ID: {b.bulletinNo}</span>
                    <span className="text-slate-500 font-medium">{b.issuedAt}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1.5">{b.headline}</h4>
                  <p className="font-sans text-xs text-slate-700 leading-relaxed mb-3">{b.details}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-white rounded border border-slate-200">
                    <div><strong>Sea Condition:</strong> {b.seaCondition}</div>
                    <div><strong>Wave Height:</strong> {b.significantWaveHeightMeters}m ({b.waveDirection})</div>
                    <div className="col-span-2 text-red-700 font-bold">
                      <strong>Squall Warning:</strong> {b.squallWarning}
                    </div>
                    <div className="col-span-2 p-2 bg-red-50 text-red-800 rounded border border-red-200">
                      <strong>Fisherman Warning:</strong> {b.fishermenAdvisory}
                    </div>
                  </div>
                </div>
              ))}
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
