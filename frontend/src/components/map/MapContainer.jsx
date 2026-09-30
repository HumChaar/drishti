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
import { useLanguage } from "../../language";

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

const createUserLocationIcon = () => {
  return L.divIcon({
    className: "user-loc-icon",
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,0.4);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createRouteDestinationIcon = (category = "HOSPITAL") => {
  const iconChar = category === "HOSPITAL" ? "✚" : category === "FIRE" ? "🚒" : category === "POLICE" ? "👮" : "🛟";
  const bg = category === "HOSPITAL" ? "#dc2626" : category === "FIRE" ? "#ea580c" : category === "POLICE" ? "#2563eb" : "#0d9488";
  return L.divIcon({
    className: "route-dest-icon",
    html: `
      <div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid #ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;font-weight:bold;">
        ${iconChar}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
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
  weatherData = null,
  focusedSystem = null,
  onResetFocus = null,
  activeRoute = null,
  userLocation = null,
  onClearRoute = null
}) {
  const { t } = useLanguage();
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

  // Determine dynamic map center & zoom based on operating mode, selected state, or focused synoptic system
  // Prompt requirement: Initial screen must show India, Arabian Sea, Bay of Bengal, Sri Lanka
  let mapCenter = [20.5937, 78.9629];
  let mapZoom = 5;
  if (activeRoute && userLocation && activeRoute.coordinates?.length > 0) {
    const dest = activeRoute.coordinates[activeRoute.coordinates.length - 1];
    mapCenter = [(userLocation.lat + dest[0]) / 2, (userLocation.lon + dest[1]) / 2];
    mapZoom = 13;
  } else if (focusedSystem && focusedSystem.latitude && focusedSystem.longitude) {
    mapCenter = [focusedSystem.latitude, focusedSystem.longitude];
    mapZoom = 7;
  } else if (isNormal) {
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

  // Lookup state match by name across 36 Indian States & UTs
  const getStateRecord = (geoName) => {
    if (!weatherData?.states) return null;
    const norm = normalizeStateName(geoName);
    const matchedState = STATES_AND_UTS.find((st) => {
      const sNorm = normalizeStateName(st.name);
      return sNorm === norm || sNorm.includes(norm) || norm.includes(sNorm);
    });
    if (matchedState) {
      let stateWeather = null;
      if (Array.isArray(weatherData.states)) {
        stateWeather = weatherData.states.find((s) => (s.stateId === matchedState.id || s.id === matchedState.id));
      } else if (weatherData.states[matchedState.id]) {
        stateWeather = weatherData.states[matchedState.id];
      }
      return { meta: matchedState, weather: stateWeather };
    }
    return null;
  };

  // Choropleth style function for 36 Indian States & UTs (Clean, unobtrusive baseline)
  const stateStyle = (feature) => {
    const stateName = feature.properties?.ST_NM || feature.properties?.NAME_1 || "";
    const isSelected = selectedState && normalizeStateName(selectedState.name) === normalizeStateName(stateName);

    return {
      fillColor: isSelected ? "#0284c7" : "transparent",
      weight: isSelected ? 2.5 : 1,
      opacity: 0.85,
      color: isSelected ? "#0369a1" : "#64748b",
      dashArray: isSelected ? undefined : "2 2",
      fillOpacity: isSelected ? 0.22 : 0
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
              color: "#0284c7",
              fillOpacity: 0.35
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
                color: isSelected ? "#0369a1" : "#64748b",
                fillOpacity: isSelected ? 0.22 : 0
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

      // State hover: State Meteorology (Wind, Rainfall, Pressure, Temperature, Source, Provenance, Checked time)
      if (!record?.weather || !record.weather.hasData) {
        layer.bindTooltip(
          `<div class="font-mono text-xs leading-tight p-2" style="background:#0f172a;color:#f8fafc;border-radius:4px;border:1px solid #334155;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:4px;border-bottom:1px solid #334155;margin-bottom:4px;">
              <strong style="color:#ffffff;font-size:11px;">${stateName}</strong>
              <span style="font-size:9px;padding:1px 4px;border-radius:2px;background:#334155;color:#94a3b8;font-weight:bold;">DATA UNAVAILABLE</span>
            </div>
            <div style="font-size:10px;color:#94a3b8;">TELEMETRY OFFLINE</div>
          </div>`,
          { sticky: true, opacity: 0.95 }
        );
      } else {
        const w = record.weather;
        const windSpeed = w.windSpeedKmph != null ? `${w.windSpeedKmph} km/h` : (w.windSpeed != null ? `${w.windSpeed} km/h` : "N/A");
        const dirLabel = w.windDirectionLabel || "";
        const rain = w.rainfallMm != null ? `${w.rainfallMm} mm` : (w.rain != null ? `${w.rain} mm` : "0.0 mm");
        const pressure = w.pressureHpa != null ? `${w.pressureHpa} hPa` : "N/A";
        const temp = w.temperatureC != null ? `${w.temperatureC} °C` : (w.temperature != null ? `${w.temperature} °C` : "N/A");
        const distanceToSys = w.distanceToSystemKm;
        const checkedTime = w.checkedAt || "IST";

        layer.bindTooltip(
          `<div class="font-mono text-xs leading-tight p-2" style="background:#0f172a;color:#f8fafc;border-radius:4px;border:1px solid #334155;min-width:180px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:4px;border-bottom:1px solid #334155;margin-bottom:6px;">
              <strong style="color:#38bdf8;font-size:11.5px;">${stateName}</strong>
              <span style="font-size:9px;padding:1px 4px;border-radius:2px;background:#1e3a8a;color:#93c5fd;border:1px solid #3b82f6;font-weight:bold;">MODEL</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;font-size:10.5px;color:#e2e8f0;">
              <div>Wind: <strong style="color:#ffffff;">${windSpeed} ${dirLabel}</strong></div>
              <div>Rainfall: <strong style="color:#ffffff;">${rain}</strong></div>
              <div>Pressure: <strong style="color:#ffffff;">${pressure}</strong></div>
              <div>Temperature: <strong style="color:#ffffff;">${temp}</strong></div>
              ${distanceToSys != null ? `<div style="color:#f59e0b;font-weight:bold;border-top:1px solid #334155;padding-top:3px;margin-top:2px;">Distance to System: ${distanceToSys} km <span style="font-size:8.5px;color:#fbbf24;font-weight:normal;">(DERIVED)</span></div>` : ''}
            </div>
            <div style="margin-top:6px;padding-top:4px;border-top:1px solid #334155;display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#94a3b8;">
              <span>OPEN-METEO</span>
              <span>${checkedTime}</span>
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

          {(focusedSystem || (isNormal && weatherData?.activeSystem?.hasActiveSystem && weatherData.activeSystem.liveStatus === "LIVE" && weatherData.activeSystem.latitude != null)) && (() => {
            const sys = focusedSystem || weatherData?.activeSystem;
            if (!sys || sys.latitude == null || sys.longitude == null || sys.coordinatesFormatted === "NOT VERIFIED" || sys.liveStatus === "SOURCE_UNAVAILABLE") return null;
            return (
              <Marker
                key={`system-marker-${sys.latitude}-${sys.longitude}`}
                position={[sys.latitude, sys.longitude]}
                icon={createDepressionIcon()}
              >
                <Popup autoPan={false}>
                  <div className="map-popup-card" style={{ minWidth: "220px", fontFamily: "monospace" }}>
                    <div className="popup-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ color: "#d97706", fontWeight: "bold", fontSize: "11px" }}>
                        [{sys.classification || "DEPRESSION"}]
                      </span>
                      <span className="badge-provenance text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                        {sys.provenance || (sys.liveStatus === "LIVE" ? "OBSERVED" : "DEMO / SIMULATED")}
                      </span>
                    </div>
                    <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "12px", marginTop: "4px" }}>
                      {sys.name}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#334155", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div><strong>Coordinates:</strong> {sys.coordinatesFormatted || `${sys.latitude}°N, ${sys.longitude}°E`}</div>
                      <div><strong>Latitude:</strong> {sys.latitudeFormatted || `${sys.latitude}° N`}</div>
                      <div><strong>Longitude:</strong> {sys.longitudeFormatted || `${sys.longitude}° E`}</div>
                      {sys.maxWindKmph && (
                        <div><strong>Max Sustained Wind:</strong> {sys.maxWindKmph} km/h</div>
                      )}
                      {sys.centralPressureHpa && (
                        <div><strong>Central Pressure:</strong> {sys.centralPressureHpa} hPa</div>
                      )}
                      {sys.movementDescription && (
                        <div><strong>Movement:</strong> {sys.movementDescription}</div>
                      )}
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                        {sys.source}
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })()}

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

          {/* Active OSRM Road Route Layer */}
          {activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0 && (
            <>
              <Polyline
                positions={activeRoute.coordinates}
                pathOptions={{
                  color: "#2563eb",
                  weight: 5,
                  opacity: 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                  dashArray: activeRoute.isFallback ? "8 8" : undefined
                }}
              />
              {userLocation && (
                <Marker
                  position={[userLocation.lat, userLocation.lon]}
                  icon={createUserLocationIcon()}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <div className="font-mono text-[10px] font-bold">MY LOCATION</div>
                  </Tooltip>
                </Marker>
              )}
              {activeRoute.destinationCoords && (
                <Marker
                  position={[activeRoute.destinationCoords.lat, activeRoute.destinationCoords.lon]}
                  icon={createRouteDestinationIcon(activeRoute.destinationCategory)}
                >
                  <Popup autoPan={false}>
                    <div className="map-popup-card font-mono" style={{ minWidth: "180px" }}>
                      <strong className="text-slate-900 block text-xs">{activeRoute.destinationName}</strong>
                      <div className="text-[11px] text-blue-700 font-bold mt-1">
                        {activeRoute.distanceFormatted} • ETA {activeRoute.durationFormatted}
                      </div>
                      <div className="text-[9.5px] text-slate-500 mt-1 border-t border-slate-200 pt-1">
                        {activeRoute.provenance}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </>
          )}
        </LeafletMap>

        {/* Active Route Floating HUD Banner */}
        {activeRoute && (
          <div
            className="active-route-hud"
            style={{
              position: "absolute",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 450,
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid #3b82f6",
              borderRadius: "6px",
              padding: "8px 14px",
              color: "#f8fafc",
              fontFamily: "monospace",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", display: "inline-block", boxShadow: "0 0 6px #3b82f6" }} />
                <span style={{ fontSize: "9px", color: "#93c5fd", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  ROUTE
                </span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {activeRoute.destinationName}
              </div>
              <div style={{ fontSize: "10.5px", color: "#60a5fa", fontWeight: 700 }}>
                {activeRoute.distanceFormatted} • {activeRoute.durationFormatted}
              </div>
            </div>

            {onClearRoute && (
              <button
                type="button"
                onClick={onClearRoute}
                style={{
                  background: "#dc2626",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "3px",
                  padding: "4px 9px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "9.5px",
                  fontFamily: "monospace",
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap"
                }}
                title="Clear route from map"
              >
                CLEAR ROUTE
              </button>
            )}
          </div>
        )}

        {/* Focused Synoptic System Floating Indicator & Reset Control */}
        {focusedSystem && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "60px",
              zIndex: 400,
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid #f59e0b",
              borderRadius: "6px",
              padding: "6px 12px",
              color: "#f8fafc",
              fontFamily: "monospace",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", display: "inline-block", boxShadow: "0 0 6px #f59e0b" }} />
              <span>
                FOCUSED: <strong>{focusedSystem.classification}</strong> ({focusedSystem.coordinatesFormatted || `${focusedSystem.latitude}°N, ${focusedSystem.longitude}°E`})
              </span>
            </div>
            {onResetFocus && (
              <button
                type="button"
                onClick={onResetFocus}
                style={{
                  background: "#d97706",
                  border: "none",
                  borderRadius: "3px",
                  color: "#0f172a",
                  fontWeight: "bold",
                  padding: "3px 8px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontFamily: "monospace"
                }}
                title="Return to full India synoptic overview"
              >
                {t("RETURN TO NATIONAL VIEW")}
              </button>
            )}
          </div>
        )}

        {/* Meteorological Wind Speed Legend Overlay */}
        {layers.windField && (
          <div
            className="wind-speed-legend"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 400,
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid #334155",
              borderRadius: "4px",
              padding: "6px 10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              fontFamily: "monospace",
              fontSize: "10px",
              color: "#f8fafc"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontWeight: "bold", marginBottom: "4px", borderBottom: "1px solid #334155", paddingBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Wind size={12} color="#06b6d4" />
                <span style={{ color: "#f8fafc" }}>{t("WIND SPEED (km/h)")}</span>
              </div>
              <span style={{ fontSize: "9px", padding: "1px 4px", background: "#1e3a8a", color: "#93c5fd", border: "1px solid #3b82f6", borderRadius: "2px", fontWeight: 600 }}>
                {t("MODEL • OPEN-METEO")}
              </span>
            </div>
            {weatherData?.windPoints && weatherData.windPoints.length > 0 ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cbd5e1", padding: "2px 0" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284c7" }} /> 0–20
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> 20–40
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} /> 40–60
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc2626" }} /> 60+
                  </span>
                </div>
                <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "4px", borderTop: "1px solid #334155", paddingTop: "2px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{t("10m Model Vectors")}</span>
                  <span>{weatherData?.nationalSummary?.maxWindState ? `PEAK: ${weatherData.nationalSummary.maxWindState.windSpeedKmph} km/h ${weatherData.nationalSummary.maxWindState.windDirectionLabel || ""}` : t("MODEL ACTIVE")}</span>
                </div>
              </>
            ) : (
              <div style={{ color: "#f87171", fontWeight: "bold", padding: "3px 0" }}>
                {t("DATA UNAVAILABLE")}
              </div>
            )}
          </div>
        )}

        {/* Map Truthful Provenance Watermark */}
        <div className="map-truthful-watermark">
          <span className="watermark-tag font-mono font-bold">
            {t(isNormal ? "PAN-INDIA SURVEILLANCE" : "CALIBRATED HISTORICAL EXERCISE")}
          </span>
          <span className="watermark-text font-mono">
            {t(isNormal
              ? "ALL 36 STATES & UTs MONITORED • LIVE WEATHER: OPEN-METEO (MODEL) • BULLETINS: DEMO / SIMULATED"
              : "HISTORICAL SIMULATION — CYCLONE REMAL 2024 • INUNDATION & SURGE METRICS ARE DERIVED SIMULATIONS — NOT LIVE FLOOD POLYGONS")}
          </span>
        </div>
      </div>
    </div>
  );
}
