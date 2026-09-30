import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/header/Header";
import MapContainer from "./components/map/MapContainer";
import TimelineControl from "./components/map/TimelineControl";
import AdvisoryPanel from "./components/insights/AdvisoryPanel";
import ActivityLog from "./components/activity/ActivityLog";
import PreparednessActions from "./components/actions/PreparednessActions";
import NationalHazardMatrix from "./components/national/NationalHazardMatrix";
import StateReadinessMatrix from "./components/national/StateReadinessMatrix";
import DistrictIntelligenceExplorer from "./components/districts/DistrictIntelligenceExplorer";
import CriticalInfrastructureExplorer from "./components/infrastructure/CriticalInfrastructureExplorer";
import NationalEvidenceCenter from "./components/evidence/NationalEvidenceCenter";
import HistoricalSimulationCenter from "./components/scenarios/HistoricalSimulationCenter";
import Footer from "./components/footer/Footer";

// Meteorological Command Center & Overlay Architecture
import EmergencyAlertBanner from "./components/alert/EmergencyAlertBanner";
import OperationalLeftRail from "./components/rail/OperationalLeftRail";
import RightIntelligencePanel from "./components/intelligence/RightIntelligencePanel";
import BulletinTickerBar from "./components/bulletin/BulletinTickerBar";
import OverlayManager from "./components/modals/OverlayManager";
import LiveMeteorologicalCarousel from "./components/carousel/LiveMeteorologicalCarousel";

import cycloneApi from "./services/cycloneApi";
import riskApi from "./services/riskApi";
import weatherApi from "./services/weatherApi";
import { getNormalizedMeteorology } from "./services/meteorologicalDataService";

import "./App.css";

