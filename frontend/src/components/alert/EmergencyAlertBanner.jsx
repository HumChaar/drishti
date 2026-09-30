import React, { useState } from "react";
import { 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  ExternalLink,
  ShieldAlert,
  Info
} from "lucide-react";
import { ACTIVE_EMERGENCY_ALERTS } from "../../services/imdAlertService";
import { useLanguage } from "../../language";

export default function EmergencyAlertBanner({
  alerts = ACTIVE_EMERGENCY_ALERTS,
  onSelectState,
  onLaunchDisasterMode,
  onFocusSituation
}) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isDismissed, setIsDismissed] = useState(false);

  const activeAlerts = alerts && alerts.length > 0 ? alerts : ACTIVE_EMERGENCY_ALERTS;

  if (isDismissed || !activeAlerts || activeAlerts.length === 0) {
    return null;
  }

  const alert = activeAlerts[currentIndex] || activeAlerts[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAlerts.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length);
  };

  const handleAction = () => {
    if (alert.category === "SIMULATION BENCHMARK") {
      if (onLaunchDisasterMode) onLaunchDisasterMode();
    } else {
      if (onFocusSituation) onFocusSituation(alert);
      if (alert.targetStateId && onSelectState) {
        onSelectState({ id: alert.targetStateId, name: alert.region });
      }
    }
  };

  const getSeverityStyle = (sev) => {
    switch (sev) {
      case "CRITICAL":
      case "WARNING":
        return {
          bannerClass: "alert-banner-warning",
          badgeClass: "badge-sev-warning",
          icon: <ShieldAlert size={14} className="text-red-700 animate-pulse" />
        };
      case "ALERT":
        return {
          bannerClass: "alert-banner-alert",
          badgeClass: "badge-sev-alert",
          icon: <AlertTriangle size={14} className="text-orange-600" />
        };
      case "WATCH":
        return {
          bannerClass: "alert-banner-watch",
          badgeClass: "badge-sev-watch",
          icon: <AlertTriangle size={14} className="text-amber-600" />
        };
      default:
        return {
          bannerClass: "alert-banner-info",
          badgeClass: "badge-sev-info",
          icon: <Info size={14} className="text-blue-600" />
        };
    }
  };

  const style = getSeverityStyle(alert.severity);

  return (
    <div className={`emergency-alert-strip ${style.bannerClass}`} role="alert">
      <div className="alert-strip-inner">
        {/* Left Severity & Title */}
        <div className="alert-left-group">
          <span className="alert-icon-wrap">{style.icon}</span>
          <span className={`alert-severity-pill ${style.badgeClass}`}>
            {t(alert.severity)}
          </span>
          <span className="alert-title font-bold text-slate-900">
            {t(alert.title)}
          </span>
          <span className="alert-divider-dot text-slate-300">•</span>
          <span className="alert-region font-mono text-xs text-slate-700 font-semibold truncate">
            {alert.region}
          </span>
          <span className="alert-time font-mono text-[10.5px] text-slate-500 hidden md:inline">
            [{alert.issuedAt}]
          </span>
        </div>

        {/* Right Actions & Multi-alert Pager */}
        <div className="alert-right-group">
          {/* Pager if multiple alerts */}
          {activeAlerts.length > 1 && (
            <div className="alert-pager font-mono text-[11px] text-slate-600">
              <button 
                type="button" 
                onClick={handlePrev} 
                className="pager-btn" 
                aria-label="Previous alert"
              >
                <ChevronLeft size={13} />
              </button>
              <span>{currentIndex + 1}/{activeAlerts.length}</span>
              <button 
                type="button" 
                onClick={handleNext} 
                className="pager-btn" 
                aria-label="Next alert"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Action Trigger */}
          <button
            type="button"
            className="alert-action-btn font-mono"
            onClick={handleAction}
          >
            <span>{t(alert.action || "VIEW SITUATION")}</span>
            <ExternalLink size={11} />
          </button>


          {/* Dismiss button */}
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss alert banner"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
