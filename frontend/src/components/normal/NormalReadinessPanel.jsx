import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Anchor,
  Zap,
  Building2,
  Hospital,
  FileCheck,
  ArrowRight,
  ClipboardCheck,
  Search
} from "lucide-react";

export default function NormalReadinessPanel({
  districtsData = [],
  infraData = [],
  selectedDistrict,
  onSelectDistrict,
  onLaunchDisasterMode
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssetCategory, setSelectedAssetCategory] = useState("ALL");

  const activeDist = selectedDistrict || districtsData[0] || {
    id: "od_balasore",
    name: "Balasore",
    state: "Odisha",
    population: 2320000,
    coastalLineKm: 86,
    totalShelters: 148,
    shelterCapacityPersons: 125000,
    headquarters: "Balasore"
  };

  const filteredDistricts = districtsData.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssets = infraData.filter((a) => {
    if (selectedAssetCategory === "ALL") return true;
    return a.category.toUpperCase() === selectedAssetCategory;
  });

  return (
    <div className="normal-workspace-flow">
      {/* 1. UPPER RIGHT PANEL: Baseline District Risk & Readiness Dossier */}
      <div className="risk-panel-container normal-readiness-dossier">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            <h2 className="panel-title">BASELINE DISTRICT READINESS DOSSIER</h2>
          </div>
          <span className="badge-provenance text-[10px]">ROUTINE VIGILANCE</span>
        </div>

        {/* District Selector & Summary Card */}
        <div className="dossier-summary-card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                SELECTED DISTRICT ({activeDist.state || "Odisha"})
              </span>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <MapPin size={15} className="text-emerald-700" />
                {activeDist.name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 font-bold">BASELINE HAZARD</span>
              <div className="font-mono text-sm font-bold text-emerald-700">
                LOW (22/100)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-3">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[9.5px] text-slate-500 block">TOTAL POPULATION</span>
              <strong className="text-slate-800">
                {activeDist.population ? (activeDist.population / 1000000).toFixed(2) + " Million" : "2.32 Million"}
              </strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[9.5px] text-slate-500 block">COASTAL FRONT</span>
              <strong className="text-slate-800">
                {activeDist.coastalLineKm || 86} km coastline
              </strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[9.5px] text-slate-500 block">CYCLONE SHELTERS</span>
              <strong className="text-emerald-700">
                {activeDist.totalShelters || 148} Units (100% Ready)
              </strong>
            </div>
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <span className="text-[9.5px] text-slate-500 block">SHELTER CAPACITY</span>
              <strong className="text-slate-800">
                {activeDist.shelterCapacityPersons ? activeDist.shelterCapacityPersons.toLocaleString() : "125,000"} Persons
              </strong>
            </div>
          </div>
        </div>

        {/* Readiness Checklist for Selected District */}
        <div className="readiness-indicators-list">
          <div className="text-[11px] font-mono font-bold text-slate-700 mb-2 px-1">
            ROUTINE PREPAREDNESS AUDIT CHECKLIST:
          </div>

          <div className="readiness-item">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <div className="readiness-item-text">
              <span className="item-title">Sea Dikes &amp; Estuarine Embankments</span>
              <span className="item-sub">Geo-tagged inspection completed; zero breaches reported</span>
            </div>
            <span className="readiness-status-tag ready">100% SECURE</span>
          </div>

          <div className="readiness-item">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <div className="readiness-item-text">
              <span className="item-title">Early Warning Siren Towers (EWDS)</span>
              <span className="item-sub">Acoustic broadcast test passed; solar backup online</span>
            </div>
            <span className="readiness-status-tag ready">TESTED</span>
          </div>

          <div className="readiness-item">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <div className="readiness-item-text">
              <span className="item-title">Emergency Communication Links</span>
              <span className="item-sub">VHF radio net &amp; satellite phones operational in EOC</span>
            </div>
            <span className="readiness-status-tag ready">STANDBY</span>
          </div>

          <div className="readiness-item">
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <div className="readiness-item-text">
              <span className="item-title">Emergency Relief &amp; Dry Ration Stocks</span>
              <span className="item-sub">Grain warehouses stocked at 14 days emergency consumption</span>
            </div>
            <span className="readiness-status-tag ready">ADEQUATE</span>
          </div>
        </div>

        {/* Switch to Cyclone Response CTA */}
        <div className="mt-auto p-3 bg-blue-50/60 border border-blue-200 rounded-md text-xs">
          <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
            <span>DISASTER DRILL / SIMULATION:</span>
            <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono">REMAL 2024</span>
          </div>
          <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">
            Test coastal response systems by launching the historical Cyclone Remal simulation exercise.
          </p>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gov-navy text-white text-[11px] font-bold rounded hover:bg-accent-blue transition-colors"
            onClick={onLaunchDisasterMode}
          >
            <span>LAUNCH CYCLONE RESPONSE MODE</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. LOWER COMPREHENSIVE SECTION: District Readiness Matrix */}
      <div className="normal-table-section mt-4">
        <div className="table-section-header">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-emerald-700" />
            <h3 className="section-heading">DISTRICT PREPAREDNESS &amp; BASELINE MATRIX (ALL 8 COASTAL DISTRICTS)</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="normal-search-box">
              <Search size={13} className="text-slate-400" />
              <input
                type="text"
                placeholder="Filter district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="normal-search-input"
              />
            </div>
          </div>
        </div>

        <div className="normal-table-wrapper">
          <table className="normal-data-table">
            <thead>
              <tr>
                <th>DISTRICT / STATE</th>
                <th>HEADQUARTERS</th>
                <th>POPULATION</th>
                <th>COASTLINE</th>
                <th>CYCLONE SHELTERS</th>
                <th>SHELTER CAPACITY</th>
                <th>BASELINE STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredDistricts.map((d) => {
                const isSelected = activeDist.id === d.id;
                return (
                  <tr
                    key={d.id}
                    className={isSelected ? "selected-row" : ""}
                    onClick={() => onSelectDistrict(d)}
                  >
                    <td>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin size={12} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                        <span>{d.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{d.state}</span>
                    </td>
                    <td className="font-mono text-xs">{d.headquarters || d.name}</td>
                    <td className="font-mono text-xs">
                      {d.population ? (d.population / 1000000).toFixed(2) + " M" : "2.1 M"}
                    </td>
                    <td className="font-mono text-xs">{d.coastalLineKm || 65} km</td>
                    <td className="font-mono text-xs font-semibold text-emerald-800">
                      {d.totalShelters || 120} Units
                    </td>
                    <td className="font-mono text-xs text-slate-700">
                      {d.shelterCapacityPersons ? d.shelterCapacityPersons.toLocaleString() : "85,000"} Persons
                    </td>
                    <td>
                      <span className="status-pill-normal">
                        <span className="pill-dot-green"></span>
                        READY
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="audit-view-btn font-mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDistrict(d);
                        }}
                      >
                        {isSelected ? "ACTIVE" : "SELECT"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. CRITICAL INFRASTRUCTURE ASSETS HEALTH */}
      <div className="normal-table-section mt-4">
        <div className="table-section-header">
          <div className="flex items-center gap-2">
            <Anchor size={16} className="text-blue-700" />
            <h3 className="section-heading">CRITICAL INFRASTRUCTURE READINESS &amp; HEALTH AUDIT</h3>
          </div>
          <div className="category-filter-chips">
            {["ALL", "PORT", "HOSPITAL", "POWER", "SHELTER"].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${selectedAssetCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedAssetCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="infrastructure-grid">
          {filteredAssets.map((asset) => {
            let Icon = Building2;
            if (asset.category === "Port") Icon = Anchor;
            if (asset.category === "Hospital") Icon = Hospital;
            if (asset.category === "Power") Icon = Zap;
            if (asset.category === "Shelter") Icon = ShieldCheck;

            return (
              <div key={asset.id} className="infra-card">
                <div className="infra-card-header">
                  <div className="flex items-center gap-2">
                    <span className="infra-icon-badge">
                      <Icon size={14} className="text-blue-700" />
                    </span>
                    <div>
                      <h4 className="infra-title">{asset.name}</h4>
                      <span className="infra-sub font-mono">{asset.type} • {asset.districtId}</span>
                    </div>
                  </div>
                  <span className="infra-status-normal">
                    OPERATIONAL
                  </span>
                </div>
                <div className="infra-card-body">
                  <p className="infra-detail text-[11px] text-slate-600">
                    {asset.capacityMetric || "Capacity nominal"} • Routine inspection certified.
                  </p>
                  <div className="infra-meta-row font-mono">
                    <span className="text-[10px] text-slate-500">BACKUP POWER: 100% FUEL</span>
                    <span className="text-[10px] text-emerald-700 font-bold">NORMAL PROTOCOL</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ROUTINE PREPAREDNESS & RESOURCES PROTOCOL */}
      <div className="normal-table-section mt-4 mb-6">
        <div className="table-section-header">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-teal-700" />
            <h3 className="section-heading">STATE RESILIENCE PROTOCOLS &amp; DRILL STATUS</h3>
          </div>
          <span className="badge-provenance text-[10px]">STANDBY LOG</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white border border-slate-200 rounded-b">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-bold mb-1">TEAM READINESS</div>
            <div className="text-sm font-bold text-slate-900">46 ODRAF / NDRF BATTALIONS</div>
            <p className="text-[11px] text-slate-600 mt-1">
              Positioned across 8 coastal bases with 210 motorized rescue boats and specialized cutting equipment.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-bold mb-1">SATELLITE &amp; METEOROLOGICAL COMM</div>
            <div className="text-sm font-bold text-slate-900">88 SAT PHONES &amp; DWR PARADEEP</div>
            <p className="text-[11px] text-slate-600 mt-1">
              Dual-redundant INSAT-3DR direct downlinks and DWR Doppler radar continuous coastal scan active.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <div className="text-[10px] font-mono text-slate-500 font-bold mb-1">EMERGENCY RELIEF RESERVES</div>
            <div className="text-sm font-bold text-slate-900">14 DAYS CONSOLIDATED FOOD STOCKS</div>
            <p className="text-[11px] text-slate-600 mt-1">
              Water purification sachets, baby food, and high-energy biscuits stored in elevated coastal depots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
