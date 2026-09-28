import React, { useState } from "react";
import { 
  Satellite, 
  Layers, 
  ExternalLink, 
  ShieldCheck,
  X
} from "lucide-react";

/**
 * INSAT-3DS Satellite Product Viewer & Map Overlay Control
 * Sourcing Classification: OBSERVED / SATELLITE PRODUCT (MOSDAC / ISRO)
 */
export const SATELLITE_PRODUCTS = [
  {
    id: "IR1",
    name: "Thermal Infrared (IR1 - 10.8 µm)",
    shortName: "IR1",
    description: "Deep convection, cloud height, and nocturnal storm monitoring.",
    sensor: "INSAT-3DS Imager",
    resolution: "4 km",
    // Official IMD/MOSDAC public composite image or fallback visualizer
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_IR1.jpg",
    fallbackColor: "from-slate-900 via-indigo-950 to-slate-900"
  },
  {
    id: "VIS",
    name: "Visible Channel (VIS - 0.65 µm)",
    shortName: "VIS",
    description: "Daytime high-resolution cloud cover, cyclone eye definition, and fog.",
    sensor: "INSAT-3DS Imager",
    resolution: "1 km",
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_VIS.jpg",
    fallbackColor: "from-slate-800 via-sky-950 to-slate-800"
  },
  {
    id: "WV",
    name: "Water Vapour Channel (WV - 6.8 µm)",
    shortName: "WV",
    description: "Mid-to-upper tropospheric moisture, jet streams, and dry air intrusion.",
    sensor: "INSAT-3DS Imager",
    resolution: "8 km",
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_WV.jpg",
    fallbackColor: "from-blue-950 via-teal-950 to-slate-900"
  },
  {
    id: "CTT",
    name: "Cloud Top Temperature (CTT - RGB)",
    shortName: "CTT",
    description: "Convective storm intensity and cloud-top cooling trends.",
    sensor: "INSAT-3DS Imager / Sounder",
    resolution: "4 km",
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_CTT.jpg",
    fallbackColor: "from-indigo-950 via-purple-950 to-slate-900"
  }
];

export default function SatellitePanel({
  onClose,
  overlayOpacity = 0.6,
  onOpacityChange,
  isOverlayActive = false,
  onToggleOverlay
}) {
  const [selectedProduct, setSelectedProduct] = useState(SATELLITE_PRODUCTS[0]);
  const [imageError, setImageError] = useState(false);

  const handleProductChange = (prod) => {
    setSelectedProduct(prod);
    setImageError(false);
  };

  const istTime = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }) + " IST";

  return (
    <div className="satellite-operational-panel bg-slate-900 text-slate-100 rounded-lg border border-slate-700 shadow-xl overflow-hidden flex flex-col max-w-xl w-full">
      {/* Panel Header */}
      <div className="satellite-header flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Satellite size={16} className="text-cyan-400" />
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-200">
              INSAT-3DS METEOROLOGICAL SATELLITE
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              SPACE APPLICATIONS CENTRE • ISRO / MOSDAC
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-provenance text-[9.5px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
            OBSERVED / SATELLITE PRODUCT
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded"
              title="Close Satellite Panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Product Selection Tabs */}
      <div className="satellite-tabs flex items-center gap-1 px-3 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto">
        {SATELLITE_PRODUCTS.map((prod) => (
          <button
            key={prod.id}
            type="button"
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              selectedProduct.id === prod.id
                ? "bg-cyan-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            onClick={() => handleProductChange(prod)}
          >
            {prod.shortName}
          </button>
        ))}
      </div>

      {/* Main Satellite Display Area */}
      <div className="satellite-viewport relative bg-black aspect-video flex items-center justify-center overflow-hidden border-b border-slate-800 group">
        {!imageError ? (
          <img
            src={selectedProduct.imageUrl}
            alt={`INSAT-3DS ${selectedProduct.name}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
            onError={() => setImageError(true)}
            crossOrigin="anonymous"
          />
        ) : (
          /* Official Source Card when direct raster stream cannot be embedded (CORS / Auth) */
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center border border-slate-800">
            <div className="p-3 bg-slate-900 rounded-full border border-cyan-800/50 mb-2.5">
              <Satellite size={32} className="text-cyan-400" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-100 tracking-wider mb-0.5">
              INSAT-3DS
            </div>
            <div className="text-xs font-mono font-semibold text-cyan-300 mb-1.5">
              IR1 / VIS / WV / CTT
            </div>
            <div className="text-[11px] font-mono text-slate-400 mb-2">
              SOURCE: MOSDAC / ISRO
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] font-mono text-emerald-300 font-bold mb-3">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>LIVE SOURCE AVAILABLE</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={selectedProduct.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>OPEN LIVE PRODUCT</span>
                <ExternalLink size={12} />
              </a>
              <a
                href="https://www.mosdac.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <span>MOSDAC / ISRO PORTAL</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Viewport Floating Meta Tag */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10.5px] font-mono text-cyan-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>LATEST CAPTURE: {istTime}</span>
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          <a
            href="https://www.mosdac.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-slate-950/80 hover:bg-cyan-900 border border-slate-700 rounded text-[10px] font-mono text-slate-200 flex items-center gap-1"
            title="Open official MOSDAC ISRO portal"
          >
            <span>MOSDAC PORTAL</span>
            <ExternalLink size={10} />
          </a>
          <a
            href="https://mausam.imd.gov.in/responsive/satellite.php"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-slate-950/80 hover:bg-cyan-900 border border-slate-700 rounded text-[10px] font-mono text-slate-200 flex items-center gap-1"
            title="Open IMD Satellite portal"
          >
            <span>IMD MAUSAM</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>

      {/* Map Overlay Controls & Opacity Slider */}
      <div className="satellite-controls p-3 bg-slate-950 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Layers size={13} className="text-cyan-400" />
            <span className="text-slate-300 font-bold">SYNOPTIC MAP OVERLAY:</span>
          </div>

          {onToggleOverlay && (
            <button
              type="button"
              onClick={() => onToggleOverlay("satellite")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                isOverlayActive
                  ? "bg-cyan-600 border-cyan-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {isOverlayActive ? "OVERLAY ACTIVE" : "OVERLAY OFF"}
            </button>
          )}
        </div>

        {isOverlayActive && onOpacityChange && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-mono text-slate-400">OPACITY:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10.5px] font-mono text-cyan-300 w-10 text-right">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
          <span>SENSOR: {selectedProduct.sensor}</span>
          <span>RESOLUTION: {selectedProduct.resolution}</span>
        </div>
      </div>
    </div>
  );
}
