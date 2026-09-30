import React from "react";
import { Globe, MapPin } from "lucide-react";
import { INDIA_REGIONS, STATES_AND_UTS } from "../../data/indiaGeography";
import { useLanguage } from "../../language";

export default function StateSelector({ selectedState, onSelectState }) {
  const { t } = useLanguage();

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === "ALL") {
      onSelectState(null);
    } else {
      const found = STATES_AND_UTS.find((s) => s.id === val);
      onSelectState(found || null);
    }
  };

  return (
    <div className="state-selector-wrapper" title="Pan-India Geographic Scope Selector">
      <span className="selector-prefix-label font-mono flex items-center gap-1">
        <Globe size={11} className="text-blue-600" />
        <span>{t("REGION:")}</span>
      </span>

      <select
        value={selectedState ? selectedState.id : "ALL"}
        onChange={handleChange}
        className="state-dropdown-select font-mono"
        aria-label="Select State or Union Territory"
      >
        <option value="ALL">{t("ALL INDIA (36 States & UTs)")}</option>

        {INDIA_REGIONS.filter((r) => r !== "ALL INDIA").map((region) => {
          const statesInRegion = STATES_AND_UTS.filter((s) => s.region === region);
          return (
            <optgroup key={region} label={`── ${region} ──`}>
              {statesInRegion.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.hasBackendData ? "★ [DATA CONNECTED]" : "(N/A)"}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      {selectedState && (
        <span 
          className={`region-status-chip font-mono ${selectedState.hasBackendData ? "connected" : "pending"}`}
          title={selectedState.hasBackendData ? "Connected to Live/Simulation Backend" : "Telemetry Ingestion Pipeline Pending"}
        >
          <MapPin size={9} />
          {selectedState.hasBackendData ? t("CONNECTED") : t("DATA N/A")}
        </span>
      )}
    </div>
  );
}
