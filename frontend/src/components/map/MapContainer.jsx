import React, { useState, useEffect } from "react";
import {
  MapContainer as LeafletMap,
  TileLayer,
  Polyline,
  Polygon,
  Circle,
  Marker,
  Popup,
  Tooltip,
  GeoJSON,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { Layers, Wind } from "lucide-react";
import { STATES_AND_UTS } from "../../data/indiaGeography";
import WindCanvasOverlay from "./WindCanvasOverlay";
import { ACTIVE_DEPRESSION_SYSTEM } from "../../services/openMeteoService";

// Subcomponent to smoothly animate map viewport to target coordinates and ensure full dimensions
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom, { animate: true, duration: 0.8 });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map, center, zoom]);

  return null;
}

// Normalize state names for robust matching between GeoJSON and State Model
function normalizeStateName(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
}

// Custom HTML DivIcons for Meteorological Command Center
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

const createDepressionIcon = () => {
  return L.divIcon({
    className: "depression-center-icon",
    html: `
      <div class="depression-marker" style="display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(217,119,6,0.3);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:20px;height:20px;border-radius:50%;background:#d97706;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:10px;font-weight:bold;font-family:monospace;">
          D
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
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
  onSelectDistrict,
  operatingMode = "NORMAL",
  selectedState,
  onSelectState,
  weatherData = null
}) {
  const isNormal = operatingMode === "NORMAL";

  const [layers, setLayers] = useState({
    stateBoundaries: true,
    windField: true,
    cone: true,
    districts: true,
    infrastructure: true,
    track: true,
    inundation: true
  });

  const [geoJsonData, setGeoJsonData] = useState(null);

  // Load offline local GeoJSON boundary dataset
  useEffect(() => {
    let isMounted = true;
    fetch("/data/india-states.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) setGeoJsonData(data);
      })
      .catch((err) => {
        console.warn("Failed to load local india-states.geojson:", err);
      });
    return () => { isMounted = false; };
  }, []);

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Determine dynamic map center & zoom based on operating mode & selected state
  // Prompt requirement: Initial screen must show India, Arabian Sea, Bay of Bengal, Sri Lanka
  let mapCenter = [20.5937, 78.9629];
  let mapZoom = 5;
  if (isNormal) {
    if (selectedState) {
      mapCenter = selectedState.center || [20.5937, 78.9629];
      mapZoom = selectedState.zoom || 6;
    } else {
      mapCenter = [20.5937, 78.9629];
      mapZoom = 5;
    }
  } else {
    mapCenter = [20.4, 87.8];
    mapZoom = 6;
  }

  const current = currentScenario?.current || { latitude: 19.6, longitude: 89.2 };
  const pastTrack = currentScenario?.pastTrack || [];
  const forecastTrack = currentScenario?.forecastTrack || [];
  const coneCoords = currentScenario?.coneCoordinates || [];
  const windRadii = currentScenario?.windRadii || { r34Km: 240, r50Km: 130, r64Km: 45 };

  // Convert past track to LatLng array
  const pastPathCoords = pastTrack.map((p) => [p.lat, p.lon]);
  if (pastPathCoords.length > 0) {
    pastPathCoords.push([current.latitude, current.longitude]);
  }

  // Convert forecast track to LatLng array starting from current
  const forecastPathCoords = [[current.latitude, current.longitude], ...forecastTrack.map((p) => [p.lat, p.lon])];

  // Lookup state match by name
  const getStateRecord = (geoName) => {
    if (!weatherData?.states) return null;
    const norm = normalizeStateName(geoName);
    const matchedState = STATES_AND_UTS.find((st) => {
      const sNorm = normalizeStateName(st.name);
      return sNorm === norm || sNorm.includes(norm) || norm.includes(sNorm);
    });
    if (matchedState && weatherData.states[matchedState.id]) {
      return { meta: matchedState, weather: weatherData.states[matchedState.id] };
    }
    return null;
  };

  // Choropleth style function for 36 Indian States & UTs
  const stateStyle = (feature) => {
    const stateName = feature.properties?.ST_NM || feature.properties?.NAME_1 || "";
    const record = getStateRecord(stateName);
    const isSelected = selectedState && normalizeStateName(selectedState.name) === normalizeStateName(stateName);

    // If no weather data, render neutral boundary without covering basemap
    if (!record?.weather) {
      return {
        fillColor: isSelected ? "#3b82f6" : "transparent",
        weight: isSelected ? 2.5 : 1,
        opacity: 0.8,
        color: isSelected ? "#1d4ed8" : "#94a3b8",
        dashArray: isSelected ? undefined : "2 2",
        fillOpacity: isSelected ? 0.25 : 0
      };
    }

    const influence = record.weather.depressionInfluencePct || 0;

    // Neutral baseline - transparent fill so OpenStreetMap basemap is 100% visible
    let fillColor = isSelected ? "#3b82f6" : "transparent";
    let fillOpacity = isSelected ? 0.25 : 0;
    let strokeColor = isSelected ? "#1d4ed8" : "#64748b";
    let strokeWeight = isSelected ? 2.5 : 1;

    // Only tint states that have meaningful verified influence (>= 35%)
    if (influence >= 60) {
      fillColor = "#ea580c"; // Elevated influence (e.g., MP synoptic zone)
      fillOpacity = isSelected ? 0.45 : 0.25;
      strokeColor = isSelected ? "#1d4ed8" : "#c2410c";
    } else if (influence >= 35) {
      fillColor = "#f59e0b"; // Moderate influence
      fillOpacity = isSelected ? 0.35 : 0.18;
      strokeColor = isSelected ? "#1d4ed8" : "#b45309";
    }

    return {
      fillColor,
      weight: strokeWeight,
      opacity: 0.85,
      color: strokeColor,
      dashArray: isSelected ? undefined : "2 2",
      fillOpacity
    };
  };

  // Event handlers for state boundary features
  const onEachStateFeature = (feature, layer) => {
    try {
      const stateName = feature.properties?.ST_NM || feature.properties?.NAME_1 || "Indian State";
      const record = getStateRecord(stateName);

      layer.on({
        mouseover: (e) => {
          try {
            const target = e.target;
            target.setStyle({
              weight: 2.5,
              color: "#2563eb",
              fillOpacity: 0.55
            });
          } catch {}
        },
        mouseout: (e) => {
          try {
            if (geoJsonData) {
              const target = e.target;
              const isSelected = selectedState && normalizeStateName(selectedState.name) === normalizeStateName(stateName);
              target.setStyle({
                weight: isSelected ? 2.5 : 1,
                color: isSelected ? "#1d4ed8" : "#94a3b8",
                fillOpacity: stateStyle(feature).fillOpacity
              });
            }
          } catch {}
        },
        click: () => {
          try {
            if (record?.meta && onSelectState) {
              onSelectState(record.meta);
            }
          } catch {}
        }
      });

      // State hover: State, Wind, Rain, Temperature, Warning status, Data timestamp. If no data: NO CURRENT DATA
      if (!record?.weather) {
        layer.bindTooltip(
          `<div class="font-mono text-xs leading-tight p-1.5">
            <strong class="text-slate-900">${stateName}</strong>
            <div class="text-[10.5px] text-slate-500 font-bold mt-1">NO CURRENT DATA</div>
            <div class="text-[9px] text-slate-400 mt-0.5">OPEN-METEO / IMD TELEMETRY PENDING</div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );
      } else {
        const influence = record.weather.depressionInfluencePct != null ? `${record.weather.depressionInfluencePct}%` : "N/A";
        const windSpeed = record.weather.windSpeed != null ? `${record.weather.windSpeed} km/h` : "N/A";
        const rain = record.weather.rain != null ? `${record.weather.rain} mm` : "N/A";
        const temp = record.weather.temperature != null ? `${record.weather.temperature}°C` : "N/A";
        const warningStatus = record.weather.depressionInfluencePct >= 50 ? "WARNING" : record.weather.depressionInfluencePct >= 25 ? "ALERT" : "ROUTINE";
        const timestamp = record.weather.updatedAt || "IST";

        layer.bindTooltip(
          `<div class="font-mono text-xs leading-tight p-1.5">
            <div class="flex items-center justify-between pb-1 border-b border-slate-200 mb-1">
              <strong class="text-slate-900">${stateName}</strong>
              <span class="text-[9px] px-1 py-0.2 rounded font-bold ${
                warningStatus === "WARNING" ? "bg-red-100 text-red-800" :
                warningStatus === "ALERT" ? "bg-orange-100 text-orange-800" :
                "bg-emerald-100 text-emerald-800"
              }">${warningStatus}</span>
            </div>
            <div class="text-[10px] text-slate-600">Wind: <strong>${windSpeed}</strong> | Rain: <strong>${rain}</strong> | Temp: <strong>${temp}</strong></div>
            <div class="mt-1 pt-1 border-t border-slate-200 flex items-center justify-between text-[9.5px]">
              <span class="text-orange-700 font-bold">DEPRESSION INFLUENCE: ${influence}</span>
              <span class="text-slate-400 font-mono">${timestamp}</span>
            </div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );
      }
    } catch (err) {
      console.warn("GeoJSON feature handler warning:", err);
    }
  };

  return (
    <div className="map-wrapper-card">
      {/* Top Map Layer Control Toolbar */}
      <div className="map-toolbar">
        <div className="toolbar-title-section">
          <Layers size={14} className={isNormal ? "text-blue-700" : "text-orange-600"} />
          <span className="toolbar-heading font-mono">
            {isNormal
              ? (selectedState
                  ? `${selectedState.name.toUpperCase()} • SYNOPTIC SURVEILLANCE & READINESS`
                  : "PAN-INDIA METEOROLOGICAL COMMAND MAP • ALL 36 STATES & UTs")
              : "ACTIVE DISASTER TACTICAL MAP • BAY OF BENGAL ARC"}
          </span>
          {isNormal ? (
            <span className="badge-provenance text-[10px] bg-blue-50 text-blue-800 border border-blue-200">
              OPEN-METEO MODEL WIND + 36 STATE CHOROPLETH
            </span>
          ) : (
            <span className="badge-provenance text-[10px] font-bold">
              HISTORICAL SIMULATION • REMAL 2024
            </span>
          )}
        </div>

        <div className="map-layer-toggles">
          {/* Wind Layer Toggle */}
          <button
            type="button"
            className={`layer-chip ${layers.windField ? "active" : ""}`}
            onClick={() => toggleLayer("windField")}
            title="Toggle Animated Meteorological Wind Vectors"
          >
            <span className="indicator wind-ind"></span>
            <span>WIND FIELD</span>
          </button>

          {/* State Boundary Toggle (Normal Mode) */}
          {isNormal && (
            <button
              type="button"
              className={`layer-chip ${layers.stateBoundaries ? "active" : ""}`}
              onClick={() => toggleLayer("stateBoundaries")}
              title="Toggle All 36 States/UTs Choropleth"
            >
              <span className="indicator district-ind"></span>
              <span>STATES (36)</span>
            </button>
          )}

          {/* Disaster Mode Toggles */}
          {!isNormal && (
            <>
              <button
                type="button"
                className={`layer-chip ${layers.track ? "active" : ""}`}
                onClick={() => {
                  toggleLayer("track");
                  toggleLayer("cone");
                }}
              >
                <span className="indicator cone-ind"></span>
                <span>TRACK</span>
              </button>

              <button
                type="button"
                className={`layer-chip ${layers.districts ? "active" : ""}`}
                onClick={() => toggleLayer("districts")}
              >
                <span className="indicator district-ind"></span>
                <span>RISK</span>
              </button>

              <button
                type="button"
                className={`layer-chip ${layers.infrastructure ? "active" : ""}`}
                onClick={() => toggleLayer("infrastructure")}
              >
                <span className="indicator infra-ind"></span>
                <span>INFRA</span>
              </button>

              <button
                type="button"
                className={`layer-chip ${layers.inundation ? "active" : ""}`}
                onClick={() => toggleLayer("inundation")}
              >
                <span className="indicator inun-ind"></span>
                <span>FLOOD</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="leaflet-map-host relative">
        <LeafletMap
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", minHeight: "560px" }}
        >
          {/* Smooth view animator */}
          <MapViewController center={mapCenter} zoom={mapZoom} />

          {/* Tactical OpenStreetMap Basemap Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* 36 States & UTs GeoJSON Layer (Normal Mode) */}
          {isNormal && layers.stateBoundaries && geoJsonData && (
            <GeoJSON
              key={`geojson-states-${selectedState?.id || "all"}`}
              data={geoJsonData}
              style={stateStyle}
              onEachFeature={onEachStateFeature}
            />
          )}

          {/* Active Synoptic System Marker (Normal Mode) */}
          {isNormal && ACTIVE_DEPRESSION_SYSTEM && ACTIVE_DEPRESSION_SYSTEM.centerLat && (
            <Marker
              position={[ACTIVE_DEPRESSION_SYSTEM.centerLat, ACTIVE_DEPRESSION_SYSTEM.centerLon]}
              icon={createDepressionIcon()}
            >
              <Popup>
                <div className="map-popup-card">
                  <div className="popup-title">
                    <span className="text-amber-800 font-bold">ACTIVE SYNOPTIC SYSTEM</span>
                    <span className="badge-provenance ml-2 text-xs">OBSERVED BULLETIN</span>
                  </div>
                  <div className="popup-stage font-semibold text-amber-700">
                    {ACTIVE_DEPRESSION_SYSTEM.name}
                  </div>
                  <div className="popup-details font-mono text-xs mt-1">
                    <div>Classification: <strong>{ACTIVE_DEPRESSION_SYSTEM.classification}</strong></div>
                    <div>Position: {ACTIVE_DEPRESSION_SYSTEM.centerLat}°N, {ACTIVE_DEPRESSION_SYSTEM.centerLon}°E</div>
                    <div>Max Sustained Wind: {ACTIVE_DEPRESSION_SYSTEM.maxWindKmh} km/h (Gusts {ACTIVE_DEPRESSION_SYSTEM.gustKmh} km/h)</div>
                    <div>Central Pressure: {ACTIVE_DEPRESSION_SYSTEM.centralPressureMb} hPa</div>
                    <div>Movement: {ACTIVE_DEPRESSION_SYSTEM.movement}</div>
                    <div className="mt-1 text-slate-500 text-[10px] border-t border-slate-200 pt-1">
                      {ACTIVE_DEPRESSION_SYSTEM.source}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Animated Meteorological Wind Vectors Canvas Layer */}
          {layers.windField && (
            <WindCanvasOverlay
              windPoints={weatherData?.windPoints || weatherData?.grid || []}
              visible={layers.windField}
              isActive={true}
            />
          )}

          {/* DISASTER MODE: Cyclone Remal Track & Swaths */}
          {!isNormal && layers.cone && coneCoords.length > 0 && (
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

          {!isNormal && layers.track && pastPathCoords.length > 1 && (
            <Polyline
              positions={pastPathCoords}
              pathOptions={{
                color: "#ea580c",
                weight: 3.5,
                opacity: 0.95
              }}
            />
          )}

          {!isNormal && layers.track && forecastPathCoords.length > 1 && (
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

          {!isNormal && (
            <Marker
              position={[current.latitude, current.longitude]}
              icon={createCycloneIcon(current.category)}
            >
              <Popup>
                <div className="map-popup-card">
                  <div className="popup-title">
                    <span className="text-red-600 font-bold">CYCLONE REMAL</span>
                    <span className="badge-provenance ml-2 text-xs">HISTORICAL SIMULATION</span>
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
          )}

          {/* District Risk Circles in Disaster Mode */}
          {layers.districts && !isNormal && districtsData.map((d) => {
            const isSelected = selectedDistrict?.id === d.id;
            const rawRisk = d.risk || {};
            const displayScore = rawRisk.riskScore || 0;
            const displayColor = rawRisk.color || "#0284c7";

            return (
              <React.Fragment key={d.id}>
                <Circle
                  center={[d.lat, d.lon]}
                  radius={28000}
                  pathOptions={{
                    color: displayColor,
                    fillColor: displayColor,
                    fillOpacity: isSelected ? 0.35 : 0.14,
                    weight: isSelected ? 2.5 : 1.2,
                    dashArray: isSelected ? undefined : "3 3"
                  }}
                  eventHandlers={{
                    click: () => onSelectDistrict(d)
                  }}
                >
                  <Tooltip direction="top" opacity={0.95}>
                    <div className="font-mono text-xs">
                      <strong>{d.name} ({d.state})</strong>
                      <br />Risk Score: <span style={{ color: displayColor, fontWeight: "bold" }}>${displayScore}/100</span>
                      <br />Surge Est: ${rawRisk.surgeMeters}m | Rain: ${rawRisk.rainMm24h}mm
                    </div>
                  </Tooltip>
                </Circle>

                <Marker
                  position={[d.lat, d.lon]}
                  icon={createDistrictIcon(d.name, displayScore, displayColor)}
                  eventHandlers={{
                    click: () => onSelectDistrict(d)
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* Wind Swaths (34kt, 50kt, 64kt) */}
          {layers.windField && !isNormal && windRadii.r34Km > 0 && (
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
                <span className="font-mono text-xs">34-Knot Swath: {windRadii.r34Km} km</span>
              </Tooltip>
            </Circle>
          )}

          {layers.windField && !isNormal && windRadii.r50Km > 0 && (
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
                <span className="font-mono text-xs">50-Knot Swath: {windRadii.r50Km} km</span>
              </Tooltip>
            </Circle>
          )}

          {layers.windField && !isNormal && windRadii.r64Km > 0 && (
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
                <span className="font-mono text-xs font-bold text-red-700">64-Knot Swath: {windRadii.r64Km} km</span>
              </Tooltip>
            </Circle>
          )}

          {/* Critical Infrastructure Markers in Disaster Mode */}
          {layers.infrastructure && !isNormal && infraData.map((asset) => {
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

        {/* Meteorological Wind Speed Legend Overlay */}
        {layers.windField && (
          <div
            className="wind-speed-legend"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 400,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "6px 10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              fontFamily: "monospace",
              fontSize: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontWeight: "bold", color: "#1e293b", marginBottom: "4px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Wind size={12} color="#0d9488" />
                <span>MODEL WIND</span>
              </div>
              <span style={{ fontSize: "9px", padding: "1px 4px", background: "#f0fdfa", color: "#115e59", border: "1px solid #ccfbf1", borderRadius: "2px", fontWeight: 600 }}>
                OPEN-METEO
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#334155", padding: "2px 0" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7" }} /> &lt;15
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> 15–30
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} /> 30–50
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ea580c" }} /> 50–70
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626" }} /> &gt;70
              </span>
            </div>
            <div style={{ fontSize: "9px", color: "#64748b", marginTop: "4px", borderTop: "1px solid #e2e8f0", paddingTop: "2px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>WIND SPEED (km/h)</span>
              <span>UPDATED {weatherData?.national?.updatedAt || "00:20 IST"}</span>
            </div>
          </div>
        )}

        {/* Map Truthful Provenance Watermark */}
        <div className="map-truthful-watermark">
          <span className="watermark-tag font-mono font-bold">
            {isNormal ? "PAN-INDIA SURVEILLANCE" : "CALIBRATED HISTORICAL EXERCISE"}
          </span>
          <span className="watermark-text font-mono">
            {isNormal
              ? "ALL 36 STATES & UTs MONITORED • DEPRESSION INFLUENCE IS DRISHTI DERIVED • MODEL: OPEN-METEO"
              : "REMAL 2024 • INUNDATION & SURGE METRICS ARE DERIVED SIMULATIONS — NOT LIVE FLOOD POLYGONS"}
          </span>
        </div>
      </div>
    </div>
  );
}
