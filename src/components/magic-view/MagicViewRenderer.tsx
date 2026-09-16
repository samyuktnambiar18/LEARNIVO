import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Sparkles, CheckCircle2, ArrowRight, Layers, Info } from 'lucide-react';
import { MagicViewData, MagicViewStep, MagicViewElement, MagicViewConnection } from '../../types';
import { Button } from '../ui/Button';

interface MagicViewRendererProps {
  data: MagicViewData;
}

export const MagicViewRenderer: React.FC<MagicViewRendererProps> = ({ data }) => {
  const steps = data.steps && data.steps.length > 0 ? data.steps : buildDefaultSteps(data);
  const elements = data.elements || [];
  const connections = data.connections || [];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStep: MagicViewStep | undefined = steps[currentStepIndex];

  // Handle Auto Play timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, steps.length]);

  const handleNext = () => {
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const togglePlay = () => {
    if (currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Determine active elements for current step
  const activeElementIds = new Set<string>();
  if (activeStep?.active_elements && activeStep.active_elements.length > 0) {
    activeStep.active_elements.forEach((id) => activeElementIds.add(id));
  } else if (elements.length > 0) {
    // If step doesn't explicitly list elements, highlight corresponding index or all
    const elemToHighlight = elements[currentStepIndex % elements.length];
    if (elemToHighlight) activeElementIds.add(elemToHighlight.id);
  }

  return (
    <div className="surface-card border border-[#C7FF4A]/30 rounded-2xl overflow-hidden shadow-2xl bg-[#0B0A0F] text-[#F7F5FA] my-4 transition-all">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181620] via-[#121118] to-[#181620] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C7FF4A]/15 border border-[#C7FF4A]/40 flex items-center justify-center text-[#C7FF4A] shadow-[0_0_12px_rgba(199,255,74,0.25)]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C7FF4A] bg-[#C7FF4A]/10 px-2 py-0.5 rounded border border-[#C7FF4A]/20">
                ✨ MAGIC VIEW
              </span>
              <span className="text-[10px] text-[#A6A1B2] capitalize">
                {data.visual_type.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#F7F5FA] mt-0.5">
              {data.title || data.concept}
            </h3>
          </div>
        </div>

        {steps.length > 1 && (
          <div className="flex items-center gap-2 bg-[#181620] px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-[#A6A1B2]">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Banner if available */}
        {data.summary && (
          <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed bg-[#121118] p-3.5 rounded-xl border border-white/5">
            {data.summary}
          </p>
        )}

        {/* Visualization Grid / Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Canvas (Left / Top 7 cols) */}
          <div className="lg:col-span-7 bg-[#121118] p-5 rounded-xl border border-white/10 flex flex-col justify-center min-h-[300px] relative overflow-hidden">
            <RenderVisualCanvas
              visualType={data.visual_type}
              elements={elements}
              connections={connections}
              activeElementIds={activeElementIds}
              currentStepIndex={currentStepIndex}
              highlightColor={activeStep?.highlight_color || '#C7FF4A'}
            />
          </div>

          {/* Step Explanation Card (Right / Bottom 5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {activeStep && (
              <div className="bg-[#181620] p-5 rounded-xl border border-white/10 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#C7FF4A] text-[#0B0A0F] font-bold text-xs flex items-center justify-center">
                    {activeStep.step_number}
                  </span>
                  <h4 className="text-sm font-bold text-[#F7F5FA]">
                    {activeStep.title}
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed flex-1">
                  {activeStep.description}
                </p>

                {/* Steps Navigation Dots */}
                {steps.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/10">
                    {steps.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setIsPlaying(false); setCurrentStepIndex(idx); }}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentStepIndex
                            ? 'w-6 bg-[#C7FF4A]'
                            : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                        title={`Go to step ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Control Buttons */}
            {steps.length > 1 && (
              <div className="flex items-center justify-between gap-2 p-3 bg-[#121118] rounded-xl border border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className="text-xs"
                >
                  <SkipBack className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={togglePlay}
                  className="text-xs min-w-[100px]"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 mr-1 fill-current" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                      {currentStepIndex >= steps.length - 1 ? 'Replay' : 'Play'}
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentStepIndex === steps.length - 1}
                  className="text-xs"
                >
                  Next
                  <SkipForward className="w-3.5 h-3.5 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  title="Reset to beginning"
                  className="px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Key Takeaway Callout */}
        {data.key_takeaway && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#C7FF4A]/10 via-[#181620] to-[#8B5CF6]/10 border border-[#C7FF4A]/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#C7FF4A] flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-[#C7FF4A] uppercase tracking-wider mb-1">
                Key Takeaway
              </h5>
              <p className="text-xs sm:text-sm text-[#F7F5FA] font-medium leading-relaxed">
                {data.key_takeaway}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// VISUAL CANVAS RENDERER COMPONENT
// Supports: Flowchart, Process, Timeline, Array, Comparison, Hierarchy, etc.
// ============================================================================

interface RenderVisualCanvasProps {
  visualType: string;
  elements: MagicViewElement[];
  connections: MagicViewConnection[];
  activeElementIds: Set<string>;
  currentStepIndex: number;
  highlightColor: string;
}

const RenderVisualCanvas: React.FC<RenderVisualCanvasProps> = ({
  visualType,
  elements,
  connections,
  activeElementIds,
  currentStepIndex,
  highlightColor,
}) => {
  const vType = (visualType || 'process').toLowerCase();

  // Mode 1: Array / Algorithm / Sequential Items
  if (vType.includes('algorithm') || vType.includes('array') || elements.some((e) => e.type === 'array_item')) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {elements.map((elem, idx) => {
            const isActive = activeElementIds.has(elem.id) || idx === currentStepIndex;
            return (
              <div key={elem.id || idx} className="flex flex-col items-center gap-1.5 transition-all duration-300">
                <span className="text-[10px] text-[#A6A1B2] font-mono">idx {idx}</span>
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-[#C7FF4A] text-[#0B0A0F] scale-110 shadow-[0_0_20px_rgba(199,255,74,0.5)] border-2 border-white'
                      : 'bg-[#181620] text-[#F7F5FA] border border-white/15'
                  }`}
                >
                  {elem.value !== undefined ? elem.value : elem.label}
                </div>
                <span className={`text-[11px] font-medium max-w-[80px] truncate ${isActive ? 'text-[#C7FF4A]' : 'text-[#A6A1B2]'}`}>
                  {elem.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode 2: Flowchart / Process / Cycle / Hierarchy / Network
  if (
    vType.includes('flowchart') ||
    vType.includes('process') ||
    vType.includes('cycle') ||
    vType.includes('hierarchy') ||
    vType.includes('mind') ||
    vType.includes('network') ||
    connections.length > 0
  ) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {elements.map((elem, idx) => {
            const isActive = activeElementIds.has(elem.id) || idx === currentStepIndex;
            const hasArrow = idx < elements.length - 1;

            return (
              <React.Fragment key={elem.id || idx}>
                <div
                  className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center text-center min-w-[120px] max-w-[180px] ${
                    isActive
                      ? 'bg-[#8B5CF6]/20 border-[#C7FF4A] shadow-[0_0_18px_rgba(199,255,74,0.3)] scale-105'
                      : 'bg-[#181620] border-white/15 text-[#A6A1B2]'
                  }`}
                >
                  <span className={`text-xs font-bold mb-1 ${isActive ? 'text-[#C7FF4A]' : 'text-[#F7F5FA]'}`}>
                    {elem.label}
                  </span>
                  {elem.value && (
                    <span className="text-[11px] text-[#A6A1B2] bg-black/40 px-2 py-0.5 rounded mt-1 font-mono">
                      {elem.value}
                    </span>
                  )}
                  {elem.details && (
                    <span className="text-[10px] text-[#A6A1B2] mt-1.5 line-clamp-2">
                      {elem.details}
                    </span>
                  )}
                </div>

                {hasArrow && (
                  <div className="text-[#C7FF4A] flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode 3: Timeline / Steps sequence
  if (vType.includes('timeline') || vType.includes('step')) {
    return (
      <div className="space-y-4 py-2">
        <div className="relative border-l-2 border-[#C7FF4A]/30 ml-4 space-y-6">
          {elements.map((elem, idx) => {
            const isActive = activeElementIds.has(elem.id) || idx === currentStepIndex;
            return (
              <div key={elem.id || idx} className="relative pl-6">
                <div
                  className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 transition-all ${
                    isActive
                      ? 'bg-[#C7FF4A] border-white shadow-[0_0_10px_rgba(199,255,74,0.6)]'
                      : 'bg-[#121118] border-white/30'
                  }`}
                />
                <div className={`p-3 rounded-xl border ${isActive ? 'bg-[#181620] border-[#C7FF4A] text-[#F7F5FA]' : 'bg-[#121118] border-white/10 text-[#A6A1B2]'}`}>
                  <h5 className={`text-xs font-bold ${isActive ? 'text-[#C7FF4A]' : 'text-[#F7F5FA]'}`}>
                    {elem.label}
                  </h5>
                  {elem.details && <p className="text-[11px] text-[#A6A1B2] mt-1">{elem.details}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode 4: Comparison
  if (vType.includes('comparison')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        {elements.map((elem, idx) => {
          const isActive = activeElementIds.has(elem.id) || idx === currentStepIndex;
          return (
            <div
              key={elem.id || idx}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-[#181620] border-[#C7FF4A] shadow-[0_0_16px_rgba(199,255,74,0.25)]'
                  : 'bg-[#121118] border-white/10 text-[#A6A1B2]'
              }`}
            >
              <h5 className={`text-sm font-bold mb-2 ${isActive ? 'text-[#C7FF4A]' : 'text-[#F7F5FA]'}`}>
                {elem.label}
              </h5>
              {elem.value && (
                <div className="text-xl font-extrabold text-[#8B5CF6] mb-2">{elem.value}</div>
              )}
              {elem.details && <p className="text-xs text-[#A6A1B2] leading-relaxed">{elem.details}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  // Default Canvas: Render Grid Cards for Elements
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 py-2">
      {elements.map((elem, idx) => {
        const isActive = activeElementIds.has(elem.id) || idx === currentStepIndex;
        return (
          <div
            key={elem.id || idx}
            className={`p-4 rounded-xl border transition-all duration-300 ${
              isActive
                ? 'bg-[#181620] border-[#C7FF4A] shadow-[0_0_16px_rgba(199,255,74,0.3)] scale-102'
                : 'bg-[#121118] border-white/10 text-[#A6A1B2]'
            }`}
          >
            <span className="text-[10px] font-bold text-[#8B5CF6] uppercase block mb-1">
              {elem.type || `Node ${idx + 1}`}
            </span>
            <h5 className={`text-xs font-bold ${isActive ? 'text-[#C7FF4A]' : 'text-[#F7F5FA]'}`}>
              {elem.label}
            </h5>
            {elem.value && (
              <span className="text-xs font-mono bg-black/40 px-2 py-0.5 rounded text-[#C7FF4A] mt-2 inline-block">
                {elem.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

function buildDefaultSteps(data: MagicViewData): MagicViewStep[] {
  if (data.elements && data.elements.length > 0) {
    return data.elements.map((elem, idx) => ({
      step_number: idx + 1,
      title: elem.label || `Step ${idx + 1}`,
      description: elem.details || data.summary || `Step ${idx + 1} of concept visualization.`,
      active_elements: [elem.id],
      highlight_color: '#C7FF4A',
    }));
  }

  return [
    {
      step_number: 1,
      title: data.title || 'Concept Overview',
      description: data.summary || 'Interactive visual explanation generated for concept.',
      active_elements: [],
      highlight_color: '#C7FF4A',
    },
  ];
}
