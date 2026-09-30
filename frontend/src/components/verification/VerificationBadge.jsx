import React from "react";
import { ShieldCheck, AlertTriangle, Minus, HelpCircle } from "lucide-react";
import { VERDICT_STYLES, QUALITY_STYLES } from "../../services/verificationApi.js";

/**
 * VerificationBadge
 *
 * A compact inline badge showing the AI verification verdict + uncertainty range.
 * Used in district risk cards and map overlays.
 *
 * GOVERNANCE:
 * - Always labelled "[AI VERIFICATION]"
 * - Central risk score preserved and displayed prominently
 * - Uncertainty range shown as [lower–upper]
 * - Human review flag visible in red
 * - Never suggests this is observed ground truth
 */

export default function VerificationBadge({
  verificationData,
  compact = false,
  style = {}
}) {
  if (!verificationData) return null;

  const { verification, risk } = verificationData;
  if (!verification || !risk) return null;

  const verdict = verification.verdict?.verdict ?? "abstain";
  const vStyle = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.abstain;
  const cloudQuality = verification.cloud_quality?.quality ?? "INSUFFICIENT";
  const qStyle = QUALITY_STYLES[cloudQuality] ?? QUALITY_STYLES.INSUFFICIENT;
  const requiresReview = risk.requires_human_review;

  const VerdictIcon = {
    agree: ShieldCheck,
    partial: Minus,
    disagree: AlertTriangle,
    abstain: HelpCircle
  }[verdict] ?? HelpCircle;

  if (compact) {
    return (
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px",
        borderRadius: "4px",
        background: vStyle.bg,
        border: `1px solid ${vStyle.border}`,
        fontSize: "9px",
        fontWeight: 700,
        color: vStyle.text,
        letterSpacing: "0.05em",
        ...style
      }}>
        <VerdictIcon size={10} />
        <span>VERIFY: {vStyle.label}</span>
        {requiresReview && (
          <span style={{
            background: "rgba(239,68,68,0.2)",
            border: "1px solid rgba(239,68,68,0.5)",
            color: "#f87171",
            fontSize: "8px",
            padding: "0px 4px",
            borderRadius: "2px",
            fontWeight: 800
          }}>⚑ REVIEW</span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(15,23,42,0.8)",
      border: `1px solid ${vStyle.border}`,
      borderRadius: "8px",
      padding: "10px 12px",
      ...style
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={12} style={{ color: "#38bdf8" }} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.06em" }}>
            [AI VERIFICATION] SECOND-OPINION
          </span>
        </div>
        {requiresReview && (
          <span style={{
            fontSize: "8px",
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: "3px",
            background: "rgba(239,68,68,0.2)",
            border: "1px solid rgba(239,68,68,0.5)",
            color: "#f87171",
            letterSpacing: "0.04em"
          }}>
            ⚑ HUMAN REVIEW REQUIRED
          </span>
        )}
      </div>

      {/* Verdict + Uncertainty row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Verdict */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 8px",
          borderRadius: "4px",
          background: vStyle.bg,
          border: `1px solid ${vStyle.border}`
        }}>
          <VerdictIcon size={11} style={{ color: vStyle.text }} />
          <span style={{ fontSize: "10px", fontWeight: 700, color: vStyle.text }}>
            {vStyle.label}
          </span>
        </div>

        {/* Uncertainty range */}
        <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
          <span style={{ color: "#64748b", fontSize: "9px" }}>RISK RANGE: </span>
          <span style={{ fontWeight: 700, color: "#f1f5f9" }}>
            {risk.risk_lower}–{risk.risk_upper}
          </span>
          <span style={{ color: "#475569", fontSize: "9px" }}> (±{risk.uncertainty_adjustment}pts)</span>
        </div>

        {/* Cloud quality */}
        <div style={{ fontSize: "9px", color: qStyle.text, display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: "#64748b" }}>S2:</span>
          <span style={{ fontWeight: 700 }}>{qStyle.label}</span>
        </div>
      </div>

      {/* Failure mode / reason - if notable */}
      {verification.verdict?.failure_mode && verification.verdict.failure_mode !== "none" && (
        <div style={{
          marginTop: "6px",
          fontSize: "9px",
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}>
          <AlertTriangle size={9} style={{ color: "#fb923c", flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: "#fb923c" }}>
            {verification.verdict.failure_mode.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
      )}

      {/* Provenance disclaimer */}
      <div style={{
        marginTop: "6px",
        fontSize: "8px",
        color: "#334155",
        letterSpacing: "0.03em"
      }}>
        [AI VERIFICATION] Not observed ground truth. MVP thresholds not calibrated.
      </div>
    </div>
  );
}
