import React, { useState } from "react";
import { 
  Building2, 
  Search, 
  MapPin, 
  CheckCircle2, 
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { INDIA_REGIONS, STATES_AND_UTS } from "../../data/indiaGeography";

export default function StateReadinessMatrix({ 
  selectedState, 
  onSelectState, 
  onLaunchDisasterMode 
}) {
  const [activeRegionFilter, setActiveRegionFilter] = useState("ALL INDIA");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStates = STATES_AND_UTS.filter((s) => {
    const matchesRegion = activeRegionFilter === "ALL INDIA" || s.region === activeRegionFilter;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.capital.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <div className="state-readiness-matrix-card">
      <div className="table-section-header">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-700" />
          <div>
            <h3 className="section-heading">STATE &amp; UNION TERRITORY RESILIENCE &amp; READINESS MATRIX</h3>
            <span className="text-[10px] text-slate-500 font-mono">
              36 States &amp; UTs • National Emergency Operations Center (NEOC) Inter-Agency Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="normal-search-box">
            <Search size={13} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search state, capital..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="normal-search-input"
            />
          </div>
          <span className="badge-provenance text-[10px]">PAN-INDIA REGISTRY</span>
        </div>
      </div>

      {/* Region Filter Chips */}
      <div className="region-filter-bar">
        {INDIA_REGIONS.map((reg) => (
          <button
            key={reg}
            type="button"
            className={`region-tab-chip font-mono ${activeRegionFilter === reg ? "active" : ""}`}
            onClick={() => setActiveRegionFilter(reg)}
          >
            {reg}
          </button>
        ))}
      </div>

      <div className="normal-table-wrapper">
        <table className="normal-data-table">
          <thead>
            <tr>
              <th>REGION</th>
              <th>STATE / UT</th>
              <th>HAZARD STATUS</th>
              <th>DISTRICTS</th>
              <th>CRITICAL ASSETS</th>
              <th>PREPAREDNESS PROTOCOL</th>
              <th>DATA HEALTH</th>
              <th>LAST UPDATE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredStates.map((s) => {
              const isSelected = selectedState?.id === s.id;
              const isConnected = s.hasBackendData;

              return (
                <tr 
                  key={s.id} 
                  className={`${isConnected ? "connected-state-row" : ""} ${isSelected ? "selected-row" : ""}`}
                  onClick={() => onSelectState(s)}
                >
                  <td className="font-mono text-[10px] text-slate-500 font-bold whitespace-nowrap">
                    {s.region}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className={isConnected ? "text-blue-600" : "text-slate-400"} />
                      <strong className="text-slate-900 text-xs">{s.name}</strong>
                      <span className="text-[9px] px-1 bg-slate-100 text-slate-500 rounded font-mono">{s.type}</span>
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-500 block ml-4">
                      Capital: {s.capital}
                    </span>
                  </td>
                  <td>
                    {isConnected ? (
                      <span className="status-pill-normal font-mono">
                        <span className="pill-dot-green"></span>
                        ROUTINE (PILOT)
                      </span>
                    ) : (
                      <span className="status-pill-pending font-mono">
                        <HelpCircle size={10} className="text-slate-400" />
                        SURVEILLANCE
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-xs">
                    {isConnected ? (
                      <span className="text-blue-700 font-bold">
                        {s.monitoredDistrictsCount} Monitored / {s.totalDistrictsCount} Total
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        N/A ({s.totalDistrictsCount} Total)
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-xs">
                    {isConnected ? (
                      <span className="text-slate-900 font-bold">11 Assets Connected</span>
                    ) : (
                      <span className="text-slate-400">N/A (Pending)</span>
                    )}
                  </td>
                  <td>
                    <span className={`text-[10.5px] font-mono font-medium ${isConnected ? "text-emerald-700" : "text-slate-600"}`}>
                      {isConnected ? "LEVEL 1 READY (ODRAF/NDRF)" : "STATE EOC STANDBY"}
                    </span>
                  </td>
                  <td>
                    {isConnected ? (
                      <span className="text-[10px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        BACKEND ONLINE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <HelpCircle size={10} />
                        STAGE 2 INGESTION
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-xs text-slate-600">
                    {isConnected ? "06:00 IST Today" : "—"}
                  </td>
                  <td>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="audit-view-btn font-mono text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectState(s);
                          }}
                        >
                          EXPLORE
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 text-white rounded text-[9.5px] font-bold font-mono hover:bg-orange-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onLaunchDisasterMode) onLaunchDisasterMode();
                          }}
                          title="Launch Cyclone Remal Simulation for this region"
                        >
                          <span>REMAL</span>
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="audit-view-btn font-mono text-[9.5px] text-slate-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectState(s);
                        }}
                      >
                        VIEW REGION
                      </button>
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
          <span className="font-bold text-slate-800">DATA TRANSPARENCY: </span>
          <span>Only Odisha &amp; West Bengal have active multi-modal hazard APIs in this MVP stage; other states reflect administrative topology awaiting data integration.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-blue-700 font-bold">★ CONNECTED DEMO STATES (2)</span>
          <span className="text-slate-500 font-medium">STAGE 2 PIPELINE (34)</span>
        </div>
      </div>
    </div>
  );
}
