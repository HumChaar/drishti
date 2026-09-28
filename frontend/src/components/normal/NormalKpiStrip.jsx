import React from "react";
import { CheckCircle2, ShieldCheck, Anchor, Radio, Activity } from "lucide-react";

export default function NormalKpiStrip({ infraCount = 11, districtCount = 8 }) {
  return (
    <div className="metric-strip-bar normal-mode-kpi">
      {/* 1. REGIONAL STATUS */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>REGIONAL STATUS</span>
        </div>
        <div className="metric-strip-val font-mono text-emerald-700">
          ALL CLEAR
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          No Active Depression • Stage Green
        </div>
      </div>

      {/* 2. DISTRICTS MONITORED */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <ShieldCheck size={13} className="text-blue-600" />
          <span>DISTRICTS MONITORED</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-900">
          {districtCount} <span className="metric-strip-unit">COASTAL</span>
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          Odisha (4) • West Bengal (4)
        </div>
      </div>

      {/* 3. INFRASTRUCTURE ASSETS */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <Anchor size={13} className="text-indigo-600" />
          <span>CRITICAL ASSETS</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-900">
          {infraCount} <span className="metric-strip-unit">AUDITED</span>
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          Ports, Power, Shelters &amp; Grids Ready
        </div>
      </div>

      {/* 4. PREPAREDNESS STATUS */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <Activity size={13} className="text-teal-600" />
          <span>PREPAREDNESS</span>
        </div>
        <div className="metric-strip-val font-mono text-teal-700">
          LEVEL 1 READY
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          ODRAF / NDRF Standby • Stocks Audited
        </div>
      </div>

      {/* 5. DATA HEALTH */}
      <div className="metric-strip-item status-strip-item">
        <div className="metric-strip-header">
          <Radio size={13} className="text-emerald-600" />
          <span>TELEMETRY HEALTH</span>
        </div>
        <div className="metric-strip-val font-mono text-emerald-700">
          100% ONLINE
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          IMD Radar • INCOIS Buoys • AWS Live
        </div>
      </div>
    </div>
  );
}
