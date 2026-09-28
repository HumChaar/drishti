import React from "react";
import { CheckCircle2, ShieldCheck, Anchor, Radio, Activity, AlertCircle } from "lucide-react";

export default function NormalKpiStrip({ infraCount = 11, districtCount = 8, selectedState }) {
  const isStateSelected = !!selectedState;
  const isConnected = selectedState?.hasBackendData;

  return (
    <div className="metric-strip-bar national-kpi-bar">
      {/* 1. NATIONAL STATUS */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>{isStateSelected ? `${selectedState.name.toUpperCase()} STATUS` : "NATIONAL STATUS"}</span>
        </div>
        <div className="metric-strip-val font-mono text-emerald-700">
          ROUTINE MONITORING
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          {isStateSelected
            ? (isConnected ? "All Clear • Stage Green Watch" : "Administrative Scope Active")
            : "All India • No Severe National Alert"}
        </div>
      </div>

      {/* 2. STATES & UTs SCOPE */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <ShieldCheck size={13} className="text-blue-600" />
          <span>STATES &amp; UTs</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-900">
          36 <span className="metric-strip-unit">JURISDICTIONS</span>
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          28 States • 8 Union Territories
        </div>
      </div>

      {/* 3. DISTRICTS COVERAGE */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <Activity size={13} className="text-indigo-600" />
          <span>DISTRICT COVERAGE</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-900">
          {isStateSelected && !isConnected ? (
            <span className="text-slate-500 text-xs">N/A <span className="text-[10px] text-slate-400">({selectedState.totalDistrictsCount} Pending)</span></span>
          ) : (
            <span>{districtCount} <span className="metric-strip-unit">ACTIVE / 788 NAT.</span></span>
          )}
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          {isStateSelected
            ? (isConnected ? `${selectedState.name} Coastal Registry` : "Ingestion Pipeline Scheduled")
            : "Odisha & West Bengal Pilot Connected"}
        </div>
      </div>

      {/* 4. ACTIVE HAZARDS */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <AlertCircle size={13} className="text-teal-600" />
          <span>ACTIVE HAZARDS</span>
        </div>
        <div className="metric-strip-val font-mono text-teal-700">
          NONE DETECTED
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          Routine Synoptic Watch • 12 Categories
        </div>
      </div>

      {/* 5. CRITICAL INFRASTRUCTURE */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <Anchor size={13} className="text-indigo-600" />
          <span>CRITICAL ASSETS</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-900">
          {isStateSelected && !isConnected ? (
            <span className="text-slate-500 text-xs">N/A <span className="text-[10px] text-slate-400">(Pending)</span></span>
          ) : (
            <span>{infraCount} <span className="metric-strip-unit">CONNECTED</span></span>
          )}
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          {isStateSelected && !isConnected
            ? "Asset Registry Unconnected"
            : "Ports, Power, Shelters & Hospitals"}
        </div>
      </div>

      {/* 6. TELEMETRY & DATA HEALTH */}
      <div className="metric-strip-item status-strip-item">
        <div className="metric-strip-header">
          <Radio size={13} className="text-emerald-600" />
          <span>DATA HEALTH</span>
        </div>
        <div className="metric-strip-val font-mono text-emerald-700 text-xs truncate">
          IMD • INCOIS • NDMA
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          Doppler Radar • Buoys • AWS Online
        </div>
      </div>
    </div>
  );
}
