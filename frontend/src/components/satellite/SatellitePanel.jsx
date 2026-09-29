import React, { useState } from "react";
import {
  Satellite,
  Layers,
  ExternalLink,
  ShieldCheck,
  X,
  Zap
} from "lucide-react";

/**
 * INSAT-3DS Satellite Product Viewer & Map Overlay Control
 * Premium dark-themed panel — consistent with DRISHTI overlay design language.
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
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_IR1.jpg",
    color: "#818cf8"
  },
  {
    id: "VIS",
    name: "Visible Channel (VIS - 0.65 µm)",
    shortName: "VIS",
    description: "Daytime high-resolution cloud cover, cyclone eye definition, and fog.",
    sensor: "INSAT-3DS Imager",
    resolution: "1 km",
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_VIS.jpg",
    color: "#34d399"
  },
  {
    id: "WV",
    name: "Water Vapour Channel (WV - 6.8 µm)",
    shortName: "WV",
    description: "Mid-to-upper tropospheric moisture, jet streams, and dry air intrusion.",
    sensor: "INSAT-3DS Imager",
    resolution: "8 km",
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_WV.jpg",
    color: "#38bdf8"
  },
  {
    id: "CTT",
    name: "Cloud Top Temperature (CTT - RGB)",
    shortName: "CTT",
    description: "Convective storm intensity and cloud-top cooling trends.",
    sensor: "INSAT-3DS Imager / Sounder",
    resolution: "4 km",
    imageUrl: "https://mausam.imd.gov.in/satellite/archive/3D_CTT.jpg",
    color: "#fb923c"
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
    <div style={{
      background: "#0f172a",
      borderRadius: "0",        /* shell in OverlayManager provides border-radius */
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "var(--font-mono, monospace)",
      maxHeight: "85vh"
    }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0e2040 50%, #0a1628 100%)",
        borderBottom: "1px solid rgba(6,182,212,0.2)",
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", borderRadius: "8px",
            background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Satellite size={18} style={{ color: "#22d3ee" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
              <h3 style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: 800, letterSpacing: "0.06em", margin: 0 }}>
                INSAT-3DS METEOROLOGICAL SATELLITE
              </h3>
              <span style={{
                fontSize: "9px", fontWeight: 700, padding: "1px 7px", borderRadius: "3px",
                background: "rgba(34,197,94,0.15)", color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex", alignItems: "center", gap: "4px"
              }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" }} />
                LIVE
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.04em" }}>
              SPACE APPLICATIONS CENTRE • ISRO / MOSDAC
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "3px",
            background: "rgba(6,182,212,0.1)", color: "#22d3ee",
            border: "1px solid rgba(6,182,212,0.25)", letterSpacing: "0.05em"
          }}>
            OBSERVED / SATELLITE PRODUCT
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px", color: "#94a3b8", cursor: "pointer",
                width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center"
              }}
              title="Close Satellite Panel"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Product Tab Strip ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "10px 16px",
        background: "rgba(6,182,212,0.04)",
        borderBottom: "1px solid rgba(6,182,212,0.1)",
        overflowX: "auto", flexShrink: 0
      }}>
        {SATELLITE_PRODUCTS.map((prod) => (
          <button
            key={prod.id}
            type="button"
            onClick={() => handleProductChange(prod)}
            style={{
              padding: "6px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              background: selectedProduct.id === prod.id
                ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)",
              border: selectedProduct.id === prod.id
                ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: selectedProduct.id === prod.id ? "#22d3ee" : "#94a3b8"
            }}
          >
            {prod.shortName}
          </button>
        ))}

        {/* selected product name */}
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "#475569", whiteSpace: "nowrap" }}>
          {selectedProduct.name}
        </span>
      </div>

      {/* ── Main Satellite Viewport ── */}
      <div style={{
        position: "relative", background: "#020617",
        aspectRatio: "16/9", overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0
      }}>
        {!imageError ? (
          <img
            src={selectedProduct.imageUrl}
            alt={`INSAT-3DS ${selectedProduct.name}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImageError(true)}
            crossOrigin="anonymous"
          />
        ) : (
          /* Fallback: offline / CORS blocked */
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "24px", textAlign: "center",
            background: "radial-gradient(ellipse at center, #0a1628 0%, #020617 100%)"
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px"
            }}>
              <Satellite size={28} style={{ color: "#22d3ee" }} />
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#e2e8f0", letterSpacing: "0.04em", marginBottom: "4px" }}>
              INSAT-3DS
            </div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#22d3ee", marginBottom: "4px" }}>
              {selectedProduct.shortName} — {selectedProduct.name.split("(")[0].trim()}
            </div>
            <div style={{ fontSize: "10px", color: "#475569", marginBottom: "6px" }}>
              {selectedProduct.description}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "4px 10px", borderRadius: "4px",
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
              fontSize: "10px", fontWeight: 700, color: "#4ade80", marginBottom: "14px"
            }}>
              <ShieldCheck size={11} />LIVE SOURCE AVAILABLE — CORS RESTRICTED
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href={selectedProduct.imageUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  padding: "8px 16px", borderRadius: "6px",
                  background: "rgba(6,182,212,0.2)", border: "1px solid rgba(6,182,212,0.4)",
                  color: "#22d3ee", fontWeight: 700, fontSize: "11px",
                  display: "flex", alignItems: "center", gap: "5px", textDecoration: "none"
                }}
              >
                OPEN LIVE PRODUCT <ExternalLink size={11} />
              </a>
              <a
                href="https://www.mosdac.gov.in/" target="_blank" rel="noopener noreferrer"
                style={{
                  padding: "8px 16px", borderRadius: "6px",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", fontWeight: 700, fontSize: "11px",
                  display: "flex", alignItems: "center", gap: "5px", textDecoration: "none"
                }}
              >
                MOSDAC / ISRO PORTAL <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}

        {/* Live capture tag — top left */}
        <div style={{
          position: "absolute", top: "8px", left: "8px",
          padding: "4px 10px", borderRadius: "4px",
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          border: "1px solid rgba(6,182,212,0.3)",
          fontSize: "10px", fontWeight: 700, color: "#22d3ee",
          display: "flex", alignItems: "center", gap: "5px"
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", animation: "ping 1s infinite" }} />
          LATEST CAPTURE: {istTime}
        </div>

        {/* Portal links — bottom right */}
        {!imageError && (
          <div style={{ position: "absolute", bottom: "8px", right: "8px", display: "flex", gap: "6px" }}>
            {[
              { href: "https://www.mosdac.gov.in/", label: "MOSDAC" },
              { href: "https://mausam.imd.gov.in/responsive/satellite.php", label: "IMD MAUSAM" }
            ].map((l) => (
              <a
                key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                style={{
                  padding: "4px 8px", borderRadius: "4px",
                  background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#94a3b8", fontSize: "10px", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "4px", textDecoration: "none"
                }}
              >
                {l.label} <ExternalLink size={9} />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Product Info + Controls ── */}
      <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 10px 0", lineHeight: 1.5, fontFamily: "sans-serif" }}>
          {selectedProduct.description}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "10px", color: "#475569" }}>SENSOR: <span style={{ color: "#94a3b8", fontWeight: 700 }}>{selectedProduct.sensor}</span></span>
            <span style={{ fontSize: "10px", color: "#475569" }}>RESOLUTION: <span style={{ color: "#94a3b8", fontWeight: 700 }}>{selectedProduct.resolution}</span></span>
          </div>

          {onToggleOverlay && (
            <button
              type="button"
              onClick={() => onToggleOverlay("satellite")}
              style={{
                padding: "6px 14px", borderRadius: "6px", fontSize: "10px", fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
                background: isOverlayActive ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.04)",
                border: isOverlayActive ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.1)",
                color: isOverlayActive ? "#22d3ee" : "#64748b",
                display: "flex", alignItems: "center", gap: "5px"
              }}
            >
              <Layers size={11} />
              {isOverlayActive ? "MAP OVERLAY ACTIVE" : "MAP OVERLAY OFF"}
            </button>
          )}
        </div>

        {isOverlayActive && onOpacityChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
            <span style={{ fontSize: "10px", color: "#64748b", whiteSpace: "nowrap" }}>OPACITY:</span>
            <input
              type="range" min="0" max="1" step="0.05"
              value={overlayOpacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "#22d3ee", cursor: "pointer" }}
            />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#22d3ee", width: "36px", textAlign: "right" }}>
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(15,23,42,0.8)", flexShrink: 0
      }}>
        <span style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.04em" }}>PROVENANCE: MOSDAC / ISRO SAC GEOSTATIONARY PRODUCTS</span>
        <span style={{ fontSize: "10px", color: "#22d3ee", fontWeight: 700 }}>ISRO • MOSDAC • IMD</span>
      </div>
    </div>
  );
}
