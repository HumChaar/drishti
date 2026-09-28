import React, { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Clock, 
  Activity,
  AlertTriangle 
} from "lucide-react";
import { TIMELINE_STEPS } from "../../data/cycloneData.js";

export default function TimelineControl({ activeStepId, onStepChange, timelineSteps = TIMELINE_STEPS }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = timelineSteps && timelineSteps.length > 0 ? timelineSteps : TIMELINE_STEPS;
  const currentIndex = steps.findIndex((s) => s.id === activeStepId);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        const nextIndex = (currentIndex + 1) % steps.length;
        onStepChange(steps[nextIndex].id);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, onStepChange, steps]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onStepChange(steps[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      onStepChange(steps[currentIndex + 1].id);
    }
  };

  const currentStep = steps[currentIndex] || steps[2] || steps[0];

  return (
    <div className="timeline-control-panel">
      <div className="timeline-header-row">
        <div className="timeline-title-wrap">
          <Clock size={15} className="text-orange-600" />
          <span className="timeline-title">TEMPORAL HAZARD PROJECTION TIMELINE</span>
          <span className="badge-provenance text-xs">SIMULATED STEP REPLAY</span>
        </div>

        <div className="timeline-active-info font-mono">
          <span className="text-slate-500">SELECTED TIMESTEP:</span>
          <span className="text-orange-600 font-bold ml-1.5">{currentStep.label}</span>
          <span className="text-slate-300 mx-2">|</span>
          <span className="text-slate-800 font-semibold">{currentStep.dateDisplay}</span>
          <span className="text-slate-300 mx-2">|</span>
          <span className="text-slate-500 text-xs">[{currentStep.stage}]</span>
        </div>

        {/* Playback Controls */}
        <div className="timeline-playback-actions">
          <button 
            className="ctrl-btn" 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            title="Step Backward"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button 
            className={`ctrl-btn play-btn ${isPlaying ? "playing" : ""}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Simulation Replay" : "Play Temporal Simulation Replay"}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? "PAUSE" : "AUTO-REPLAY"}</span>
          </button>

          <button 
            className="ctrl-btn" 
            onClick={handleNext}
            disabled={currentIndex === TIMELINE_STEPS.length - 1}
            title="Step Forward"
          >
            <ChevronRight size={16} />
          </button>

          <button 
            className="ctrl-btn reset-btn" 
            onClick={() => onStepChange("NOW")}
            title="Jump to Current Time"
          >
            <RotateCcw size={14} />
            <span>NOW</span>
          </button>
        </div>
      </div>

      {/* Step Buttons Track */}
      <div className="timeline-steps-track">
        <div className="timeline-track-line">
          {/* Progress fill */}
          <div 
            className="timeline-track-progress"
            style={{ width: `${(currentIndex / Math.max(1, steps.length - 1)) * 100}%` }}
          ></div>
        </div>

        <div className="timeline-steps-grid">
          {steps.map((step, idx) => {
            const isActive = step.id === activeStepId;
            const isPast = idx < currentIndex;
            const isLandfallZone = step.id === "+12h" || step.id === "+24h";

            return (
              <div 
                key={step.id} 
                className={`timeline-step-node ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
                onClick={() => onStepChange(step.id)}
              >
                <div className="node-marker-wrap">
                  <div className={`node-marker ${isLandfallZone ? "landfall-node" : ""}`}>
                    {step.id === "NOW" ? (
                      <span className="pulse-dot"></span>
                    ) : isLandfallZone ? (
                      <AlertTriangle size={10} className="text-red-600" />
                    ) : null}
                  </div>
                </div>
                <div className="node-label-wrap">
                  <span className="node-id font-mono">{step.label}</span>
                  <span className="node-sub">{step.stage}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
