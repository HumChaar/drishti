import React from "react";
import {
  ShieldCheck,
  Cloud,
  Droplets,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Minus,
  Database
} from "lucide-react";
import {
  VERDICT_STYLES,
  QUALITY_STYLES,
  RISK_BAND_COLORS
} from "../../services/verificationApi.js";

/**
 * VerificationPanel
 *
 * Full evidence panel showing the complete verification result for a risk zone.
 * Used inside OverlayManager or as a detail panel in the disaster mode sidebar.
 *
 * GOVERNANCE:
 * - Central risk score displayed prominently and labelled as DETERMINISTIC
 * - Uncertainty range shown separately and labelled
 * - Gemini verdict clearly labelled [AI VERIFICATION] — NOT ground truth
 * - All evidence sources show provenance tier
 * - MVP calibration disclaimers on all thresholds
 */

function EvidenceRow({ icon, label, value, color = "#94a3b8", badge, badgeBg, badgeColor }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.04)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#38bdf8", flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color }}>{value}</span>
        {badge && (
          <span style={{
            fontSize: "8px",
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: "3px",
            background: badgeBg || "rgba(56,189,248,0.1)",
            color: badgeColor || "#38bdf8",
            border: "1px solid rgba(56,189,248,0.2)",
            letterSpacing: "0.04em"
          }}>{badge}</span>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ label, color = "#38bdf8" }) {
  return (
    <div style={{
      padding: "8px 12px 4px",
      fontSize: "9px",
      fontWeight: 700,
      color,
      letterSpacing: "0.07em"
    }}>
      {label}
    </div>
  );
}

