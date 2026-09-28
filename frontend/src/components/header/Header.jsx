import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Radio, 
  AlertTriangle, 
  Layers, 
  FileText, 
  Compass, 
  CheckSquare,
  Globe
} from "lucide-react";

export default function Header({ activeTab, setActiveTab, currentScenario, backendStatus = "ONLINE" }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIST = (date) => {
    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const formatUTC = (date) => {
    return date.toLocaleTimeString("en-GB", {
      timeZone: "UTC",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <header className="drishti-header">
      {/* Top Gov Authority Bar */}
      <div className="gov-top-bar">
        <div className="gov-title-wrap">
          <span className="gov-national-tag">GOVERNMENT OF INDIA</span>
          <span className="gov-separator">|</span>
          <span className="gov-subtag">NATIONAL DISASTER MANAGEMENT AUTHORITY & OSDMA</span>
          <span className="gov-separator">|</span>
          <span className="gov-portal-tag">METEOROLOGICAL HAZARD SURVEILLANCE CELL</span>
        </div>
        <div className="gov-meta-wrap">
          <div className="badge-provenance">
            <Radio size={12} className="text-amber-600 animate-pulse" />
            <span>DATA PROVENANCE: HISTORICAL SIMULATION — CYCLONE REMAL 2024</span>
          </div>
          <div className="eoc-clock">
            <Clock size={12} />
            <span>IST: {formatIST(currentTime)}</span>
            <span className="text-slate-400">•</span>
            <span>UTC: {formatUTC(currentTime)}</span>
          </div>
          {/* Government of India Emblem (FAR RIGHT) - Placeholder for approved asset */}
          <div className="gov-emblem-slot" title="Government of India">
            <img 
              src="/emblem-of-india.svg" 
              alt="Government of India" 
              className="gov-emblem-asset"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector(".gov-emblem-placeholder");
                if (fallback) fallback.style.display = "inline-flex";
              }}
              style={{ display: "none" }}
            />
            <span className="gov-emblem-placeholder">
              [GOI EMBLEM]
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="main-header-bar">
        <div className="brand-section">
          <div className="brand-emblem">
            <ShieldAlert size={28} className="text-red-600" />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <h1 className="brand-acronym">DRISHTI</h1>
              <span className="version-tag">v1.0-MVP</span>
              <span className="badge-emergency">
                <AlertTriangle size={12} />
                ALERT LEVEL 3: SEVERE
              </span>
            </div>
            <p className="brand-fullname">
              Disaster Risk Intelligence & Surveillance Hazard Tracking Interface
            </p>
          </div>
        </div>

        {/* Operational Bulletin Status */}
        <div className="operational-status-block">
          <div className="status-item">
            <span className="status-label">ACTIVE MONITORING</span>
            <span className="status-value text-red-600 font-mono">
              CYCLONE REMAL (BOB/01)
            </span>
          </div>
          <div className="status-divider"></div>
          <div className="status-item">
            <span className="status-label">CURRENT INTENSITY</span>
            <span className="status-value text-amber-700 font-mono">
              {currentScenario?.current?.category || "Severe Cyclonic Storm"}
            </span>
          </div>
          <div className="status-divider"></div>
          <div className="status-item">
            <span className="status-label">BACKEND API</span>
            {backendStatus === "ONLINE" ? (
              <span className="status-value text-emerald-700 font-mono flex items-center gap-1" title="Connected to FastAPI backend">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
                FASTAPI ONLINE
              </span>
            ) : backendStatus === "CHECKING" ? (
              <span className="status-value text-slate-500 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block animate-pulse"></span>
                CONNECTING...
              </span>
            ) : (
              <span className="status-value text-amber-700 font-mono flex items-center gap-1" title="FastAPI unavailable, using local simulation fallback">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                DEMO FALLBACK
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="drishti-nav">
        <div className="nav-items">
          <button 
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={15} />
            <span>Command Center</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === "risk" ? "active" : ""}`}
            onClick={() => setActiveTab("risk")}
          >
            <Layers size={15} />
            <span>District Risk Matrix</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === "actions" ? "active" : ""}`}
            onClick={() => setActiveTab("actions")}
          >
            <CheckSquare size={15} />
            <span>Emergency SOP Directives</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === "scenarios" ? "active" : ""}`}
            onClick={() => setActiveTab("scenarios")}
          >
            <Compass size={15} />
            <span>Scenario Archive</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === "advisories" ? "active" : ""}`}
            onClick={() => setActiveTab("advisories")}
          >
            <FileText size={15} />
            <span>IMD Advisories</span>
          </button>
        </div>

        <div className="nav-secondary">
          <span className="nav-info-pill">
            <Globe size={13} className="text-orange-600" />
            <span>Bay of Bengal / Odisha-WB Arc</span>
          </span>
        </div>
      </nav>
    </header>
  );
}
