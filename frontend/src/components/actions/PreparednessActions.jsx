import React, { useState } from "react";
import { 
  CheckSquare, 
  Anchor, 
  Truck, 
  Radio, 
  LifeBuoy, 
  Zap, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { useLanguage } from "../../language";

export default function PreparednessActions({ 
  directives = [], 
  metrics = {}, 
  onToggleDirective 
}) {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState("ALL");
  const [notificationMsg, setNotificationMsg] = useState(null);

  const triggerMockAction = (actionTitle) => {
    setNotificationMsg(`[SIMULATED DISPATCH] Action initiated: "${actionTitle}". Operational EOC notified.`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const filteredDirectives = directives.filter((d) => {
    if (filterType === "ALL") return true;
    return d.status === filterType;
  });

  return (
    <div className="actions-section-container">
      {/* Section Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-600" />
          <h2 className="panel-title">{t("OPERATIONAL PREPAREDNESS & INCIDENT COMMAND DIRECTIVES")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-provenance text-xs">{t("MOCK EOC DISPATCH")}</span>
          <span className="badge-emergency text-xs">{t("SOP PROTOCOL ACTIVE")}</span>
        </div>
      </div>

      {notificationMsg && (
        <div className="notification-banner font-mono text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-700" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Operational KPI Metrics */}
      <div className="preparedness-kpi-grid">
        <div className="prep-kpi-card">
          <div className="prep-kpi-icon text-slate-700">
            <Truck size={18} />
          </div>
          <div className="prep-kpi-info">
            <span className="prep-kpi-title">{t("TOTAL EVACUATED")}</span>
            <span className="prep-kpi-value font-mono text-slate-900">
              {metrics.totalEvacuated?.toLocaleString() || "485,000"}
            </span>
            <span className="prep-kpi-sub">{t("Target:")} {metrics.targetEvacuation?.toLocaleString() || "540,000"}</span>
          </div>
        </div>

        <div className="prep-kpi-card">
          <div className="prep-kpi-icon text-emerald-600">
            <LifeBuoy size={18} />
          </div>
          <div className="prep-kpi-info">
            <span className="prep-kpi-title">{t("ACTIVE MPCS SHELTERS")}</span>
            <span className="prep-kpi-value font-mono text-emerald-700">
              {metrics.activeShelters || 840}
            </span>
            <span className="prep-kpi-sub">{t("Generators & Water Verified")}</span>
          </div>
        </div>

        <div className="prep-kpi-card">
          <div className="prep-kpi-icon text-orange-600">
            <ShieldAlert size={18} />
          </div>
          <div className="prep-kpi-info">
            <span className="prep-kpi-title">{t("NDRF / ODRAF TEAMS")}</span>
            <span className="prep-kpi-value font-mono text-orange-700">
              {metrics.ndrfOdrafTeamsDeployed || 32} {t("Deployed")}
            </span>
            <span className="prep-kpi-sub">{t("168 Flood Rescue Boats")}</span>
          </div>
        </div>

        <div className="prep-kpi-card">
          <div className="prep-kpi-icon text-slate-700">
            <Radio size={18} />
          </div>
          <div className="prep-kpi-info">
            <span className="prep-kpi-title">{t("SATPHONE COMMS")}</span>
            <span className="prep-kpi-value font-mono text-slate-900">
              {metrics.satellitePhonesActive || 44} {t("Online")}
            </span>
            <span className="prep-kpi-sub">{t("HF Ham Radio Redundancy")}</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Port Warning Board + Directives SOP Checklist */}
      <div className="actions-content-grid">
        {/* Left: Port Warning Signals & Fast Dispatch Panel */}
        <div className="port-signals-card">
          <h3 className="section-subtitle flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold mb-3">
            <Anchor size={14} className="text-slate-700" />
            {t("MARITIME PORT DANGER WARNING SIGNALS")}
          </h3>

          <div className="signals-table">
            {metrics.warningSignals?.map((sig, idx) => (
              <div key={idx} className="signal-row">
                <div className="signal-port-name font-bold text-slate-900">{t(sig.port)}</div>
                <div className="signal-badge font-mono text-xs">
                  {t(sig.signal)}
                </div>
                <div className="signal-status text-xs text-emerald-700 font-mono font-bold">
                  [{t(sig.status)}]
                </div>
              </div>
            ))}
          </div>

          {/* Quick Simulation Emergency Dispatch Triggers */}
          <div className="quick-dispatch-block mt-4">
            <div className="text-xs font-mono text-slate-600 mb-2 font-bold">
              {t("COMMAND CENTER RAPID DISPATCH:")}
            </div>
            <div className="dispatch-buttons-grid">
              <button 
                className="dispatch-action-btn"
                onClick={() => triggerMockAction("Broadcast Common Alerting Protocol (CAP) Warning SMS")}
              >
                <Send size={13} className="text-orange-600" />
                <span>{t("Issue Public SMS Alert (CAP)")}</span>
              </button>
              <button 
                className="dispatch-action-btn"
                onClick={() => triggerMockAction("Trip Pre-emptive Coastal Feeder Lines")}
              >
                <Zap size={13} className="text-amber-600" />
                <span>{t("Pre-emptive Feeder De-energize")}</span>
              </button>
              <button 
                className="dispatch-action-btn"
                onClick={() => triggerMockAction("Deploy Regional Mobile Medical Surge Teams")}
              >
                <Truck size={13} className="text-blue-600" />
                <span>{t("Deploy Mobile Medical Units")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Emergency Standard Operating Procedures (SOP) Checklist */}
        <div className="directives-checklist-card">
          <div className="directives-header-bar">
            <h3 className="section-subtitle flex items-center gap-1.5 text-xs font-mono text-slate-800 font-bold">
              <CheckSquare size={14} className="text-emerald-700" />
              {t("SOP INCIDENT MANAGEMENT DIRECTIVES")}
            </h3>

            <div className="filter-chips-mini">
              {["ALL", "IN_PROGRESS", "DEPLOYED", "COMPLETED"].map((status) => (
                <button
                  key={status}
                  className={`mini-chip ${filterType === status ? "active" : ""}`}
                  onClick={() => setFilterType(status)}
                >
                  {t(status)}
                </button>
              ))}
            </div>
          </div>

          <div className="directives-items-list">
            {filteredDirectives.map((d) => {
              const isCompleted = d.status === "COMPLETED";

              return (
                <div key={d.id} className="directive-item-card">
                  <div className="directive-top-line">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-orange-700 font-bold">{d.code}</span>
                      <span className="priority-pill text-[10px] font-mono font-bold">
                        {t(d.priority)}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">[{t(d.department)}]</span>
                    </div>

                    <button
                      className={`directive-toggle-btn ${isCompleted ? "completed" : ""}`}
                      onClick={() => onToggleDirective(d.id)}
                      title={t("Toggle Operational Status")}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span className="text-emerald-700 font-mono text-xs font-bold">{t("ACKNOWLEDGED")}</span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-orange-600" />
                          <span className="text-orange-700 font-mono text-xs font-bold">{t(d.status)}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="directive-title text-sm font-semibold text-slate-900 mt-1">
                    {t(d.title)}
                  </div>

                  <div className="directive-note text-xs text-slate-500 font-mono mt-1">
                    {t("Target:")} {t(d.target)}
                  </div>

                  <div className="directive-completion text-xs text-slate-700 mt-1.5 flex items-center justify-between">
                    <span>{t(d.completionNote)}</span>
                    <span className="font-mono font-bold text-slate-900">{d.progressPct}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="meter-track mt-1">
                    <div 
                      className={`meter-fill ${isCompleted ? "bg-emerald-600" : "bg-orange-500"}`}
                      style={{ width: `${d.progressPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
