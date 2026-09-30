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
import { useLanguage } from "../../language";

export default function NationalEvidenceCenter() {
  const { t } = useLanguage();

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
          name: "CWC Riverine Gauging & Basin Telemetry Network",
          provenance: "OBSERVED",
          coverage: "Subarnarekha, Baitarani, Brahmani River Basins",
          latency: "1 Hour",
          telemetry: "Water discharge level (meters above danger level), peak crest forecast",
          status: "INTEGRATED IN INUNDATION"
        },
        {
          name: "SeqFormer Spatio-Temporal Inundation Inference",
          provenance: "DERIVED",
          coverage: "Low-Lying Estuarine Flood Zones (8 Districts)",
          latency: "On-Demand Model Inference",
          telemetry: "Pixel-level water likelihood logits, rasterized water boundaries, depth envelope",
          status: "PIPELINE CONNECTED"
        }
      ]
    },
    {
      id: "terrain",
      name: "ELEVATION & GEOMORPHOLOGY",
      leadAgency: "Survey of India (SoI) / Cartosat-1 DEM",
      icon: Mountain,
      sources: [
        {
          name: "ISRO CartoDEM (30-meter High Resolution Digital Elevation Model)",
          provenance: "OBSERVED",
          coverage: "Eastern Coastal Plain of India",
          latency: "Static Baseline",
          telemetry: "True ground surface elevation above mean sea level (MSL), micro-relief gradients",
          status: "LOCAL STATIC CACHE"
        },
        {
          name: "Coastal Slope & Tidal Ingress Attenuation Index",
          provenance: "DERIVED",
          coverage: "10 km Intertidal Coastal Buffer",
          latency: "Precomputed Matrix",
          telemetry: "Topographic slope angle, natural storm surge dissipation coefficient",
          status: "ACTIVE IN RISK FORMULA"
        }
      ]
    },
    {
      id: "landcover",
      name: "LAND USE & NATURE-BASED DEFENSES",
      leadAgency: "Forest Survey of India (FSI) & NRSC LULC",
      icon: Trees,
      sources: [
        {
          name: "Bhuvan 1:50,000 Land Use / Land Cover Vector Maps",
          provenance: "OBSERVED",
          coverage: "Odisha & West Bengal Coastal Districts",
          latency: "Annual Revision",
          telemetry: "Dense mangrove cover, coastal casuarina shelterbelts, agricultural vs settlement parcels",
          status: "LOCAL SPATIAL DATABASE"
        },
        {
          name: "Mangrove Surge Attenuation Dampening Factor",
          provenance: "DERIVED",
          coverage: "Sundarbans Biosphere & Bhitarkanika National Park",
          latency: "Static Geospatial Layer",
          telemetry: "Wave attenuation reduction percentage (30-50% surge energy dissipation)",
          status: "INTEGRATED IN RISK WEIGHTS"
        }
      ]
    },
    {
      id: "infra",
      name: "CRITICAL INFRASTRUCTURE REPOSITORY",
      leadAgency: "NDMA / SDMA (OSDMA & WBSDMA)",
      icon: Anchor,
      sources: [
        {
          name: "State Disaster Management GIS Asset Database",
          provenance: "OBSERVED",
          coverage: "Major Ports, 400kV Power Substations, District Hospitals, Multi-Purpose Cyclone Shelters",
          latency: "Weekly Operational Sync",
          telemetry: "Verified latitude/longitude, structural surge clearance, backup diesel generator hours",
          status: "API CONNECTED"
        }
      ]
    },
    {
      id: "socioeconomic",
      name: "SOCIO-ECONOMIC VULNERABILITY & DEMOGRAPHY",
      leadAgency: "Office of the Registrar General & Census Commissioner",
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
            <h3 className="section-heading">{t("NATIONAL EVIDENCE & MULTI-MODAL DATA SOURCES")}</h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {t("Strict Provenance Classification: OBSERVED (Sensors) • DERIVED (Analytical Models) • SIMULATED (Scenario Step)")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-provenance text-[10px]">
            {t("DATA INTEGRITY ASSURED")}
          </span>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-2 text-xs font-mono text-slate-700">
        <Info size={14} className="text-blue-700 flex-shrink-0" />
        <span>
          <strong>{t("Government-Grade Provenance Standard:")}</strong> {t("DRISHTI never blurs the boundary between empirical observations and simulation models. AI reasoning engines consume these verified evidence chains to synthesize advisories without altering deterministic numerical risk scores.")}
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
                  <strong className="text-xs font-bold text-slate-900">{t(cat.name)}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">
                    • {t("Lead Authority:")} {t(cat.leadAgency)}
                  </span>
                </div>
                <span className="text-[10.5px] font-mono font-bold text-slate-600">
                  {cat.sources.length} {t("Data Feeds")}
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
                          <span className="text-xs font-bold text-slate-900">{t(src.name)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <span className={`px-2 py-0.5 rounded border font-bold ${provBadgeClass}`}>
                            {t(src.provenance)}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold">
                            {t(src.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono text-slate-600 mt-2 pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[9.5px]">{t("GEOGRAPHIC COVERAGE")}</span>
                          <span>{t(src.coverage)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px]">{t("INGESTION LATENCY")}</span>
                          <span>{t(src.latency)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9.5px]">{t("TELEMETRY PAYLOAD")}</span>
                          <span className="text-slate-800 font-sans text-xs">{t(src.telemetry)}</span>
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
