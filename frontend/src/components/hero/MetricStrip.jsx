import React from "react";
import { Wind, Gauge, ShieldAlert, MapPin, Activity } from "lucide-react";

export default function MetricStrip({ currentScenario, districtsData = [], activeStepId = "NOW" }) {
  const current = currentScenario?.current || {};
  const highestDistrict = (districtsData && districtsData.length > 0)
    ? [...districtsData].sort((a, b) => (b.risk?.riskScore || 0) - (a.risk?.riskScore || 0))[0]
    : null;

  const topRisk = highestDistrict?.risk || {};

  return (
    <div className="metric-strip-bar">
      {/* 1. WIND */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <Wind size={13} className="text-orange-600" />
          <span>WIND</span>
        </div>
        <div className="metric-strip-val font-mono text-orange-600">
          {current.windKmh || 110} <span className="metric-strip-unit">km/h</span>
        </div>
        <div className="metric-strip-sub font-mono">
          Gusts {current.gustKmh || 135} km/h ({current.windKt || 60} kt)
        </div>
      </div>

      {/* 2. PRESSURE */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <Gauge size={13} className="text-slate-600" />
          <span>PRESSURE</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-800">
          {current.pressureMb || 986} <span className="metric-strip-unit">hPa</span>
        </div>
        <div className="metric-strip-sub font-mono">
          Central Min (Drop -16 hPa)
        </div>
      </div>

      {/* 3. RISK */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <ShieldAlert size={13} className="text-red-600" />
          <span>RISK</span>
        </div>
        <div className="metric-strip-val font-mono text-red-600">
          {topRisk.riskScore || 86}<span className="metric-strip-unit">/100</span>
        </div>
        <div className="metric-strip-sub font-mono text-red-700 font-bold">
          [{topRisk.riskBand || "EXTREME"}]
        </div>
      </div>

      {/* 4. DISTRICT */}
      <div className="metric-strip-item">
        <div className="metric-strip-header">
          <MapPin size={13} className="text-indigo-600" />
          <span>DISTRICT</span>
        </div>
        <div className="metric-strip-val font-sans text-slate-900 truncate">
          {highestDistrict ? highestDistrict.name : "Balasore"}
        </div>
        <div className="metric-strip-sub font-mono text-slate-500">
          {highestDistrict?.state || "Odisha"} • Peak Threat
        </div>
      </div>

      {/* 5. STATUS */}
      <div className="metric-strip-item status-strip-item">
        <div className="metric-strip-header">
          <Activity size={13} className="text-emerald-600" />
          <span>STATUS</span>
        </div>
        <div className="metric-strip-val font-mono text-slate-800 text-xs truncate">
          {current.category || "Severe Cyclonic Storm (SCS)"}
        </div>
        <div className="metric-strip-sub font-mono text-emerald-700 font-bold">
          HISTORICAL EXERCISE • [{activeStepId}]
        </div>
      </div>
    </div>
  );
}
