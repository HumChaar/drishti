import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  Eye,
  Users,
  Road,
  Hospital,
  Loader2
} from "lucide-react";
import { submitReviewDecision, VERDICT_STYLES, RISK_BAND_COLORS } from "../../services/verificationApi.js";

/**
 * ReviewQueueModal
 *
 * Displays the human review queue for uncertain flood-evidence decisions.
 * Allows Watch Officers to APPROVE, REJECT, or ESCALATE each item.
 *
 * GOVERNANCE:
 * - Every item is clearly labelled with the uncertainty reason
 * - Central risk score is displayed prominently (unchanged)
 * - Provenance is shown for all evidence sources
 * - All decisions are submitted to the backend audit log
 */

const STATUS_STYLES = {
  PENDING: { bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.35)", text: "#fbbf24", label: "PENDING REVIEW" },
  APPROVED: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)", text: "#4ade80", label: "APPROVED" },
  REJECTED: { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", text: "#94a3b8", label: "REJECTED" },
  ESCALATED: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#f87171", label: "ESCALATED" }
};

function ReviewQueueItem({ item, onDecisionSubmitted }) {
  const [submitting, setSubmitting] = useState(false);
  const [reviewerNote, setReviewerNote] = useState("");
  const [reviewerName, setReviewerName] = useState("Watch Officer");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);

  const vStyle = VERDICT_STYLES[item.verification_verdict] ?? VERDICT_STYLES.abstain;
  const statusStyle = STATUS_STYLES[item.review_status] ?? STATUS_STYLES.PENDING;
  const isPending = item.review_status === "PENDING";

  const handleDecision = async (action) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitReviewDecision(item.review_id, {
        action,
        reviewerName,
        reviewerNote
      });
      if (result && onDecisionSubmitted) {
        onDecisionSubmitted(result);
      }
    } catch (e) {
      setError(`Decision submission failed: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${isPending ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "10px",
      overflow: "hidden",
      marginBottom: "12px"
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        background: isPending ? "rgba(234,179,8,0.04)" : "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer"
      }}
      onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <ShieldCheck size={14} style={{ color: "#38bdf8" }} />
          <div>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#f1f5f9", letterSpacing: "0.04em" }}>
              {item.location || item.risk_zone_id || "Risk Zone"}
            </div>
            <div style={{ fontSize: "9px", color: "#64748b" }}>
              {item.event_id} · {item.created_at?.substring(0, 16).replace("T", " ")} UTC
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Status badge */}
          <span style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "3px",
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            color: statusStyle.text,
            letterSpacing: "0.05em"
          }}>
            {statusStyle.label}
          </span>
          {/* Verdict */}
          <span style={{
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: "3px",
            background: vStyle.bg,
            border: `1px solid ${vStyle.border}`,
            color: vStyle.text,
            letterSpacing: "0.05em"
          }}>
            GEMINI: {vStyle.label}
          </span>
          <ArrowUpRight size={12} style={{
            color: "#64748b",
            transform: expanded ? "rotate(90deg)" : "none",
            transition: "transform 0.2s"
          }} />
        </div>
      </div>

      {/* Collapsed summary */}
      <div style={{
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap"
      }}>
        {/* Risk range */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.05em" }}>RISK RANGE</span>
          <span style={{ fontSize: "13px", fontWeight: 800, color: "#f1f5f9", fontFamily: "monospace" }}>
            {item.risk_lower}–{item.risk_upper}
            <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 500 }}> pts</span>
          </span>
          <span style={{ fontSize: "8px", color: "#64748b" }}>central: {item.central_risk}</span>
        </div>

        <div style={{ width: "1px", height: "36px", background: "rgba(255,255,255,0.06)" }} />

        {/* Band */}
        {(() => {
          const bc = RISK_BAND_COLORS[item.risk_band] ?? RISK_BAND_COLORS.MODERATE;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.05em" }}>BAND</span>
              <span style={{
                fontSize: "10px",
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: "3px",
                background: bc.bg,
                border: `1px solid ${bc.border}`,
                color: bc.text
              }}>{item.risk_band}</span>
            </div>
          );
        })()}

        {/* Flag reason */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.05em" }}>REVIEW REASON</span>
          <span style={{ fontSize: "9px", color: "#fb923c", fontWeight: 600, lineHeight: 1.4 }}>
            {item.flag_reason}
          </span>
        </div>

        {/* Exposure */}
        <div style={{ display: "flex", gap: "12px" }}>
          {item.affected_population && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Users size={10} style={{ color: "#64748b" }} />
              <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                {item.affected_population.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {/* Evidence sources */}
          <div>
            <div style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.06em", marginBottom: "6px", fontWeight: 700 }}>
              EVIDENCE SOURCES
            </div>
            {(item.evidence_sources || []).map((src, i) => (
              <div key={i} style={{
                fontSize: "9px",
                color: "#64748b",
                marginBottom: "3px",
                display: "flex",
                alignItems: "flex-start",
                gap: "6px"
              }}>
                <span style={{ color: "#38bdf8", flexShrink: 0 }}>◆</span>
                {src}
              </div>
            ))}
          </div>

          {/* Failure mode */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "8px", color: "#64748b" }}>FAILURE MODE: </span>
              <span style={{ fontSize: "9px", color: "#fb923c", fontWeight: 700 }}>
                {(item.failure_mode || "none").replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "8px", color: "#64748b" }}>EVIDENCE QUALITY: </span>
              <span style={{ fontSize: "9px", color: "#fbbf24", fontWeight: 700 }}>
                {(item.evidence_quality || "low").toUpperCase()}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "8px", color: "#64748b" }}>DISAGREEMENT: </span>
              <span style={{ fontSize: "9px", color: "#f1f5f9", fontWeight: 700 }}>
                {((item.disagreement_level || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Provenance */}
          <div style={{
            padding: "8px 10px",
            background: "rgba(56,189,248,0.04)",
            border: "1px solid rgba(56,189,248,0.1)",
            borderRadius: "6px",
            fontSize: "8px",
            color: "#475569",
            letterSpacing: "0.03em"
          }}>
            {item.provenance || "[VERIFICATION LAYER] AI Flood Evidence Verification"}
          </div>

          {/* Decision interface — only for PENDING */}
          {isPending && (
            <div style={{
              padding: "12px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: "10px" }}>
                HUMAN REVIEW DECISION
              </div>

              {/* Reviewer fields */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input
                  placeholder="Reviewer name / callsign"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    outline: "none"
                  }}
                />
              </div>
              <textarea
                placeholder="Optional review note..."
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  color: "#94a3b8",
                  fontSize: "10px",
                  fontFamily: "monospace",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: "10px"
                }}
              />

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision("APPROVE")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: submitting ? "rgba(34,197,94,0.05)" : "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.35)",
                    color: "#4ade80",
                    fontWeight: 800,
                    fontSize: "10px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  {submitting ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={11} />}
                  APPROVE
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision("REJECT")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "rgba(100,116,139,0.1)",
                    border: "1px solid rgba(100,116,139,0.3)",
                    color: "#94a3b8",
                    fontWeight: 800,
                    fontSize: "10px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <XCircle size={11} />
                  REJECT
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision("ESCALATE")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171",
                    fontWeight: 800,
                    fontSize: "10px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <AlertTriangle size={11} />
                  ESCALATE
                </button>
              </div>

              {error && (
                <div style={{
                  marginTop: "8px",
                  fontSize: "9px",
                  color: "#f87171",
                  padding: "6px 8px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "4px"
                }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Decision record — if not pending */}
          {!isPending && item.reviewed_at && (
            <div style={{
              padding: "10px 12px",
              background: "rgba(34,197,94,0.04)",
              border: "1px solid rgba(34,197,94,0.15)",
              borderRadius: "8px"
            }}>
              <div style={{ fontSize: "8px", color: "#4ade80", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "4px" }}>
                DECISION RECORDED
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                {item.reviewer_name} · {item.reviewed_at?.substring(0, 16).replace("T", " ")} UTC
              </div>
              {item.reviewer_note && (
                <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px" }}>
                  "{item.reviewer_note}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function ReviewQueueModal({
  items = [],
  loading = false,
  onDecisionSubmitted
}) {
  const pending = items.filter((i) => i.review_status === "PENDING");
  const resolved = items.filter((i) => i.review_status !== "PENDING");

  return (
    <div style={{ padding: "0", overflowY: "auto" }}>
      {/* Stats row */}
      <div style={{
        display: "flex",
        gap: "8px",
        padding: "10px 16px",
        background: "rgba(234,179,8,0.04)",
        borderBottom: "1px solid rgba(234,179,8,0.1)",
        flexShrink: 0
      }}>
        {[
          { label: "PENDING", value: pending.length, color: "#fbbf24" },
          { label: "RESOLVED", value: resolved.length, color: "#4ade80" },
          { label: "TOTAL", value: items.length, color: "#94a3b8" }
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "6px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "8px", color: "#64748b", letterSpacing: "0.06em" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 16px", overflowY: "auto", maxHeight: "65vh" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "24px", color: "#64748b", fontSize: "11px" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            Loading review queue...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "32px",
            color: "#64748b",
            fontSize: "11px"
          }}>
            <ShieldCheck size={32} style={{ color: "#4ade80", margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: "4px" }}>
              No review items pending
            </div>
            <div>All uncertainty intervals are within risk bands.</div>
          </div>
        )}

        {/* Pending items first */}
        {pending.length > 0 && (
          <>
            <div style={{ fontSize: "9px", color: "#fbbf24", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={10} />
              PENDING REVIEW ({pending.length})
            </div>
            {pending.map((item) => (
              <ReviewQueueItem
                key={item.review_id}
                item={item}
                onDecisionSubmitted={onDecisionSubmitted}
              />
            ))}
          </>
        )}

        {/* Resolved items */}
        {resolved.length > 0 && (
          <>
            <div style={{ fontSize: "9px", color: "#64748b", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "8px", marginTop: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle size={10} />
              RESOLVED ({resolved.length})
            </div>
            {resolved.map((item) => (
              <ReviewQueueItem
                key={item.review_id}
                item={item}
                onDecisionSubmitted={onDecisionSubmitted}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        fontSize: "9px",
        color: "#334155",
        letterSpacing: "0.04em"
      }}>
        PROVENANCE: [VERIFICATION LAYER] AI FLOOD EVIDENCE VERIFICATION • MVP THRESHOLDS NOT CALIBRATED
      </div>
    </div>
  );
}
