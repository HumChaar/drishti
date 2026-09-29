import React, { useState, useEffect, useCallback } from "react";
import {
  Satellite,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Info,
  Clock,
  Compass,
  X,
  FileText,
  Activity,
  Wind,
  Gauge,
  Navigation
} from "lucide-react";
import {
  SATELLITE_PRODUCTS,
  OFFICIAL_SATELLITE_PORTALS,
  getCachedProductMeta,
  setCachedProductMeta,
  getCurrentISTTime
} from "../../services/satelliteService";
import {
  fetchActiveSynopticSystems,
  OFFICIAL_CYCLONE_PORTALS
} from "../../services/synopticSystemService";

// Re-export for any modules importing from SatellitePanel
export { SATELLITE_PRODUCTS };

/**
 * DRISHTI Official Satellite Intelligence Panel (Stage 2A)
 *
 * SOURCING CLASSIFICATION:
 * - SOURCE: IMD / INSAT-3DS (with MOSDAC / ISRO references)
 * - STATUS: OBSERVED
 * - PROVENANCE: OBSERVED
 *
 * Strict Architecture Compliance:
 * - 100% remote official imagery; zero bundled rasters or archives.
 * - Viewport responsive containment with object-fit: contain; zero distortion, zero cropping.
 * - Authoritative IMD active depression detection & dual-view map integration.
 * - Transparent status tagging: LIVE only when retrieved; LAST_VERIFIED when CORS blocks client fetch.
 * - Never guesses uncalibrated raster bounds.
 */
