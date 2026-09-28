import React from "react";
import { 
  Database, 
  Satellite, 
  Waves, 
  CloudRain, 
  Mountain, 
  Trees, 
  Anchor, 
  Users, 
  CheckCircle2, 
  Info 
} from "lucide-react";

export default function NationalEvidenceCenter() {
  const evidenceCategories = [
    {
      id: "meteorology",
      name: "METEOROLOGY & ATMOSPHERE",
      leadAgency: "India Meteorological Department (IMD)",
      icon: CloudRain,
      sources: [
        {
          name: "IMD Automated Weather Stations (AWS) & High-Wind Speed Recorders (HWSR)",
          provenance: "OBSERVED",
          coverage: "Odisha & West Bengal Coastal Corridor (8 Districts)",
          latency: "10-15 Minutes",
          telemetry: "Wind velocity (kt/km/h), central barometric pressure (hPa), 24h cumulative rainfall (mm)",
          status: "LIVE & CONNECTED"
        },
        {
          name: "Doppler Weather Radar (DWR) Paradip & Kolkata",
          provenance: "OBSERVED",
          coverage: "Radial 500 km Coverage across Bay of Bengal",
          latency: "10 Minutes",
          telemetry: "Reflectivity (dBZ), radial velocity, storm eye track coordinates",
          status: "LIVE & CONNECTED"
        },
        {
          name: "National Weather Forecasting Centre (NWFC) RSMC Tropical Cyclone e-Bulletins",
          provenance: "OBSERVED",
          coverage: "North Indian Ocean Basin (Bay of Bengal & Arabian Sea)",
          latency: "3-Hour Cycle",
          telemetry: "Official IMD cyclone category, past track coordinates, 72h forecast track coordinates",
          status: "CONNECTED VIA FASTAPI"
        }
      ]
    },
    {
      id: "satellite",
      name: "SATELLITE & EARTH OBSERVATION",
      leadAgency: "ISRO / National Remote Sensing Centre (NRSC)",
      icon: Satellite,
      sources: [
        {
          name: "INSAT-3DR Rapid-Scan Geostationary Imager",
          provenance: "OBSERVED",
          coverage: "All India & Extended Oceanic Domain",
          latency: "15 Minutes",
          telemetry: "Thermal Infrared (TIR1), Cloud Top Temperatures, Outgoing Longwave Radiation",
          status: "PIPELINE CONNECTED"
        },
        {
          name: "Sentinel-1 Synthetic Aperture Radar (SAR) Water Extent",
          provenance: "DERIVED",
          coverage: "Sundarbans Delta & Mahanadi Estuary",
          latency: "6-12 Days Repeat",
          telemetry: "Calibrated flood extent boundary polygons and coastal wetland backscatter",
          status: "CALIBRATED HISTORICAL REPLAY"
        }
      ]
    },
    {
      id: "ocean",
      name: "OCEAN & COASTAL DYNAMICS",
      leadAgency: "Indian National Centre for Ocean Information Services (INCOIS)",
      icon: Waves,
      sources: [
        {
          name: "INCOIS Ocean State Forecast & Coastal Wave Rider Buoys",
          provenance: "OBSERVED",
          coverage: "Gopalpur, Paradip, Sagar Island Offshore Stations",
          latency: "Hourly",
          telemetry: "Significant wave height (meters), swell direction, sea surface temperature (SST)",
          status: "LIVE VIA MARINE BULLETIN"
        },
        {
          name: "Storm Surge Hydrodynamic Modeling (IIT Delhi / INCOIS Model)",
          provenance: "SIMULATED",
          coverage: "Coastal Landfall Arc (Balasore to 24 Parganas)",
          latency: "Simulation Timesteps",
          telemetry: "Astronomical tide superposition, peak surge height above datum (1.2m - 2.8m)",
          status: "INTEGRATED IN TIMELINE"
        }
      ]
    },
    {
      id: "flood",
      name: "FLOOD & HYDROLOGY",
      leadAgency: "Central Water Commission (CWC)",
      icon: Waves,
      sources: [
        {
          name: "CWC River Gauge Telemetry Network",
          provenance: "OBSERVED",
          coverage: "Subarnarekha, Baitarani, Brahmani, and Hooghly Basins",
          latency: "Hourly",
          telemetry: "River stage levels (meters above danger mark), discharge discharge rate (cumecs)",
          status: "STAGE 2 PAN-INDIA EXPANSION"
        },
        {
          name: "Derived Coastal Inundation Footprint",
          provenance: "SIMULATED",
          coverage: "8 Coastal Pilot Districts",
          latency: "Static Step Replay",
          telemetry: "Probabilistic coastal inundation envelope based on surge, elevation & dike buffer",
          status: "CALIBRATED HISTORICAL SIMULATION"
        }
      ]
    },
    {
      id: "terrain",
      name: "TERRAIN & ELEVATION",
      leadAgency: "Survey of India (SOI) / NRSC Cartosat",
      icon: Mountain,
      sources: [
        {
          name: "SRTM 30m Digital Elevation Model (DEM) & Cartosat-1",
          provenance: "OBSERVED",
          coverage: "All India Coverage",
          latency: "Static Baseline",
          telemetry: "Mean sea level elevation (MSL), micro-topographical slope, low-lying depression grids",
          status: "ACTIVE IN RISK ENGINE"
        }
      ]
    },
    {
      id: "landcover",
      name: "LAND COVER & BIO-SHIELD BUFFER",
      leadAgency: "Forest Survey of India (FSI) & NRSC",
      icon: Trees,
      sources: [
        {
          name: "National LULC 1:50,000 Classification & Mangrove Mapping",
          provenance: "DERIVED",
          coverage: "Bhitarkanika & Sundarbans Biosphere Reserves",
          latency: "Annual Review",
          telemetry: "Dense mangrove density index, coastal bio-shield attenuation factor (reduces wave energy by 25-40%)",
          status: "INTEGRATED IN RISK WEIGHTS"
        }
      ]
    },
    {
      id: "infrastructure",
      name: "CRITICAL INFRASTRUCTURE ASSETS",
      leadAgency: "OSDMA, WB-DMD, MoRTH, CEA, MoHFW",
      icon: Anchor,
      sources: [
        {
          name: "State Disaster Management Authority Asset GIS Registers",
          provenance: "OBSERVED",
          coverage: "11 High-Value Assets in Pilot Arc (Ports, Hospitals, Power, Shelters)",
          latency: "Operational Audit",
          telemetry: "Asset geo-coordinates, elevation, structural resilience rating, backup genset capacity",
          status: "LIVE BACKEND API"
        }
      ]
    },
    {
      id: "population",
      name: "POPULATION & HUMAN EXPOSURE",
      leadAgency: "Office of the Registrar General & Census Commissioner / WorldPop",
      icon: Users,
      sources: [
        {
          name: "Census of India Projected Coastal Demographics & WorldPop 100m Grids",
          provenance: "DERIVED",
          coverage: "8 Pilot Districts (14.2M Total Population / 2.6M Coastal Exposure)",
          latency: "5-Year Projection",
          telemetry: "Habitation density, vulnerable kutcha housing count, elderly/infant percentage",
          status: "ACTIVE IN DETERMINISTIC RISK"
        }
      ]
    }
  ];

  return (
    <div className="national-evidence-center-card">
      {/* Header */}
      <div className="table-section-header">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-700" />
          <div>
            <h3 className="section-heading">NATIONAL EVIDENCE &amp; MULTI-MODAL DATA SOURCES</h3>
            <span className="text-[10px] text-slate-500 font-mono">
              Strict Provenance Classification: OBSERVED (Sensors) • DERIVED (Analytical Models) • SIMULATED (Scenario Step)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-provenance text-[10px]">
            DATA INTEGRITY ASSURED
          </span>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2 text-xs font-mono text-slate-700">
        <Info size={14} className="text-blue-700 flex-shrink-0" />
        <span>
          <strong>Government-Grade Provenance Standard:</strong> DRISHTI never blurs the boundary between empirical observations and simulation models. AI reasoning engines consume these verified evidence chains to synthesize advisories without altering deterministic numerical risk scores.
        </span>
      </div>

      {/* 8 Categories Grid */}
      <div className="p-4 bg-white border border-slate-200 rounded-b space-y-4">
        {evidenceCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-white border border-slate-200 rounded text-blue-700">
                    <Icon size={14} />
                  </span>
                  <strong className="text-xs font-bold text-slate-900">{cat.name}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">
                    • Lead Authority: {cat.leadAgency}
                  </span>
                </div>
                <span className="text-[10.5px] font-mono font-bold text-slate-600">
                  {cat.sources.length} Data Feeds
                </span>
              </div>

              {/* Feed items table */}
              <div className="divide-y divide-slate-100">
                {cat.sources.map((src, idx) => {
                  const provBadgeClass =
                    src.provenance === "OBSERVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    src.provenance === "DERIVED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div key={idx} className="p-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 mb-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-blue-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-900">{src.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className={`px-2 py-0.5 rounded border font-bold ${provBadgeClass}`}>
                            {src.provenance}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold">
                            {src.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono text-slate-600 mt-2 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[9.5px]">GEOGRAPHIC COVERAGE</span>
                          <span>{src.coverage}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px]">INGESTION LATENCY</span>
                          <span>{src.latency}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px]">TELEMETRY PAYLOAD</span>
                          <span className="text-slate-800 font-sans text-xs">{src.telemetry}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
