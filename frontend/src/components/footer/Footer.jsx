import { AlertCircle, Cpu, Globe, Server } from "lucide-react";
import { useLanguage } from "../../language";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="drishti-footer">
      <div className="footer-content">
        {/* Official Disclaimer */}
        <div className="footer-disclaimer-box">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="disclaimer-text">
              <span className="font-bold text-amber-300">{t("OPERATIONAL EXERCISE & SIMULATION NOTICE:")}</span>
              {" "}{t("DRISHTI (Disaster Risk Intelligence & Surveillance Hazard Tracking Interface) MVP is running in Simulated Historical Replay Mode (Cyclone REMAL 2024 Archive). For real-time life safety advisories and evacuation instructions, refer strictly to official bulletins issued by IMD and State Disaster Management Authorities.")}
            </div>
          </div>
        </div>


        {/* System Meta and Architecture */}
        <div className="footer-bottom-row">
          <div className="footer-org-credits">
            <div className="text-xs font-semibold text-slate-300">
              DRISHTI MVP • Coastal Hazard Surveillance Platform
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Designed for National & State Disaster Management Authorities • Bay of Bengal Sector
            </div>
          </div>

          <div className="footer-tech-specs font-mono text-[11px] text-slate-400 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Cpu size={12} className="text-cyan-400" />
              <span>Vite + React (Vercel Ready)</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Server size={12} className="text-purple-400" />
              <span>FastAPI Backend Target (Render Ready)</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Globe size={12} className="text-emerald-400" />
              <span>Leaflet Cartographic Engine</span>
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">
              SYS-OK (Stage 1 Complete)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
