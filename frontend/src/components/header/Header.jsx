import React, { useState, useEffect } from "react";
import {
  Activity,
  Clock,
  Radio,
  Layers,
  Compass,
  CheckSquare,
  Globe,
  Sparkles
} from "lucide-react";

export default function Header({
  activeTab,
  setActiveTab,
  currentScenario: _currentScenario,
  backendStatus = "ONLINE",
  operatingMode = "DISASTER",
  onModeChange
}) {
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
      {/* 1. Indian National Tricolour Accent Line */}
      <div className="gov-tricolour-strip" aria-hidden="true">
        <div className="tricolour-saffron" />
        <div className="tricolour-white" />
        <div className="tricolour-green" />
      </div>

      {/* 2. Top Government Authority & Time Utility Strip */}
      <div className="gov-top-bar">
        <div className="gov-title-wrap">
          <span className="gov-national-tag">GOVERNMENT OF INDIA</span>
          <span className="gov-separator">|</span>
          <span className="gov-subtag">MINISTRY OF EARTH SCIENCES (MoES)</span>
          <span className="gov-separator">|</span>
          <span className="gov-portal-tag">METEOROLOGICAL HAZARD SURVEILLANCE CELL</span>
        </div>
        <div className="gov-meta-wrap">
          {operatingMode === "DISASTER" ? (
            <div className="badge-provenance">
              <Radio size={11} className="text-amber-600 animate-pulse" />
              <span>HISTORICAL SIMULATION • CYCLONE REMAL 2024</span>
            </div>
          ) : (
            <div className="badge-normal-status">
              <span className="normal-pulse-dot" />
              <span>NORMAL OPERATIONS • REGIONAL HAZARD MONITORING</span>
            </div>
          )}
          <div className="eoc-clock">
            <Clock size={11} />
            <span>IST: {formatIST(currentTime)}</span>
            <span className="text-slate-400">•</span>
            <span>UTC: {formatUTC(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* 3. Official Institutional Masthead */}
      <div className="institutional-masthead">
        {/* Left Column (30%): Primary Government Identity (GOI + IMD) */}
        <div className="masthead-col masthead-left">
          {/* Government of India National Emblem */}
          <div className="entity-block" title="Government of India">
            <img
              src="/assets/logos/emblem-india.png"
              alt="State Emblem of India"
              className="inst-logo logo-goi"
            />
            <div className="entity-text">
              <span className="entity-hindi">भारत सरकार</span>
              <span className="entity-en-primary">Government of India</span>
            </div>
          </div>

          <div className="masthead-divider" aria-hidden="true" />

          {/* India Meteorological Department (IMD) */}
          <div className="entity-block" title="India Meteorological Department • Ministry of Earth Sciences">
            <img
              src="/assets/logos/imd-logo.png"
              alt="India Meteorological Department"
              className="inst-logo logo-imd"
            />
            <div className="entity-text">
              <span className="entity-hindi">भारत मौसम विज्ञान विभाग</span>
              <span className="entity-en-primary font-bold">INDIA METEOROLOGICAL DEPARTMENT</span>
              <span className="entity-en-sub">Ministry of Earth Sciences</span>
            </div>
          </div>
        </div>

        {/* Center Column (40%): DRISHTI Project Identity */}
        <div className="masthead-col masthead-center">
          <div className="drishti-brand-wrap">
            <div className="brand-header-line">
              <h1 className="brand-acronym">DRISHTI</h1>
              <span className="badge-prototype">
                RESEARCH / DECISION-SUPPORT PROTOTYPE
              </span>
            </div>
            <div className="brand-fullname">
              Disaster Risk Intelligence &amp; Spatial Threat Insights
            </div>
            <div className="brand-caption font-mono">
              Decision-support prototype for cyclone risk intelligence
            </div>
          </div>
        </div>

        {/* Right Column (30%): Disaster Management Partners (NDMA + OSDMA) */}
        <div className="masthead-col masthead-right">
          {/* National Disaster Management Authority (NDMA) */}
          <div className="entity-block" title="National Disaster Management Authority">
            <img
              src="/assets/logos/ndma-logo.png"
              alt="National Disaster Management Authority"
              className="inst-logo logo-ndma"
            />
            <div className="entity-text">
              <span className="entity-hindi">राष्ट्रीय आपदा प्रबंधन प्राधिकरण</span>
              <span className="entity-en-primary font-bold">NDMA</span>
              <span className="entity-en-sub">Govt. of India</span>
            </div>
          </div>

          <div className="masthead-divider" aria-hidden="true" />

          {/* Odisha State Disaster Management Authority (OSDMA) */}
          <div className="entity-block" title="Odisha State Disaster Management Authority">
            <img
              src="/assets/logos/osdma-crest.png"
              alt="Odisha State Disaster Management Authority"
              className="inst-logo logo-osdma"
              onError={(e) => {
                e.currentTarget.src = "/assets/logos/osdma-logo.png";
              }}
            />
            <div className="entity-text">
              <span className="entity-hindi">ଓଡ଼ିଶା ରାଜ୍ୟ ବିପର୍ଯ୍ୟୟ ପରିଚାଳନା</span>
              <span className="entity-en-primary font-bold">OSDMA</span>
              <span className="entity-en-sub">Govt. of Odisha</span>
            </div>
          </div>

          <div className="masthead-divider" aria-hidden="true" />

          {/* System API Status Beacon */}
          <div className="system-status-indicator" title={backendStatus === "ONLINE" ? "FastAPI Backend Connected" : "Local Simulation Fallback Active"}>
            <span className={`status-beacon ${backendStatus === "ONLINE" ? "online" : "fallback"}`} />
            <span className="status-beacon-text font-mono">
              {backendStatus === "ONLINE" ? "API ONLINE" : "DEMO"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. DRISHTI Navigation Bar */}
      <nav className="drishti-nav">
        <div className="nav-items">
          <button
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={14} />
            <span>Command Center</span>
          </button>
          <button
            className={`nav-btn ${activeTab === "risk" ? "active" : ""}`}
            onClick={() => setActiveTab("risk")}
          >
            <Layers size={14} />
            <span>District Risk Matrix</span>
          </button>
          <button
            className={`nav-btn ${activeTab === "actions" ? "active" : ""}`}
            onClick={() => setActiveTab("actions")}
          >
            <CheckSquare size={14} />
            <span>Emergency SOP Directives</span>
          </button>
          <button
            className={`nav-btn ${activeTab === "scenarios" ? "active" : ""}`}
            onClick={() => setActiveTab("scenarios")}
          >
            <Compass size={14} />
            <span>Scenario Archive</span>
          </button>
          <button
            className={`nav-btn ${activeTab === "advisories" ? "active" : ""}`}
            onClick={() => setActiveTab("advisories")}
          >
            <Sparkles size={14} className={activeTab === "advisories" ? "text-orange-500" : ""} />
            <span>AI Advisories &amp; SOP</span>
          </button>
        </div>

        <div className="nav-secondary">
          {/* Government Operating Mode Selector */}
          <div className="operating-mode-selector" role="group" aria-label="Operating Posture Selector">
            <span className="mode-selector-label font-mono">POSTURE:</span>
            <div className="mode-toggle-pill">
              <button
                type="button"
                className={`mode-btn ${operatingMode === "NORMAL" ? "active-normal" : ""}`}
                onClick={() => onModeChange && onModeChange("NORMAL")}
                aria-pressed={operatingMode === "NORMAL"}
                title="Normal Operations: Routine regional hazard monitoring & preparedness"
              >
                <span className="mode-dot normal-dot" />
                <span>NORMAL OPERATIONS</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${operatingMode === "DISASTER" ? "active-disaster" : ""}`}
                onClick={() => onModeChange && onModeChange("DISASTER")}
                aria-pressed={operatingMode === "DISASTER"}
                title="Cyclone Response: Active emergency warning & decision support"
              >
                <span className="mode-dot disaster-dot" />
                <span>CYCLONE RESPONSE</span>
              </button>
            </div>
          </div>

          <span className="nav-info-pill">
            <Globe size={12} className="text-orange-600" />
            <span>Bay of Bengal / Odisha-WB Arc</span>
          </span>
        </div>
      </nav>
    </header>
  );
}
