import React, { useState } from "react";
import { 
  MapContainer as LeafletMap, 
  TileLayer, 
  Polyline, 
  Polygon, 
  Circle, 
  Marker, 
  Popup, 
  Tooltip 
} from "react-leaflet";
import L from "leaflet";
import { Layers } from "lucide-react";

// Custom HTML DivIcons for Light Command Center
const createCycloneIcon = (_category) => {
  return L.divIcon({
    className: "cyclone-eye-icon",
    html: `
      <div class="cyclone-marker">
        <div class="pulse-ring"></div>
        <div class="core-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.7 7.7a9 9 0 1 0-9.9 9.9"></path>
            <path d="M14.5 14.5A5 5 0 1 0 9.5 9.5"></path>
            <circle cx="12" cy="12" r="1.5" fill="white"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
};

const createDistrictIcon = (name, riskScore, color) => {
  return L.divIcon({
    className: "district-pill-icon",
    html: `
      <div class="district-map-pill" style="color: #0f172a; border-color: ${color}; background-color: #ffffff; box-shadow: 0 2px 6px rgba(15,23,42,0.15);">
        <span>${name}</span>
        <span style="margin-left: 4px; padding: 1px 5px; border-radius: 2px; background: ${color}; color: #ffffff; font-weight: bold;">${riskScore}</span>
      </div>
    `,
    iconSize: [110, 24],
    iconAnchor: [55, 12]
  });
};

const createInfraIcon = (type, color) => {
  let symbol = "⚓";
  if (type === "Shelter") symbol = "🛡";
  if (type === "Hospital") symbol = "✚";
  if (type === "Power") symbol = "⚡";

  return L.divIcon({
    className: "infra-icon-wrap",
    html: `
      <div class="infra-map-marker" style="border-color: ${color}; color: ${color}; background: #ffffff;">
        <span style="font-size: 11px;">${symbol}</span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export default function MapContainer({ 
  currentScenario, 
  districtsData = [], 
  infraData = [], 
  selectedDistrict, 
  onSelectDistrict 
}) {
  const [layers, setLayers] = useState({
    cone: true,
    windField: true,
    districts: true,
    infrastructure: true,
    track: true,
    inundation: true
  });

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const current = currentScenario?.current || { latitude: 19.6, longitude: 89.2 };
  const pastTrack = currentScenario?.pastTrack || [];
  const forecastTrack = currentScenario?.forecastTrack || [];
  const coneCoords = currentScenario?.coneCoordinates || [];
  const windRadii = currentScenario?.windRadii || { r34Km: 240, r50Km: 130, r64Km: 45 };

  // Convert past track to LatLng array
  const pastPathCoords = pastTrack.map((p) => [p.lat, p.lon]);
  // Connect past to current
  if (pastPathCoords.length > 0) {
    pastPathCoords.push([current.latitude, current.longitude]);
  }

  // Convert forecast track to LatLng array starting from current
  const forecastPathCoords = [[current.latitude, current.longitude], ...forecastTrack.map((p) => [p.lat, p.lon])];

  return (
    <div className="map-wrapper-card">
      {/* Top Map Layer Control Toolbar */}
      <div className="map-toolbar">
        <div className="toolbar-title-section">
          <Layers size={14} className="text-orange-600" />
          <span className="toolbar-heading">BAY OF BENGAL SITUATIONAL MAP</span>
          <span className="badge-provenance text-xs">CALIBRATED REPLAY</span>
        </div>

        <div className="map-layer-toggles">
          <button 
            className={`layer-chip ${layers.cone ? "active" : ""}`}
            onClick={() => toggleLayer("cone")}
          >
            <span className="indicator cone-ind"></span>
            <span>Forecast Cone</span>
          </button>

          <button 
            className={`layer-chip ${layers.windField ? "active" : ""}`}
            onClick={() => toggleLayer("windField")}
          >
            <span className="indicator wind-ind"></span>
            <span>Wind Radii</span>
          </button>

          <button 
            className={`layer-chip ${layers.districts ? "active" : ""}`}
            onClick={() => toggleLayer("districts")}
          >
            <span className="indicator district-ind"></span>
            <span>District Risk</span>
          </button>

          <button 
            className={`layer-chip ${layers.inundation ? "active" : ""}`}
            onClick={() => toggleLayer("inundation")}
          >
            <span className="indicator inun-ind"></span>
            <span>Inundation Threat (Derived)</span>
          </button>

          <button
            className={`layer-chip ${layers.infrastructure ? "active" : ""}`}
            onClick={() => toggleLayer("infrastructure")}
          >
            <span className="indicator infra-ind"></span>
            <span>Critical Assets</span>
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="leaflet-map-host">
        <LeafletMap 
          center={[20.4, 87.8]} 
          zoom={6} 
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Tactical OpenStreetMap Basemap Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Forecast Cone of Uncertainty Polygon */}
          {layers.cone && coneCoords.length > 0 && (
            <Polygon
              positions={coneCoords}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#f59e0b",
                fillOpacity: 0.16,
                weight: 1.5,
                dashArray: "4 4"
              }}
            >
              <Tooltip direction="top" opacity={0.9} sticky>
                <div className="font-mono text-xs">
                  <strong>70% Probability Cone of Uncertainty</strong>
                  <br />Potential Landfall Envelope: WB - Odisha Coast
                </div>
              </Tooltip>
            </Polygon>
          )}

          {/* Wind Swaths (34kt gale radius & 50kt storm radius) */}
          {layers.windField && windRadii.r34Km > 0 && (
            <Circle
              center={[current.latitude, current.longitude]}
              radius={windRadii.r34Km * 1000}
              pathOptions={{
                color: "#0284c7",
                fillColor: "#0284c7",
                fillOpacity: 0.08,
                weight: 1,
                dashArray: "3 3"
              }}
            >
              <Tooltip direction="top" opacity={0.9}>
                <span className="font-mono text-xs">34-Knot (Gale Force) Swath: {windRadii.r34Km} km</span>
              </Tooltip>
            </Circle>
          )}

          {layers.windField && windRadii.r50Km > 0 && (
            <Circle
              center={[current.latitude, current.longitude]}
              radius={windRadii.r50Km * 1000}
              pathOptions={{
                color: "#ea580c",
                fillColor: "#ea580c",
                fillOpacity: 0.12,
                weight: 1.2
              }}
            >
              <Tooltip direction="top" opacity={0.9}>
                <span className="font-mono text-xs">50-Knot (Storm Force) Swath: {windRadii.r50Km} km</span>
              </Tooltip>
            </Circle>
          )}

          {/* Hurricane-Force 64-Knot Swath */}
          {layers.windField && windRadii.r64Km > 0 && (
            <Circle
              center={[current.latitude, current.longitude]}
              radius={windRadii.r64Km * 1000}
              pathOptions={{
                color: "#b91c1c",
                fillColor: "#b91c1c",
                fillOpacity: 0.2,
                weight: 1.6
              }}
            >
              <Tooltip direction="top" opacity={0.9}>
                <span className="font-mono text-xs font-bold text-red-700">64-Knot (Hurricane Force) Swath: {windRadii.r64Km} km</span>
              </Tooltip>
            </Circle>
          )}

          {/* Historical Path Polyline (Solid orange/red) */}
          {layers.track && pastPathCoords.length > 1 && (
            <Polyline
              positions={pastPathCoords}
              pathOptions={{
                color: "#ea580c",
                weight: 3.5,
                opacity: 0.95
              }}
            />
          )}

          {/* Forecast Path Polyline (Dashed red) */}
          {layers.track && forecastPathCoords.length > 1 && (
            <Polyline
              positions={forecastPathCoords}
              pathOptions={{
                color: "#dc2626",
                weight: 3,
                dashArray: "6 6",
                opacity: 0.9
              }}
            />
          )}

          {/* Historical Waypoints */}
          {layers.track && pastTrack.map((pt, i) => (
            <Circle
              key={`past-pt-${i}`}
              center={[pt.lat, pt.lon]}
              radius={7000}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#ea580c",
                fillOpacity: 1,
                weight: 1.5
              }}
            >
              <Tooltip direction="right" opacity={0.9}>
                <div className="font-mono text-xs">
                  <strong>{pt.label}</strong>
                  <br />Wind: {pt.windKt} kt ({Math.round(pt.windKt * 1.852)} km/h)
                </div>
              </Tooltip>
            </Circle>
          ))}

          {/* Forecast Waypoints */}
          {layers.track && forecastTrack.map((pt, i) => (
            <Circle
              key={`fcst-pt-${i}`}
              center={[pt.lat, pt.lon]}
              radius={6000}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#ffffff",
                fillOpacity: 0.9,
                weight: 2,
                dashArray: "2 2"
              }}
            >
              <Tooltip direction="right" opacity={0.9}>
                <div className="font-mono text-xs">
                  <strong>{pt.label}</strong>
                  <br />Forecast Wind: {pt.windKt} kt
                </div>
              </Tooltip>
            </Circle>
          ))}

          {/* Current Cyclone Eye Marker */}
          <Marker
            position={[current.latitude, current.longitude]}
            icon={createCycloneIcon(current.category)}
          >
            <Popup>
              <div className="map-popup-card">
                <div className="popup-title">
                  <span className="text-red-600 font-bold">CYCLONE REMAL</span>
                  <span className="badge-provenance ml-2 text-xs">REPLAY</span>
                </div>
                <div className="popup-stage">{current.category}</div>
                <div className="popup-details font-mono text-xs">
                  <div>Position: {current.latitude}°N, {current.longitude}°E</div>
                  <div>Wind: {current.windKt} kt ({current.windKmh} km/h)</div>
                  <div>Gusts: {current.gustKmh} km/h</div>
                  <div>Central Pressure: {current.pressureMb} hPa</div>
                  <div>Motion: {current.movementDirection} @ {current.movementSpeedKmh} km/h</div>
                </div>
              </div>
            </Popup>
          </Marker>

          {/* District Risk Circles & Badges */}
          {layers.districts && districtsData.map((d) => {
            const isSelected = selectedDistrict?.id === d.id;
            const risk = d.risk || {};

            return (
              <React.Fragment key={d.id}>
                {/* Risk Halo Circle around District Headquarter */}
                <Circle
                  center={[d.lat, d.lon]}
                  radius={28000}
                  pathOptions={{
                    color: risk.color || "#0284c7",
                    fillColor: risk.color || "#0284c7",
                    fillOpacity: isSelected ? 0.35 : 0.16,
                    weight: isSelected ? 3 : 1.5,
                    dashArray: isSelected ? undefined : "3 3"
                  }}
                  eventHandlers={{
                    click: () => onSelectDistrict(d)
                  }}
                >
                  <Tooltip direction="top" opacity={0.95}>
                    <div className="font-mono text-xs">
                      <strong>{d.name} ({d.state})</strong>
                      <br />Risk Score: <span style={{ color: risk.color, fontWeight: "bold" }}>{risk.riskScore}/100 [{risk.riskBand}]</span>
                      <br />Surge Est: {risk.surgeMeters}m | Rain: {risk.rainMm24h}mm
                    </div>
                  </Tooltip>
                </Circle>

                {/* District Marker Label */}
                <Marker
                  position={[d.lat, d.lon]}
                  icon={createDistrictIcon(d.name, risk.riskScore, risk.color)}
                  eventHandlers={{
                    click: () => onSelectDistrict(d)
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* Derived Coastal Inundation Threat Footprint (Calibrated Simulation Layer) */}
          {layers.inundation && districtsData
            .filter((d) => (d.risk?.inundationProbPct >= 40) || (d.risk?.surgeMeters >= 1.0))
            .map((d) => {
              const risk = d.risk || {};
              const radiusMeters = Math.max(30000, (d.coastalLineKm || 30) * 850);
              return (
                <Circle
                  key={`inun-footprint-${d.id}`}
                  center={[d.lat, d.lon]}
                  radius={radiusMeters}
                  pathOptions={{
                    color: "#0891b2",
                    fillColor: "#06b6d4",
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: "6 6"
                  }}
                  eventHandlers={{
                    click: () => onSelectDistrict(d)
                  }}
                >
                  <Tooltip direction="bottom" opacity={0.95}>
                    <div className="font-mono text-xs">
                      <strong className="text-cyan-800">DERIVED COASTAL INUNDATION FOOTPRINT</strong>
                      <br />District: <strong>{d.name}</strong> ({d.state})
                      <br />Surge Est: <strong>{risk.surgeMeters}m</strong> | Inundation Prob: <strong>{risk.inundationProbPct}%</strong>
                      <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-200 pt-1">
                        CALIBRATED HISTORICAL SIMULATION (NOT LIVE SATELLITE/GEE FLOOD POLYGON)
                      </div>
                    </div>
                  </Tooltip>
                </Circle>
              );
            })}

          {/* Infrastructure Markers */}
          {layers.infrastructure && infraData.map((asset) => {
            const assetColor = 
              asset.riskLevel === "CRITICAL" || asset.riskLevel === "EXTREME" ? "#dc2626" :
              asset.riskLevel === "VERY HIGH" ? "#ea580c" :
              asset.riskLevel === "HIGH" ? "#d97706" : "#0284c7";

            return (
              <Marker
                key={asset.id}
                position={[asset.lat, asset.lon]}
                icon={createInfraIcon(asset.category, assetColor)}
              >
                <Popup>
                  <div className="map-popup-card">
                    <div className="popup-title font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{asset.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mb-1">
                      {asset.type} • {asset.category}
                    </div>
                    <div className="text-xs text-slate-700 mb-1">
                      Status: <strong className="text-amber-800 font-semibold">{asset.status}</strong>
                    </div>
                    <div className="text-xs text-slate-600">
                      {asset.details}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </LeafletMap>

        {/* Map Truthful Provenance Watermark */}
        <div className="map-truthful-watermark">
          <span className="watermark-tag font-mono font-bold">CALIBRATED HISTORICAL EXERCISE</span>
          <span className="watermark-text font-mono">
            REMAL 2024 • INUNDATION & SURGE METRICS ARE DERIVED SIMULATIONS — NOT LIVE FLOOD POLYGONS
          </span>
        </div>

        {/* Map Legend Overlay */}
        <div className="map-legend-card">
          <div className="legend-title">MAP HAZARD CLASSIFICATION</div>
          <div className="legend-items">
            <div className="legend-row">
              <span className="legend-swatch" style={{ background: "#dc2626" }}></span>
              <span>Extreme / Critical Risk (85-100)</span>
            </div>
            <div className="legend-row">
              <span className="legend-swatch" style={{ background: "#ea580c" }}></span>
              <span>Very High Risk (75-84)</span>
            </div>
            <div className="legend-row">
              <span className="legend-swatch" style={{ background: "#d97706" }}></span>
              <span>High Risk (60-74)</span>
            </div>
            <div className="legend-row">
              <span className="legend-swatch" style={{ background: "#ca8a04" }}></span>
              <span>Moderate Risk (40-59)</span>
            </div>
            <div className="legend-row">
              <span className="legend-swatch" style={{ background: "#16a34a" }}></span>
              <span>Low Risk (0-39)</span>
            </div>
            <div className="legend-divider"></div>
            <div className="legend-row">
              <span className="legend-line solid-line"></span>
              <span>Past Replay Track</span>
            </div>
            <div className="legend-row">
              <span className="legend-line dashed-line"></span>
              <span>Forecast Track</span>
            </div>
            <div className="legend-row">
              <span className="legend-cone-swatch"></span>
              <span>70% Uncertainty Cone</span>
            </div>
            <div className="legend-row">
              <span className="legend-swatch" style={{ background: "#b91c1c", opacity: 0.7 }}></span>
              <span>64-Knot Hurricane Swath</span>
            </div>
            <div className="legend-row">
              <span className="legend-inun-swatch"></span>
              <span>Derived Inundation Footprint</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
