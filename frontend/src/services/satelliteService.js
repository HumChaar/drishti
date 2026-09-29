/**
 * DRISHTI Official Satellite Service Layer
 *
 * Integrates official Indian Geostationary Meteorological Satellite Imagery (INSAT-3DS)
 * sourced from India Meteorological Department (IMD) and Space Applications Centre / MOSDAC (ISRO).
 *
 * SOURCING STANDARD:
 * - SOURCE: IMD / INSAT-3DS (with MOSDAC / ISRO references)
 * - STATUS: OBSERVED
 * - PROVENANCE: OBSERVED
 *
 * ARCHITECTURE RULES:
 * - Remote assets only; zero local raster or HDF5 bundling.
 * - No fabrication or scraping.
 * - Displays official image headers and actual source-derived acquisition tags.
 * - Never calculates an unofficial depression percentage from imagery.
 */

export const SATELLITE_PRODUCTS = [
  {
    id: "IR1",
    name: "Thermal Infrared (IR1 - 10.8 µm)",
    shortName: "IR1",
    category: "Infrared",
    sector: "Asia Sector",
    sensor: "INSAT-3DS Imager",
    resolution: "4 km",
    wavelength: "10.8 µm",
    description: "Deep convection, storm cloud-top height, and nocturnal cyclone core monitoring across South Asia.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_ir1.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST"
  },
  {
    id: "VIS",
    name: "Visible Channel (VIS - 0.65 µm)",
    shortName: "VIS",
    category: "Visible",
    sector: "Asia Sector",
    sensor: "INSAT-3DS Imager",
    resolution: "1 km",
    wavelength: "0.65 µm",
    description: "Daytime high-resolution cloud cover, cyclone eye definition, spiral band structure, and fog detection.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_vis.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST (Daytime only)"
  },
  {
    id: "WV",
    name: "Water Vapour Channel (WV - 6.8 µm)",
    shortName: "WV",
    category: "Water Vapour",
    sector: "Asia Sector",
    sensor: "INSAT-3DS Imager",
    resolution: "8 km",
    wavelength: "6.8 µm",
    description: "Mid-to-upper tropospheric moisture dynamics, jet stream boundaries, and dry environmental air intrusion.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_wv.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST"
  },
  {
    id: "SWIR",
    name: "Shortwave Infrared (SWIR - 1.6 µm)",
    shortName: "SWIR",
    category: "SWIR",
    sector: "Rapid Scan / WMO Sector",
    sensor: "INSAT-3DS Imager Rapid Scan",
    resolution: "1 km",
    wavelength: "1.6 µm",
    description: "Ice vs. water cloud phase discrimination, snow mapping, and early morning fog characterization.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/rswmo_swir.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite_rapidscan.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST"
  },
  {
    id: "MP",
    name: "Multi-Purpose RGB Composite (MP)",
    shortName: "MP (MET)",
    category: "Meteorological / MP",
    sector: "Rapid Scan / WMO Sector",
    sensor: "INSAT-3DS Imager Rapid Scan",
    resolution: "4 km",
    wavelength: "Multi-band RGB",
    description: "Multispectral RGB composite highlighting convective storm severity, updraft intensity, and cloud microphysics.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/rswmo_mp.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite_rapidscan.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST"
  },
  {
    id: "CTT",
    name: "Cloud Top Brightness Temperature (CTBT / CTT)",
    shortName: "CTT",
    category: "Cloud Top Temperature",
    sector: "Asia Sector",
    sensor: "INSAT-3DS Imager / Sounder",
    resolution: "4 km",
    wavelength: "Thermal IR derived",
    description: "Convective intensity calibration and cloud-top brightness temperature mapping across the storm envelope.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/3Dasiasec_ctbt.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST"
  },
  {
    id: "RAPID_SCAN",
    name: "INSAT-3DS Rapid Scan (IR1)",
    shortName: "RAPID SCAN",
    category: "Rapid Scan",
    sector: "WMO Rapid Scan Domain",
    sensor: "INSAT-3DS Imager Rapid Scan Mode",
    resolution: "4 km",
    wavelength: "10.8 µm",
    description: "High-cadence rapid scan sector observations over active cyclones and severe convective systems.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/rswmo_ir1.jpg",
    officialSourceUrl: "https://mausam.imd.gov.in/responsive/satellite_rapidscan.php",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Stamped on official image header • UTC / IST"
  },
  {
    id: "BULLETIN",
    name: "IMD Synoptic Satellite Bulletin",
    shortName: "BULLETIN",
    category: "Satellite Bulletin",
    sector: "National & Oceanic Domain",
    sensor: "INSAT-3DS Synoptic Analysis",
    resolution: "National Synthesis",
    wavelength: "Multi-channel Bulletin",
    description: "Authoritative satellite weather summary bulletin issued by IMD Satellite Meteorology Division with cloud vortex positions.",
    imageUrl: "https://mausam.imd.gov.in/Satellite/tmpsbltn/satbltn-0.png",
    officialSourceUrl: "https://mausam.imd.gov.in/Forecast/satellite_bulletin_view.php",
    officialPdfUrl: "https://mausam.imd.gov.in/Forecast/satbltn.pdf",
    sourceOrg: "IMD / INSAT-3DS",
    provenance: "OBSERVED",
    acquisitionNote: "Official synoptic bulletin cycle (00, 03, 06, 09, 12, 15, 18, 21 UTC)"
  }
];

export const OFFICIAL_SATELLITE_PORTALS = {
  IMD_SATELLITE: {
    title: "IMD Satellite Products",
    url: "https://mausam.imd.gov.in/responsive/satellite.php",
    description: "Official India Meteorological Department geostationary satellite portal."
  },
  IMD_RAPID_SCAN: {
    title: "IMD Rapid Scan",
    url: "https://mausam.imd.gov.in/responsive/satellite_rapidscan.php",
    description: "INSAT-3DS rapid scan imagery for high-frequency severe weather surveillance."
  },
  IMD_BULLETIN: {
    title: "IMD Satellite Bulletin",
    url: "https://mausam.imd.gov.in/Forecast/satellite_bulletin_view.php",
    description: "National synoptic satellite analysis bulletin and vortex summaries."
  },
  MOSDAC_INSAT3DS: {
    title: "MOSDAC / ISRO INSAT-3DS",
    url: "https://mosdac.gov.in/insat-3ds",
    description: "Space Applications Centre (ISRO) Meteorological & Oceanographic Satellite Data Archival Centre."
  },
  MOSDAC_REFERENCES: {
    title: "MOSDAC INSAT-3DS References",
    url: "https://www.mosdac.gov.in/insat-3s-references",
    description: "Technical sensor specifications and calibration payloads for INSAT-3DS."
  }
};

/**
 * Lightweight in-memory session cache for selected satellite image metadata.
 * Does NOT store raster data or archives. Low memory footprint (<10 KB).
 */
const inMemoryCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCachedProductMeta(productId) {
  const cached = inMemoryCache.get(productId);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    inMemoryCache.delete(productId);
    return null;
  }
  return cached;
}

export function setCachedProductMeta(productId, meta) {
  inMemoryCache.set(productId, {
    ...meta,
    timestamp: Date.now()
  });
}

/**
 * Returns current formatted time in Indian Standard Time (IST)
 */
export function getCurrentISTTime() {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }) + " IST";
}
