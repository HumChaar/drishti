import React, { useState, useEffect } from "react";
import { 
  Radio, 
  Satellite, 
  AlertTriangle, 
  Database
} from "lucide-react";
import { ACTIVE_BULLETINS } from "../../services/imdAlertService";
import { useLanguage } from "../../language";

/**
 * IMD Operational Meteorological Bulletin Ticker & Command Action Bar
 */
export default function BulletinTickerBar({
  onOpenDrawer,
  lastUpdatedFormatted = "23:00 IST",
  nextRefreshMinutes = 10,
  activeDepression: _activeDepression
}) {
  const { t } = useLanguage();
  const [tickerIndex, setTickerIndex] = useState(0);


  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % ACTIVE_BULLETINS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentBulletin = ACTIVE_BULLETINS[tickerIndex] || ACTIVE_BULLETINS[0];

  return (
    <footer className="imd-bulletin-ticker-bar" role="region" aria-label="IMD Operational Bulletin Ticker">
      <div className="bulletin-bar-left">
        <button
          type="button"
          className="bulletin-ticker-tag"
          onClick={() => onOpenDrawer && onOpenDrawer("bulletins")}
          title="Click to view full IMD Meteorological Bulletins"
        >
          <span className="ticker-pulse-beacon" />
          <Radio size={13} className="text-blue-600 animate-pulse" />
          <span className="font-mono font-bold text-xs text-blue-950">{t("IMD BULLETIN")}</span>
        </button>

        <div 
          className="bulletin-ticker-content cursor-pointer hover:bg-blue-50/60 transition-colors"
          onClick={() => onOpenDrawer && onOpenDrawer("bulletins")}
          title="Click to expand bulletin details"
        >
          <span className="bulletin-no-badge font-mono text-[11px] font-bold text-slate-700">
            [{currentBulletin.bulletinNo}]
          </span>
          <span className="bulletin-headline text-xs font-semibold text-slate-900 truncate">
            {t(currentBulletin.headline)}
          </span>
          <span className="bulletin-region-tag font-mono text-[10.5px] text-slate-500 hidden lg:inline">
            • {t(currentBulletin.region)}
          </span>
        </div>
      </div>

      <div className="bulletin-bar-actions">
        {/* Quick Operational Panel Triggers */}
        <div className="quick-nav-pills">
          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => onOpenDrawer && onOpenDrawer("bulletins")}
            title="Open IMD Bulletins Archive"
          >
            <Radio size={12} className="text-blue-600" />
            <span>{t("BULLETINS")}</span>
          </button>

          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => onOpenDrawer && onOpenDrawer("satellite")}
            title="Open INSAT-3DS Satellite Viewer"
          >
            <Satellite size={12} className="text-cyan-600" />
            <span>{t("SATELLITE")}</span>
          </button>

          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => onOpenDrawer && onOpenDrawer("warnings")}
            title="Open IMD Weather Warnings"
          >
            <AlertTriangle size={12} className="text-amber-600" />
            <span>{t("WARNINGS")}</span>
          </button>

          <button
            type="button"
            className="quick-pill-btn"
            onClick={() => onOpenDrawer && onOpenDrawer("sources")}
            title="Open Data Provenance & Authoritative Sources"
          >
            <Database size={12} className="text-slate-600" />
            <span>{t("SOURCES")}</span>
          </button>
        </div>

        {/* Telemetry Refresh Status */}
        <div className="telemetry-refresh-block font-mono text-[10px] text-slate-500">
          <span className="text-slate-700 font-semibold">{t("UPDATED:")} {lastUpdatedFormatted}</span>
          <span className="text-slate-300">•</span>
          <span>{t("NEXT:")} {nextRefreshMinutes}m</span>
        </div>
      </div>
    </footer>
  );
}
