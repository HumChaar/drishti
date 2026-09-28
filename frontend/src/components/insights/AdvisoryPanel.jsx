import React, { useState, useEffect } from "react";
import { 
  Bot, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Languages, 
  Radio, 
  Sparkles,
  Users,
  Building,
  FileCheck
} from "lucide-react";
import advisoryApi from "../../services/advisoryApi";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "or", label: "ଓଡ଼ିଆ (Odia)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "hi", label: "हिन्दी (Hindi)" }
];

export default function AdvisoryPanel({ 
  district, 
  stepId = "NOW" 
}) {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [advisoryData, setAdvisoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewerName, setReviewerName] = useState("Special Relief Commissioner, Odisha");
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedActionTitle, setModifiedActionTitle] = useState("");

  const districtId = district?.id || "od_balasore";
  const districtName = district?.name || "Balasore";

  // Fetch or regenerate advisory whenever district, step, or language changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsModifying(false);

    advisoryApi.generateAdvisory(districtId, stepId, selectedLanguage)
      .then((data) => {
        if (isMounted) {
          setAdvisoryData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Advisory error:", err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [districtId, stepId, selectedLanguage]);

  const handleReview = async (action) => {
    if (!advisoryData?.advisory_id) return;
    setIsLoading(true);
    try {
      let modifiedActions = null;
      if (action === "MODIFY" && modifiedActionTitle) {
        modifiedActions = advisoryData.advisory.priority_actions.map((act, i) => 
          i === 0 ? { ...act, title: modifiedActionTitle } : act
        );
      }
      const updated = await advisoryApi.reviewAdvisory(
        advisoryData.advisory_id,
        action,
        reviewerName,
        reviewNotes,
        modifiedActions
      );
      setAdvisoryData((prev) => ({
        ...prev,
        review: updated.review || { ...prev.review, status: action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "MODIFIED" }
      }));
      setIsModifying(false);
    } catch (err) {
      console.error("Review failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const reviewStatus = advisoryData?.review?.status || "PENDING";
  const mode = advisoryData?.mode || "DEMO_FALLBACK";
  const advContent = advisoryData?.advisory;

  return (
    <div className="advisory-panel-container bg-white border border-slate-200 rounded-lg p-4 font-sans text-slate-800 shadow-sm">
      {/* Header with Title and Mode */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-600" />
          <h3 className="font-bold text-sm text-slate-900 tracking-tight font-mono">
            DECISION INTELLIGENCE & AI ADVISORY
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {mode === "LIVE_GEMINI" ? (
            <span className="badge-provenance text-[11px] bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1 font-mono">
              <Sparkles size={11} className="text-emerald-600" />
              LIVE GEMINI 1.5 FLASH
            </span>
          ) : (
            <span className="badge-provenance text-[11px] bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 font-mono">
              <Radio size={11} className="text-amber-600" />
              DEMO / FALLBACK MODE
            </span>
          )}
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2 rounded-md mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Languages size={14} className="text-blue-600" />
          <span>Language:</span>
        </div>
        <div className="flex gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                selectedLanguage === lang.code
                  ? "bg-blue-600 text-white font-bold"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Critical Governance Warning Banner */}
      <div className="p-2.5 bg-amber-50 border-l-4 border-amber-500 rounded-r text-xs text-amber-900 mb-3 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider block">AI GENERATED — HUMAN APPROVAL REQUIRED</span>
          <span>Recommendations are grounded in the DRISHTI Evidence Layer. Operational directives require authorized incident commander approval before execution.</span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 animate-pulse">
          Synthesizing multi-hazard evidence and generating advisory in {LANGUAGES.find(l => l.code === selectedLanguage)?.label}...
        </div>
      ) : advContent ? (
        <div className="space-y-3">
          {/* Executive Summary & Grounded Risk Explanation */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Executive Situation Summary ({districtName})
            </span>
            <p className="text-xs leading-relaxed text-slate-800 font-medium mb-2">
              {advContent.summary}
            </p>
            <div className="text-[11px] text-slate-600 bg-white p-2 border border-slate-200 rounded">
              <span className="font-bold text-slate-800">Risk Audit Basis: </span>
              {advContent.risk_explanation}
            </div>
          </div>

          {/* Priority Emergency Directives List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <FileCheck size={13} className="text-blue-600" />
                Recommended Priority Actions ({advContent.priority_actions?.length || 0})
              </span>
              <span className="text-[10px] font-mono text-slate-400">Strictly grounded in evidence</span>
            </div>

            <div className="space-y-2">
              {advContent.priority_actions?.map((action, idx) => (
                <div key={action.action_id || idx} className="bg-white p-3 border border-slate-200 rounded-md shadow-xs">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        action.priority === "CRITICAL" ? "bg-red-100 text-red-800 border border-red-300" :
                        action.priority === "HIGH" ? "bg-orange-100 text-orange-800 border border-orange-300" :
                        "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}>
                        {action.priority}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">[{action.action_type}]</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-600">{action.target_agency}</span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mb-1">{action.title}</h4>
                  <p className="text-xs text-slate-700 mb-2 leading-relaxed">{action.description}</p>
                  
                  <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded font-mono flex items-center gap-1">
                    <span className="font-bold text-slate-600">Rationale:</span>
                    <span>{action.rationale}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Population & Infrastructure Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 border border-slate-200 rounded">
              <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mb-1">
                <Users size={12} className="text-orange-600" />
                Coastal Exposure & Target
              </span>
              <p className="text-[11px] text-slate-700 leading-snug">{advContent.affected_population}</p>
            </div>

            <div className="bg-slate-50 p-2.5 border border-slate-200 rounded">
              <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 mb-1">
                <Building size={12} className="text-slate-600" />
                Infrastructure Vulnerabilities
              </span>
              <ul className="text-[11px] text-slate-700 space-y-0.5 list-disc list-inside">
                {advContent.infrastructure_concerns?.map((inf, i) => (
                  <li key={i} className="truncate">{inf}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Provenance & Evidence Sources */}
          <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Provenance: {advContent.provenance}</span>
              <span>Confidence: {advContent.confidence}</span>
            </div>
            <div>
              <span className="font-bold text-slate-600">Evidence Chain: </span>
              {advContent.evidence_used?.join(" • ")}
            </div>
          </div>

          {/* Human-in-the-Loop Governance Box */}
          <div className="human-review-box mt-3 p-3 bg-slate-100 border-2 border-slate-300 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-blue-700" />
                INCIDENT COMMANDER AUTHORIZATION
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                reviewStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-400" :
                reviewStatus === "REJECTED" ? "bg-red-100 text-red-800 border border-red-400" :
                reviewStatus === "MODIFIED" ? "bg-blue-100 text-blue-800 border border-blue-400" :
                "bg-amber-100 text-amber-800 border border-amber-400 animate-pulse"
              }`}>
                STATUS: {reviewStatus}
              </span>
            </div>

            {/* Officer Callsign & Notes Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-600 block mb-0.5">Authorizing Officer</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-800"
                  placeholder="Officer name / callsign"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-600 block mb-0.5">Operational Directive Notes</label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-800"
                  placeholder="e.g. Ground survey confirmed; authorize immediate action"
                />
              </div>
            </div>

            {/* Optional Inline Directive Modification Box */}
            {isModifying && (
              <div className="p-2 bg-white border border-blue-200 rounded mb-2 text-xs">
                <span className="text-[10px] font-mono text-blue-700 font-bold block mb-1">
                  Officer Directive Amendment
                </span>
                <input
                  type="text"
                  value={modifiedActionTitle}
                  onChange={(e) => setModifiedActionTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-800 mb-1"
                  placeholder="Specify amended directive title..."
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200">
              <button
                onClick={() => handleReview("APPROVE")}
                disabled={isLoading}
                className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs py-1.5 px-3 rounded flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <CheckCircle2 size={14} />
                APPROVE
              </button>

              <button
                onClick={() => handleReview("REJECT")}
                disabled={isLoading}
                className="flex-1 min-w-[120px] bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs py-1.5 px-3 rounded flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <XCircle size={14} />
                REJECT
              </button>

              <button
                onClick={() => {
                  if (!isModifying) {
                    setIsModifying(true);
                    setModifiedActionTitle(advContent.priority_actions?.[0]?.title || "");
                  } else {
                    handleReview("MODIFY");
                  }
                }}
                disabled={isLoading}
                className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs py-1.5 px-3 rounded flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Edit3 size={14} />
                {isModifying ? "SUBMIT MODIFICATION" : "MODIFY"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 text-xs text-slate-500 font-mono text-center">
          No advisory data available for this district.
        </div>
      )}
    </div>
  );
}
