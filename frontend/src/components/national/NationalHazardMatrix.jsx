import React, { useState } from "react";
import { 
  AlertTriangle, 
  Search, 
  Wind, 
  Waves, 
  CloudRain, 
  Sun, 
  Snowflake, 
  Zap, 
  Flame, 
  Activity,
  Mountain,
  Compass,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { NATIONAL_HAZARD_REGISTRY } from "../../data/indiaGeography";
import { useLanguage } from "../../language";

export default function NationalHazardMatrix({ operatingMode = "NORMAL", onLaunchSimulation }) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const isDisaster = operatingMode === "DISASTER";

  const getHazardIcon = (id) => {
    switch (id) {
      case "cyclone": return <Wind size={14} className="text-orange-600" />;
      case "flood": return <Waves size={14} className="text-blue-600" />;
      case "rain": return <CloudRain size={14} className="text-indigo-600" />;
      case "coastal": return <Compass size={14} className="text-teal-600" />;
      case "heat": return <Sun size={14} className="text-amber-600" />;
      case "cold": return <Snowflake size={14} className="text-cyan-600" />;
      case "thunderstorm": return <Zap size={14} className="text-amber-500" />;
      case "earthquake": return <Activity size={14} className="text-red-600" />;
      case "landslide": return <Mountain size={14} className="text-stone-600" />;
      case "forestfire": return <Flame size={14} className="text-rose-600" />;
      default: return <AlertTriangle size={14} className="text-slate-500" />;
    }
  };

  const filteredHazards = NATIONAL_HAZARD_REGISTRY.filter((h) =>
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="national-hazard-matrix-card">
      <div className="table-section-header">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className={isDisaster ? "text-amber-600" : "text-blue-700"} />
          <div>
            <h3 className="section-heading">{t("NATIONAL MULTI-HAZARD SURVEILLANCE MATRIX")}</h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {t("12 Primary Natural Hazard Categories Monitored Across India • Real-Time MoES & IMD Standards")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="normal-search-box">
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              placeholder={t("Search hazard or agency...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="normal-search-input"
            />
          </div>
          <span className="badge-provenance text-[10px]">
            {t(isDisaster ? "EVENT SURGE PROTOCOL" : "ROUTINE SYNOPSIS")}
          </span>
        </div>
      </div>

      <div className="normal-table-wrapper">
        <table className="normal-data-table">
          <thead>
            <tr>
              <th>{t("HAZARD CATEGORY")}</th>
              <th>{t("OPERATIONAL STATUS")}</th>
              <th>{t("AFFECTED GEOGRAPHY")}</th>
              <th>{t("SEVERITY LEVEL")}</th>
              <th>{t("OFFICIAL SOURCE / NETWORK")}</th>
              <th>{t("DATA PROVENANCE")}</th>
              <th>{t("ACTION")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredHazards.map((h) => {
              const statusText = isDisaster ? h.statusDisaster : h.statusNormal;
              const regionText = isDisaster ? h.affectedRegionDisaster : h.affectedRegionNormal;
              const severityText = isDisaster ? h.severityDisaster : h.severityNormal;
              const isSevere = severityText.includes("HIGH") || severityText.includes("CRITICAL") || severityText.includes("SEVERE");
              const isNotConnected = h.provenance === "NOT CONNECTED";

              return (
                <tr key={h.id} className={h.connected ? (isSevere ? "severe-hazard-row" : "connected-hazard-row") : ""}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="hazard-icon-circle">
                        {getHazardIcon(h.id)}
                      </span>
                      <div>
                        <strong className="text-slate-900 block text-xs">{t(h.name)}</strong>
                        <span className="text-[9.5px] font-mono text-slate-500">ID: HAZ-{h.id.toUpperCase()}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`hazard-status-pill font-mono ${isNotConnected ? "pill-not-connected" : (isSevere ? "pill-severe" : "pill-normal")}`}>
                      {isNotConnected ? (
                        <HelpCircle size={10} />
                      ) : (
                        <CheckCircle2 size={10} />
                      )}
                      <span>{t(statusText)}</span>
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-700">
                    {t(regionText)}
                  </td>
                  <td>
                    <span className={`font-mono text-xs font-bold ${isSevere ? "text-red-700" : (isNotConnected ? "text-slate-400" : "text-emerald-700")}`}>
                      {t(severityText)}
                    </span>
                  </td>
                  <td>
                    <div className="text-xs text-slate-800 font-medium">{h.source}</div>
                    <span className="text-[9.5px] font-mono text-slate-500">{h.lastUpdate}</span>
                  </td>
                  <td>
                    <span className={`badge-provenance text-[9px] ${h.provenance.includes("OBSERVED") ? "prov-obs" : (h.provenance.includes("DERIVED") ? "prov-der" : "prov-sim")}`}>
                      {t(h.provenance)}
                    </span>
                  </td>
                  <td>
                    {h.id === "cyclone" && !isDisaster && (
                      <button
                        type="button"
                        onClick={onLaunchSimulation}
                        className="audit-view-btn font-mono text-[9.5px]"
                        title="Launch Cyclone Remal Demonstration Simulation"
                      >
                        {t("REMAL SIMULATION")}
                      </button>
                    )}
                    {h.id !== "cyclone" && h.connected && (
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">{t("LIVE TELEMETRY")}</span>
                    )}
                    {!h.connected && (
                      <span className="text-[10px] font-mono text-slate-400">{t("STAGE 2 INGESTION")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-[10.5px] font-mono text-slate-600">
        <div>
          <span className="font-bold text-slate-800">DATA POLICY: </span>
          <span>National hazard layers with active backend APIs show real verified status; unintegrated sensors are explicitly labeled as STAGE 2 INGESTION / NOT CONNECTED.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span> CONNECTED (4)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> INGESTION PENDING (8)</span>
        </div>
      </div>
    </div>
  );
}
