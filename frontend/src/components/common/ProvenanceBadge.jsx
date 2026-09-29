import React from "react";

/**
 * DRISHTI Reusable Provenance Badge Component
 *
 * SOURCING TAXONOMY:
 * - OBSERVED: Official observed/authoritative source (IMD, MOSDAC, Doppler radar)
 * - MODEL: Numerical weather prediction model data (Open-Meteo)
 * - DERIVED: Computed by DRISHTI from genuine inputs (e.g. proximity distance)
 * - SIMULATED: Historical/calibrated exercise (Cyclone Remal May 2024)
 * - UNAVAILABLE: Live source unreachable
 */
export default function ProvenanceBadge({
  provenance = "MODEL",
  className = "",
  size = "xs"
}) {
  const provUpper = (provenance || "").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";
  let label = provUpper;

  if (provUpper.includes("OBSERVED")) {
    colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-300";
    label = "OBSERVED";
  } else if (provUpper.includes("MODEL")) {
    colorClasses = "bg-blue-50 text-blue-800 border-blue-300";
    label = "MODEL";
  } else if (provUpper.includes("DERIVED")) {
    colorClasses = "bg-amber-50 text-amber-900 border-amber-300";
    label = "DERIVED";
  } else if (provUpper.includes("SIMULATED")) {
    colorClasses = "bg-rose-50 text-rose-800 border-rose-300";
    label = "SIMULATED";
  } else if (provUpper.includes("UNAVAILABLE") || provUpper.includes("OFFLINE")) {
    colorClasses = "bg-slate-100 text-slate-600 border-slate-300";
    label = "UNAVAILABLE";
  }

  const sizeClass = size === "sm"
    ? "text-[10px] px-1.5 py-0.5"
    : size === "tiny"
    ? "text-[8.5px] px-1 py-0.2"
    : "text-[9px] px-1.5 py-0.5";

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase rounded border tracking-wide ${sizeClass} ${colorClasses} ${className}`}
      title={`Data Provenance: ${label}`}
    >
      {label}
    </span>
  );
}
