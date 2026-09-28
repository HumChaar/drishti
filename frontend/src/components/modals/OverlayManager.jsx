import React, { useEffect, useState } from "react";
import {
  X,
  Radio,
  AlertTriangle,
  Database,
  ExternalLink,
  Search,
  Activity,
  Bell,
  Satellite,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import SatellitePanel from "../satellite/SatellitePanel";
import { STATES_AND_UTS } from "../../data/indiaGeography";

/**
 * OverlayManager
 * Centralized Single Overlay System for DRISHTI Meteorological Command Centre
 * 
 * Enforces rule: ONLY ONE OVERLAY MAY EXIST AT A TIME.
 * Centralizes:
 * - Backdrop
 * - z-index (1500)
 * - Close button
 * - Escape key listener
 * - Click-outside handler
 * - Max-height (85vh) & scroll containment
 * - Sourcing Provenance
 */
export default function OverlayManager({
  activeOverlay, // null | "alerts" | "notifications" | "satellite" | "bulletin" | "warning" | "advisory" | "scenario" | "sources" | "observations"
  onClose,
  data, // normalized data from meteorologicalDataService
  onSelectState,
  onLaunchDisasterMode
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [readOverrides, setReadOverrides] = useState({});

  const notifications = (data?.notifications || []).map((n) => ({
    ...n,
    isRead: readOverrides[n.id] !== undefined ? readOverrides[n.id] : n.isRead
  }));

  const markAllRead = () => {
    const all = {};
    (data?.notifications || []).forEach((n) => {
      all[n.id] = true;
    });
    setReadOverrides(all);
  };
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && activeOverlay) {
        onClose();
      }
    }
    if (activeOverlay) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, onClose]);

  if (!activeOverlay) return null;

  // Normalize aliases
  const overlayKey =
    activeOverlay === "bulletins" ? "bulletin" :
    activeOverlay === "warnings" || activeOverlay === "alerts" ? "warning" :
    activeOverlay;


  const getNotifIcon = (type) => {
    switch (type) {
      case "WARNING":
        return <AlertTriangle size={13} className="text-red-600" />;
      case "BULLETIN":
        return <Radio size={13} className="text-orange-600" />;
      case "SATELLITE":
        return <Satellite size={13} className="text-cyan-600" />;
      default:
        return <ShieldCheck size={13} className="text-blue-600" />;
    }
  };

  return (
    <div
      className="operational-overlay-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Operational Command Overlay"
    >
      <div
        className="operational-overlay-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. NOTIFICATIONS OVERLAY */}
        {overlayKey === "notifications" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  OPERATIONAL NOTIFICATION CENTRE
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-mono text-blue-300 hover:text-white underline"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white p-1 rounded"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-mono text-slate-600 flex items-center justify-between">
              <span>ACTIVE SYSTEM BROADCASTS</span>
              <span className="font-bold text-blue-900">VERIFIED NEOC / IMD FEEDS</span>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-2.5 max-h-[70vh]">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    item.isRead
                      ? "bg-slate-50 border-slate-200 text-slate-700"
                      : "bg-blue-50/60 border-blue-200 text-slate-900"
                  }`}
                  onClick={() => {
                    setReadOverrides((prev) => ({ ...prev, [item.id]: true }));
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      {getNotifIcon(item.type)}
                      <span>{item.title}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {item.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] font-mono mt-1 text-slate-600">
                    <span>REGION: {item.region}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold text-[9px]">
                      {item.provenance}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-slate-100 border-t border-slate-200 font-mono text-[10px] text-slate-500 flex items-center justify-between">
              <span>PROVENANCE: MULTI-HAZARD EVENT BUS</span>
              <span className="text-blue-700 font-bold">MoES • IMD</span>
            </div>
          </div>
        )}

        {/* 2. SATELLITE OVERLAY */}
        {overlayKey === "satellite" && (
          <SatellitePanel onClose={onClose} />
        )}

        {/* 3. IMD METEOROLOGICAL BULLETINS */}
        {overlayKey === "bulletin" && (
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
                aria-label="Close"
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

              {(data?.bulletins || []).map((b) => (
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

        {/* 4. IMD EMERGENCY WARNINGS */}
        {overlayKey === "warning" && (
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
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              {(data?.warnings || []).map((alert) => (
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
                    <strong>Region / Affected Sector:</strong> {alert.region}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span>SOURCE: {alert.source}</span>
                    <span className="badge-provenance">{alert.provenance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. DATA SOURCES & STRICT PROVENANCE */}
        {overlayKey === "sources" && (
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
                aria-label="Close"
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

        {/* 6. NATIONAL OBSERVATIONS TABLE */}
        {overlayKey === "observations" && (
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
                aria-label="Close"
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
                      const record = data?.states?.find((s) => s.id === state.id);
                      const hasData = record && record.hasData !== false;
                      const wind = hasData && record.windSpeed != null ? `${record.windSpeed} km/h` : "NO DATA";
                      const rain = hasData && record.rain != null ? (record.rain > 15 ? "Heavy" : record.rain > 0 ? `${record.rain} mm` : "Low") : "NO DATA";
                      const temp = hasData && record.temperature != null ? `${record.temperature}°C` : "NO DATA";
                      const inf = hasData && record.depressionInfluencePct != null ? `${record.depressionInfluencePct}%` : "N/A";
                      const src = record?.source || "Open-Meteo";
                      const upd = record?.updatedAt || data?.timestamp?.timeShort || "IST";

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

        {/* 7. ADVISORY OVERLAY */}
        {overlayKey === "advisory" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-orange-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  OPERATIONAL DECISION DIRECTIVE &amp; ADVISORY
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              <div className="p-3 bg-orange-50 border border-orange-200 rounded text-slate-800">
                <div className="flex items-center justify-between pb-1.5 border-b border-orange-200 mb-2">
                  <span className="font-bold text-orange-950">AI EXPLANATION &amp; SYNOPTIC SYNTHESIS</span>
                  <span className="badge-provenance text-[9px] bg-orange-100 text-orange-900">DRISHTI DECISION ENGINE</span>
                </div>
                <p className="font-sans text-xs text-slate-700 leading-relaxed mb-3">
                  System depression tracks across Central India are exerting high hydraulic stress in Northeast Madhya Pradesh and adjoining Chhattisgarh river basins. Precautionary activation of SDRF quick response teams is advised.
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-white rounded border border-orange-200">
                  <div><strong>Human Review:</strong> <span className="text-emerald-700 font-bold">COMPLETED</span></div>
                  <div><strong>Authorization Status:</strong> <span className="text-blue-700 font-bold">APPROVED (NEOC WATCH OFFICER)</span></div>
                  <div className="col-span-2"><strong>Dispatch Status:</strong> <span className="text-slate-700 font-semibold">TRANSMITTED TO STATE EOCs (MP, CG, UP)</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. SCENARIO OVERLAY */}
        {overlayKey === "scenario" && (
          <div className="drawer-panel-card bg-white rounded-lg border border-slate-300 shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="drawer-header bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-red-400" />
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  HISTORICAL SIMULATION EXERCISE ARCHIVE
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-bold text-red-950 text-xs mb-1">
                  CYCLONE REMAL (MAY 2024) CALIBRATED EXERCISE
                </h4>
                <p className="font-sans text-xs text-slate-700 leading-relaxed mb-3">
                  Replays the multi-temporal progression of Severe Cyclonic Storm Remal across the Bay of Bengal into West Bengal and Bangladesh. Features deterministic 8-district risk scoring, SegFormer inundation inference, and Gemini multi-lingual advisory generation.
                </p>
                {onLaunchDisasterMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onLaunchDisasterMode();
                      onClose();
                    }}
                    className="w-full py-2 bg-red-700 hover:bg-red-800 text-white rounded font-bold text-xs shadow transition-colors"
                  >
                    LAUNCH CYCLONE RESPONSE MODE
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
