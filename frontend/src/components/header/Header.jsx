import React, { useState, useEffect } from "react";
import {
  Activity,
  Clock,
  Radio,
  Layers,
  Compass,
  AlertTriangle,
  Building2,
  Anchor,
  Sparkles,
  Database,
  ClipboardList,
  Satellite,
  Zap,
  Wind,
  CloudRain
} from "lucide-react";
import StateSelector from "../national/StateSelector";
import NotificationCenter from "./NotificationCenter";

export default function Header({
  activeTab,
  setActiveTab,
  currentScenario: _currentScenario,
  backendStatus = "ONLINE",
  operatingMode = "NORMAL",
  onModeChange,
  selectedState,
  onSelectState,
  onOpenDrawer,
  unreadNotificationsCount = 0
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatISTDate = (date) => {
    const day = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata"
    }).toUpperCase();
    const time = date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    return `${day} • ${time} IST`;
  };

  const isNormal = operatingMode === "NORMAL";

  // IMD-Style Primary Navigation Items per Operating Mode
  const normalNavItems = [
    { id: "dashboard", label: "COMMAND CENTRE", icon: Activity },
    { id: "weather", label: "WEATHER", icon: Wind },
    { id: "hazards", label: "HAZARDS", icon: AlertTriangle },
    { id: "states", label: "STATE MONITOR", icon: Building2 },
    { id: "satellite", label: "SATELLITE", icon: Satellite, isDrawer: true },
    { id: "radar", label: "RADAR", icon: Compass, isDrawer: true },
    { id: "observations", label: "OBSERVATIONS", icon: Zap, isDrawer: true },
    { id: "scenarios", label: "SCENARIOS", icon: Compass },
    { id: "advisories", label: "ADVISORIES", icon: Sparkles }
  ];

  const disasterNavItems = [
    { id: "dashboard", label: "SITUATION", icon: Activity },
    { id: "track", label: "TRACK", icon: Compass, isLayerSwitch: true },
    { id: "wind", label: "WIND", icon: Wind, isLayerSwitch: true },
    { id: "rain", label: "RAIN", icon: CloudRain, isLayerSwitch: true },
    { id: "risk", label: "RISK", icon: Layers },
    { id: "infra", label: "INFRASTRUCTURE", icon: Anchor },
    { id: "evidence", label: "EVIDENCE", icon: Database },
    { id: "advisories", label: "ADVISORY", icon: Sparkles },
    { id: "activity", label: "OPERATIONS", icon: ClipboardList }
  ];

  const navItems = isNormal ? normalNavItems : disasterNavItems;

  const handleNavClick = (item) => {
    if (item.isDrawer && onOpenDrawer) {
      onOpenDrawer(item.id);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <header className="drishti-header">
      {/* 1. Indian National Tricolour Accent Line */}
      <div className="gov-tricolour-strip" aria-hidden="true">
        <div className="tricolour-saffron" />
        <div className="tricolour-white" />
        <div className="tricolour-green" />
      </div>

      {/* 2. Top Government Authority & Dynamic IST Clock Strip */}
      <div className="gov-top-bar">
        <div className="gov-title-wrap">
          <span className="gov-national-tag">GOVERNMENT OF INDIA</span>
          <span className="gov-separator">|</span>
          <span className="gov-subtag">MINISTRY OF EARTH SCIENCES (MoES)</span>
          <span className="gov-separator">|</span>
          <span className="gov-portal-tag">INDIA METEOROLOGICAL DEPARTMENT (IMD)</span>
        </div>

        <div className="gov-meta-wrap">
          {operatingMode === "DISASTER" ? (
            <div className="badge-provenance">
              <Radio size={11} className="text-amber-600 animate-pulse" />
              <span>ACTIVE EVENT: CYCLONE REMAL 2024 (HISTORICAL SIMULATION • BAY OF BENGAL ARC)</span>
            </div>
          ) : (
            <div className="badge-normal-status">
              <span className="normal-pulse-dot" />
              <span>NATIONAL MONITORING • ALL INDIA • ROUTINE SURVEILLANCE</span>
            </div>
          )}
          <div className="eoc-clock">
            <Clock size={11} />
            <span>{formatISTDate(currentTime)}</span>
          </div>
        </div>
      </div>

      {/* 3. Official Institutional Masthead */}
      <div className="institutional-masthead">
        {/* Left Column: Primary Government Identity (GOI + IMD) */}
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

        {/* Center Column: DRISHTI Project Identity */}
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
              National Multi-Hazard Decision Support System • MoES &amp; IMD Standards
            </div>
          </div>
        </div>

        {/* Right Column: Disaster Management Partners & Utilities */}
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

          {/* Notification Centre Trigger */}
          <NotificationCenter
            unreadCount={unreadNotificationsCount}
            onOpenNotifications={() => onOpenDrawer && onOpenDrawer("notifications")}
          />

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

      {/* 4. IMD-Style Primary Operational Navigation Bar */}
      <nav className="drishti-nav" aria-label="Command Centre Navigation">
        <div className="nav-items">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-btn ${isCurrent ? "active" : ""}`}
                onClick={() => handleNavClick(item)}
                title={`${item.label} Operational Workspace`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="nav-secondary">
          {/* Pan-India State / UT Selector */}
          <StateSelector
            selectedState={selectedState}
            onSelectState={onSelectState}
          />

          {/* Highly Visible Government Operating Mode Switch */}
          <div className="operating-mode-selector" role="group" aria-label="Operational Mode Selector">
            <div className="mode-toggle-pill">
              <button
                type="button"
                className={`mode-btn ${isNormal ? "active-normal font-bold" : ""}`}
                onClick={() => onModeChange && onModeChange("NORMAL")}
                aria-pressed={isNormal}
                title="Normal Operations: Routine National Hazard Monitoring & Preparedness"
              >
                <span className="mode-dot normal-dot" />
                <span>NORMAL OPERATIONS</span>
              </button>
              <button
                type="button"
                className={`mode-btn ${!isNormal ? "active-disaster font-bold" : ""}`}
                onClick={() => onModeChange && onModeChange("DISASTER")}
                aria-pressed={!isNormal}
                title="Cyclone / Disaster Response: Active Emergency Early Warning & Decision Support"
              >
                <span className="mode-dot disaster-dot" />
                <span>⚠ CYCLONE / DISASTER RESPONSE</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