export default function App() {
  const [operatingMode, setOperatingMode] = useState("NORMAL");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeStepId, setActiveStepId] = useState("NOW");
  const [currentScenario, setCurrentScenario] = useState(null);
  const [districtsData, setDistrictsData] = useState([]);
  const [infraData, setInfraData] = useState([]);
  const [directives, setDirectives] = useState([]);
  const [prepMetrics, setPrepMetrics] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [bulletin, setBulletin] = useState(null);
  const [timelineSteps, setTimelineSteps] = useState([]);
  const [backendStatus, setBackendStatus] = useState("CHECKING");
  const [_isLoading, setIsLoading] = useState(true);

  // Unified Normalized Meteorological Data Layer
  const [normalizedData, setNormalizedData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);

  // Single Overlay Manager System (Only ONE overlay open at any time)
  const [activeOverlay, setActiveOverlay] = useState(null);

  // Focused synoptic system for dual-view map centering
  const [focusedSystem, setFocusedSystem] = useState(null);

  // Active road routing & user location state for Leaflet rendering
  const [activeRoute, setActiveRoute] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Rail & Layer states
  const [activeRailItem, setActiveRailItem] = useState("warnings");
  const [layerStates, setLayerStates] = useState({
    wind: true,
    rain: true,
    track: true,
    inundation: true
  });

  const handleToggleLayer = (layerKey) => {
    setLayerStates((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Truthful non-persistent session activity log
  const [sessionActivity, setSessionActivity] = useState([]);

  const logSessionActivity = useCallback((entry) => {
    const timestamp = new Date().toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }) + " IST";

    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      region: entry.region || (selectedState ? selectedState.name : "ALL INDIA"),
      ...entry
    };
    setSessionActivity((prev) => [newEntry, ...prev.slice(0, 49)]);
  }, [selectedState]);

  // Load and periodically refresh normalized meteorological data layer
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const norm = await getNormalizedMeteorology(operatingMode, currentScenario, infraData);
        if (isMounted) {
          setNormalizedData(norm);
          if (norm?.weather) {
            setWeatherData(norm.weather);
          }
        }
      } catch (err) {
        console.warn("Failed to load normalized meteorological data:", err);
      }
    }

    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000); // 5 minutes refresh
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [operatingMode, currentScenario, infraData]);

  // Load static infrastructure and backend metadata once
  useEffect(() => {
    async function loadStaticAssets() {
      try {
        const health = await cycloneApi.checkHealth();
        setBackendStatus(health ? "ONLINE" : "FALLBACK");
      } catch {
        setBackendStatus("FALLBACK");
      }

      try {
        const stepsRes = await cycloneApi.getTimelineSteps();
        if (stepsRes && stepsRes.length > 0) {
          setTimelineSteps(stepsRes);
        }

        const infraRes = await riskApi.getInfrastructureExposure();
        setInfraData(infraRes.assets || []);

        const directivesRes = await riskApi.getEmergencyDirectives();
        setDirectives(directivesRes.directives || []);
        setPrepMetrics(directivesRes.metrics || {});

        const bulletinRes = await weatherApi.getMarineBulletin();
        setBulletin(bulletinRes);
      } catch (err) {
        console.error("Error loading baseline emergency data:", err);
      }
    }
    loadStaticAssets();
  }, []);

  // Fetch temporal scenario and district risk whenever timeline step changes
  useEffect(() => {
    async function loadTemporalData() {
      setIsLoading(true);
      try {
        const [scenarioRes, riskRes] = await Promise.all([
          cycloneApi.getScenarioByStep(activeStepId),
          riskApi.getDistrictRiskMatrix(activeStepId)
        ]);

        if (scenarioRes?.metadata?.dataSource === "LOCAL_SIMULATION_FALLBACK") {
          setBackendStatus("FALLBACK");
        } else if (scenarioRes?.success) {
          setBackendStatus("ONLINE");
        }

        setCurrentScenario(scenarioRes.data);
        const districts = riskRes.districts || [];
        setDistrictsData(districts);

        // Keep existing selected district updated with new risk data for the timestep
        setSelectedDistrict((prev) => {
          if (!prev) return districts[0] || null;
          const updated = districts.find((d) => d.id === prev.id);
          return updated || districts[0] || null;
        });
      } catch (err) {
        console.error("Error loading timestep data:", err);
        setBackendStatus("FALLBACK");
      } finally {
        setIsLoading(false);
      }
    }
    loadTemporalData();
  }, [activeStepId]);

  const handleStepChange = useCallback((stepId) => {
    setActiveStepId(stepId);
  }, []);

  const handleToggleDirective = async (directiveId) => {
    const directive = directives.find((d) => d.id === directiveId);
    if (!directive) return;
    const newStatus = directive.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    await riskApi.updateDirectiveStatus(directiveId, newStatus);
    setDirectives((prev) =>
      prev.map((d) =>
        d.id === directiveId
          ? { ...d, status: newStatus, progressPct: newStatus === "COMPLETED" ? 100 : 75 }
          : d
      )
    );

    // Record directive acknowledgement/update in truthful session log
    logSessionActivity({
      event: newStatus === "COMPLETED" ? "DIRECTIVE ACKNOWLEDGED" : "DIRECTIVE STATUS UPDATED",
      category: "COMMAND",
      district: directive.target || "Coastal Command",
      status: newStatus,
      details: `Directive [${directive.code}] "${directive.title}" status changed to ${newStatus}`
    });
  };

  // Centralized single overlay handler: opening one automatically closes any other
  const handleOpenOverlay = (overlayKey) => {
    setActiveOverlay(overlayKey);
  };

  // Dual view handler: Locate active synoptic system on Leaflet operational map
  const handleLocateSystemOnMap = useCallback((system) => {
    setFocusedSystem(system);
    setActiveTab("dashboard");
    setActiveOverlay(null); // Closes satellite panel so operator immediately views operational map
    logSessionActivity({
      event: "MAP FOCUS: SYNOPTIC SYSTEM",
      category: "SPATIAL",
      region: system.locationDescription || system.name,
      details: `Operational map centered on ${system.classification} at ${system.coordinatesFormatted || `${system.latitude}°N, ${system.longitude}°E`}`
    });
  }, [logSessionActivity]);

  const handleResetNationalView = useCallback(() => {
    setFocusedSystem(null);
    setSelectedState(null);
  }, []);

  const handleSelectRailItem = (itemId) => {
    setActiveRailItem(itemId);
    if (["warnings", "bulletins", "satellite", "radar", "observations"].includes(itemId)) {
      handleOpenOverlay(itemId);
    } else if (itemId === "risk") {
      setActiveTab("risk");
    } else if (itemId === "infra") {
      setActiveTab("infra");
    } else if (itemId === "evidence") {
      setActiveTab("evidence");
    } else if (itemId === "advisory") {
      setActiveTab("advisories");
    }
  };

  // Dynamic unread notification count
  const unreadNotificationsCount = (normalizedData?.notifications || []).filter(
    (n) => !n.isRead
  ).length;

  return (
    <div className="drishti-app">
      {/* 1. Top Header & Institutional Branding */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentScenario={currentScenario}
        backendStatus={backendStatus}
        operatingMode={operatingMode}
        onModeChange={setOperatingMode}
        selectedState={selectedState}
        onSelectState={setSelectedState}
        onOpenDrawer={handleOpenOverlay}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* 2. Compact Warning Ticker (Never obscures screen on startup) */}
      <EmergencyAlertBanner
        alerts={normalizedData?.warnings}
        onSelectState={setSelectedState}
        onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
        onFocusSituation={() => {
          setActiveTab("dashboard");
          handleOpenOverlay("warning");
        }}
      />

      {/* 3. Operational Posture Bar */}
      {operatingMode === "NORMAL" ? (
        <div className="operational-posture-banner posture-normal">
          <div className="posture-banner-inner">
            <div className="posture-left">
              <span className="posture-indicator-badge normal">
                <span className="status-dot-green"></span>
                NORMAL OPERATIONS
              </span>
              <span className="posture-title">
                {selectedState
                  ? `${selectedState.name.toUpperCase()} SYNOPTIC SURVEILLANCE & READINESS`
                  : "NATIONAL METEOROLOGICAL MONITORING • ALL 36 STATES & UTs"}
              </span>
              <span className="posture-divider-dot">•</span>
              <span className="posture-meta">
                Routine Regional Surveillance • Open-Meteo Surface Vectors &amp; IMD Synoptic Bulletins
              </span>
            </div>
            <div className="posture-right">
              <span className="posture-tag font-mono">
                MONITORING POSTURE: LEVEL 1 (ROUTINE SURVEILLANCE)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="operational-posture-banner posture-disaster">
          <div className="posture-banner-inner">
            <div className="posture-left">
              <span className="posture-indicator-badge disaster">
                <span className="status-dot-amber"></span>
                ⚠ ACTIVE DISASTER RESPONSE
              </span>
              <span className="posture-title">
                CYCLONE REMAL (BOB/01/2024) • BAY OF BENGAL ARC
              </span>
              <span className="posture-divider-dot">•</span>
              <span className="posture-meta">
                Severe Cyclonic Storm (SCS) • Affected States: West Bengal &amp; Odisha
              </span>
            </div>
            <div className="posture-right">
              <span className="posture-tag font-mono">
                CALIBRATED HISTORICAL EXERCISE • NOT A LIVE WARNING
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Command Center Workspace */}
      <main className="drishti-main-workspace">
        {/* 1. COMMAND CENTRE TAB (3-COLUMN IMD PANEL ARCHITECTURE) */}
        {activeTab === "dashboard" && (
          <div className="imd-command-center-layout">
            {/* Left Operational Rail */}
            <OperationalLeftRail
              operatingMode={operatingMode}
              activeRailItem={activeRailItem}
              onSelectRailItem={handleSelectRailItem}
              layerStates={layerStates}
              onToggleLayer={handleToggleLayer}
            />

            {/* Central Dominant India Map */}
            <div className="map-view-column">
              <MapContainer
                currentScenario={currentScenario}
                districtsData={districtsData}
                infraData={infraData}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                operatingMode={operatingMode}
                selectedState={selectedState}
                onSelectState={setSelectedState}
                weatherData={weatherData}
                focusedSystem={focusedSystem}
                onResetFocus={handleResetNationalView}
                activeRoute={activeRoute}
                userLocation={userLocation}
                onClearRoute={() => setActiveRoute(null)}
              />

              {/* Disaster Mode Timeline & Directives */}
              {operatingMode === "DISASTER" && (
                <div className="mt-3 flex flex-col gap-3">
                  <TimelineControl
                    activeStepId={activeStepId}
                    onStepChange={handleStepChange}
                    timelineSteps={timelineSteps}
                  />

                  <PreparednessActions
                    directives={directives}
                    metrics={prepMetrics}
                    onToggleDirective={handleToggleDirective}
                  />
                </div>
              )}
            </div>

            {/* Right Intelligence Dossier */}
            <RightIntelligencePanel
              operatingMode={operatingMode}
              selectedState={selectedState}
              onSelectState={setSelectedState}
              weatherData={weatherData}
              districtsData={districtsData}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
              infraData={infraData}
              currentScenario={currentScenario}
              activeStepId={activeStepId}
              onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
              onOpenDrawer={handleOpenOverlay}
              activeRoute={activeRoute}
              onSelectRoute={setActiveRoute}
              onClearRoute={() => setActiveRoute(null)}
              userLocation={userLocation}
              onSetUserLocation={setUserLocation}
            />
          </div>
        )}

        {/* 2. WEATHER TAB */}
        {activeTab === "weather" && (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold font-mono text-slate-900">
                  PAN-INDIA NUMERICAL MODEL TELEMETRY (36 STATES &amp; UTs)
                </h2>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  SOURCE: OPEN-METEO HIGH-RESOLUTION NWP • PROVENANCE: MODEL
                </div>
              </div>
              <span className="badge-provenance text-[9px] bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                CURRENT MODEL DATA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {normalizedData?.states ? (
                normalizedData.states.map((st) => (
                  <div key={st.stateId || st.id} className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200 mb-1.5">
                        <strong className="text-slate-900 text-sm">{st.location || st.name}</strong>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${st.hasData ? "bg-blue-100 text-blue-900" : "bg-slate-200 text-slate-600"}`}>
                          {st.hasData ? "MODEL" : "OFFLINE"}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-700">
                        <div className="text-teal-800">
                          <strong>Wind:</strong> {st.windSpeedKmph != null ? `${st.windSpeedKmph} km/h ${st.windDirectionLabel || ""}` : (st.windSpeed != null ? `${st.windSpeed} km/h` : "N/A")}{st.windGustKmph ? ` (Gusts ${st.windGustKmph})` : ""}
                        </div>
                        <div className="text-blue-800">
                          <strong>Rainfall:</strong> {st.rainfallMm != null ? `${st.rainfallMm} mm` : (st.rain != null ? `${st.rain} mm` : "0.0 mm")}
                        </div>
                        <div className="text-slate-800">
                          <strong>Surface Pressure:</strong> {st.pressureHpa != null ? `${st.pressureHpa} hPa` : "N/A"}
                        </div>
                        <div className="text-amber-900">
                          <strong>Temperature:</strong> {st.temperatureC != null ? `${st.temperatureC}°C` : (st.temperature != null ? `${st.temperature}°C` : "N/A")}{st.humidityPct != null ? ` (${st.humidityPct}% RH)` : ""}
                        </div>
                        {st.distanceToSystemKm != null && (
                          <div className="text-amber-800 font-bold border-t border-slate-200/80 pt-1 mt-1">
                            Distance to System: {st.distanceToSystemKm} km <span className="text-[9px] font-normal text-amber-700">(DERIVED)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
                      <span>OPEN-METEO</span>
                      <span>{st.checkedAt || "IST"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-slate-500 font-mono text-xs col-span-3">
                  Loading surface meteorological observations...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. NATIONAL HAZARD MONITOR TAB */}
        {activeTab === "hazards" && (
          <NationalHazardMatrix
            operatingMode={operatingMode}
            onLaunchSimulation={() => setOperatingMode("DISASTER")}
          />
        )}

        {/* 4. STATE & UT READINESS MATRIX TAB */}
        {activeTab === "states" && (
          <StateReadinessMatrix
            selectedState={selectedState}
            onSelectState={setSelectedState}
            onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
          />
        )}

        {/* 5. DISTRICT RISK & INTELLIGENCE TAB */}
        {activeTab === "risk" && (
          <DistrictIntelligenceExplorer
            districtsData={districtsData}
            infraData={infraData}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            onNavigateTab={setActiveTab}
            onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
            selectedState={selectedState}
            onSelectState={setSelectedState}
          />
        )}

        {/* 6. CRITICAL INFRASTRUCTURE ASSETS TAB */}
        {activeTab === "infra" && (
          <CriticalInfrastructureExplorer infraData={infraData} />
        )}

        {/* 7. NATIONAL EVIDENCE CENTER TAB */}
        {activeTab === "evidence" && (
          <NationalEvidenceCenter />
        )}

        {/* 8. HISTORICAL SCENARIO ARCHIVE TAB */}
        {activeTab === "scenarios" && (
          <HistoricalSimulationCenter
            onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
            activeStepId={activeStepId}
            onStepChange={handleStepChange}
          />
        )}

        {/* 9. AI ADVISORIES & SOP TAB */}
        {activeTab === "advisories" && (
          <div className="flex flex-col gap-4">
            <TimelineControl
              activeStepId={activeStepId}
              onStepChange={handleStepChange}
              timelineSteps={timelineSteps}
            />

            {/* AI Decision Intelligence Advisory & Human Authorization */}
            <AdvisoryPanel
              district={selectedDistrict || districtsData[0]}
              stepId={activeStepId}
            />

            {/* IMD Meteorological Bulletins */}
            <div className="risk-panel-container p-6">
              <div className="panel-header mb-4">
                <h2 className="panel-title text-base">METEOROLOGICAL BULLETINS &amp; MARINE ADVISORIES</h2>
                <span className="badge-provenance">IMD HISTORICAL ARCHIVE</span>
              </div>
              {bulletin ? (
                <div className="flex flex-col gap-3 font-mono text-xs text-slate-800">
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-slate-900 font-bold text-sm mb-1">BULLETIN ID: {bulletin.bulletinNo}</div>
                    <div className="text-slate-500 mb-3 font-medium">ISSUED: {bulletin.issuedAt} ({bulletin.provenance})</div>
                    <div className="text-orange-700 mb-2 font-bold text-sm">SEA CONDITION: {bulletin.seaCondition}</div>
                    <div className="mb-2 text-slate-700 font-medium">SIGNIFICANT WAVE HEIGHT: {bulletin.significantWaveHeightMeters} meters ({bulletin.waveDirection})</div>
                    <div className="mb-3 text-red-700 font-bold">SQUALL WARNING: {bulletin.squallWarning}</div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 font-medium">
                      ADVISORY TO FISHERMEN: {bulletin.fishermenAdvisory}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs font-mono">Loading advisory data...</div>
              )}
            </div>

            {/* Truthful Session Command Activity Log */}
            <ActivityLog entries={sessionActivity} />
          </div>
        )}

        {/* 10. NATIONAL OPERATIONS LOG TAB */}
        {activeTab === "activity" && (
          <div className="flex flex-col gap-4">
            <ActivityLog entries={sessionActivity} />
          </div>
        )}
      </main>

      {/* 5. Live Meteorological Carousel (Normal in-page component placed below workspace) */}
      <LiveMeteorologicalCarousel
        data={normalizedData}
        onOpenOverlay={handleOpenOverlay}
        onNavigateTab={setActiveTab}
      />

      {/* 6. Bottom Meteorological Bulletin Ticker & Command Bar */}
      <BulletinTickerBar
        onOpenDrawer={handleOpenOverlay}
        lastUpdatedFormatted={normalizedData?.timestamp?.timeShort || weatherData?.lastUpdatedFormatted || "IST"}
        nextRefreshMinutes={weatherData?.nextRefreshMinutes || 10}
        activeDepression={normalizedData?.activeSystem || weatherData?.activeSystem}
      />

      {/* 7. Centralized Single Overlay Manager (Only 1 overlay active at any time) */}
      <OverlayManager
        activeOverlay={activeOverlay}
        onClose={() => setActiveOverlay(null)}
        data={normalizedData}
        onSelectState={setSelectedState}
        onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
        onLocateOnMap={handleLocateSystemOnMap}
      />

      {/* 8. Government Institutional Footer */}
      <Footer />
    </div>
  );
}
