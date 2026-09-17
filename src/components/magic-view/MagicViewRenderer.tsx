import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Sparkles, CheckCircle2, ArrowRight, Layers, Info, Code, Image as ImageIcon, ExternalLink, Loader2, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { MagicViewData, MagicViewStep, MagicViewElement, MagicViewConnection, MagicViewNarrationPayload } from '../../types';
import { learnivoBackend } from '../../services/api/learnivoBackend';
import { Button } from '../ui/Button';

interface MagicViewRendererProps {
  data: MagicViewData;
}

type NarrationState = 'idle' | 'loading' | 'speaking' | 'paused' | 'finished';

export const MagicViewRenderer: React.FC<MagicViewRendererProps> = ({ data }) => {
  // Ensure elements, connections, and steps are populated so canvas is NEVER empty
  const { elements, connections, steps } = deriveVisualElementsAndSteps(data);

  const [activeTab, setActiveTab] = useState<'diagram' | 'html' | 'image'>(() =>
    data.html ? 'html' : data.imageUrl ? 'image' : 'diagram'
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Narration & Speech Synthesis state
  const [narrationState, setNarrationState] = useState<NarrationState>('idle');
  const [narrationError, setNarrationError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentNarrationDataRef = useRef<{ text?: string; audioUrl?: string } | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStep: MagicViewStep | undefined = steps[currentStepIndex];

  // Map element IDs for O(1) SVG lookup
  const elementsMap: Record<string, MagicViewElement> = {};
  elements.forEach((e) => {
    elementsMap[e.id] = e;
  });

  // Determine active elements for current step
  const activeElementIds = new Set<string>();
  if (activeStep?.active_elements && activeStep.active_elements.length > 0) {
    activeStep.active_elements.forEach((id) => activeElementIds.add(id));
  } else if (elements.length > 0) {
    const activeElem = elements[currentStepIndex % elements.length];
    if (activeElem) activeElementIds.add(activeElem.id);
  }

  // Stop active narration & speech synthesis safely
  const stopActiveNarration = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speechUtteranceRef.current = null;
  };

  // Cleanup speech/audio on unmount
  useEffect(() => {
    return () => {
      stopActiveNarration();
    };
  }, []);

  // Auto-play step timer
  useEffect(() => {
    if (isPlaying && steps.length > 1) {
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

  // Step change handlers — stop speech immediately and reset Play state
  const handleNext = () => {
    setIsPlaying(false);
    stopActiveNarration();
    setNarrationState('idle');
    setNarrationError(null);
    currentNarrationDataRef.current = null;
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    stopActiveNarration();
    setNarrationState('idle');
    setNarrationError(null);
    currentNarrationDataRef.current = null;
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    stopActiveNarration();
    setNarrationState('idle');
    setNarrationError(null);
    currentNarrationDataRef.current = null;
    setCurrentStepIndex(0);
    setSelectedElementId(null);
  };

  // Plays given narration content (Audio URL or Speech Synthesis)
  const playNarrationContent = (narrationData: { text?: string; audioUrl?: string }) => {
    stopActiveNarration();

    if (narrationData.audioUrl) {
      try {
        const audio = new Audio(narrationData.audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setNarrationState('finished');
        };
        audio.onerror = () => {
          setNarrationState('idle');
          setNarrationError("Unable to load audio narration. Please try again.");
        };
        audio.play().then(() => {
          setNarrationState('speaking');
        }).catch((err) => {
          console.warn("Audio playback failed:", err);
          setNarrationState('idle');
          setNarrationError("Unable to load narration. Please try again.");
        });
        return;
      } catch (e) {
        console.warn("Audio initialization error:", e);
      }
    }

    if (narrationData.text && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(narrationData.text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
          setNarrationState('finished');
        };
        utterance.onerror = (e) => {
          console.warn("Speech synthesis error:", e);
          setNarrationState('idle');
        };

        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setNarrationState('speaking');
        return;
      } catch (e) {
        console.warn("Speech synthesis initialization error:", e);
      }
    }

    setNarrationState('idle');
    setNarrationError("No narration available for this step.");
  };

  // Main PLAY button click handler with backend narration webhook integration
  const handlePlayNarration = async () => {
    // Prevent duplicate parallel requests
    if (narrationState === 'loading') return;

    // If currently speaking, PAUSE narration
    if (narrationState === 'speaking') {
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setNarrationState('paused');
      return;
    }

    // If currently paused, RESUME narration without restarting
    if (narrationState === 'paused') {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.warn('Audio play failed on resume:', err));
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      setNarrationState('speaking');
      return;
    }

    // If idle or finished, fetch narration from backend webhook (or use cache if present)
    setNarrationError(null);

    if (currentNarrationDataRef.current) {
      playNarrationContent(currentNarrationDataRef.current);
      return;
    }

    setNarrationState('loading');
    stopActiveNarration();

    const activeElementsList = activeStep?.active_elements?.length
      ? activeStep.active_elements
      : elements.map(e => e.id);

    const visualContext = activeElementsList.length
      ? `Highlighting nodes: ${activeElementsList.join(', ')}`
      : `Visual explanation diagram for ${data.concept || data.title}`;

    const payload: MagicViewNarrationPayload = {
      question: data.concept || data.title,
      concept: data.concept || data.title,
      step: {
        number: activeStep ? activeStep.step_number : currentStepIndex + 1,
        title: activeStep ? activeStep.title : `Step ${currentStepIndex + 1}`,
        explanation: activeStep ? activeStep.description : data.summary,
      },
      visual_context: visualContext,
      key_takeaway: data.key_takeaway || data.summary,
    };

    const result = await learnivoBackend.fetchMagicViewNarration(payload);

    if (!result.success) {
      setNarrationState('idle');
      setNarrationError(result.errorMessage || "Unable to load narration. Please try again.");
      return;
    }

    const narrationData = { text: result.text, audioUrl: result.audioUrl };
    currentNarrationDataRef.current = narrationData;
    playNarrationContent(narrationData);
  };

  // REPLAY button click handler
  const handleReplayClick = () => {
    setIsPlaying(false);
    stopActiveNarration();
    setNarrationError(null);
    if (currentNarrationDataRef.current) {
      playNarrationContent(currentNarrationDataRef.current);
    } else {
      handlePlayNarration();
    }
  };

  const selectedElement = selectedElementId ? elementsMap[selectedElementId] : null;

  return (
    <div className="surface-card border border-[#C7FF4A]/40 rounded-2xl overflow-hidden shadow-2xl bg-[#0B0A0F] text-[#F7F5FA] my-4 transition-all">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181620] via-[#121118] to-[#181620] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C7FF4A]/15 border border-[#C7FF4A]/40 flex items-center justify-center text-[#C7FF4A] shadow-[0_0_14px_rgba(199,255,74,0.3)]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C7FF4A] bg-[#C7FF4A]/10 px-2 py-0.5 rounded border border-[#C7FF4A]/20">
                ✨ MAGIC VIEW
              </span>
              <span className="text-[10px] text-[#A6A1B2] capitalize bg-white/5 px-2 py-0.5 rounded">
                {(data.visual_type || 'diagram').replace(/_/g, ' ')}
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

      {/* Main Container */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Description */}
        {data.summary && (
          <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed bg-[#121118] p-3.5 rounded-xl border border-white/5">
            {data.summary}
          </p>
        )}

        {/* View Switcher Tabs (if HTML or Image is present alongside vector specs) */}
        {(data.html || data.imageUrl) && (
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('diagram')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'diagram'
                  ? 'bg-[#C7FF4A] text-[#0B0A0F] font-bold shadow-sm'
                  : 'bg-[#181620] text-[#A6A1B2] hover:text-[#F7F5FA] border border-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Diagram View</span>
            </button>
            {data.html && (
              <button
                onClick={() => setActiveTab('html')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'html'
                    ? 'bg-[#C7FF4A] text-[#0B0A0F] font-bold shadow-sm'
                    : 'bg-[#181620] text-[#A6A1B2] hover:text-[#F7F5FA] border border-white/10'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>HTML Preview</span>
              </button>
            )}
            {data.imageUrl && (
              <button
                onClick={() => setActiveTab('image')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'image'
                    ? 'bg-[#C7FF4A] text-[#0B0A0F] font-bold shadow-sm'
                    : 'bg-[#181620] text-[#A6A1B2] hover:text-[#F7F5FA] border border-white/10'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image Preview</span>
              </button>
            )}
          </div>
        )}

        {/* Responsive Visualization & Explanation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Visual Display (Left 7 Columns) */}
          <div className="lg:col-span-7 bg-[#121118] p-3 sm:p-4 rounded-xl border border-white/10 flex flex-col justify-center min-h-[350px] relative overflow-hidden">
            {activeTab === 'html' && data.html ? (
              <div className="w-full h-full flex flex-col rounded-lg overflow-hidden">
                <div className="p-2 bg-[#181620] border-b border-white/10 flex items-center justify-between text-xs text-[#A6A1B2] mb-2">
                  <span className="font-semibold text-[#C7FF4A] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> HTML Preview
                  </span>
                </div>
                <div className="w-full h-[400px] bg-white rounded-lg overflow-hidden relative">
                  <iframe
                    srcDoc={data.html}
                    title="Magic View HTML Code Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            ) : activeTab === 'image' && data.imageUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="p-2 w-full flex items-center justify-between text-xs text-[#A6A1B2] mb-2">
                  <span className="font-semibold text-[#C7FF4A] flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Image Visual Preview
                  </span>
                  <a
                    href={data.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#C7FF4A] hover:underline flex items-center gap-1"
                  >
                    Open Full Resolution <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <img
                  src={data.imageUrl}
                  alt={data.title || "Magic View Image Preview"}
                  className="max-h-[420px] w-auto max-w-full object-contain rounded-lg border border-white/10 shadow-lg"
                />
              </div>
            ) : (
              <MagicSvgCanvas
                elements={elements}
                connections={connections}
                elementsMap={elementsMap}
                activeElementIds={activeElementIds}
                selectedElementId={selectedElementId}
                onSelectElement={(id) => setSelectedElementId(id)}
              />
            )}
          </div>

          {/* Steps & Controls Panel (Right 5 Columns) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Active Step Card */}
            {activeStep ? (
              <div className="bg-[#181620] p-5 rounded-xl border border-white/10 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#C7FF4A] text-[#0B0A0F] font-bold text-xs flex items-center justify-center shadow-md">
                      {activeStep.step_number}
                    </span>
                    <h4 className="text-sm font-bold text-[#F7F5FA]">
                      {activeStep.title}
                    </h4>
                  </div>

                  <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed">
                    {activeStep.description}
                  </p>
                </div>

                {/* Clicked Element Details Inspector */}
                {selectedElement && (
                  <div className="mt-4 p-3 rounded-lg bg-[#121118] border border-[#8B5CF6]/40 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[#8B5CF6] font-bold">
                      <span className="flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        Selected Element: {selectedElement.label}
                      </span>
                      <button
                        onClick={() => setSelectedElementId(null)}
                        className="text-[10px] text-[#A6A1B2] hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                    {selectedElement.value && (
                      <p className="text-[11px] text-[#F7F5FA] font-mono">
                        Value: {selectedElement.value}
                      </p>
                    )}
                    {selectedElement.details && (
                      <p className="text-[11px] text-[#A6A1B2]">
                        {selectedElement.details}
                      </p>
                    )}
                  </div>
                )}

                {/* Steps Selector Progress Bar */}
                {steps.length > 1 && (
                  <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/10">
                    {steps.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setIsPlaying(false);
                          stopActiveNarration();
                          setNarrationState('idle');
                          setNarrationError(null);
                          currentNarrationDataRef.current = null;
                          setCurrentStepIndex(idx);
                        }}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === currentStepIndex
                            ? 'w-8 bg-[#C7FF4A] shadow-[0_0_8px_rgba(199,255,74,0.6)]'
                            : 'w-2.5 bg-white/20 hover:bg-white/40'
                        }`}
                        title={`Jump to Step ${s.step_number}: ${s.title}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#181620] p-5 rounded-xl border border-white/10 text-center py-8">
                <Layers className="w-8 h-8 text-[#A6A1B2] mx-auto mb-2" />
                <p className="text-xs text-[#A6A1B2]">Visualizing concept elements...</p>
              </div>
            )}

            {/* Narration Error User-Friendly Notification */}
            {narrationError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 shadow-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  {narrationError}
                </span>
                <button
                  onClick={() => setNarrationError(null)}
                  className="text-[10px] uppercase font-bold text-amber-400 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Animation & Narration Audio Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#121118] rounded-xl border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="text-xs"
                aria-label="Previous step"
              >
                <SkipBack className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handlePlayNarration}
                disabled={narrationState === 'loading'}
                aria-label={
                  narrationState === 'loading'
                    ? 'Loading explanation'
                    : narrationState === 'speaking'
                    ? 'Pause explanation'
                    : narrationState === 'paused'
                    ? 'Resume explanation'
                    : 'Play explanation'
                }
                className="text-xs min-w-[110px]"
              >
                {narrationState === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Loading...
                  </>
                ) : narrationState === 'speaking' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    Pause
                  </>
                ) : narrationState === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    Resume
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    Play
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                disabled={currentStepIndex === steps.length - 1}
                className="text-xs"
                aria-label="Next step"
              >
                Next
                <SkipForward className="w-3.5 h-3.5 ml-1" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReplayClick}
                aria-label="Replay explanation"
                title="Replay narration from start"
                className="px-2.5 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Replay
              </Button>
            </div>
          </div>
        </div>

        {/* Key Takeaway Banner */}
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
// SVG CANVAS COMPONENT (1200 x 700 viewBox)
// Renders elements (box, circle, text, formula, arrow, image_placeholder, node)
// Renders connections with directional SVG arrows & labels
// ============================================================================

interface MagicSvgCanvasProps {
  elements: MagicViewElement[];
  connections: MagicViewConnection[];
  elementsMap: Record<string, MagicViewElement>;
  activeElementIds: Set<string>;
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
}

const MagicSvgCanvas: React.FC<MagicSvgCanvasProps> = ({
  elements,
  connections,
  elementsMap,
  activeElementIds,
  selectedElementId,
  onSelectElement,
}) => {
  return (
    <svg
      viewBox="0 0 1200 700"
      className="w-full h-auto max-h-[550px] aspect-[1200/700] rounded-xl overflow-visible select-none transition-all"
    >
      <defs>
        {/* SVG Arrowhead Marker Definitions */}
        <marker
          id="arrow-forward"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#C7FF4A" />
        </marker>

        <marker
          id="arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#C7FF4A" />
        </marker>

        <marker
          id="arrow-neutral"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#8B5CF6" />
        </marker>

        {/* Glow Filters */}
        <filter id="glow-lime" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Grid Pattern Background */}
      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      </pattern>
      <rect width="1200" height="700" fill="url(#grid-pattern)" rx="12" />

      {/* RENDER CONNECTIONS */}
      {connections.map((conn, idx) => {
        const fromElem = elementsMap[conn.from];
        const toElem = elementsMap[conn.to];

        // Ignore invalid connection referencing missing elements safely without crashing
        if (!fromElem || !toElem) return null;

        const x1 = Math.max(60, Math.min(1140, fromElem.position?.x ?? 200));
        const y1 = Math.max(50, Math.min(650, fromElem.position?.y ?? 200));
        const x2 = Math.max(60, Math.min(1140, toElem.position?.x ?? 600));
        const y2 = Math.max(50, Math.min(650, toElem.position?.y ?? 200));

        const isConnActive = activeElementIds.has(fromElem.id) || activeElementIds.has(toElem.id);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const isDashed = conn.type === 'dashed';
        const markerId = isConnActive ? 'url(#arrow-active)' : 'url(#arrow-neutral)';
        const strokeColor = isConnActive ? '#C7FF4A' : conn.color || '#8B5CF6';

        return (
          <g key={`conn_${idx}_${conn.from}_${conn.to}`}>
            {/* SVG Connector Line */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth={isConnActive ? 3.5 : 2}
              strokeDasharray={isDashed ? '6 6' : undefined}
              markerEnd={conn.direction !== 'none' ? markerId : undefined}
              opacity={isConnActive ? 1 : 0.65}
              className="transition-all duration-300"
            />

            {/* Connection Label Badge */}
            {conn.label && (
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x={-(conn.label.length * 4.5 + 8)}
                  y="-11"
                  width={conn.label.length * 9 + 16}
                  height="22"
                  rx="6"
                  fill="#121118"
                  stroke={strokeColor}
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="4"
                  fill="#F7F5FA"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {conn.label}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* RENDER ELEMENTS */}
      {elements.map((elem) => {
        const x = Math.max(80, Math.min(1120, elem.position?.x ?? 300));
        const y = Math.max(60, Math.min(640, elem.position?.y ?? 300));
        const isActive = activeElementIds.has(elem.id);
        const isSelected = selectedElementId === elem.id;

        const elemType = (elem.type || 'box').toLowerCase();

        return (
          <g
            key={elem.id}
            transform={`translate(${x}, ${y})`}
            onClick={() => onSelectElement(elem.id)}
            className="cursor-pointer group transition-all duration-300"
          >
            {/* Active Glow Ring */}
            {(isActive || isSelected) && (
              <circle
                r="70"
                fill="none"
                stroke={isSelected ? '#8B5CF6' : '#C7FF4A'}
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-spin-slow opacity-60"
              />
            )}

            {/* TYPE 1: CIRCLE */}
            {elemType === 'circle' && (
              <g>
                <circle
                  r="45"
                  fill={isActive ? 'rgba(199, 255, 74, 0.2)' : 'rgba(24, 22, 32, 0.9)'}
                  stroke={isActive ? '#C7FF4A' : elem.color || 'rgba(255,255,255,0.25)'}
                  strokeWidth={isActive ? 3.5 : 2}
                  filter={isActive ? 'url(#glow-lime)' : undefined}
                />
                <text
                  y={elem.value ? '-6' : '4'}
                  fill="#F7F5FA"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {truncateText(elem.label, 12)}
                </text>
                {elem.value && (
                  <text y="14" fill="#C7FF4A" fontSize="11" fontWeight="600" textAnchor="middle" fontFamily="monospace">
                    {elem.value}
                  </text>
                )}
              </g>
            )}

            {/* TYPE 2: FORMULA / MATH */}
            {elemType === 'formula' && (
              <g>
                <rect
                  x="-85"
                  y="-35"
                  width="170"
                  height="70"
                  rx="10"
                  fill={isActive ? 'rgba(139, 92, 246, 0.25)' : 'rgba(18, 17, 24, 0.95)'}
                  stroke={isActive ? '#C7FF4A' : '#8B5CF6'}
                  strokeWidth={isActive ? 3 : 2}
                />
                <text y="-8" fill="#C7FF4A" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {truncateText(elem.label, 18)}
                </text>
                <text y="14" fill="#F7F5FA" fontSize="15" fontWeight="bold" textAnchor="middle" fontFamily="serif" fontStyle="italic">
                  {elem.value || elem.label}
                </text>
              </g>
            )}

            {/* TYPE 3: TEXT */}
            {elemType === 'text' && (
              <g>
                <rect
                  x="-75"
                  y="-22"
                  width="150"
                  height="44"
                  rx="22"
                  fill={isActive ? '#C7FF4A' : 'rgba(24, 22, 32, 0.9)'}
                  stroke={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}
                  strokeWidth="2"
                />
                <text
                  y="5"
                  fill={isActive ? '#0B0A0F' : '#F7F5FA'}
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {truncateText(elem.label, 16)}
                </text>
              </g>
            )}

            {/* TYPE 4: IMAGE PLACEHOLDER */}
            {elemType === 'image_placeholder' && (
              <g>
                <rect
                  x="-75"
                  y="-45"
                  width="150"
                  height="90"
                  rx="10"
                  fill="rgba(18, 17, 24, 0.9)"
                  stroke={isActive ? '#C7FF4A' : '#A6A1B2'}
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <text y="-10" fill="#A6A1B2" fontSize="18" textAnchor="middle">🖼️</text>
                <text y="16" fill="#F7F5FA" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {truncateText(elem.label, 16)}
                </text>
              </g>
            )}

            {/* TYPE 5: BOX / NODE / DEFAULT */}
            {(elemType === 'box' || elemType === 'node' || elemType === 'arrow') && (
              <g>
                <rect
                  x="-75"
                  y="-35"
                  width="150"
                  height="70"
                  rx="12"
                  fill={isActive ? 'rgba(199, 255, 74, 0.18)' : 'rgba(24, 22, 32, 0.92)'}
                  stroke={isActive ? '#C7FF4A' : elem.color || 'rgba(255,255,255,0.25)'}
                  strokeWidth={isActive ? 3 : 2}
                  filter={isActive ? 'url(#glow-lime)' : undefined}
                />
                <text
                  y={elem.value ? '-8' : '4'}
                  fill={isActive ? '#C7FF4A' : '#F7F5FA'}
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {truncateText(elem.label, 16)}
                </text>
                {elem.value && (
                  <text y="14" fill="#F7F5FA" fontSize="12" fontWeight="500" textAnchor="middle" fontFamily="monospace">
                    {elem.value}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Ensures visual elements and steps are derived if the backend response contains empty arrays,
 * preventing empty visualization canvas state under all query conditions.
 */
function deriveVisualElementsAndSteps(data: MagicViewData): {
  elements: MagicViewElement[];
  connections: MagicViewConnection[];
  steps: MagicViewStep[];
} {
  let elements = [...(data.elements || [])];
  let connections = [...(data.connections || [])];
  let steps = [...(data.steps || [])];

  if (elements.length > 0) {
    if (steps.length === 0) {
      steps = elements.map((elem, idx) => ({
        step_number: idx + 1,
        title: elem.label,
        description: elem.details || data.summary || `Step ${idx + 1} of ${data.concept} visual explanation.`,
        active_elements: [elem.id],
        highlight_color: '#C7FF4A',
      }));
    }
    return { elements, connections, steps };
  }

  const queryLower = (data.concept || data.title || '').toLowerCase();

  // Case A: Matrix / Math Grid
  if (queryLower.includes('matrix') || (data.visual_type && data.visual_type.includes('math'))) {
    elements = [
      { id: 'm_val1', label: 'Row 1: [ 1  2 ]', type: 'formula', position: { x: 350, y: 230 }, value: '[ 1   2 ]', details: 'Top row entries' },
      { id: 'm_val2', label: 'Row 2: [ 3  4 ]', type: 'formula', position: { x: 350, y: 430 }, value: '[ 3   4 ]', details: 'Bottom row entries' },
      { id: 'm_rows', label: 'ROWS (Horizontal)', type: 'box', position: { x: 800, y: 230 }, color: '#C7FF4A', details: 'Horizontal dimension m' },
      { id: 'm_cols', label: 'COLUMNS (Vertical)', type: 'box', position: { x: 800, y: 430 }, color: '#8B5CF6', details: 'Vertical dimension n' },
    ];
    connections = [
      { from: 'm_val1', to: 'm_rows', label: 'Row 1', direction: 'forward', type: 'arrow' },
      { from: 'm_val2', to: 'm_cols', label: 'Col 1 & 2', direction: 'forward', type: 'arrow' },
    ];
  }
  // Case B: Water Cycle / Process
  else if (queryLower.includes('water') || queryLower.includes('cycle') || (data.visual_type && data.visual_type.includes('cycle'))) {
    elements = [
      { id: 'evap', label: 'Evaporation', type: 'circle', position: { x: 300, y: 460 }, value: 'Heat → Vapor', details: 'Solar heat transforms surface water into vapor' },
      { id: 'cond', label: 'Condensation', type: 'circle', position: { x: 600, y: 180 }, value: 'Cloud Formation', details: 'Cooling vapor condenses into clouds' },
      { id: 'prec', label: 'Precipitation', type: 'circle', position: { x: 900, y: 460 }, value: 'Rain / Snow', details: 'Condensed moisture falls to earth' },
    ];
    connections = [
      { from: 'evap', to: 'cond', label: 'Rises', direction: 'forward', type: 'arrow' },
      { from: 'cond', to: 'prec', label: 'Falls', direction: 'forward', type: 'arrow' },
      { from: 'prec', to: 'evap', label: 'Collection', direction: 'forward', type: 'arrow' },
    ];
  }
  // Case C: Binary Search / Algorithm
  else if (queryLower.includes('binary') || queryLower.includes('search') || (data.visual_type && data.visual_type.includes('algorithm'))) {
    elements = [
      { id: 'arr_l', label: 'Left Pointer (0)', type: 'box', position: { x: 250, y: 320 }, value: 'Val: 2', details: 'Lower search index' },
      { id: 'arr_m', label: 'Middle (Mid)', type: 'circle', position: { x: 600, y: 320 }, value: 'Val: 10', color: '#C7FF4A', details: 'Target compared with middle element' },
      { id: 'arr_r', label: 'Right Pointer (N-1)', type: 'box', position: { x: 950, y: 320 }, value: 'Val: 25', details: 'Upper search index' },
    ];
    connections = [
      { from: 'arr_l', to: 'arr_m', label: 'Target > Mid', direction: 'forward', type: 'arrow' },
      { from: 'arr_m', to: 'arr_r', label: 'Search Right', direction: 'forward', type: 'arrow' },
    ];
  }
  // Case D: Derive from steps if steps array has items
  else if (steps.length > 0) {
    elements = steps.map((s, idx) => ({
      id: `derived_step_${idx + 1}`,
      label: s.title || `Step ${idx + 1}`,
      type: idx % 2 === 0 ? 'box' : 'circle',
      position: { x: 250 + (idx % 3) * 350, y: 220 + Math.floor(idx / 3) * 220 },
      details: s.description,
    }));
    connections = elements.slice(0, -1).map((e, idx) => ({
      from: e.id,
      to: elements[idx + 1].id,
      label: `Step ${idx + 1} → ${idx + 2}`,
      direction: 'forward',
      type: 'arrow',
    }));
  }
  // Case E: Default fallback so canvas is NEVER blank
  else {
    elements = [
      { id: 'n_concept', label: data.concept || 'Target Concept', type: 'circle', position: { x: 350, y: 320 }, value: data.visual_type },
      { id: 'n_summary', label: 'Core Mechanism', type: 'box', position: { x: 850, y: 320 }, color: '#C7FF4A', details: data.summary },
    ];
    connections = [
      { from: 'n_concept', to: 'node_summary', label: 'Mechanism', direction: 'forward', type: 'arrow' },
    ];
  }

  if (steps.length === 0) {
    steps = elements.map((elem, idx) => ({
      step_number: idx + 1,
      title: elem.label,
      description: elem.details || data.summary || `Step ${idx + 1} of ${data.concept} visual explanation.`,
      active_elements: [elem.id],
      highlight_color: '#C7FF4A',
    }));
  }

  return { elements, connections, steps };
}

function truncateText(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
