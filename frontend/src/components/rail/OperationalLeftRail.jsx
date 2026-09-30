import React from "react";
import { 
  AlertTriangle, 
  Zap, 
  Radio, 
  Satellite, 
  Compass, 
  Wind, 
  CloudRain, 
  Waves, 
  Layers, 
  Activity,
  Anchor,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { useLanguage } from "../../language";

export default function OperationalLeftRail({
  operatingMode = "NORMAL",
  activeRailItem,
  onSelectRailItem,
  layerStates = {},
  onToggleLayer
}) {
  const { t } = useLanguage();
  const isNormal = operatingMode === "NORMAL";

  const normalItems = [
    { id: "warnings", label: "WARNINGS", icon: AlertTriangle, color: "text-red-600", count: "3" },
    { id: "nowcast", label: "NOWCAST", icon: Zap, color: "text-amber-500", count: "DWR" },
    { id: "bulletins", label: "BULLETINS", icon: Radio, color: "text-blue-600", count: "LIVE" },
    { id: "satellite", label: "SATELLITE", icon: Satellite, color: "text-cyan-600", count: "3DS" },
    { id: "radar", label: "RADAR", icon: Compass, color: "text-emerald-600", count: "DWR" },
    { id: "wind", label: "WIND", icon: Wind, color: "text-teal-600", isLayerToggle: true, layerKey: "wind" },
    { id: "rainfall", label: "RAINFALL", icon: CloudRain, color: "text-indigo-600", isLayerToggle: true, layerKey: "rain" },
    { id: "cyclone", label: "CYCLONE", icon: Waves, color: "text-orange-600", count: "DEP" },
    { id: "observations", label: "OBSERVATIONS", icon: Activity, color: "text-slate-700", count: "AWS" }
  ];

  const disasterItems = [
    { id: "track", label: "TRACK", icon: Compass, color: "text-orange-600", isLayerToggle: true, layerKey: "track" },
    { id: "wind", label: "WIND FIELD", icon: Wind, color: "text-teal-600", isLayerToggle: true, layerKey: "wind" },
    { id: "rain", label: "SURGE / FLOOD", icon: Waves, color: "text-cyan-600", isLayerToggle: true, layerKey: "inundation" },
    { id: "risk", label: "RISK MATRIX", icon: Layers, color: "text-red-600", count: "8 DIST" },
    { id: "infra", label: "INFRASTRUCTURE", icon: Anchor, color: "text-blue-700", count: "11 ASSETS" },
    { id: "evidence", label: "EVIDENCE", icon: ShieldCheck, color: "text-emerald-600", count: "VERIFIED" },
    { id: "advisory", label: "ADVISORY", icon: Sparkles, color: "text-orange-600", count: "AI SOP" }
  ];

  const items = isNormal ? normalItems : disasterItems;

  return (
    <aside className="operational-left-rail" aria-label="IMD Meteorological Operational Rail">
      <div className="rail-header">
        <span className="rail-title font-mono font-bold">
          {t(isNormal ? "MET SERVICES" : "COMMAND RAIL")}
        </span>
      </div>

      <nav className="rail-items-list">
        {items.map((item) => {
          const Icon = item.icon;
          const isSelected = activeRailItem === item.id;
          const isLayerActive = item.isLayerToggle ? !!layerStates[item.layerKey] : false;

          return (
            <button
              key={item.id}
              type="button"
              className={`rail-nav-btn ${isSelected ? "selected" : ""} ${isLayerActive ? "layer-active" : ""}`}
              onClick={() => {
                if (item.isLayerToggle && onToggleLayer) {
                  onToggleLayer(item.layerKey);
                }
                if (onSelectRailItem) {
                  onSelectRailItem(item.id);
                }
              }}
              title={`${t(item.label)} • ${item.isLayerToggle ? t("Toggle Map Layer") : t("Open Operational Drawer")}`}
            >
              <div className="rail-icon-wrap">
                <Icon size={14} className={item.color} />
              </div>
              <span className="rail-btn-label font-mono">{t(item.label)}</span>

              {item.isLayerToggle ? (
                <span className={`rail-toggle-indicator ${isLayerActive ? "on" : "off"}`}>
                  {isLayerActive ? t("ON") : t("OFF")}
                </span>
              ) : item.count ? (
                <span className="rail-badge font-mono">{item.count}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="rail-footer font-mono">
        <span className="rail-source-tag">{t("IMD • MOSDAC")}</span>
      </div>
    </aside>
  );
}
