import React from "react";
import { 
  Wind, 
  Gauge, 
  Compass, 
  MapPin, 
  AlertCircle, 
  Info,
  Calendar,
  Navigation
} from "lucide-react";

export default function ScenarioBar({ currentScenario, activeStepId }) {
  const current = currentScenario?.current || {};

  return (
    <div className="scenario-bar">
      <div className="scenario-bar-inner">
        {/* Storm Overview */}
        <div className="cyclone-identity-card">
          <div className="cyclone-icon-pill">
            <Wind size={22} className="text-white" />
          </div>
          <div className="cyclone-names">
            <div className="flex items-center gap-2">
              <span className="cyclone-title">Cyclone REMAL</span>
              <span className="cyclone-tag font-mono">BOB-01-2024</span>
            </div>
            <div className="cyclone-subtitle text-slate-600 font-medium">
              {current.category || "Severe Cyclonic Storm"}
            </div>
          </div>
        </div>

        {/* Tactical Telemetry Metrics */}
        <div className="telemetry-grid">
          {/* Coordinates */}
          <div className="telemetry-card">
            <div className="metric-header">
              <MapPin size={13} className="text-slate-600" />
              <span>COORDINATES</span>
            </div>
            <div className="metric-value font-mono">
              {current.latitude?.toFixed(1)}°N, {current.longitude?.toFixed(1)}°E
            </div>
            <div className="metric-sub text-slate-500">
              {current.distanceToCoastKm > 0 
                ? `${current.distanceToCoastKm} km to coast` 
                : "Landfall In Progress / Inland"}
            </div>
          </div>

          {/* Wind Speed */}
          <div className="telemetry-card">
            <div className="metric-header">
              <Wind size={13} className="text-orange-600" />
              <span>SUSTAINED WIND</span>
            </div>
            <div className="metric-value font-mono text-orange-600">
              {current.windKt} kt <span className="metric-unit">({current.windKmh} km/h)</span>
            </div>
            <div className="metric-sub text-orange-700 font-medium">
              Gusts up to {current.gustKmh} km/h
            </div>
          </div>

          {/* Central Pressure */}
          <div className="telemetry-card">
            <div className="metric-header">
              <Gauge size={13} className="text-slate-600" />
              <span>CENTRAL PRESSURE</span>
            </div>
            <div className="metric-value font-mono text-slate-800">
              {current.pressureMb} <span className="metric-unit">hPa / mb</span>
            </div>
            <div className="metric-sub text-slate-500">
              Drop: -16 hPa / 24h
            </div>
          </div>

          {/* Movement Vector */}
          <div className="telemetry-card">
            <div className="metric-header">
              <Navigation size={13} className="text-slate-600" />
              <span>MOTION VECTOR</span>
            </div>
            <div className="metric-value font-mono">
              {current.movementDirection || "North"}
            </div>
            <div className="metric-sub text-slate-500">
              Speed: {current.movementSpeedKmh} km/h
            </div>
          </div>

          {/* Landfall Outlook */}
          <div className="telemetry-card landfall-card">
            <div className="metric-header">
              <Calendar size={13} className="text-red-600" />
              <span>LANDFALL WINDOW</span>
            </div>
            <div className="metric-value font-mono text-red-600">
              {current.landfallExpectedTime || "26 May ~22:30 IST"}
            </div>
            <div className="metric-sub text-red-700 font-medium flex items-center gap-1">
              <AlertCircle size={11} />
              <span>Sagar Island - Khepupara Arc</span>
            </div>
          </div>
        </div>

        {/* Simulation / Step Badge */}
        <div className="scenario-step-indicator">
          <div className="step-label">REPLAY TIMESTEP</div>
          <div className="step-badge-current font-mono">
            {activeStepId}
          </div>
          <div className="step-provenance-tag">
            [HISTORICAL DEMO]
          </div>
        </div>
      </div>
    </div>
  );
}
