import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/header/Header";
import HeroCarousel from "./components/hero/HeroCarousel";
import MetricStrip from "./components/hero/MetricStrip";
import MapContainer from "./components/map/MapContainer";
import TimelineControl from "./components/map/TimelineControl";
import RiskPanel from "./components/insights/RiskPanel";
import AdvisoryPanel from "./components/insights/AdvisoryPanel";
import ActivityLog from "./components/activity/ActivityLog";
import PreparednessActions from "./components/actions/PreparednessActions";
import NormalKpiStrip from "./components/normal/NormalKpiStrip";
import NormalReadinessPanel from "./components/normal/NormalReadinessPanel";
import Footer from "./components/footer/Footer";

import cycloneApi from "./services/cycloneApi";
import riskApi from "./services/riskApi";
import weatherApi from "./services/weatherApi";

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
  const [bulletin, setBulletin] = useState(null);
  const [timelineSteps, setTimelineSteps] = useState([]);
  const [backendStatus, setBackendStatus] = useState("CHECKING");
  const [_isLoading, setIsLoading] = useState(true);

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
      ...entry
    };
    setSessionActivity((prev) => [newEntry, ...prev.slice(0, 49)]);
  }, []);

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

    // Record directive acknowledgement/update in truthful session log (Step 8)
    logSessionActivity({
      event: newStatus === "COMPLETED" ? "DIRECTIVE ACKNOWLEDGED" : "DIRECTIVE STATUS UPDATED",
      category: "COMMAND",
      district: directive.target || "Coastal Command",
      status: newStatus,
      details: `Directive [${directive.code}] "${directive.title}" status changed to ${newStatus}`
    });
  };


  return (
    <div className="drishti-app">
      {/* Top Header & Government Branding */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentScenario={currentScenario}
        backendStatus={backendStatus}
        operatingMode={operatingMode}
        onModeChange={setOperatingMode}
      />

      {/* Operational Posture Banner */}
      {operatingMode === "NORMAL" ? (
        <div className="operational-posture-banner posture-normal">
          <div className="posture-banner-inner">
            <div className="posture-left">
              <span className="posture-indicator-badge normal">
                <span className="status-dot-green"></span>
                NORMAL OPERATIONS
              </span>
              <span className="posture-title">REGIONAL HAZARD MONITORING &amp; PREPAREDNESS</span>
              <span className="posture-divider-dot">•</span>
              <span className="posture-meta">Bay of Bengal Coastal Sector Routine Surveillance</span>
            </div>
            <div className="posture-right">
              <span className="posture-tag font-mono">STATUS: LEVEL 1 (ALL CLEAR • ROUTINE VIGILANCE)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="operational-posture-banner posture-disaster">
          <div className="posture-banner-inner">
            <div className="posture-left">
              <span className="posture-indicator-badge disaster">
                <span className="status-dot-amber"></span>
                ⚠ ACTIVE CYCLONE RESPONSE
              </span>
              <span className="posture-title">CYCLONE REMAL (BOB/01/2024)</span>
              <span className="posture-divider-dot">•</span>
              <span className="posture-meta">Severe Cyclonic Storm (SCS) • Peak Intensity 110 km/h</span>
            </div>
            <div className="posture-right">
              <span className="posture-tag font-mono">HISTORICAL SIMULATION • MAY 2024 (NOT A LIVE WARNING)</span>
            </div>
          </div>
        </div>
      )}

      {/* Mode-Specific KPI / Telemetry Strip */}
      {operatingMode === "NORMAL" ? (
        <NormalKpiStrip
          infraCount={infraData.length || 11}
          districtCount={districtsData.length || 8}
        />
      ) : (
        <>
          <HeroCarousel
            currentScenario={currentScenario}
            activeStepId={activeStepId}
            districtsData={districtsData}
            onNavigateTab={setActiveTab}
          />
          <MetricStrip
            currentScenario={currentScenario}
            districtsData={districtsData}
            activeStepId={activeStepId}
          />
        </>
      )}

      {/* Main Command Center Workspace */}
      <main className="drishti-main-workspace">
        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <>
            {operatingMode === "NORMAL" ? (
              /* Normal Operations: Regional Surveillance Map + District Readiness Dossier & Audit */
              <div className="workspace-grid-upper">
                <div className="map-view-column">
                  <MapContainer
                    currentScenario={currentScenario}
                    districtsData={districtsData}
                    infraData={infraData}
                    selectedDistrict={selectedDistrict}
                    onSelectDistrict={setSelectedDistrict}
                    operatingMode={operatingMode}
                  />
                </div>
                <NormalReadinessPanel
                  districtsData={districtsData}
                  infraData={infraData}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={setSelectedDistrict}
                  onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
                />
              </div>
            ) : (
              /* Disaster Response: Tactical Map + Risk Matrix + Timeline + Directives */
              <>
                <div className="workspace-grid-upper">
                  <div className="map-view-column">
                    <MapContainer
                      currentScenario={currentScenario}
                      districtsData={districtsData}
                      infraData={infraData}
                      selectedDistrict={selectedDistrict}
                      onSelectDistrict={setSelectedDistrict}
                      operatingMode={operatingMode}
                    />
                  </div>

                  <RiskPanel
                    districtsData={districtsData}
                    selectedDistrict={selectedDistrict}
                    onSelectDistrict={setSelectedDistrict}
                    activeStepId={activeStepId}
                    onNavigateTab={setActiveTab}
                    currentScenario={currentScenario}
                    infraData={infraData}
                  />
                </div>

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
              </>
            )}
          </>
        )}

        {/* DISTRICT RISK TAB */}
        {activeTab === "risk" && (
          operatingMode === "NORMAL" ? (
            <NormalReadinessPanel
              districtsData={districtsData}
              infraData={infraData}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={setSelectedDistrict}
              onLaunchDisasterMode={() => setOperatingMode("DISASTER")}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <TimelineControl
                activeStepId={activeStepId}
                onStepChange={handleStepChange}
                timelineSteps={timelineSteps}
              />
              <RiskPanel
                districtsData={districtsData}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                activeStepId={activeStepId}
                onNavigateTab={setActiveTab}
                currentScenario={currentScenario}
                infraData={infraData}
              />
            </div>
          )
        )}

        {/* ACTIONS TAB */}
        {activeTab === "actions" && (
          <div className="flex flex-col gap-4">
            <PreparednessActions
              directives={directives}
              metrics={prepMetrics}
              onToggleDirective={handleToggleDirective}
            />
          </div>
        )}

        {/* SCENARIOS TAB */}
        {activeTab === "scenarios" && (
          <div className="risk-panel-container p-6">
            <div className="panel-header mb-4">
              <h2 className="panel-title text-base">HISTORICAL SCENARIO ARCHIVE & BENCHMARKING</h2>
              <span className="badge-provenance">DEMO DATABASE</span>
            </div>
            <div className="text-sm text-slate-600 mb-4 font-medium">
              DRISHTI provides comparative trajectory analysis against notable Bay of Bengal tropical cyclones to evaluate coastal resilience models:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                <div className="text-red-600 font-bold text-sm mb-1">Cyclone REMAL (2024) [ACTIVE REPLAY]</div>
                <div className="text-slate-600">Peak Category: Severe Cyclonic Storm (110 km/h)</div>
                <div className="text-slate-500">Landfall: Sagar Island & Khepupara</div>
                <div className="text-orange-700 font-bold mt-2">Active in DRISHTI MVP Stage 1</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                <div className="text-amber-700 font-bold text-sm mb-1">Cyclone FANI (2019) [ARCHIVE]</div>
                <div className="text-slate-600">Peak Category: Extremely Severe (215 km/h)</div>
                <div className="text-slate-500">Landfall: Puri Coast (Odisha)</div>
                <div className="text-slate-400 mt-2">Scheduled for Stage 2 Ingestion</div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                <div className="text-slate-800 font-bold text-sm mb-1">Cyclone YAAS (2021) [ARCHIVE]</div>
                <div className="text-slate-600">Peak Category: Very Severe (140 km/h)</div>
                <div className="text-slate-500">Landfall: Dhamra Port / Balasore</div>
                <div className="text-slate-400 mt-2">Scheduled for Stage 2 Ingestion</div>
              </div>
            </div>
          </div>
        )}

        {/* ADVISORIES TAB */}
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
                <h2 className="panel-title text-base">METEOROLOGICAL BULLETINS & MARINE ADVISORIES</h2>
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
      </main>

      {/* Government Footer */}
      <Footer />
    </div>
  );
}