export default function VerificationPanel({ verificationData, districtName }) {
  if (!verificationData) {
    return (
      <div style={{
        padding: "24px",
        textAlign: "center",
        color: "#64748b",
        fontSize: "11px"
      }}>
        <ShieldCheck size={28} style={{ color: "#334155", margin: "0 auto 12px" }} />
        No verification data available.
      </div>
    );
  }

  const { verification, risk, human_review } = verificationData;
  const verdict = verification?.verdict?.verdict ?? "abstain";
  const vStyle = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.abstain;
  const bandColor = RISK_BAND_COLORS[risk?.risk_band ?? "MODERATE"];
  const cloudQuality = verification?.cloud_quality?.quality ?? "INSUFFICIENT";
  const qStyle = QUALITY_STYLES[cloudQuality] ?? QUALITY_STYLES.INSUFFICIENT;

  const VerdictIcon = {
    agree: CheckCircle,
    partial: Minus,
    disagree: AlertTriangle,
    abstain: HelpCircle
  }[verdict] ?? HelpCircle;

  return (
    <div style={{
      background: "#0c1628",
      fontFamily: "var(--font-mono, monospace)"
    }}>
      {/* Human review alert */}
      {human_review?.required && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: "8px",
          margin: "12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px"
        }}>
          <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: "1px" }} />
          <div>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#f87171", marginBottom: "3px" }}>
              ⚑ HUMAN REVIEW REQUIRED
            </div>
            <div style={{ fontSize: "9px", color: "#fca5a5", lineHeight: 1.5 }}>
              {human_review.reason}
            </div>
            {human_review.review_id && (
              <div style={{ fontSize: "8px", color: "#64748b", marginTop: "4px" }}>
                Review ID: {human_review.review_id}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk score section */}
      <SectionTitle label="DETERMINISTIC RISK SCORE (UNCHANGED BY VERIFICATION)" color="#38bdf8" />
      <div style={{
        margin: "0 12px 8px",
        padding: "12px",
        background: bandColor?.bg ?? "rgba(255,255,255,0.04)",
        border: `1px solid ${bandColor?.border ?? "rgba(255,255,255,0.1)"}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <div style={{ fontSize: "9px", color: "#64748b", letterSpacing: "0.06em", marginBottom: "2px" }}>
            CENTRAL RISK [DETERMINISTIC]
          </div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: bandColor?.text ?? "#f1f5f9" }}>
            {risk?.central_risk ?? "—"}
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 400 }}>/100</span>
          </div>
          <div style={{
            fontSize: "10px",
            fontWeight: 700,
            color: bandColor?.text,
            letterSpacing: "0.06em"
          }}>
            {risk?.risk_band}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "8px", color: "#64748b", marginBottom: "4px" }}>UNCERTAINTY RANGE</div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#f1f5f9", fontFamily: "monospace" }}>
            [{risk?.risk_lower}–{risk?.risk_upper}]
          </div>
          <div style={{ fontSize: "8px", color: "#64748b" }}>±{risk?.uncertainty_adjustment} pts</div>
          <div style={{ fontSize: "8px", color: "#475569", marginTop: "2px" }}>
            {risk?.formula}
          </div>
        </div>
      </div>

      {/* Verification verdict section */}
      <SectionTitle label="AI VERIFICATION VERDICT" color={vStyle.text} />
      <div style={{
        margin: "0 12px 8px",
        padding: "12px",
        background: vStyle.bg,
        border: `1px solid ${vStyle.border}`,
        borderRadius: "8px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <VerdictIcon size={16} style={{ color: vStyle.text }} />
          <span style={{ fontSize: "13px", fontWeight: 800, color: vStyle.text, letterSpacing: "0.05em" }}>
            {vStyle.label}
          </span>
          <span style={{
            fontSize: "8px",
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: "3px",
            background: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.2)",
            color: "#38bdf8"
          }}>
            [AI VERIFICATION] SECOND-OPINION
          </span>
        </div>

        {/* Failure mode */}
        {verification?.verdict?.failure_mode && verification.verdict.failure_mode !== "none" && (
          <div style={{
            padding: "6px 10px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid rgba(251,146,60,0.2)",
            borderRadius: "5px",
            marginBottom: "8px"
          }}>
            <span style={{ fontSize: "8px", color: "#64748b" }}>FAILURE MODE: </span>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#fb923c" }}>
              {verification.verdict.failure_mode.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>
        )}

        {/* Reason */}
        <p style={{
          fontSize: "10px",
          color: "#94a3b8",
          lineHeight: 1.6,
          margin: 0,
          fontFamily: "sans-serif"
        }}>
          {verification?.verdict?.reason ?? "No reason provided."}
        </p>

        {/* Disagreement level */}
        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "8px", color: "#64748b" }}>DISAGREEMENT:</span>
          <div style={{
            flex: 1,
            height: "4px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "2px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${((verification?.verdict?.disagreement_level ?? 0) * 100).toFixed(0)}%`,
              background: verdict === "disagree" ? "#f87171" : verdict === "partial" ? "#fbbf24" : "#4ade80",
              borderRadius: "2px",
              transition: "width 0.5s ease"
            }} />
          </div>
          <span style={{ fontSize: "9px", fontWeight: 700, color: vStyle.text }}>
            {((verification?.verdict?.disagreement_level ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Sentinel-2 cloud quality */}
      <SectionTitle label="SENTINEL-2 OPTICAL EVIDENCE" />
      <div style={{ margin: "0 12px 8px" }}>
        <EvidenceRow
          icon={<Cloud size={11} />}
          label="Cloud Quality"
          value={qStyle.label}
          color={qStyle.text}
          badge={verification?.cloud_quality?.provenance ?? "DERIVED"}
          badgeBg="rgba(56,189,248,0.08)"
          badgeColor="#38bdf8"
        />
        {verification?.cloud_quality?.cloudy_pixel_pct != null && (
          <EvidenceRow
            icon={<Cloud size={11} />}
            label="Cloudy Pixel %"
            value={`${verification.cloud_quality.cloudy_pixel_pct.toFixed(1)}%`}
            color="#94a3b8"
          />
        )}
        {verification?.cloud_quality?.scene_date && (
          <EvidenceRow
            icon={<Database size={11} />}
            label="Scene Date"
            value={verification.cloud_quality.scene_date}
            color="#94a3b8"
          />
        )}
        <div style={{
          padding: "6px 10px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: "0 0 6px 6px"
        }}>
          <p style={{ fontSize: "8px", color: "#334155", margin: 0, letterSpacing: "0.03em" }}>
            {verification?.cloud_quality?.note ?? "Cloud gate thresholds are MVP engineering defaults."}
          </p>
        </div>
      </div>

      {/* Permanent water check */}
      <SectionTitle label="PERMANENT WATER REFERENCE CHECK" />
      <div style={{ margin: "0 12px 8px" }}>
        <EvidenceRow
          icon={<Droplets size={11} />}
          label="Permanent Water Overlap"
          value={`${((verification?.permanent_water?.overlap_fraction ?? 0) * 100).toFixed(1)}%`}
          color={verification?.permanent_water?.is_flagged ? "#f87171" : "#4ade80"}
          badge={verification?.permanent_water?.is_flagged ? "FLAGGED" : "OK"}
          badgeBg={verification?.permanent_water?.is_flagged ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)"}
          badgeColor={verification?.permanent_water?.is_flagged ? "#f87171" : "#4ade80"}
        />
        {verification?.permanent_water?.is_flagged && (
          <div style={{
            padding: "8px 10px",
            background: "rgba(251,146,60,0.05)",
            border: "1px solid rgba(251,146,60,0.15)",
            borderRadius: "5px",
            fontSize: "9px",
            color: "#fb923c",
            margin: "4px 0 0"
          }}>
            ⚠ Possible permanent water false positive — SAR specular reflection.
            This does NOT remove the flood prediction.
          </div>
        )}
      </div>

      {/* JEV Bounded Decision Layer */}
      {verificationData.jev_decision && (
        <>
          <SectionTitle label="JEV BOUNDED DECISION LAYER" color="#fb923c" />
          <div style={{
            margin: "0 12px 8px",
            padding: "10px 12px",
            background: "rgba(251,146,60,0.06)",
            border: "1px solid rgba(251,146,60,0.2)",
            borderRadius: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#fb923c" }}>
                  DECISION: {verificationData.jev_decision.decision}
                </span>
                <span style={{
                  fontSize: "8px", fontWeight: 700, padding: "1px 5px", borderRadius: "3px",
                  background: "rgba(251,146,60,0.15)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)"
                }}>
                  PRIORITY: {verificationData.jev_decision.priority}
                </span>
              </div>
              <span style={{
                fontSize: "8px", fontWeight: 700, padding: "1px 6px", borderRadius: "3px",
                background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)"
              }}>
                {verificationData.jev_decision.verification_status}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", fontSize: "9px" }}>
              <span style={{ color: "#94a3b8" }}>NEXT ACTION: <strong style={{ color: "#e2e8f0" }}>{verificationData.jev_decision.next_action}</strong></span>
              <span style={{ color: "#64748b" }}>|</span>
              <span style={{ color: "#94a3b8" }}>REASON CODE: <strong style={{ color: "#fb923c" }}>{verificationData.jev_decision.reason_code}</strong></span>
            </div>
            {verificationData.jev_decision.additional_evidence_request?.length > 0 && (
              <div>
                <div style={{ fontSize: "8px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                  RECOMMENDED EVIDENCE ACTIONS:
                </div>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "8px", color: "#94a3b8" }}>
                  {verificationData.jev_decision.additional_evidence_request.map((req, idx) => (
                    <li key={idx} style={{ marginBottom: "2px" }}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ fontSize: "8px", color: "#475569", marginTop: "6px" }}>
              {verificationData.jev_decision.governance_note}
            </div>
          </div>
        </>
      )}

      {/* Gemini Watch Officer Advisory */}
      {verificationData.watch_officer_advisory && (
        <>
          <SectionTitle label="WATCH OFFICER VERIFICATION BRIEFING" color="#38bdf8" />
          <div style={{
            margin: "0 12px 8px",
            padding: "10px 12px",
            background: "rgba(56,189,248,0.05)",
            border: "1px solid rgba(56,189,248,0.18)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#38bdf8" }}>1. RISK EXPLANATION:</div>
              <div style={{ fontSize: "9px", color: "#cbd5e1", lineHeight: 1.5 }}>{verificationData.watch_officer_advisory.why_high_risk}</div>
            </div>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#4ade80" }}>2. SUPPORTING EVIDENCE:</div>
              <div style={{ fontSize: "9px", color: "#cbd5e1", lineHeight: 1.5 }}>{verificationData.watch_officer_advisory.supporting_evidence}</div>
            </div>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#fbbf24" }}>3. UNCERTAINTY / CONTRADICTIONS:</div>
              <div style={{ fontSize: "9px", color: "#cbd5e1", lineHeight: 1.5 }}>{verificationData.watch_officer_advisory.uncertain_or_contradictory_evidence}</div>
            </div>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#a78bfa" }}>4. AFFECTED INFRASTRUCTURE:</div>
              <div style={{ fontSize: "9px", color: "#cbd5e1", lineHeight: 1.5 }}>{verificationData.watch_officer_advisory.affected_infrastructure}</div>
            </div>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#f87171" }}>5. HUMAN REVIEW REASON:</div>
              <div style={{ fontSize: "9px", color: "#cbd5e1", lineHeight: 1.5 }}>{verificationData.watch_officer_advisory.why_human_review_required}</div>
            </div>
            <div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "#38bdf8" }}>6. INSPECTION PRIORITIES:</div>
              <ul style={{ margin: "2px 0 0", paddingLeft: "16px", fontSize: "8px", color: "#cbd5e1" }}>
                {(verificationData.watch_officer_advisory.watch_officer_inspection_priorities || []).map((p, pIdx) => (
                  <li key={pIdx} style={{ marginBottom: "2px" }}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Policy note */}
      <div style={{
        margin: "0 12px 12px",
        padding: "8px 10px",
        background: "rgba(56,189,248,0.04)",
        border: "1px solid rgba(56,189,248,0.1)",
        borderRadius: "6px"
      }}>
        <div style={{ fontSize: "8px", color: "#64748b", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "3px" }}>
          UNCERTAINTY POLICY
        </div>
        <p style={{ fontSize: "8px", color: "#334155", margin: 0, lineHeight: 1.5 }}>
          {risk?.policy_note ?? "Uncertainty adjustments are MVP engineering baselines — not scientifically calibrated."}
        </p>
        {risk?.formula && (
          <div style={{ fontSize: "8px", color: "#475569", marginTop: "4px", fontFamily: "monospace" }}>
            Formula: {risk.formula}
          </div>
        )}
      </div>

      {/* Pipeline note */}
      <div style={{
        margin: "0 12px 12px",
        padding: "8px 10px",
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "6px",
        fontSize: "8px",
        color: "#334155",
        lineHeight: 1.5,
        letterSpacing: "0.02em"
      }}>
        {verificationData.pipeline_note}
      </div>
    </div>
  );
}
