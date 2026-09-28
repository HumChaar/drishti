import React, { useState, useMemo } from "react";
import { 
  Clock, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  FileCheck, 
  Info,
  CheckCircle2
} from "lucide-react";

/**
 * DRISHTI Command Activity Log Component
 * 
 * Truthful, non-persistent session activity log for the incident commander.
 * 
 * CORE ARCHITECTURAL RULE:
 * This component records actions performed strictly during the current browser session.
 * It is explicitly NOT a persistent backend audit database.
 */
export default function ActivityLog({
  entries = [],
  className = ""
}) {
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);

  // Compute dynamic session statistics from real entries
  const sessionStats = useMemo(() => {
    let generated = 0;
    let underReview = 0;
    let approved = 0;
    let dispatched = 0;
    let directives = 0;

    for (const e of entries) {
      if (e.event === "AI ADVISORY GENERATED") generated++;
      else if (e.event === "COMMAND REVIEW") underReview++;
      else if (e.event === "ADVISORY APPROVED") approved++;
      else if (e.event === "ADVISORY DISPATCHED") dispatched++;
      else if (e.event === "DIRECTIVE ACKNOWLEDGED" || e.event === "DIRECTIVE STATUS UPDATED") directives++;
    }

    return { generated, underReview, approved, dispatched, directives };
  }, [entries]);

  // Filter entries based on category / event type
  const filteredEntries = useMemo(() => {
    if (filter === "ALL") return entries;
    if (filter === "AI") {
      return entries.filter(
        (e) => e.category === "AI" || (e.event && e.event.startsWith("AI"))
      );
    }
    if (filter === "COMMAND") {
      return entries.filter(
        (e) =>
          e.category === "COMMAND" ||
          (e.event &&
            (e.event.includes("COMMAND") ||
              e.event.includes("DIRECTIVE") ||
              e.event.includes("EDITED") ||
              e.event.includes("APPROVED") ||
              e.event.includes("REJECTED")))
      );
    }
    if (filter === "DISPATCH") {
      return entries.filter(
        (e) => e.category === "DISPATCH" || (e.event && e.event.includes("DISPATCH"))
      );
    }
    return entries;
  }, [entries, filter]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getEventIcon = (event = "", category = "") => {
    if (category === "AI" || event.startsWith("AI")) {
      return <Sparkles size={13} className="text-orange-600" />;
    }
    if (event.includes("DISPATCH")) {
      return <Send size={13} className="text-blue-600" />;
    }
    if (event.includes("APPROVED")) {
      return <CheckCircle2 size={13} className="text-emerald-600" />;
    }
    if (event.includes("DIRECTIVE")) {
      return <ShieldCheck size={13} className="text-indigo-600" />;
    }
    return <FileCheck size={13} className="text-slate-600" />;
  };

  const getStatusClass = (status = "") => {
    const s = status.toLowerCase().replace(/[^a-z0-9]/g, "-");
    return `status-${s}`;
  };

  return (
    <div className={`command-activity-panel ${className}`}>
      {/* Component Header */}
      <div className="activity-panel-header">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-slate-700" />
          <h3 className="activity-panel-title">COMMAND ACTIVITY</h3>
        </div>
        <span className="badge-activity-simulation">
          SESSION / SIMULATION
        </span>
      </div>

      {/* Session Disclaimer */}
      <div className="session-disclaimer-box">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-slate-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight text-slate-600">
            <strong className="text-slate-800 uppercase font-mono">Session Activity Log:</strong>
            {" "}Historical simulation / non-persistent. This log records actions performed strictly during the current DRISHTI session. It is not a persistent operational command record.
          </div>
        </div>
      </div>

      {/* Command Center Summary */}
      <div className="command-status-kpi-grid">
        <div className="status-kpi-item">
          <span className="status-kpi-label">ADVISORIES GEN</span>
          <span className="status-kpi-val font-mono text-orange-700">{sessionStats.generated}</span>
        </div>
        <div className="status-kpi-item">
          <span className="status-kpi-label">UNDER REVIEW</span>
          <span className="status-kpi-val font-mono text-amber-700">{sessionStats.underReview}</span>
        </div>
        <div className="status-kpi-item">
          <span className="status-kpi-label">APPROVED</span>
          <span className="status-kpi-val font-mono text-emerald-700">{sessionStats.approved}</span>
        </div>
        <div className="status-kpi-item">
          <span className="status-kpi-label">DISPATCHED</span>
          <span className="status-kpi-val font-mono text-blue-700">{sessionStats.dispatched}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="activity-filter-toolbar">
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mr-1">
          <Filter size={12} />
          <span>FILTER:</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: "ALL", label: `ALL (${entries.length})` },
            { id: "AI", label: `AI (${entries.filter(e => e.category === "AI" || (e.event && e.event.startsWith("AI"))).length})` },
            { id: "COMMAND", label: `COMMAND (${entries.filter(e => e.category === "COMMAND" || (e.event && (e.event.includes("COMMAND") || e.event.includes("DIRECTIVE") || e.event.includes("APPROVED") || e.event.includes("EDITED")))).length})` },
            { id: "DISPATCH", label: `DISPATCH (${entries.filter(e => e.category === "DISPATCH" || (e.event && e.event.includes("DISPATCH"))).length})` }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`activity-filter-btn ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Event Area */}
      <div className="activity-log-scrollbox">
        {filteredEntries.length === 0 ? (
          <div className="activity-log-empty">
            {entries.length === 0
              ? "No command activity recorded in this session."
              : "No matching events for the selected filter."}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div 
                key={entry.id} 
                className={`activity-log-item ${isExpanded ? "expanded" : ""}`}
                onClick={() => toggleExpand(entry.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpand(entry.id);
                  }
                }}
              >
                {/* Top Row: Timestamp & Status */}
                <div className="activity-log-top">
                  <div className="flex items-center gap-1.5 font-mono text-slate-600">
                    {getEventIcon(entry.event, entry.category)}
                    <span>{entry.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`log-status-pill ${getStatusClass(entry.status)}`}>
                      {entry.status}
                    </span>
                    <button
                      type="button"
                      className="activity-expand-btn text-slate-400 hover:text-slate-700"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Event Name & District */}
                <div className="activity-log-main-row">
                  <span className="log-event font-bold text-slate-900">{entry.event}</span>
                  {entry.district && (
                    <span className="log-district font-mono text-slate-500 text-[11px]">
                      • {entry.district}
                    </span>
                  )}
                </div>

                {/* Summary / Snippet */}
                {entry.details && !isExpanded && (
                  <div className="log-details text-slate-600 text-[11px] truncate">
                    {entry.details}
                  </div>
                )}

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="activity-details-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="activity-details-grid">
                      <div className="activity-field">
                        <span className="activity-field-label">TIMESTAMP</span>
                        <span className="activity-field-val font-mono">{entry.timestamp}</span>
                      </div>
                      <div className="activity-field">
                        <span className="activity-field-label">EVENT TYPE</span>
                        <span className="activity-field-val font-mono">{entry.event}</span>
                      </div>
                      {entry.district && (
                        <div className="activity-field">
                          <span className="activity-field-label">DISTRICT</span>
                          <span className="activity-field-val font-bold">{entry.district}</span>
                        </div>
                      )}
                      {entry.status && (
                        <div className="activity-field">
                          <span className="activity-field-label">STATUS</span>
                          <span className="activity-field-val font-mono">{entry.status}</span>
                        </div>
                      )}
                      {entry.audience && (
                        <div className="activity-field">
                          <span className="activity-field-label">AUDIENCE</span>
                          <span className="activity-field-val">{entry.audience}</span>
                        </div>
                      )}
                      {entry.language && (
                        <div className="activity-field">
                          <span className="activity-field-label">LANGUAGE</span>
                          <span className="activity-field-val font-mono">{entry.language}</span>
                        </div>
                      )}
                      {entry.timestep && (
                        <div className="activity-field">
                          <span className="activity-field-label">TIMESTEP</span>
                          <span className="activity-field-val font-mono">[{entry.timestep}]</span>
                        </div>
                      )}
                      {entry.generationType && (
                        <div className="activity-field">
                          <span className="activity-field-label">GENERATION</span>
                          <span className="activity-field-val font-mono">{entry.generationType}</span>
                        </div>
                      )}
                    </div>
                    {entry.details && (
                      <div className="activity-field-full mt-2 pt-2 border-t border-slate-200">
                        <span className="activity-field-label block mb-0.5">OPERATIONAL DETAILS</span>
                        <div className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 leading-relaxed font-sans">
                          {entry.details}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
