/**
 * DRISHTI MOSDAC / ISRO Additional Remote Sensing Products Service
 *
 * Official Source: Meteorological & Oceanographic Satellite Data Archival Centre (MOSDAC)
 * Space Applications Centre (SAC), Indian Space Research Organisation (ISRO).
 * Portal: https://mosdac.gov.in/
 * Sensor Suite: INSAT-3DS / INSAT-3D Imager & Sounder
 *
 * PROVENANCE:
 * OBSERVED / SATELLITE PRODUCT
 * SOURCE: MOSDAC / ISRO & IMD
 *
 * ARCHITECTURE RULES:
 * - Direct remote image and metadata references only.
 * - Zero local HDF5/NetCDF/GeoTIFF raster bundling (<512 MB memory constraint).
 * - No fabrication of satellite imagery or derived indexes.
 */

export const MOSDAC_ADDITIONAL_PRODUCTS = [
  {
    id: "QPE_RAINFALL",
    name: "Quantitative Precipitation Estimation (HEM / QPE)",
    shortCode: "QPE",
    parameter: "Rainfall Rate / 24h Accumulation",
    sensor: "INSAT-3DS Imager",
    resolution: "4 km",
    updateFrequency: "Every 15 minutes",
    description: "Satellite-derived hydro-estimator precipitation rates calibrating cloud brightness temperature to surface precipitation intensity across India.",
    previewUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_ir1.jpg", // Lightweight operational preview
    officialCatalogUrl: "https://mosdac.gov.in/",
    source: "MOSDAC / ISRO & IMD",
    provenance: "OBSERVED / SATELLITE DERIVED",
    channels: ["10.8 µm", "6.8 µm"]
  },
  {
    id: "AMV_WINDS",
    name: "Atmospheric Motion Vectors (AMV - Cloud Motion Winds)",
    shortCode: "AMV",
    parameter: "Tropospheric Wind Vectors (850-200 hPa)",
    sensor: "INSAT-3DS Imager Rapid Scan",
    resolution: "40 km Grid Vectors",
    updateFrequency: "Hourly",
    description: "Traced cloud and water vapor parcel trajectories providing real-time upper-level steering flow and vertical wind shear diagnostics.",
    previewUrl: "https://mausam.imd.gov.in/Satellite/rswmo_mp.jpg",
    officialCatalogUrl: "https://mosdac.gov.in/",
    source: "MOSDAC / ISRO",
    provenance: "OBSERVED / SATELLITE DERIVED",
    channels: ["Visible", "Thermal IR", "Water Vapour"]
  },
  {
    id: "SST_OCEAN",
    name: "Sea Surface Temperature (SST - Bay of Bengal & Arabian Sea)",
    shortCode: "SST",
    parameter: "Sea Surface Temperature (SST - °C)",
    sensor: "INSAT-3DS Imager (Split Window)",
    resolution: "4 km",
    updateFrequency: "Daily / 12-Hourly",
    description: "Ocean thermal energy potential critical for cyclone rapid intensification (RI) assessment in North Indian Ocean basins.",
    previewUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_wv.jpg",
    officialCatalogUrl: "https://mosdac.gov.in/",
    source: "MOSDAC / ISRO",
    provenance: "OBSERVED / SATELLITE DERIVED",
    channels: ["10.8 µm", "12.0 µm Split-Window"]
  },
  {
    id: "CTT_CONVECTION",
    name: "Cloud Top Temperature (CTT & Cloud Top Height)",
    shortCode: "CTT",
    parameter: "Cloud Top Temperature (Kelvin / °C)",
    sensor: "INSAT-3DS Sounder & Imager",
    resolution: "4 km",
    updateFrequency: "Every 15 minutes",
    description: "Convective core penetration and storm cloud updraft intensity via calibrated radiometric brightness temperatures.",
    previewUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_ir1.jpg",
    officialCatalogUrl: "https://mosdac.gov.in/",
    source: "MOSDAC / ISRO & IMD",
    provenance: "OBSERVED / SATELLITE PRODUCT",
    channels: ["10.8 µm IR1"]
  },
  {
    id: "SMOKE_AEROSOL",
    name: "Smoke, Dust & Aerosol Optical Depth (AOD)",
    shortCode: "AOD",
    parameter: "Aerosol Optical Thickness (550 nm)",
    sensor: "INSAT-3DS Imager",
    resolution: "4 km",
    updateFrequency: "Daytime (30 minutes)",
    description: "Atmospheric aerosol loading, industrial haze, agricultural burn plumes, and dust storm propagation.",
    previewUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_vis.jpg",
    officialCatalogUrl: "https://mosdac.gov.in/",
    source: "MOSDAC / ISRO",
    provenance: "OBSERVED / SATELLITE DERIVED",
    channels: ["0.65 µm VIS", "1.6 µm SWIR"]
  }
];

export function getMosdacProducts() {
  return MOSDAC_ADDITIONAL_PRODUCTS;
}

export default {
  MOSDAC_ADDITIONAL_PRODUCTS,
  getMosdacProducts
};
