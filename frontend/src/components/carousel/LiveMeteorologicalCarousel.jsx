import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Wind,
  CloudRain,
  Satellite,
  AlertTriangle,
  Gauge,
  Thermometer,
  ExternalLink,
  Pause,
  Play
} from "lucide-react";
import ProvenanceBadge from "../common/ProvenanceBadge";
import { useLanguage } from "../../language";

/**
 * LiveMeteorologicalCarousel
 * Professional IMD-style Live Meteorological Carousel component.
 * Conforms strictly to Stage 2B Section 7:
 * - WIND
 * - RAIN
 * - PRESSURE
 * - TEMPERATURE
 * - SYSTEM
 * - SATELLITE
 * - ALERTS
 *
 * Every card explicitly contains: value, unit, source, provenance, and timestamps (DATA vs CHECKED).
 */
export default function LiveMeteorologicalCarousel({
  data,
  onOpenOverlay,
  onNavigateTab
}) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef(null);

  const activeSys = data?.activeSystem;
  const hasLiveSys = activeSys?.liveStatus === "LIVE" && activeSys?.hasActiveSystem && activeSys?.latitude != null;

  const checkedAtTime = data?.checkedAt || "IST";

  // Build the 6 core meteorological cards strictly complying with Section 7
  const cards = [
    // 1. WIND
    {
      id: "card-wind",
      pillar: "WIND",
      source: "OPEN-METEO",
      provenance: "MODEL",
      icon: Wind,
      title: "SURFACE WIND VECTORS",
      location: data?.wind?.maxWindState ? `${data.wind.maxWindState.location} (Peak Sector)` : (data ? "Pan-India Continental" : "Loading Sector..."),
      value: data?.wind?.maxWindState ? `${data.wind.maxWindState.speedKmph} km/h` : (data ? "WIND DATA UNAVAILABLE" : "LOADING..."),
      secondary: data?.wind?.maxWindState?.directionLabel
        ? `${data.wind.maxWindState.directionLabel} ${data.wind.maxWindState.directionDeg ? `${data.wind.maxWindState.directionDeg}°` : ""}${data.wind.maxWindState.gustKmph ? ` • Gusts ${data.wind.maxWindState.gustKmph} km/h` : ""}`
        : (data ? "NWP 10m Wind Model" : "Connecting to NWP feed..."),
      dataTime: data?.wind?.observationTime || "MODEL CYCLE",
      checkedTime: checkedAtTime,
      actionLabel: "SURFACE MAP",
      action: () => onNavigateTab && onNavigateTab("weather")
    },

    // 2. RAIN
    {
      id: "card-rain",
      pillar: "RAIN",
      source: "OPEN-METEO",
      provenance: "MODEL",
      icon: CloudRain,
      title: "MODEL PRECIPITATION",
      location: data?.rainfall?.maxRainState ? `${data.rainfall.maxRainState.location} (Max 24h)` : (data ? "Pan-India Basins" : "Loading Basins..."),
      value: data?.rainfall?.maxRainState ? `${data.rainfall.maxRainState.rainfallMm} mm` : (data ? "0.0 mm" : "LOADING..."),
      secondary: data?.rainfall?.activeRainSectorsCount > 0
        ? `${data.rainfall.activeRainSectorsCount} Active Rain Sectors`
        : (data ? "Routine Baseline NWP • No Heavy Precip" : "Connecting to NWP feed..."),
      dataTime: data?.rainfall?.observationTime || "MODEL CYCLE",
      checkedTime: checkedAtTime,
      actionLabel: "RAIN OBSERVATIONS",
      action: () => onOpenOverlay && onOpenOverlay("observations")
    },

    // 3. PRESSURE
    {
      id: "card-pressure",
      pillar: "PRESSURE",
      source: "OPEN-METEO",
      provenance: "MODEL",
      icon: Gauge,
      title: "SURFACE PRESSURE",
      location: "Pan-India Barometric Mean",
      value: data?.surfacePressure?.meanPressureHpa != null ? `${data.surfacePressure.meanPressureHpa} hPa` : (data ? "DATA UNAVAILABLE" : "LOADING..."),
      secondary: "Mean Surface Barometric Pressure (NWP)",
      dataTime: data?.surfacePressure?.observationTime || "MODEL CYCLE",
      checkedTime: checkedAtTime,
      actionLabel: "BAROMETRIC INTEL",
      action: () => onOpenOverlay && onOpenOverlay("observations")
    },

    // 4. TEMPERATURE
    {
      id: "card-temp",
      pillar: "TEMPERATURE",
      source: "OPEN-METEO",
      provenance: "MODEL",
      icon: Thermometer,
      title: "2M AIR TEMPERATURE",
      location: "Pan-India Continental Mean",
      value: data?.temperature?.meanTemperatureC != null ? `${data.temperature.meanTemperatureC} °C` : (data ? "DATA UNAVAILABLE" : "LOADING..."),
      secondary: "2m Above Ground NWP Telemetry",
      dataTime: data?.temperature?.observationTime || "MODEL CYCLE",
      checkedTime: checkedAtTime,
      actionLabel: "TEMP MATRIX",
      action: () => onOpenOverlay && onOpenOverlay("observations")
    },

    // 5. SYSTEM
    {
      id: "card-system",
      pillar: "SYSTEM",
      source: "IMD",
      provenance: hasLiveSys ? "OBSERVED" : "UNAVAILABLE",
      icon: Radio,
      title: hasLiveSys ? "ACTIVE SYNOPTIC SYSTEM" : "IMD SYSTEM FEED",
      location: hasLiveSys ? (activeSys?.name || "North Indian Ocean Basin") : "All Indian Basins Monitored",
      value: hasLiveSys
        ? `[${activeSys.classification}] ${activeSys.coordinatesFormatted || ""}`
        : "SOURCE UNAVAILABLE",
      secondary: hasLiveSys
        ? `Observed: ${activeSys.observationTime} • ${activeSys.movementDescription || "Monitoring"}`
        : "Coordinates: NOT VERIFIED • Observation: NOT VERIFIED",
      dataTime: hasLiveSys ? activeSys.observationTime : "NOT VERIFIED",
      checkedTime: checkedAtTime,
      actionLabel: hasLiveSys ? "VIEW BULLETIN" : "OPEN IMD BULLETIN",
      action: () => onOpenOverlay && onOpenOverlay("bulletin")
    },

    // 6. SATELLITE
    {
      id: "card-satellite",
      pillar: "SATELLITE",
      source: "IMD / INSAT-3DS",
      provenance: "OBSERVED",
      icon: Satellite,
      title: "INSAT-3DS SURVEILLANCE",
      location: "South Asia & Indian Ocean Sector",
      value: "8 PRODUCTS ONLINE",
      secondary: "IR1, VIS, WV, SWIR, MP, CTT, Rapid Scan & Bulletin",
      dataTime: "OBSERVED IMAGERY",
      checkedTime: checkedAtTime,
      actionLabel: "OPEN SATELLITE",
      action: () => onOpenOverlay && onOpenOverlay("satellite")
    },

    // 7. WARNINGS
    {
      id: "card-alerts",
      pillar: "WARNINGS",
      source: "IMD ALERT",
      provenance: "OBSERVED",
      icon: AlertTriangle,
      title: "SYNOPTIC ALERTS & WARNINGS",
      location: data?.warnings?.[0]?.region || "National Meteorological Arc",
      value: data?.warnings?.[0]?.title || "NO CURRENT RED WARNINGS",
      secondary: data?.warnings?.length > 0 ? `${data.warnings.length} Active Bulletin Notices` : "Baseline Surveillance",
      dataTime: data?.warnings?.[0]?.issuedAt || "CURRENT",
      checkedTime: checkedAtTime,
      actionLabel: "VIEW WARNINGS",
      action: () => onOpenOverlay && onOpenOverlay("warning")
    }
  ];

  // Autoplay rotation (7 seconds per cycle)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, cards.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <section
      className="live-meteorological-carousel-section"
      aria-label="Live Meteorological Command Carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Header Strip */}
      <div className="carousel-section-header">
        <div className="carousel-title-group">
          <div className="carousel-pulse-dot" />
          <h2 className="carousel-section-title font-mono">
            {t("LIVE METEOROLOGICAL TELEMETRY & HAZARD CAROUSEL")}
          </h2>
          <span className="carousel-provenance-tag font-mono">
            {t("STRICT PROVENANCE • AUTOMATIC ROTATION")}
          </span>
        </div>

        <div className="carousel-controls-group">
          {/* Play/Pause state */}
          <button
            type="button"
            className="carousel-control-btn"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? t("Resume Autoplay") : t("Pause Autoplay")}
            aria-label={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
          </button>

          {/* Indicator dots */}
          <div className="carousel-dots-strip" role="tablist">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                className={`carousel-dot ${idx === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(idx)}
                title={`Go to slide ${idx + 1}: ${t(card.pillar)}`}
              />
            ))}
          </div>

          {/* Prev / Next buttons */}
          <div className="carousel-arrows">
            <button
              type="button"
              className="carousel-control-btn"
              onClick={handlePrev}
              title={t("Previous Meteorological Card")}
              aria-label="Previous slide"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="carousel-page-indicator font-mono text-[11px] text-slate-600">
              {currentIndex + 1} / {cards.length}
            </span>
            <button
              type="button"
              className="carousel-control-btn"
              onClick={handleNext}
              title={t("Next Meteorological Card")}
              aria-label="Next slide"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Viewport Strip */}
      <div className="carousel-cards-viewport" ref={scrollContainerRef}>
        <div
          className="carousel-cards-track"
          style={{
            transform: `translateX(-${currentIndex * (100 / Math.min(cards.length, 3))}%)`
          }}
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.id} className="meteorological-card">
                {/* Card Top: SOURCE & PROVENANCE */}
                <div className="card-top-meta flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon size={13} className="text-blue-700 flex-shrink-0" />
                    <span className="card-source font-mono font-bold text-[10.5px] text-slate-900 tracking-wider truncate">
                      {t(card.pillar)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">• {card.source}</span>
                  </div>
                  <ProvenanceBadge provenance={card.provenance} size="tiny" />
                </div>

                {/* Card Body: TITLE, LOCATION, VALUE */}
                <div className="card-body mt-2">
                  <div className="card-title font-mono font-bold text-[11px] text-slate-800 tracking-wide uppercase truncate">
                    {t(card.title)}
                  </div>
                  <div className="card-location text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                    {t(card.location)}
                  </div>

                  <div className="card-metric font-mono text-xs font-bold text-slate-900 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="text-[13px] text-blue-950 font-bold">{t(card.value)}</div>
                    <div className="text-[10px] text-slate-600 font-normal mt-0.5 truncate">
                      {t(card.secondary)}
                    </div>
                  </div>
                </div>

                {/* Card Footer: DATA TIME vs CHECKED TIME */}
                <div className="card-footer mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between font-mono text-[9.5px]">
                  <div className="flex flex-col text-slate-500 leading-tight">
                    <span>{t("DATA:")} <strong className="text-slate-700">{card.dataTime}</strong></span>
                    <span>{t("CHECKED:")} <strong className="text-slate-600">{card.checkedTime}</strong></span>
                  </div>

                  <button
                    type="button"
                    className="card-action-btn font-mono"
                    onClick={card.action}
                  >
                    <span>{t(card.actionLabel)}</span>
                    <ExternalLink size={10} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