export default function SatellitePanel({
  onClose,
  onLocateOnMap,
  _overlayOpacity = 0.6,
  _onOpacityChange,
  _isOverlayActive = false,
  _onToggleOverlay
}) {
  const [selectedProduct, setSelectedProduct] = useState(SATELLITE_PRODUCTS[0]);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState(() => getCurrentISTTime());
  const [cacheBuster, setCacheBuster] = useState(() => Date.now());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Active synoptic system detection state
  const [synopticData, setSynopticData] = useState(null);
  const [synopticLoading, setSynopticLoading] = useState(false);

  // Fetch active system intelligence from official IMD sources
  const loadSynopticSystems = useCallback(async () => {
    setSynopticLoading(true);
    try {
      const data = await fetchActiveSynopticSystems();
      setSynopticData(data);
    } catch (err) {
      console.warn("Synoptic system fetch error:", err);
    } finally {
      setSynopticLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSynopticSystems();
  }, [loadSynopticSystems]);

  // Switch products and check in-memory cache
  const handleSelectProduct = useCallback((product) => {
    if (product.id === selectedProduct.id) return;
    setSelectedProduct(product);
    setImageLoading(true);
    setImageError(false);

    const cached = getCachedProductMeta(product.id);
    if (cached) {
      if (cached.status === "ERROR") {
        setImageError(true);
        setImageLoading(false);
      }
    }
  }, [selectedProduct.id]);

  // Manual image refresh handler
  const handleManualImageRefresh = useCallback(() => {
    setImageLoading(true);
    setImageError(false);
    const now = Date.now();
    setCacheBuster(now);
    const newChecked = getCurrentISTTime();
    setLastCheckedTime(newChecked);

    setCachedProductMeta(selectedProduct.id, {
      status: "CHECKING",
      lastChecked: newChecked
    });
  }, [selectedProduct.id]);

  // Image load callbacks
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    setCachedProductMeta(selectedProduct.id, {
      status: "OBSERVED",
      lastChecked: lastCheckedTime
    });
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    setCachedProductMeta(selectedProduct.id, {
      status: "ERROR",
      lastChecked: lastCheckedTime
    });
  };

  // Conservative 15-minute auto-refresh interval for satellite image
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      handleManualImageRefresh();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, handleManualImageRefresh]);

  const currentImageUrl = `${selectedProduct.imageUrl}?t=${cacheBuster}`;
  const primarySystem = synopticData?.primarySystem || null;
  const isSystemLive = synopticData?.liveStatus === "LIVE" && synopticData?.hasActiveSystem && primarySystem != null && primarySystem.latitude != null;

  return (
    <div
      className="satellite-operational-panel bg-slate-900 text-slate-100 rounded-lg border border-slate-700 shadow-2xl overflow-hidden"
      role="region"
      aria-label="Satellite Intelligence Command Center"
    >
      {/* 1. Header Bar: Title, Sourcing Provenance & Window Controls */}
      <div className="satellite-header flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Satellite size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-100">
                SATELLITE INTELLIGENCE
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                • INSAT-3DS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              SOURCE: IMD / INSAT-3DS • SPACE APPLICATIONS CENTRE (ISRO)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-provenance text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono font-bold tracking-wide">
            STATUS: OBSERVED
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              title="Close Satellite Intelligence Panel"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Product Selector Tabs */}
      <div className="satellite-tabs px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {SATELLITE_PRODUCTS.map((prod) => {
          const isActive = selectedProduct.id === prod.id;
          return (
            <button
              key={prod.id}
              type="button"
              onClick={() => handleSelectProduct(prod)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? "bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400"
                  : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
              }`}
            >
              <span>{prod.shortName}</span>
              {prod.category === "Rapid Scan" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Rapid Scan Mode" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Main Satellite Viewport Box (Responsive Fit, object-fit: contain, zero distortion) */}
      <div className="satellite-viewport-box">
        {/* Loading Spinner / Skeleton */}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center gap-2.5">
            <RefreshCw size={24} className="text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-slate-300">
              CONNECTING TO OFFICIAL IMD SATELLITE STREAM...
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {selectedProduct.name}
            </span>
          </div>
        )}

        {/* Live Satellite Raster Display */}
        {!imageError ? (
          <div className="satellite-image-viewport">
            <img
              key={currentImageUrl}
              src={currentImageUrl}
              alt={`INSAT-3DS ${selectedProduct.name}`}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`satellite-image transition-opacity duration-300 ${
                imageLoading ? "opacity-0" : "opacity-100"
              }`}
            />
          </div>
        ) : (
          /* High-Integrity Error State when direct stream is blocked or unavailable */
          <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center border border-slate-800">
            <div className="p-3 bg-red-950/60 rounded-full border border-red-800/80 mb-2.5 text-red-400">
              <AlertTriangle size={28} />
            </div>
            <div className="text-xs font-bold font-mono text-red-300 tracking-wider mb-1">
              SATELLITE DATA UNAVAILABLE
            </div>
            <p className="text-[11px] font-mono text-slate-400 max-w-md mb-3 leading-relaxed">
              Official satellite imagery could not be retrieved directly from the remote IMD endpoint.
              Direct browser access may be constrained by network connectivity or server maintenance.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={OFFICIAL_SATELLITE_PORTALS.IMD_SATELLITE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              >
                <span>OPEN IMD SATELLITE</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={OFFICIAL_SATELLITE_PORTALS.IMD_RAPID_SCAN.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <span>OPEN IMD RAPID SCAN</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={OFFICIAL_SATELLITE_PORTALS.MOSDAC_INSAT3DS.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <span>OPEN MOSDAC</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Viewport Floating HUD Overlays */}
        {!imageError && !imageLoading && (
          <>
            {/* Top-Left: Active System HUD Annotation Marker (Only when officially LIVE and verified) */}
            {isSystemLive && (
              <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-2 max-w-[85%]">
                <div className="px-2.5 py-1.5 rounded bg-black/85 backdrop-blur-md border border-amber-500/80 text-[11px] font-mono text-amber-300 shadow-xl flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-200 tracking-wider">
                        ACTIVE SYSTEM: {primarySystem.classification}
                      </span>
                      <span className="px-1 py-0.2 bg-amber-950/80 border border-amber-700/60 rounded text-[9px] text-amber-400 font-bold">
                        {primarySystem.coordinatesFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {onLocateOnMap && (
                  <button
                    type="button"
                    onClick={() => onLocateOnMap(primarySystem)}
                    className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-mono text-[10.5px] flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
                    title="Center and view exact coordinates on Leaflet Operational Map"
                  >
                    <Compass size={13} className="text-slate-950" />
                    <span>LOCATE ON MAP</span>
                  </button>
                )}
              </div>
            )}

            {/* Top-Right: Product Sector & Check Timestamp */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
              <div className="px-2 py-1 rounded bg-black/80 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow">
                <span>{selectedProduct.shortName} • {selectedProduct.sector}</span>
              </div>
              <div className="px-2 py-1 rounded bg-black/80 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 shadow">
                <Clock size={10} className="text-cyan-400" />
                <span>CHECKED: {lastCheckedTime}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Intelligence Dossier: Active Meteorological System Card & Product Specs */}
      <div className="p-3 bg-slate-950 flex flex-col gap-2.5 overflow-y-auto max-h-[38vh]">
        {/* Dual Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Column A: Authoritative Active Meteorological System Card (Sections 2, 4, 5, 9, 10, 14) */}
          <div className="md:col-span-7 p-3 bg-slate-900/90 rounded border border-amber-900/50 flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-amber-900/40 pb-1.5">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-amber-400 shrink-0" />
                <span className="font-bold text-slate-100 text-[11.5px] tracking-wide">
                  ACTIVE METEOROLOGICAL SYSTEM
                </span>
              </div>

              {/* Live Status Badge */}
              {synopticData?.liveStatus === "LIVE" ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[9.5px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE / IMD OBSERVED</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-800/60 text-[9.5px] font-bold flex items-center gap-1">
                  <AlertTriangle size={10} className="text-amber-400" />
                  <span>IMD SYSTEM FEED: SOURCE UNAVAILABLE</span>
                </span>
              )}
            </div>

            {isSystemLive && primarySystem ? (
              <>
                {/* System Name & Classification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-slate-950 font-bold text-[11px] tracking-wider">
                      [{primarySystem.classification}]
                    </span>
                    <span className="font-bold text-slate-200 text-xs">
                      {primarySystem.name}
                    </span>
                  </div>
                </div>

                {/* Location & Precise Coordinates */}
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[9.5px]">LOCATION / SECTOR:</span>
                    <span className="text-slate-200 font-semibold">
                      {primarySystem.locationDescription || "Indian Subcontinent & Oceanic Basins"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9.5px]">SYSTEM COORDINATES:</span>
                    <span className="text-amber-300 font-bold text-xs">
                      {primarySystem.coordinatesFormatted}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9.5px]">LATITUDE / LONGITUDE:</span>
                    <span className="text-slate-300 font-bold">
                      {primarySystem.latitudeFormatted} • {primarySystem.longitudeFormatted}
                    </span>
                  </div>
                </div>

                {/* Intensity, Pressure, Movement & Observation */}
                <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                  <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-1 text-slate-400 text-[9px] mb-0.5">
                      <Wind size={10} className="text-teal-400" />
                      <span>MAX WIND</span>
                    </div>
                    <div className="font-bold text-teal-300">
                      {primarySystem.maxWindKmph ? `${primarySystem.maxWindKmph} km/h` : "Not reported"}
                    </div>
                    {primarySystem.gustKmph && (
                      <div className="text-[9px] text-slate-400">Gusts: {primarySystem.gustKmph} km/h</div>
                    )}
                  </div>

                  <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-1 text-slate-400 text-[9px] mb-0.5">
                      <Gauge size={10} className="text-blue-400" />
                      <span>PRESSURE</span>
                    </div>
                    <div className="font-bold text-blue-300">
                      {primarySystem.pressureHpa ? `${primarySystem.pressureHpa} hPa` : "Not reported"}
                    </div>
                    <div className="text-[9px] text-slate-400">Central core</div>
                  </div>

                  <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-1 text-slate-400 text-[9px] mb-0.5">
                      <Navigation size={10} className="text-amber-400" />
                      <span>MOVEMENT</span>
                    </div>
                    <div className="font-bold text-amber-300 truncate">
                      {primarySystem.movementDescription || "Monitoring"}
                    </div>
                    <div className="text-[9px] text-slate-400">Synoptic vector</div>
                  </div>
                </div>

                {/* Sourcing & Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400">
                    <span>Observation: <strong className="text-slate-200">{primarySystem.observationTime}</strong></span>
                    <span className="mx-1.5">•</span>
                    <span>Source: <strong className="text-slate-300">{primarySystem.source}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onLocateOnMap && (
                      <button
                        type="button"
                        onClick={() => onLocateOnMap(primarySystem)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded font-bold text-[10.5px] flex items-center gap-1 shadow transition-colors"
                        title="Center Leaflet operational map on active system coordinates"
                      >
                        <Compass size={12} />
                        <span>LOCATE ON MAP</span>
                      </button>
                    )}

                    <a
                      href={primarySystem.sourceUrl || OFFICIAL_CYCLONE_PORTALS.PRIMARY_CYCLONE_INFO.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10.5px] flex items-center gap-1 transition-colors"
                      title="Open official IMD Cyclone Information portal"
                    >
                      <span>OPEN IMD SOURCE</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-900/60 font-bold text-[11px] tracking-wider">
                    [IMD SYSTEM FEED]
                  </span>
                  <span className="font-bold text-slate-300 text-xs">
                    SOURCE UNAVAILABLE
                  </span>
                </div>

                {/* Coordinates & Observation NOT VERIFIED */}
                <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">SYSTEM COORDINATES:</span>
                    <span className="text-slate-400 font-bold text-xs">
                      NOT VERIFIED
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[9.5px]">OBSERVATION:</span>
                    <span className="text-slate-400 font-bold text-xs">
                      NOT VERIFIED
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      DRISHTI CHECKED: <strong className="text-cyan-300">{synopticData?.checkedAt || lastCheckedTime}</strong>
                    </span>
                    <span className="text-slate-500">PROVENANCE: UNAVAILABLE</span>
                  </div>
                </div>

                {/* Sourcing Transparency Notice & Direct Link */}
                <div className="p-2 bg-slate-950/60 rounded border border-slate-800/80 text-[10px] text-slate-400 flex flex-col gap-2">
                  <span>Direct IMD bulletin web access is blocked by browser CORS. Official live system observation and coordinates cannot be verified client-side without an official proxy.</span>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <a
                      href={OFFICIAL_CYCLONE_PORTALS.PRIMARY_CYCLONE_INFO.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded font-bold text-[10.5px] flex items-center gap-1 transition-colors"
                      title="Open official IMD Cyclone Information portal"
                    >
                      <span>OPEN OFFICIAL IMD BULLETIN</span>
                      <ExternalLink size={10} />
                    </a>
                    <button
                      type="button"
                      onClick={loadSynopticSystems}
                      disabled={synopticLoading}
                      className="text-amber-400 hover:underline flex items-center gap-1 text-[10px] font-bold"
                    >
                      <RefreshCw size={9} className={synopticLoading ? "animate-spin" : ""} />
                      <span>Re-check Feed</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column B: Selected Satellite Product Specifications & Controls */}
          <div className="md:col-span-5 p-3 bg-slate-900/90 rounded border border-slate-800 flex flex-col justify-between gap-2 font-mono text-xs">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-200 text-[11.5px]">
                  SATELLITE PRODUCT SPECS
                </span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {selectedProduct.shortName}
                </span>
              </div>

              <div className="space-y-1.5 text-[10.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">PRODUCT:</span>
                  <span className="font-bold text-slate-200">{selectedProduct.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SENSOR:</span>
                  <span className="text-slate-300">{selectedProduct.sensor} ({selectedProduct.resolution})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">WAVELENGTH:</span>
                  <span className="text-slate-300">{selectedProduct.wavelength}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ACQUISITION:</span>
                  <span className="text-cyan-300 font-semibold">{selectedProduct.acquisitionNote}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">DRISHTI CHECKED:</span>
                  <span className="text-slate-300">{lastCheckedTime}</span>
                </div>
              </div>
            </div>

            {/* Spatial Bounds Adherence Note (Section 7) */}
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800/80 text-[9.5px] text-slate-400 leading-relaxed flex items-start gap-1.5">
              <Info size={11} className="text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300">Geographic Spatial Bounds:</strong> IMD composite rasters lack published georeferencing matrices. In strict compliance with DRISHTI rules (NEVER GUESS IMAGE BOUNDS), exact coordinates are plotted on the Leaflet operational map.
              </div>
            </div>

            {/* Satellite Actions */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleManualImageRefresh}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 text-[10.5px] transition-colors"
                  title="Re-check current satellite stream"
                >
                  <RefreshCw size={10} className="text-cyan-400" />
                  <span>Refresh Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                  className={`px-1.5 py-1 rounded text-[9.5px] font-bold border transition-colors ${
                    autoRefreshEnabled
                      ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                  title="Toggle conservative 15-minute background refresh"
                >
                  {autoRefreshEnabled ? "Auto (15m): ON" : "Auto: OFF"}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href={selectedProduct.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-[10.5px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                  title="Open full-resolution image in new tab"
                >
                  <span>FULL IMAGE</span>
                  <ExternalLink size={10} />
                </a>

                <a
                  href={selectedProduct.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10.5px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
                  title="Open official IMD portal page"
                >
                  <span>IMD PORTAL</span>
                  <ExternalLink size={10} />
                </a>

                {selectedProduct.officialPdfUrl && (
                  <a
                    href={selectedProduct.officialPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[10.5px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
                    title="Download Official IMD Bulletin PDF"
                  >
                    <FileText size={10} />
                    <span>PDF</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Provenance Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] font-mono text-slate-500">
          <span>Satellite observation • IMD / INSAT-3DS</span>
          <div className="flex items-center gap-3">
            <a
              href={OFFICIAL_SATELLITE_PORTALS.MOSDAC_INSAT3DS.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400/80 hover:text-cyan-300 hover:underline flex items-center gap-1"
            >
              <span>MOSDAC / ISRO</span>
              <ExternalLink size={9} />
            </a>
            <span className="text-slate-600">•</span>
            <a
              href={OFFICIAL_SATELLITE_PORTALS.IMD_SATELLITE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400/80 hover:text-cyan-300 hover:underline flex items-center gap-1"
            >
              <span>IMD MAUSAM</span>
              <ExternalLink size={9} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
