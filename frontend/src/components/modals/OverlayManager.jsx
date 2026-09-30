import React, { useEffect, useState } from "react";
import {
  X,
  Radio,
  AlertTriangle,
  Database,
  ExternalLink,
  Search,
  Activity,
  Bell,
  Satellite,
  Sparkles,
  ShieldCheck,
  Wind,
  Thermometer,
  CloudRain,
  Zap,
  MapPin
} from "lucide-react";
import SatellitePanel from "../satellite/SatellitePanel";
import { STATES_AND_UTS } from "../../data/indiaGeography";
import { useLanguage } from "../../language";

/**
 * OverlayManager
 * Centralized Single Overlay System for DRISHTI Meteorological Command Centre
 * Premium dark-themed overlay system — consistent with bulletin design language.
 */

// Shared dark modal shell styles
const MODAL = {
  wrap: {
    background: "#0f172a",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
    width: "100%",
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "var(--font-mono, monospace)"
  },
  closeBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#94a3b8",
    cursor: "pointer",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  footer: {
    padding: "10px 20px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(15,23,42,0.8)",
    flexShrink: 0
  }
};

// Reusable header builder
function ModalHeader({ icon, iconBg, iconColor, title, subtitle, badge, badgeColor, onClose, extra }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0c1628 100%)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "8px",
          background: iconBg || "rgba(56,189,248,0.15)",
          border: `1px solid ${iconColor || "rgba(56,189,248,0.3)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0
        }}>
          {icon}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
            <h3 style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: 800, letterSpacing: "0.06em", margin: 0 }}>
              {title}
            </h3>
            {badge && (
              <span style={{
                fontSize: "9px", fontWeight: 700, padding: "1px 7px", borderRadius: "3px",
                background: badgeColor?.bg || "rgba(34,197,94,0.15)",
                color: badgeColor?.text || "#4ade80",
                border: `1px solid ${badgeColor?.border || "rgba(34,197,94,0.3)"}`,
                display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap"
              }}>
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: badgeColor?.dot || "#4ade80",
                  display: "inline-block", animation: "pulse 2s infinite"
                }} />
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.04em" }}>{subtitle}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {extra}
        <button type="button" onClick={onClose} style={MODAL.closeBtn} aria-label="Close">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// Sub-header bar
function SubBar({ left, right, accentColor = "rgba(56,189,248,0.1)", borderColor = "rgba(56,189,248,0.08)" }) {
  return (
    <div style={{
      background: accentColor,
      borderBottom: `1px solid ${borderColor}`,
      padding: "8px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexShrink: 0
    }}>
      <span style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.06em" }}>{left}</span>
      <span style={{
        fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "3px",
        background: "rgba(56,189,248,0.1)", color: "#38bdf8",
        border: "1px solid rgba(56,189,248,0.2)", letterSpacing: "0.05em"
      }}>{right}</span>
    </div>
  );
}

export default function OverlayManager({
  activeOverlay,
  onClose,
  data,
  onSelectState,
  onLaunchDisasterMode
}) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [readOverrides, setReadOverrides] = useState({});

  const notifications = (data?.notifications || []).map((n) => ({
    ...n,
    isRead: readOverrides[n.id] !== undefined ? readOverrides[n.id] : n.isRead
  }));

  const markAllRead = () => {
    const all = {};
    (data?.notifications || []).forEach((n) => { all[n.id] = true; });
    setReadOverrides(all);
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && activeOverlay) onClose();
    }
    if (activeOverlay) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeOverlay, onClose]);

  if (!activeOverlay) return null;

  const overlayKey =
    activeOverlay === "bulletins" ? "bulletin" :
    activeOverlay === "warnings" || activeOverlay === "alerts" ? "warning" :
    activeOverlay;

  const getNotifTypeStyle = (type) => {
    switch (type) {
      case "WARNING":  return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", color: "#f87171" };
      case "BULLETIN": return { bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.3)", color: "#fb923c" };
      case "SATELLITE":return { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", color: "#22d3ee" };
      default:         return { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#60a5fa" };
    }
  };

  const getSeverityStyle = (sev) => {
    if (sev === "CRITICAL" || sev === "WARNING")
      return { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", color: "#f87171" };
    if (sev === "ALERT")
      return { bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.4)", color: "#fb923c" };
    return { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", color: "#fbbf24" };
  };

  return (
    <div
      className="operational-overlay-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Operational Command Overlay"
    >
      <div className="operational-overlay-window" onClick={(e) => e.stopPropagation()}>

        {/* ══════════════════════════════════════════════════════
            1. NOTIFICATIONS OVERLAY
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "notifications" && (
          <div style={{ ...MODAL.wrap, maxWidth: "520px" }}>
            <ModalHeader
              icon={<Bell size={18} style={{ color: "#fbbf24" }} />}
              iconBg="rgba(251,191,36,0.15)"
              iconColor="rgba(251,191,36,0.3)"
              title={t("OPERATIONAL NOTIFICATION CENTRE")}
              subtitle={t("VERIFIED NEOC / IMD MULTI-HAZARD EVENT BUS")}
              badge={t("LIVE")}
              badgeColor={{ bg: "rgba(34,197,94,0.15)", text: "#4ade80", border: "rgba(34,197,94,0.3)", dot: "#4ade80" }}
              onClose={onClose}
              extra={
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{
                    fontSize: "10px", fontWeight: 700, color: "#60a5fa",
                    background: "transparent", border: "none", cursor: "pointer",
                    letterSpacing: "0.04em"
                  }}
                >
                  {t("MARK ALL READ")}
                </button>
              }
            />
            <SubBar
              left={`${notifications.filter(n => !n.isRead).length} ${t("UNREAD")} • ${notifications.length} ${t("TOTAL")}`}
              right={t("ACTIVE BROADCASTS")}
              accentColor="rgba(251,191,36,0.05)"
              borderColor="rgba(251,191,36,0.1)"
            />

            <div style={{ padding: "12px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "65vh" }}>
              {notifications.map((item) => {
                const ts = getNotifTypeStyle(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => setReadOverrides((prev) => ({ ...prev, [item.id]: true }))}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      background: item.isRead ? "rgba(255,255,255,0.02)" : "rgba(59,130,246,0.06)",
                      border: item.isRead ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(59,130,246,0.2)",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px",
                          background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color, letterSpacing: "0.04em"
                        }}>{t(item.type)}</span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#f1f5f9" }}>{t(item.title)}</span>
                        {!item.isRead && (
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
                        )}
                      </div>
                      <span style={{ fontSize: "10px", color: "#64748b", flexShrink: 0 }}>{item.time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={10} style={{ color: "#64748b" }} />
                        {t(item.region)}
                      </span>
                      <span style={{
                        fontSize: "9px", fontWeight: 700, padding: "1px 6px", borderRadius: "3px",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8"
                      }}>{t(item.provenance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: MULTI-HAZARD EVENT BUS")}</span>
              <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 700 }}>MoES • IMD • NEOC</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            2. SATELLITE OVERLAY — wraps SatellitePanel in dark shell
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "satellite" && (
          <div style={{ ...MODAL.wrap, maxWidth: "600px", border: "1px solid rgba(6,182,212,0.2)" }}>
            <SatellitePanel onClose={onClose} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            3. IMD METEOROLOGICAL BULLETINS
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "bulletin" && (
          <div style={{ ...MODAL.wrap, maxWidth: "680px", border: "1px solid #1e3a5f", boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.08)" }}>
            <ModalHeader
              icon={<Radio size={18} style={{ color: "#38bdf8" }} />}
              iconBg="rgba(56,189,248,0.15)"
              iconColor="rgba(56,189,248,0.3)"
              title={t("IMD NATIONAL & MARINE METEOROLOGICAL BULLETINS")}
              subtitle={t("DEMO / SIMULATED METEOROLOGICAL DATA • REFERENCE SCENARIO")}
              badge={t("DEMO")}
              badgeColor={{ bg: "rgba(56,189,248,0.15)", text: "#38bdf8", border: "rgba(56,189,248,0.3)", dot: "#38bdf8" }}
              onClose={onClose}
            />
            <SubBar
              left={`${(data?.bulletins || []).length} ${t("BULLETINS ACTIVE")}`}
              right={t("DEMO / SIMULATED METEOROLOGICAL DATA")}
            />
            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              {(data?.bulletins || []).map((b, bIdx) => (
                <div key={b.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", background: "rgba(30,58,95,0.5)", borderBottom: "1px solid rgba(56,189,248,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: "#38bdf8" }}>{bIdx + 1}</span>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.04em" }}>{b.bulletinNo}</span>
                    </div>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>{b.issuedAt}</span>
                  </div>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <h4 style={{ fontSize: "12px", fontWeight: 800, color: "#f8fafc", margin: "0 0 6px 0", letterSpacing: "0.02em" }}>{t(b.headline)}</h4>
                    <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, margin: 0, fontFamily: "sans-serif", fontWeight: 400 }}>{t(b.details)}</p>
                  </div>
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#0ea5e9", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("SEA CONDITION")}</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>{t(b.seaCondition)}</div>
                    </div>
                    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#818cf8", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("WAVE HEIGHT")}</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>{b.significantWaveHeightMeters}m <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500 }}>({t(b.waveDirection)})</span></div>
                    </div>
                    <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: "8px", background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#fb923c", letterSpacing: "0.06em", marginBottom: "4px" }}>⚡ {t("SQUALL WARNING")}</div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#fed7aa" }}>{t(b.squallWarning)}</div>
                    </div>
                    <div style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: "8px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
                        <AlertTriangle size={11} style={{ color: "#f87171", flexShrink: 0 }} />
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#f87171", letterSpacing: "0.06em" }}>{t("FISHERMEN ADVISORY")}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "#fca5a5", lineHeight: 1.5, fontFamily: "sans-serif", fontWeight: 500 }}>{t(b.fishermenAdvisory)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: DEMO / SIMULATED METEOROLOGICAL DATA")}</span>
              <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 700 }}>{t("DEMO SCENARIO")}</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            4. IMD EMERGENCY WARNINGS
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "warning" && (
          <div style={{ ...MODAL.wrap, maxWidth: "660px", border: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.06)" }}>
            <ModalHeader
              icon={<AlertTriangle size={18} style={{ color: "#f87171" }} />}
              iconBg="rgba(239,68,68,0.15)"
              iconColor="rgba(239,68,68,0.3)"
              title={t("IMD NATIONAL WEATHER WARNINGS & ALERTS")}
              subtitle={t("DEMO / SIMULATED METEOROLOGICAL DATA • REFERENCE SCENARIO")}
              badge={t("DEMO")}
              badgeColor={{ bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)", dot: "#f87171" }}
              onClose={onClose}
            />
            <SubBar
              left={`${(data?.warnings || []).length} ${t("ALERTS ISSUED")}`}
              right={t("DEMO / SIMULATED METEOROLOGICAL DATA")}
              accentColor="rgba(239,68,68,0.05)"
              borderColor="rgba(239,68,68,0.1)"
            />
            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              {(data?.warnings || []).map((alert) => {
                const ss = getSeverityStyle(alert.severity);
                return (
                  <div key={alert.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: "rgba(60,20,20,0.4)", borderBottom: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color, letterSpacing: "0.06em" }}>{t(alert.severity)}</span>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#f1f5f9" }}>{t(alert.title)}</span>
                      </div>
                      <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, flexShrink: 0 }}>{alert.issuedAt}</span>
                    </div>
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, margin: 0, fontFamily: "sans-serif" }}>{t(alert.summary || alert.details || "")}</p>
                    </div>
                    <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ gridColumn: "1 / -1", padding: "10px 12px", borderRadius: "8px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#f87171", letterSpacing: "0.06em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={10} />{t("REGION / AFFECTED SECTOR")}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#fca5a5" }}>{t(alert.region)}</div>
                      </div>
                    </div>
                    <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("SOURCE:")} {alert.source}</span>
                      <span style={{ fontSize: "9px", fontWeight: 700, padding: "1px 7px", borderRadius: "3px", background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}>{t(alert.provenance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: DEMO / SIMULATED METEOROLOGICAL DATA")}</span>
              <span style={{ fontSize: "10px", color: "#f87171", fontWeight: 700 }}>{t("DEMO SCENARIO")}</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            5. DATA SOURCES & STRICT PROVENANCE
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "sources" && (
          <div style={{ ...MODAL.wrap, maxWidth: "640px", border: "1px solid rgba(6,182,212,0.15)" }}>
            <ModalHeader
              icon={<Database size={18} style={{ color: "#22d3ee" }} />}
              iconBg="rgba(6,182,212,0.15)"
              iconColor="rgba(6,182,212,0.3)"
              title={t("DATA PROVENANCE & AUTHORITATIVE SOURCES")}
              subtitle={t("STRICT SOURCING MATRIX • DRISHTI INTELLIGENCE FRAMEWORK")}
              badge={t("VERIFIED")}
              badgeColor={{ bg: "rgba(6,182,212,0.15)", text: "#22d3ee", border: "rgba(6,182,212,0.3)", dot: "#22d3ee" }}
              onClose={onClose}
            />
            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                {
                  num: "01", name: t("INDIA METEOROLOGICAL DEPARTMENT (IMD)"),
                  badge: t("DEMO / SIMULATED METEOROLOGICAL DATA"),
                  badgeColor: "#38bdf8", badgeBg: "rgba(56,189,248,0.1)", badgeBorder: "rgba(56,189,248,0.2)",
                  accent: "rgba(56,189,248,0.06)", accentBorder: "rgba(56,189,248,0.12)",
                  desc: t("National synoptic bulletins, marine squall advisories, and CAP emergency alerts (demonstration scenarios calibrated to official IMD formats)."),
                  url: "https://mausam.imd.gov.in", urlLabel: "mausam.imd.gov.in"
                },
                {
                  num: "02", name: t("MOSDAC / ISRO (INSAT-3DS)"),
                  badge: t("OBSERVED / SATELLITE PRODUCT"),
                  badgeColor: "#22d3ee", badgeBg: "rgba(6,182,212,0.1)", badgeBorder: "rgba(6,182,212,0.2)",
                  accent: "rgba(6,182,212,0.06)", accentBorder: "rgba(6,182,212,0.12)",
                  desc: t("Space Applications Centre geostationary meteorological satellite products: Infrared (IR1), Visible (VIS), Water Vapour (WV), and Cloud Top Temperature (CTT)."),
                  url: "https://www.mosdac.gov.in", urlLabel: "mosdac.gov.in"
                },
                {
                  num: "03", name: t("OPEN-METEO WEATHER MODEL"),
                  badge: t("LIVE WEATHER — CURRENT MODEL DATA"),
                  badgeColor: "#4ade80", badgeBg: "rgba(34,197,94,0.1)", badgeBorder: "rgba(34,197,94,0.2)",
                  accent: "rgba(34,197,94,0.06)", accentBorder: "rgba(34,197,94,0.12)",
                  desc: t("Frontend-accessible numerical weather prediction: 10m wind speed, direction, gusts, 2m temperature, relative humidity, and precipitation."),
                  url: "https://open-meteo.com", urlLabel: "open-meteo.com"
                },
                {
                  num: "04", name: t("DRISHTI DEPRESSION INFLUENCE %"),
                  badge: t("DRISHTI DERIVED"),
                  badgeColor: "#fbbf24", badgeBg: "rgba(245,158,11,0.1)", badgeBorder: "rgba(245,158,11,0.2)",
                  accent: "rgba(245,158,11,0.06)", accentBorder: "rgba(245,158,11,0.12)",
                  desc: t("Transparent mathematical formula derived from synoptic depression centroid proximity, surface wind velocity, and precipitation. NOT an official IMD probability."),
                  url: null
                },
                {
                  num: "05", name: t("CYCLONE REMAL 2024 BENCHMARK"),
                  badge: t("HISTORICAL SIMULATION — CYCLONE REMAL 2024"),
                  badgeColor: "#f87171", badgeBg: "rgba(239,68,68,0.1)", badgeBorder: "rgba(239,68,68,0.2)",
                  accent: "rgba(239,68,68,0.06)", accentBorder: "rgba(239,68,68,0.12)",
                  desc: t("Calibrated historical operational exercise replay over Bay of Bengal / Odisha-WB arc for emergency decision training and risk validation."),
                  url: null
                }
              ].map((src) => (
                <div key={src.num} style={{ background: src.accent, border: `1px solid ${src.accentBorder}`, borderRadius: "10px", padding: "14px 16px", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "9px", fontWeight: 800, color: src.badgeColor, background: src.badgeBg, border: `1px solid ${src.badgeBorder}`, padding: "2px 6px", borderRadius: "3px" }}>{src.num}</span>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.03em" }}>{src.name}</span>
                    </div>
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "3px", background: src.badgeBg, color: src.badgeColor, border: `1px solid ${src.badgeBorder}`, whiteSpace: "nowrap" }}>{src.badge}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 8px 0", fontFamily: "sans-serif" }}>{src.desc}</p>
                  {src.url && (
                    <a href={src.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "11px", color: src.badgeColor, display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                      <span>{src.urlLabel}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: MULTI-AGENCY DATA MATRIX")}</span>
              <span style={{ fontSize: "10px", color: "#22d3ee", fontWeight: 700 }}>MoES • IMD • ISRO</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            6. NATIONAL OBSERVATIONS TABLE
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "observations" && (
          <div style={{ ...MODAL.wrap, maxWidth: "900px", border: "1px solid rgba(16,185,129,0.15)" }}>
            <ModalHeader
              icon={<Activity size={18} style={{ color: "#34d399" }} />}
              iconBg="rgba(16,185,129,0.15)"
              iconColor="rgba(16,185,129,0.3)"
              title={t("NATIONAL SYNOPTIC METEOROLOGY & HAZARD STATUS")}
              subtitle={t("ALL 36 STATES & UNION TERRITORIES • OPEN-METEO MODEL TELEMETRY")}
              badge={t("LIVE")}
              badgeColor={{ bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.3)", dot: "#34d399" }}
              onClose={onClose}
            />

            {/* Search bar */}
            <div style={{ padding: "10px 16px", background: "rgba(16,185,129,0.04)", borderBottom: "1px solid rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexShrink: 0 }}>
              <div style={{ position: "relative", maxWidth: "260px", width: "100%" }}>
                <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input
                  type="text"
                  placeholder={t("Filter state or UT...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%", paddingLeft: "32px", paddingRight: "12px", paddingTop: "7px", paddingBottom: "7px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px", color: "#e2e8f0", fontSize: "11px", fontFamily: "var(--font-mono, monospace)",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
              <span style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                {t("PROVENANCE: OPEN-METEO MODEL TELEMETRY")}
              </span>
            </div>

            <div style={{ overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "var(--font-mono, monospace)" }}>
                <thead>
                  <tr style={{ background: "rgba(16,185,129,0.07)", borderBottom: "1px solid rgba(16,185,129,0.1)" }}>
                    {[t("STATE / UT"), t("WIND"), t("RAINFALL"), t("TEMP"), t("DEPRESSION %"), t("SOURCE"), t("UPDATED")].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "9px", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STATES_AND_UTS
                    .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((state, idx) => {
                      const record = data?.states?.find((s) => s.id === state.id);
                      const hasData = record && record.hasData !== false;
                      const wind = hasData && record.windSpeed != null ? `${record.windSpeed} km/h` : "—";
                      const rain = hasData && record.rain != null ? (record.rain > 15 ? t("Heavy") : record.rain > 0 ? `${record.rain} mm` : t("Low")) : "—";
                      const temp = hasData && record.temperature != null ? `${record.temperature}°C` : "—";
                      const inf = hasData && record.depressionInfluencePct != null ? `${record.depressionInfluencePct}%` : "N/A";
                      const src = record?.source || "Open-Meteo";
                      const upd = record?.updatedAt || data?.timestamp?.timeShort || "IST";
                      const infVal = parseFloat(inf) || 0;

                      return (
                        <tr
                          key={state.id}
                          onClick={() => { if (onSelectState) onSelectState(state); onClose(); }}
                          style={{
                            background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            cursor: "pointer",
                            transition: "background 0.1s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(16,185,129,0.06)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"}
                        >
                          <td style={{ padding: "9px 12px", fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap" }}>{t(state.name)}</td>
                          <td style={{ padding: "9px 12px", color: "#2dd4bf" }}>{wind}</td>
                          <td style={{ padding: "9px 12px", color: "#60a5fa" }}>{rain}</td>
                          <td style={{ padding: "9px 12px", color: "#fbbf24" }}>{temp}</td>
                          <td style={{ padding: "9px 12px", fontWeight: 700, color: infVal > 50 ? "#f87171" : infVal > 25 ? "#fb923c" : "#64748b" }}>{inf}</td>
                          <td style={{ padding: "9px 12px", color: "#475569", fontSize: "10px" }}>{src}</td>
                          <td style={{ padding: "9px 12px", color: "#475569", fontSize: "10px" }}>{upd}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: OPEN-METEO MODEL TELEMETRY • REFRESHED BATCH")}</span>
              <span style={{ fontSize: "10px", color: "#34d399", fontWeight: 700 }}>Open-Meteo • MoES</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            7. ADVISORY OVERLAY
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "advisory" && (
          <div style={{ ...MODAL.wrap, maxWidth: "580px", border: "1px solid rgba(251,146,60,0.2)" }}>
            <ModalHeader
              icon={<Sparkles size={18} style={{ color: "#fb923c" }} />}
              iconBg="rgba(251,146,60,0.15)"
              iconColor="rgba(251,146,60,0.3)"
              title={t("OPERATIONAL DECISION DIRECTIVE & ADVISORY")}
              subtitle={t("DRISHTI AI DECISION ENGINE • HUMAN-REVIEWED & AUTHORIZED")}
              badge={t("APPROVED")}
              badgeColor={{ bg: "rgba(34,197,94,0.15)", text: "#4ade80", border: "rgba(34,197,94,0.3)", dot: "#4ade80" }}
              onClose={onClose}
            />
            <SubBar
              left={t("AI SYNOPTIC SYNTHESIS • NEOC WATCH OFFICER AUTHORIZED")}
              right={t("DRISHTI DERIVED")}
              accentColor="rgba(251,146,60,0.05)"
              borderColor="rgba(251,146,60,0.1)"
            />
            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* AI Summary */}
              <div style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#fb923c", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Sparkles size={10} />{t("AI EXPLANATION & SYNOPTIC SYNTHESIS")}
                </div>
                <p style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.7, margin: 0, fontFamily: "sans-serif", fontWeight: 400 }}>
                  {t("System depression tracks across Central India are exerting high hydraulic stress in Northeast Madhya Pradesh and adjoining Chhattisgarh river basins. Precautionary activation of SDRF quick response teams is advised.")}
                </p>
              </div>

              {/* Authorization grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#4ade80", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("HUMAN REVIEW")}</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#4ade80" }}>{t("COMPLETED ✓")}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("AUTHORIZATION")}</div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8" }}>{t("APPROVED")}</div>
                </div>
                <div style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: "8px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#818cf8", letterSpacing: "0.06em", marginBottom: "4px" }}>{t("DISPATCH STATUS")}</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#c4b5fd" }}>{t("TRANSMITTED TO STATE EOCs (MP, CG, UP)")}</div>
                </div>
              </div>
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: DRISHTI DECISION ENGINE • NOT AN OFFICIAL IMD ADVISORY")}</span>
              <span style={{ fontSize: "10px", color: "#fb923c", fontWeight: 700 }}>NEOC</span>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            8. SCENARIO OVERLAY
        ══════════════════════════════════════════════════════ */}
        {overlayKey === "scenario" && (
          <div style={{ ...MODAL.wrap, maxWidth: "520px", border: "1px solid rgba(239,68,68,0.2)" }}>
            <ModalHeader
              icon={<Activity size={18} style={{ color: "#f87171" }} />}
              iconBg="rgba(239,68,68,0.15)"
              iconColor="rgba(239,68,68,0.3)"
              title={t("HISTORICAL SIMULATION EXERCISE ARCHIVE")}
              subtitle={t("CALIBRATED OPERATIONAL REPLAY • NOT A LIVE WARNING")}
              badge={t("SIMULATION")}
              badgeColor={{ bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.3)", dot: "#f87171" }}
              onClose={onClose}
            />
            <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "rgba(60,20,20,0.5)", borderBottom: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 800, padding: "2px 7px", borderRadius: "3px", background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}>BOB/01/2024</span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#f1f5f9" }}>{t("CYCLONE REMAL (MAY 2024)")}</span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                    {[
                      { label: "CLASSIFICATION", value: "Severe Cyclonic Storm", color: "#f87171" },
                      { label: "BASIN", value: "Bay of Bengal", color: "#38bdf8" },
                      { label: "LANDFALL", value: "West Bengal / Bangladesh", color: "#fbbf24" },
                      { label: "PEAK WIND", value: "~110 km/h", color: "#fb923c" }
                    ].map((m) => (
                      <div key={m.label} style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", marginBottom: "4px" }}>{t(m.label)}</div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: m.color }}>{t(m.value)}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 14px 0", fontFamily: "sans-serif" }}>
                    {t("Replays the multi-temporal progression of Severe Cyclonic Storm Remal across the Bay of Bengal into West Bengal and Bangladesh. Features deterministic 8-district risk scoring, SegFormer inundation inference, and Gemini multi-lingual advisory generation.")}
                  </p>
                  {onLaunchDisasterMode && (
                    <button
                      type="button"
                      onClick={() => { onLaunchDisasterMode(); onClose(); }}
                      style={{
                        width: "100%", padding: "12px", borderRadius: "8px",
                        background: "linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)",
                        border: "1px solid rgba(239,68,68,0.4)",
                        color: "#ffffff", fontWeight: 800, fontSize: "12px",
                        cursor: "pointer", letterSpacing: "0.06em",
                        boxShadow: "0 4px 15px rgba(239,68,68,0.25)",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)"}
                    >
                      {t("⚠ LAUNCH CYCLONE RESPONSE MODE")}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div style={MODAL.footer}>
              <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>{t("PROVENANCE: HISTORICAL SIMULATION • NOT A LIVE WARNING")}</span>
              <span style={{ fontSize: "10px", color: "#f87171", fontWeight: 700 }}>{t("DRISHTI EXERCISE")}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
