import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Wind,
  CloudRain,
  Satellite,
  AlertTriangle,
  Activity,
  Database,
  ExternalLink,
  ShieldCheck,
  Pause,
  Play
} from "lucide-react";

/**
 * LiveMeteorologicalCarousel
 * Professional IMD-style Live Meteorological Carousel component.
 * 
 * Sits directly below the map and intelligence workspace.
 * Generated dynamically from normalized meteorological data.
 * Lightweight, native React/CSS (zero heavy external dependencies).
 */
export default function LiveMeteorologicalCarousel({
  data,
  onOpenOverlay,
  onNavigateTab
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef(null);

  // Helper for status badge styling
  const getStatusPillClass = (color) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "amber":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "red":
        return "bg-red-50 text-red-800 border-red-200";
      case "cyan":
      case "teal":
      case "blue":
        return "bg-blue-50 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const hasSys = data?.activeSystem?.hasActiveSystem;
  const isSysAvail = data?.activeSystem?.isAvailable !== false;

  // Dynamic meteorological cards conforming to: SOURCE / STATUS / TITLE / LOCATION / VALUE / UPDATED / ACTION
  const cards = [
    {
      id: "national-weather",
      source: "OPEN-METEO",
      status: "MODEL TELEMETRY",
      statusColor: "emerald",
      title: "NATIONAL WEATHER",
      location: "Pan-India (36 States & UTs)",
      metric: data?.national?.temp != null
        ? `Mean Temp ${data.national.temp}°C • Wind ${data.national.windSpeed || 18} km/h`
        : "NO CURRENT DATA",
      timestamp: data?.timestamp?.timeShort || "00:20 IST",
      actionLabel: "VIEW OBSERVATIONS",
      action: () => onOpenOverlay && onOpenOverlay("observations"),
      icon: Activity
    },
    {
      id: "synoptic-system",
      source: "IMD BULLETIN",
      status: hasSys ? "DEPRESSION ACTIVE" : isSysAvail ? "SURVEILLANCE" : "TELEMETRY OFFLINE",
      statusColor: hasSys ? "amber" : "slate",
      title: hasSys ? "ACTIVE SYNOPTIC SYSTEM" : "SYNOPTIC SURVEILLANCE",
      location: hasSys
        ? (data?.activeSystem?.shortName || "Northeast Madhya Pradesh")
        : "All Basins Monitored",
      metric: hasSys
        ? `${data?.activeSystem?.centralPressureMb || 998} hPa • Wind ${data?.activeSystem?.maxWindKmh || 45}-${data?.activeSystem?.gustKmh || 60} km/h`
        : isSysAvail
        ? "NO ACTIVE SYNOPTIC SYSTEM"
        : "CURRENT SYSTEM DATA UNAVAILABLE",
      timestamp: data?.activeSystem?.updatedAt || "00:20 IST",
      actionLabel: hasSys ? "VIEW BULLETIN" : "VIEW SITUATION",
      action: () => onOpenOverlay && onOpenOverlay("bulletin"),
      icon: Radio
    },
    {
      id: "imd-warning",
      source: "IMD ALERT",
      status: data?.warnings?.length > 0 ? (data.warnings[0].severity || "WARNING ACTIVE") : "ROUTINE",
      statusColor: data?.warnings?.length > 0 ? "red" : "emerald",
      title: "LATEST IMD WARNING",
      location: data?.warnings?.[0]?.region || "Northeast MP & North Chhattisgarh",
      metric: data?.warnings?.[0]?.title || "NO CURRENT ACTIVE WARNINGS",
      timestamp: data?.warnings?.[0]?.issuedAt || "00:20 IST",
      actionLabel: "VIEW WARNING",
      action: () => onOpenOverlay && onOpenOverlay("warning"),
      icon: AlertTriangle
    },
    {
      id: "satellite-status",
      source: "MOSDAC / ISRO",
      status: "LIVE SATELLITE",
      statusColor: "cyan",
      title: "INSAT-3DS SATELLITE",
      location: "South Asia & Indian Ocean Sector",
      metric: "IR1, VIS, WV, CTT Products Available",
      timestamp: data?.satellite?.lastCapture || "00:20 IST",
      actionLabel: "OPEN LIVE PRODUCT",
      action: () => onOpenOverlay && onOpenOverlay("satellite"),
      icon: Satellite
    },
    {
      id: "wind-field",
      source: "OPEN-METEO",
      status: "MODEL VECTORS",
      statusColor: "teal",
      title: "SURFACE WIND FIELD",
      location: "Central & Adjoining Marine Sectors",
      metric: data?.wind?.speed != null
        ? `Surface Wind ${data.wind.speed} km/h • Dir ${data.wind.direction ?? 90}°`
        : "NO CURRENT DATA",
      timestamp: data?.wind?.lastUpdated || "00:20 IST",
      actionLabel: "SURFACE WEATHER",
      action: () => onNavigateTab && onNavigateTab("weather"),
      icon: Wind
    },
    {
      id: "rainfall-telemetry",
      source: "OPEN-METEO",
      status: "MODEL PRECIP",
      statusColor: "blue",
      title: "PRECIPITATION TELEMETRY",
      location: "Central & Peninsular River Basins",
      metric: data?.national?.rain != null
        ? `24h Accumulated: ${data.national.rain} mm (Pan-India Sector)`
        : "NO CURRENT DATA",
      timestamp: data?.timestamp?.timeShort || "00:20 IST",
      actionLabel: "VIEW RAIN MATRIX",
      action: () => onOpenOverlay && onOpenOverlay("observations"),
      icon: CloudRain
    },
    {
      id: "regional-state",
      source: "DRISHTI DERIVED",
      status: "SURVEILLANCE",
      statusColor: "orange",
      title: "REGIONAL READINESS",
      location: "36 States & Union Territories",
      metric: "Depression Influence Calculated Multi-Factor",
      timestamp: data?.timestamp?.timeShort || "00:20 IST",
      actionLabel: "STATE MONITOR",
      action: () => onNavigateTab && onNavigateTab("states"),
      icon: ShieldCheck
    },
    {
      id: "data-provenance",
      source: "MULTI-AGENCY",
      status: "STRICT PROVENANCE",
      statusColor: "slate",
      title: "DATA PROVENANCE MATRIX",
      location: "National Meteorological EOC",
      metric: "OBSERVED • MODEL • DERIVED • SIMULATED",
      timestamp: data?.timestamp?.timeShort || "00:20 IST",
      actionLabel: "VIEW SOURCES",
      action: () => onOpenOverlay && onOpenOverlay("sources"),
      icon: Database
    }
  ];

  // Autoplay cycle (7 seconds)
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
      {/* Top Section Header */}
      <div className="carousel-section-header">
        <div className="carousel-title-group">
          <div className="carousel-pulse-dot" />
          <h2 className="carousel-section-title font-mono">
            LIVE METEOROLOGICAL TELEMETRY &amp; HAZARD CAROUSEL
          </h2>
          <span className="carousel-provenance-tag font-mono">
            MULTI-SOURCE • AUTOMATIC ROTATION
          </span>
        </div>

        <div className="carousel-controls-group">
          {/* Play/Pause state */}
          <button
            type="button"
            className="carousel-control-btn"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume Autoplay" : "Pause Autoplay"}
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
                title={`Go to slide ${idx + 1}: ${card.title}`}
              />
            ))}
          </div>

          {/* Prev / Next buttons */}
          <div className="carousel-arrows">
            <button
              type="button"
              className="carousel-control-btn"
              onClick={handlePrev}
              title="Previous Meteorological Card"
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
              title="Next Meteorological Card"
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
                {/* Card Top: SOURCE & STATUS */}
                <div className="card-top-meta flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon size={12} className="text-blue-700 flex-shrink-0" />
                    <span className="card-source font-mono font-bold text-[10px] text-slate-800 tracking-wider truncate">
                      {card.source}
                    </span>
                  </div>
                  <span className={`status-pill font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusPillClass(card.statusColor)}`}>
                    {card.status}
                  </span>
                </div>

                {/* Card Body: TITLE, LOCATION, VALUE */}
                <div className="card-body mt-2">
                  <div className="card-title font-mono font-bold text-xs text-slate-900 tracking-wide uppercase truncate">
                    {card.title}
                  </div>
                  <div className="card-location text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {card.location}
                  </div>
                  <div className="card-metric font-mono text-xs font-bold text-slate-800 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                    {card.metric}
                  </div>
                </div>

                {/* Card Footer: UPDATED & ACTION */}
                <div className="card-footer mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">UPDATED</span>
                    <span className="font-bold text-slate-700">{card.timestamp}</span>
                  </span>

                  <button
                    type="button"
                    className="card-action-btn font-mono"
                    onClick={card.action}
                  >
                    <span>{card.actionLabel}</span>
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
