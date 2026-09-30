import React, { useState } from "react";
import { 
  Compass, 
  Wind, 
  Play, 
  CheckCircle2, 
  Info
} from "lucide-react";
import { useLanguage } from "../../language";

export default function HistoricalSimulationCenter({
  onLaunchDisasterMode,
  activeStepId: _activeStepId,
  onStepChange: _onStepChange
}) {
  const { t } = useLanguage();
  const [selectedScenarioId, setSelectedScenarioId] = useState("remal_2024");

  const scenarios = [
    {
      id: "remal_2024",
      name: "Cyclone Remal (2024)",
      code: "BOB/01/2024",
      region: "West Bengal & Odisha Arc",
      basin: "Bay of Bengal",
      dates: "24 May - 28 May 2024",
      peakIntensity: "Severe Cyclonic Storm (110 km/h, Gusts 135 km/h)",
      lowestPressure: "982 hPa",
      landfall: "Sagar Island (West Bengal) & Khepupara (Bangladesh)",
      timelineSpan: "T-24h → +72h (7 Discrete Verification Steps)",
      active: true,
      description: "Primary demonstration scenario for DRISHTI MVP Stage 1. Complete multi-modal pipeline with temporal wind field, storm surge inundation, 8-district deterministic risk matrix, and Gemini multilingual decision reasoning."
    },
    {
      id: "fani_2019",
      name: "Extremely Severe Cyclonic Storm Fani (2019)",
      code: "BOB/02/2019",
      region: "Puri & Coastal Odisha",
      basin: "Bay of Bengal",
      dates: "26 April - 04 May 2019",
      peakIntensity: "Extremely Severe Cyclonic Storm (215 km/h, Gusts 250 km/h)",
      lowestPressure: "932 hPa",
      landfall: "Puri, Odisha",
      timelineSpan: "T-48h → +48h",
      active: false,
      description: "Highest intensity modern Odisha tropical cyclone. 1.2 million citizens evacuated in record 24-hour drill. Ingestion scheduled for Stage 2 Historical Benchmark Archive."
    },
    {
      id: "yaas_2021",
      name: "Very Severe Cyclonic Storm Yaas (2021)",
      code: "BOB/02/2021",
      region: "Balasore & Bhadrak Coast (Odisha)",
      basin: "Bay of Bengal",
      dates: "23 May - 28 May 2021",
      peakIntensity: "Very Severe Cyclonic Storm (140 km/h, Gusts 155 km/h)",
      lowestPressure: "970 hPa",
      landfall: "South of Balasore / Dhamra Port",
      timelineSpan: "T-36h → +48h",
      active: false,
      description: "Severe coastal storm surge flooding and dike breach scenario. Ingestion scheduled for Stage 2 Historical Benchmark Archive."
    },
    {
      id: "biparjoy_2023",
      name: "Extremely Severe Cyclonic Storm Biparjoy (2023)",
      code: "ARB/01/2023",
      region: "Saurashtra & Kutch (Gujarat)",
      basin: "Arabian Sea",
      dates: "06 June - 19 June 2023",
      peakIntensity: "Extremely Severe Cyclonic Storm (165 km/h)",
      lowestPressure: "958 hPa",
      landfall: "Jakhau Port, Gujarat",
      timelineSpan: "T-48h → +72h",
      active: false,
      description: "Extended lifespan Arabian Sea cyclone demonstrating Western Seaboard multi-hazard resilience. Ingestion scheduled for Stage 2 Western Sector expansion."
    }
  ];

  const current = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  return (
    <div className="historical-simulation-center-card">
      {/* Header */}
      <div className="table-section-header">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-blue-700" />
          <div>
            <h3 className="section-heading">{t("HISTORICAL & SIMULATION SCENARIO CENTER")}</h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {t("Calibrated Storm Replays • Multi-Hazard Stress Testing • Resilience Verification")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-provenance text-[10px]">
            {t("EXERCISE BENCHMARKS")}
          </span>
        </div>
      </div>

      {/* Core Platform Orientation Notice */}
      <div className="p-3.5 bg-blue-50/70 border-b border-blue-200 flex items-start gap-2.5 text-xs text-slate-700">
        <Info size={16} className="text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="font-mono leading-relaxed">
          <strong className="text-blue-900 uppercase">{t("Core Architectural Principle:")}</strong>{" "}
          {t("DRISHTI is a Pan-India Multi-Hazard Platform. Odisha and West Bengal are not the platform's geographical boundary; they represent the active demonstration scenario (Cyclone Remal 2024). In Normal Operations, DRISHTI monitors all 36 States & UTs; in Disaster Response, it focuses dynamically on the active or simulated event theater.")}
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="p-4 bg-white border border-slate-200 rounded-b grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (1 col): Scenario List */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-slate-500 block mb-1">
            {t("AVAILABLE HISTORICAL SCENARIOS:")}
          </span>
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50/80 border-blue-600 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-xs font-bold text-slate-900">{t(sc.name)}</strong>
                  {sc.active ? (
                    <span className="px-1.5 py-0.2 text-[9.5px] bg-red-100 text-red-700 font-mono font-bold rounded">
                      {t("ACTIVE REPLAY")}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 text-[9.5px] bg-slate-100 text-slate-600 font-mono font-semibold rounded">
                      {t("STAGE 2")}
                    </span>
                  )}
                </div>
                <div className="text-[10.5px] text-slate-500 font-mono">
                  {t(sc.region)} • {sc.dates}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (2 cols): Selected Scenario Dossier */}
        <div className="lg:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-slate-200 mb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                  {t("SCENARIO DOSSIER")} • {t(current.basin)}
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Wind size={16} className="text-orange-600" />
                  <span>{t(current.name)}</span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold">
                    {current.code}
                  </span>
                </h3>
              </div>

              {current.active ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gov-navy text-white text-xs font-bold rounded hover:bg-accent-blue transition-colors font-mono"
                  onClick={onLaunchDisasterMode}
                >
                  <Play size={13} />
                  <span>{t("LAUNCH DISASTER RESPONSE MODE")}</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 text-xs font-mono text-slate-500 bg-slate-200 rounded font-semibold">
                  {t("SCHEDULED FOR STAGE 2")}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-sans mb-4">
              {t(current.description)}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block">{t("AFFECTED REGION")}</span>
                <strong className="text-slate-800 text-[11px]">{t(current.region)}</strong>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block">{t("PEAK INTENSITY")}</span>
                <strong className="text-orange-700 text-[11px]">{t(current.peakIntensity)}</strong>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block">{t("CENTRAL PRESSURE")}</span>
                <strong className="text-slate-800 text-[11px]">{current.lowestPressure}</strong>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block">{t("LANDFALL LOCATION")}</span>
                <strong className="text-slate-800 text-[11px]">{t(current.landfall)}</strong>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block">{t("TEMPORAL TIMELINE")}</span>
                <strong className="text-blue-700 text-[11px]">{t(current.timelineSpan)}</strong>
              </div>
              <div className="p-2.5 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-400 block">{t("EVIDENCE TELEMETRY")}</span>
                <strong className="text-emerald-700 text-[11px]">{t("AWS, DWR, INCOIS Buoy")}</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>{t("DRISHTI DECISION SUPPORT ENGINE • GROUNDED IN VERIFIED EVIDENCE")}</span>
            {current.active && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>{t("READY FOR DRILL REPLAY")}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
