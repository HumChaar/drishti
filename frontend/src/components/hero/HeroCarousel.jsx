import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import { Wind, ShieldAlert, FileText, ArrowRight } from "lucide-react";

import "swiper/css";
import "swiper/css/pagination";

export default function HeroCarousel({
  currentScenario,
  activeStepId = "NOW",
  districtsData = [],
  onNavigateTab
}) {
  const current = currentScenario?.current || {};
  const highestDistrict = (districtsData && districtsData.length > 0)
    ? [...districtsData].sort((a, b) => (b.risk?.riskScore || 0) - (a.risk?.riskScore || 0))[0]
    : null;

  const topRisk = highestDistrict?.risk || {};
  const topDriver = (topRisk.primaryDrivers && topRisk.primaryDrivers[0])
    ? topRisk.primaryDrivers[0]
    : "Severe storm surge and gale-force wind inundation threat along coastal buffer";

  return (
    <div className="hero-carousel-container">
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 7000, disableOnInteraction: true }}
        loop={true}
        className="hero-swiper"
      >
        {/* Slide 1: Cyclone Situation */}
        <SwiperSlide>
          <div className="carousel-slide-inner">
            <div className="slide-badge-col">
              <span className="slide-kicker">
                <Wind size={12} className="text-orange-600" />
                <span>CYCLONE SITUATION</span>
              </span>
              <span className="slide-storm-id font-mono">REMAL • 2024</span>
            </div>

            <div className="slide-content-col">
              <div className="slide-headline">
                <strong className="text-slate-900">Cyclone REMAL</strong>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="text-slate-600 font-medium">{current.category || "Severe Cyclonic Storm (SCS)"}</span>
              </div>
              <div className="slide-metrics-row font-mono">
                <span className="metric-pill">
                  <span className="pill-lbl">TIMESTEP:</span>
                  <span className="pill-val text-orange-600 font-bold">{activeStepId}</span>
                </span>
                <span className="metric-pill">
                  <span className="pill-lbl">WIND:</span>
                  <span className="pill-val font-semibold">{current.windKmh || 110} km/h ({current.windKt || 60} kt)</span>
                </span>
                <span className="metric-pill">
                  <span className="pill-lbl">PRESSURE:</span>
                  <span className="pill-val">{current.pressureMb || 986} hPa</span>
                </span>
                <span className="metric-pill">
                  <span className="pill-lbl">POSITION:</span>
                  <span className="pill-val">{current.latitude ? `${current.latitude.toFixed(1)}°N, ${current.longitude?.toFixed(1)}°E` : "19.6°N, 89.2°E"}</span>
                </span>
              </div>
            </div>
          </div>
        </SwiperSlide>

        {/* Slide 2: Risk Situation */}
        <SwiperSlide>
          <div className="carousel-slide-inner">
            <div className="slide-badge-col">
              <span className="slide-kicker risk-kicker">
                <ShieldAlert size={12} className="text-red-600" />
                <span>RISK SITUATION</span>
              </span>
              <span className="slide-storm-id font-mono text-red-700">PEAK SECTOR</span>
            </div>

            <div className="slide-content-col">
              <div className="slide-headline">
                <strong className="text-slate-900">
                  {highestDistrict ? `${highestDistrict.name} (${highestDistrict.state})` : "Balasore (Odisha)"}
                </strong>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="font-mono font-bold" style={{ color: topRisk.color || "#dc2626" }}>
                  SCORE: {topRisk.riskScore || 86}/100 [{topRisk.riskBand || "EXTREME"}]
                </span>
              </div>
              <div className="slide-subtext font-mono text-slate-700">
                <span className="text-slate-500 font-bold mr-1">TOP DRIVER:</span>
                <span>{topDriver}</span>
              </div>
            </div>
          </div>
        </SwiperSlide>

        {/* Slide 3: Response Advisory */}
        <SwiperSlide>
          <div className="carousel-slide-inner">
            <div className="slide-badge-col">
              <span className="slide-kicker advisory-kicker">
                <FileText size={12} className="text-indigo-600" />
                <span>RESPONSE ADVISORY</span>
              </span>
              <span className="slide-storm-id font-mono text-indigo-700">HUMAN APPROVAL</span>
            </div>

            <div className="slide-content-col">
              <div className="slide-headline">
                <strong className="text-slate-900">Mandatory Coastal Evacuation Directive</strong>
                <span className="text-slate-400 mx-1.5">•</span>
                <span className="badge-advisory-approval">PENDING COMMAND AUTHORIZATION</span>
              </div>
              <div className="slide-subtext text-slate-600">
                Evacuate residents in 5km coastal belt to Multi-Purpose Cyclone Shelters; clear harbor berths.
              </div>
            </div>

            <div className="slide-action-col">
              <button
                type="button"
                className="carousel-action-btn"
                onClick={() => onNavigateTab && onNavigateTab("advisories")}
              >
                <span>VIEW ADVISORY</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}
