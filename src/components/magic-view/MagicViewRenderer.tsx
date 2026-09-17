import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Layers,
  Info,
  Code,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import {
  MagicViewData,
  MagicViewStep,
  MagicViewElement,
  MagicViewConnection,
  MagicViewNarrationPayload
} from '../../types';
import { learnivoBackend } from '../../services/api/learnivoBackend';
import { Button } from '../ui/Button';

interface MagicViewRendererProps {
  data: MagicViewData;
}

type NarrationState = 'idle' | 'loading' | 'speaking' | 'paused' | 'finished';

// Wrap text into clean lines without truncation (max 18 chars for 220px node width)
function wrapSvgText(text: string, maxCharsPerLine: number = 18): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Calculate precise box boundary intersection point for SVG arrow lines
function getBoxIntersection(
  fromX: number,
  fromY: number,
  boxWidth: number,
  boxHeight: number,
  toX: number,
  toY: number
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (dx === 0 && dy === 0) return { x: fromX, y: fromY };

  const halfW = boxWidth / 2 + 4;
  const halfH = boxHeight / 2 + 4;

  const scaleX = Math.abs(dx) > 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0 ? halfH / Math.abs(dy) : Infinity;

  const scale = Math.min(scaleX, scaleY);

  return {
    x: fromX + dx * scale,
    y: fromY + dy * scale,
  };
}

// Injects responsive CSS into raw HTML for iframe preview
function processMagicHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  const injection = `
    <style>
      html, body {
        width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        padding: 20px !important;
        background: #0B0A0F !important;
        color: #F7F5FA !important;
        font-family: system-ui, -apple-system, sans-serif !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .node, .flowchart-node, .step-card, .card, [class*="node"], [class*="box"] {
        min-width: 200px !important;
        max-width: 250px !important;
        min-height: 75px !important;
        font-size: 15px !important;
        font-weight: bold !important;
        padding: 12px 18px !important;
        margin: 14px auto !important;
        box-sizing: border-box !important;
        white-space: normal !important;
        word-break: break-word !important;
        border-radius: 12px !important;
      }
      svg {
        width: 100% !important;
        height: auto !important;
        max-height: 100% !important;
      }
    </style>
  `;
  if (rawHtml.includes('</head>')) {
    return rawHtml.replace('</head>', `${injection}</head>`);
  }
  return injection + rawHtml;
}

export const MagicViewRenderer: React.FC<MagicViewRendererProps> = ({ data }) => {
  // Derive elements, connections, and steps
  const { rawElements, rawConnections, steps } = deriveVisualElementsAndSteps(data);
  const elements = layoutElementsIntelligently(rawElements, rawConnections, data.visual_type);
  const connections = rawConnections;

  const [activeTab, setActiveTab] = useState<'diagram' | 'html' | 'image'>(() =>
    data.html ? 'html' : data.imageUrl ? 'image' : 'diagram'
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Narration & Speech state
  const [narrationState, setNarrationState] = useState<NarrationState>('idle');
  const [narrationError, setNarrationError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentNarrationDataRef = useRef<{ text?: string; audioUrl?: string } | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStep: MagicViewStep | undefined = steps[currentStepIndex];

  // Map element IDs for lookup
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

  useEffect(() => {
    return () => {
      stopActiveNarration();
    };
  }, []);

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
      }, 3500);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, steps.length]);

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
          setNarrationError('Unable to load audio narration. Please try again.');
        };
        audio
          .play()
          .then(() => {
            setNarrationState('speaking');
          })
          .catch((err) => {
            console.warn('Audio playback failed:', err);
            setNarrationState('idle');
            setNarrationError('Unable to load narration. Please try again.');
          });
        return;
      } catch (e) {
        console.warn('Audio initialization error:', e);
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
          console.warn('Speech synthesis error:', e);
          setNarrationState('idle');
        };

        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setNarrationState('speaking');
        return;
      } catch (e) {
        console.warn('Speech synthesis initialization error:', e);
      }
    }

    setNarrationState('idle');
    setNarrationError('No narration available for this step.');
  };

  const handlePlayNarration = async () => {
    if (narrationState === 'loading') return;

    if (narrationState === 'speaking') {
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setNarrationState('paused');
      return;
    }

    if (narrationState === 'paused') {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.warn('Audio play failed on resume:', err));
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      setNarrationState('speaking');
      return;
    }

    setNarrationError(null);

    if (currentNarrationDataRef.current) {
      playNarrationContent(currentNarrationDataRef.current);
      return;
    }

    setNarrationState('loading');
    stopActiveNarration();

    const activeElementsList = activeStep?.active_elements?.length
      ? activeStep.active_elements
      : elements.map((e) => e.id);

    const visualContext = activeElementsList.length
      ? `Highlighting nodes: ${activeElementsList.join(', ')}`
      : `Visual explanation diagram for ${data.concept || data.title}`;

    const stepNum = activeStep ? activeStep.step_number : currentStepIndex + 1;
    const stepTitle = activeStep ? activeStep.title : `Step ${currentStepIndex + 1}`;
    const stepExplanation = activeStep ? activeStep.description : data.summary;
    const keyTakeaway = data.key_takeaway || data.summary;

    const payload: MagicViewNarrationPayload = {
      question: data.concept || data.title,
      concept: data.concept || data.title,
      stepNumber: stepNum,
      stepTitle: stepTitle,
      stepExplanation: stepExplanation,
      visualContext: visualContext,
      keyTakeaway: keyTakeaway,
      step: {
        number: stepNum,
        title: stepTitle,
        explanation: stepExplanation,
      },
      visual_context: visualContext,
      key_takeaway: keyTakeaway,
    };

    const result = await learnivoBackend.fetchMagicViewNarration(payload);

    if (!result.success) {
      setNarrationState('idle');
      setNarrationError(result.errorMessage || 'Unable to load explanation. Please try again.');
      return;
    }

    const narrationData = { text: result.text, audioUrl: result.audioUrl };
    currentNarrationDataRef.current = narrationData;
    playNarrationContent(narrationData);
  };

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
    <div className="surface-card border border-[#C7FF4A]/40 rounded-2xl overflow-hidden shadow-2xl bg-[#0B0A0F] text-[#F7F5FA] my-4 transition-all w-full">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#181620] via-[#121118] to-[#181620] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C7FF4A]/15 border border-[#C7FF4A]/40 flex items-center justify-center text-[#C7FF4A] shadow-[0_0_16px_rgba(199,255,74,0.35)]">
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
            <h3 className="text-base sm:text-xl font-extrabold text-[#F7F5FA] mt-0.5">
              {data.title || data.concept}
            </h3>
          </div>
        </div>

        {steps.length > 1 && (
          <div className="flex items-center gap-2 bg-[#181620] px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-[#A6A1B2]">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Description */}
        {data.summary && (
          <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed bg-[#121118] p-4 rounded-xl border border-white/5">
            {data.summary}
          </p>
        )}

        {/* View Switcher Tabs */}
        {(data.html || data.imageUrl) && (
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              onClick={() => setActiveTab('diagram')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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

        {/* Responsive Grid: Left Panel ~62% Width (7 Cols), Right Panel ~38% Width (5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          {/* Main Visual Display (Left Panel ~62% Width, min-height 500px, scrollable max-height 650px) */}
          <div className="lg:col-span-7 w-full bg-[#121118] p-3 sm:p-5 rounded-xl border border-white/10 flex flex-col justify-center items-center min-h-[500px] max-h-[650px] overflow-y-auto overflow-x-hidden relative box-border">
            {activeTab === 'html' && data.html ? (
              <div className="w-full h-full flex flex-col rounded-lg overflow-hidden min-h-[480px]">
                <div className="p-2 bg-[#181620] border-b border-white/10 flex items-center justify-between text-xs text-[#A6A1B2] mb-2">
                  <span className="font-semibold text-[#C7FF4A] flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> HTML Preview
                  </span>
                </div>
                <div className="w-full h-[480px] bg-[#0B0A0F] rounded-lg overflow-hidden relative">
                  <iframe
                    srcDoc={processMagicHtml(data.html)}
                    title="Magic View HTML Code Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            ) : activeTab === 'image' && data.imageUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[480px]">
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
                  alt={data.title || 'Magic View Image Preview'}
                  className="max-h-[480px] w-auto max-w-full object-contain rounded-lg border border-white/10 shadow-lg"
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

          {/* Explanation & Controls Panel (Right Panel ~38% Width) */}
          <div className="lg:col-span-5 w-full flex flex-col justify-between space-y-4">
            {/* Active Step Card */}
            {activeStep ? (
              <div className="bg-[#181620] p-5 sm:p-6 rounded-xl border border-white/10 flex-1 flex flex-col justify-between max-h-[580px] overflow-y-auto w-full box-border">
                <div className="space-y-4 w-full break-words">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <span className="w-8 h-8 rounded-full bg-[#C7FF4A] text-[#0B0A0F] font-extrabold text-sm flex items-center justify-center shadow-md shadow-[#C7FF4A]/20 flex-shrink-0">
                      {activeStep.step_number}
                    </span>
                    <h4 className="text-base font-bold text-[#F7F5FA] leading-snug">
                      {activeStep.title}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-[#C7FF4A]" /> What is happening?
                    </h5>
                    <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed">
                      {activeStep.description}
                    </p>
                  </div>
                </div>

                {/* Clicked Element Details Inspector */}
                {selectedElement && (
                  <div className="mt-4 p-3.5 rounded-lg bg-[#121118] border border-[#8B5CF6]/40 text-xs space-y-1.5 w-full box-border">
                    <div className="flex items-center justify-between text-[#8B5CF6] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        {selectedElement.label}
                      </span>
                      <button
                        onClick={() => setSelectedElementId(null)}
                        className="text-[10px] text-[#A6A1B2] hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                    {selectedElement.value && (
                      <p className="text-[11px] text-[#F7F5FA] font-mono bg-white/5 p-1 rounded break-all">
                        Value: {selectedElement.value}
                      </p>
                    )}
                    {selectedElement.details && (
                      <p className="text-[11px] text-[#A6A1B2] leading-relaxed">
                        {selectedElement.details}
                      </p>
                    )}
                  </div>
                )}

                {/* Steps Selector Progress Bar */}
                {steps.length > 1 && (
                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
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
                        className={`h-3 rounded-full transition-all ${
                          idx === currentStepIndex
                            ? 'w-10 bg-[#C7FF4A] shadow-[0_0_10px_rgba(199,255,74,0.7)]'
                            : 'w-3 bg-white/20 hover:bg-white/40'
                        }`}
                        title={`Jump to Step ${s.step_number}: ${s.title}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#181620] p-6 rounded-xl border border-white/10 text-center py-10">
                <Layers className="w-8 h-8 text-[#A6A1B2] mx-auto mb-2" />
                <p className="text-xs text-[#A6A1B2]">Visualizing concept elements...</p>
              </div>
            )}

            {/* Narration Error Notification */}
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

            {/* Animation & Narration Controls */}
            <div className="flex items-center justify-between gap-2 p-3 bg-[#121118] rounded-xl border border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="text-xs px-2.5"
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
                className="text-xs px-2.5"
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
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#C7FF4A]/10 via-[#181620] to-[#8B5CF6]/10 border border-[#C7FF4A]/30 flex items-start gap-3">
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
// SVG CANVAS COMPONENT (Optimized Node Size & Crisp Flowchart Connections)
// Node Size: Width 220px, Height 80px-88px (Desktop Range 190-250px)
// Connection Gap: 46px vertical spacing with center-aligned arrow lines & badges
// Dynamic ViewBox: Dynamic bounding box fitting around elements
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
  // Compute dynamic Bounding Box of all nodes & labels
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((elem) => {
    const x = elem.position?.x ?? 400;
    const y = elem.position?.y ?? 200;

    const labelLines = wrapSvgText(elem.label || 'Node Element', 18);
    const boxWidth = elem.width || 220;
    const lineCount = labelLines.length || 1;
    const hasValue = Boolean(elem.value);
    const boxHeight = elem.height || (lineCount > 1 || hasValue ? 88 : 80);

    const halfW = boxWidth / 2;
    const halfH = boxHeight / 2;

    minX = Math.min(minX, x - halfW);
    maxX = Math.max(maxX, x + halfW);
    minY = Math.min(minY, y - halfH);
    maxY = Math.max(maxY, y + halfH);
  });

  connections.forEach((conn) => {
    const fromElem = elementsMap[conn.from];
    const toElem = elementsMap[conn.to];
    if (fromElem && toElem && conn.label) {
      const midX = ((fromElem.position?.x ?? 400) + (toElem.position?.x ?? 400)) / 2;
      const midY = ((fromElem.position?.y ?? 200) + (toElem.position?.y ?? 200)) / 2;
      const labelW = conn.label.length * 7 + 20;
      minX = Math.min(minX, midX - labelW / 2);
      maxX = Math.max(maxX, midX + labelW / 2);
      minY = Math.min(minY, midY - 14);
      maxY = Math.max(maxY, midY + 14);
    }
  });

  if (minX === Infinity || maxX === -Infinity) {
    minX = 290;
    maxX = 510;
    minY = 30;
    maxY = 650;
  }

  // Padding around diagram inside viewBox
  const paddingX = 40;
  const paddingY = 30;

  const vbX = Math.floor(minX - paddingX);
  const vbY = Math.floor(minY - paddingY);
  const vbW = Math.max(300, Math.ceil(maxX - minX + paddingX * 2));
  const vbH = Math.max(220, Math.ceil(maxY - minY + paddingY * 2));

  const viewBoxStr = `${vbX} ${vbY} ${vbW} ${vbH}`;

  return (
    <svg
      viewBox={viewBoxStr}
      className="w-full h-auto max-h-[560px] object-contain select-none transition-all duration-300"
    >
      <defs>
        {/* Arrowhead Marker Definitions */}
        <marker
          id="arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7.5"
          markerHeight="7.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#C7FF4A" />
        </marker>

        <marker
          id="arrow-neutral"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#8B5CF6" />
        </marker>

        {/* Subtle Glow Filter */}
        <filter id="glow-lime-subtle" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="glow-purple-subtle" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Grid Background Pattern */}
      <pattern id="grid-pattern-clean" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      </pattern>
      <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#grid-pattern-clean)" rx="12" />

      {/* RENDER CONNECTIONS WITH CLEAN ANCHORED SPACING */}
      {connections.map((conn, idx) => {
        const fromElem = elementsMap[conn.from];
        const toElem = elementsMap[conn.to];

        if (!fromElem || !toElem) return null;

        const fromX = fromElem.position?.x ?? 400;
        const fromY = fromElem.position?.y ?? 70;
        const toX = toElem.position?.x ?? 400;
        const toY = toElem.position?.y ?? 196;

        const fromW = fromElem.width || 220;
        const fromLabelLines = wrapSvgText(fromElem.label || '', 18);
        const fromH = fromElem.height || (fromLabelLines.length > 1 || fromElem.value ? 88 : 80);

        const toW = toElem.width || 220;
        const toLabelLines = wrapSvgText(toElem.label || '', 18);
        const toH = toElem.height || (toLabelLines.length > 1 || toElem.value ? 88 : 80);

        // Calculate exact start & end points at node borders
        const startPt = getBoxIntersection(fromX, fromY, fromW, fromH, toX, toY);
        const endPt = getBoxIntersection(toX, toY, toW, toH, fromX, fromY);

        const isConnActive = activeElementIds.has(fromElem.id) || activeElementIds.has(toElem.id);
        const midX = (startPt.x + endPt.x) / 2;
        const midY = (startPt.y + endPt.y) / 2;

        const isDashed = conn.type === 'dashed';
        const markerId = isConnActive ? 'url(#arrow-active)' : 'url(#arrow-neutral)';
        const strokeColor = isConnActive ? '#C7FF4A' : conn.color || '#8B5CF6';

        return (
          <g key={`conn_${idx}_${conn.from}_${conn.to}`}>
            {/* SVG Connector Line */}
            <line
              x1={startPt.x}
              y1={startPt.y}
              x2={endPt.x}
              y2={endPt.y}
              stroke={strokeColor}
              strokeWidth={isConnActive ? 3 : 2}
              strokeDasharray={isDashed ? '6 6' : undefined}
              markerEnd={conn.direction !== 'none' ? markerId : undefined}
              opacity={isConnActive ? 1 : 0.8}
              className="transition-all duration-300"
            />

            {/* Connection Label Badge Positioned Cleanly Between Nodes */}
            {conn.label && (
              <g transform={`translate(${midX}, ${midY})`}>
                <rect
                  x={-(conn.label.length * 3.8 + 8)}
                  y="-11"
                  width={conn.label.length * 7.6 + 16}
                  height="22"
                  rx="6"
                  fill="#121118"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="4"
                  fill="#F7F5FA"
                  fontSize="12"
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

      {/* RENDER ELEMENTS WITH REFINED NODE SIZE (220px x 80px-88px) */}
      {elements.map((elem) => {
        const x = elem.position?.x ?? 400;
        const y = elem.position?.y ?? 200;
        const isActive = activeElementIds.has(elem.id);
        const isSelected = selectedElementId === elem.id;

        const elemType = (elem.type || 'box').toLowerCase();

        // Wrap label lines for ZERO truncation
        const labelLines = wrapSvgText(elem.label || 'Node Element', 18);

        const boxWidth = elem.width || 220;
        const lineCount = labelLines.length || 1;
        const hasValue = Boolean(elem.value);
        const boxHeight = elem.height || (lineCount > 1 || hasValue ? 88 : 80);

        const halfW = boxWidth / 2;
        const halfH = boxHeight / 2;

        return (
          <g
            key={elem.id}
            transform={`translate(${x}, ${y}) scale(${isActive || isSelected ? 1.03 : 1})`}
            onClick={() => onSelectElement(elem.id)}
            className="cursor-pointer group transition-all duration-300"
          >
            {/* Active Glow Outline */}
            {(isActive || isSelected) && (
              <rect
                x={-halfW - 4}
                y={-halfH - 4}
                width={boxWidth + 8}
                height={boxHeight + 8}
                rx="14"
                fill="none"
                stroke={isSelected ? '#8B5CF6' : '#C7FF4A'}
                strokeWidth="2.5"
                strokeDasharray="5 5"
                className="opacity-80"
              />
            )}

            {/* TYPE 1: CIRCLE */}
            {elemType === 'circle' && (
              <g>
                <circle
                  r={Math.max(50, halfW * 0.48)}
                  fill={isActive ? 'rgba(199, 255, 74, 0.18)' : 'rgba(24, 22, 32, 0.94)'}
                  stroke={isActive ? '#C7FF4A' : elem.color || 'rgba(255,255,255,0.3)'}
                  strokeWidth={isActive ? 3 : 2}
                  filter={isActive ? 'url(#glow-lime-subtle)' : undefined}
                />
                {labelLines.map((line, lIdx) => {
                  const startY = -(labelLines.length - 1) * 9 + (hasValue ? -7 : 0);
                  return (
                    <text
                      key={lIdx}
                      x="0"
                      y={startY + lIdx * 18}
                      fill={isActive ? '#C7FF4A' : '#F7F5FA'}
                      fontSize="15"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {line}
                    </text>
                  );
                })}
                {elem.value && (
                  <text
                    x="0"
                    y={(labelLines.length - 1) * 9 + 18}
                    fill="#C7FF4A"
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {elem.value}
                  </text>
                )}
              </g>
            )}

            {/* TYPE 2: FORMULA / MATH */}
            {elemType === 'formula' && (
              <g>
                <rect
                  x={-halfW}
                  y={-halfH}
                  width={boxWidth}
                  height={boxHeight}
                  rx="12"
                  fill={isActive ? 'rgba(139, 92, 246, 0.22)' : 'rgba(18, 17, 24, 0.95)'}
                  stroke={isActive ? '#C7FF4A' : '#8B5CF6'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  filter={isActive ? 'url(#glow-purple-subtle)' : undefined}
                />
                {labelLines.map((line, lIdx) => {
                  const startY = -halfH + 24;
                  return (
                    <text
                      key={lIdx}
                      x="0"
                      y={startY + lIdx * 18}
                      fill="#C7FF4A"
                      fontSize="13"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {line}
                    </text>
                  );
                })}
                <text
                  x="0"
                  y={halfH - 14}
                  fill="#F7F5FA"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="serif"
                  fontStyle="italic"
                >
                  {elem.value || elem.label}
                </text>
              </g>
            )}

            {/* TYPE 3: TEXT / PILL */}
            {elemType === 'text' && (
              <g>
                <rect
                  x={-halfW}
                  y={-halfH}
                  width={boxWidth}
                  height={boxHeight}
                  rx={halfH}
                  fill={isActive ? '#C7FF4A' : 'rgba(24, 22, 32, 0.94)'}
                  stroke={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="2"
                />
                {labelLines.map((line, lIdx) => {
                  const startY = -(labelLines.length - 1) * 9;
                  return (
                    <text
                      key={lIdx}
                      x="0"
                      y={startY + lIdx * 18 + 4}
                      fill={isActive ? '#0B0A0F' : '#F7F5FA'}
                      fontSize="15"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {line}
                    </text>
                  );
                })}
              </g>
            )}

            {/* TYPE 4: BOX / NODE / DEFAULT */}
            {(elemType === 'box' || elemType === 'node' || elemType === 'arrow' || elemType === 'image_placeholder') && (
              <g>
                <rect
                  x={-halfW}
                  y={-halfH}
                  width={boxWidth}
                  height={boxHeight}
                  rx="12"
                  fill={isActive ? 'rgba(199, 255, 74, 0.16)' : 'rgba(24, 22, 32, 0.95)'}
                  stroke={isActive ? '#C7FF4A' : elem.color || 'rgba(255,255,255,0.3)'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  filter={isActive ? 'url(#glow-lime-subtle)' : undefined}
                />
                {labelLines.map((line, lIdx) => {
                  // Vertically center lines in node box
                  const startY = -halfH + 26 + (hasValue ? 0 : (boxHeight - 52 - labelLines.length * 18) / 2);
                  return (
                    <text
                      key={lIdx}
                      x="0"
                      y={startY + lIdx * 18}
                      fill={isActive ? '#C7FF4A' : '#F7F5FA'}
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {line}
                    </text>
                  );
                })}
                {elem.value && (
                  <text
                    x="0"
                    y={halfH - 14}
                    fill="#F7F5FA"
                    fontSize="13"
                    fontWeight="500"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
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
 * Intelligent Layout engine: Allocates spacious coordinates for nodes with explicit V_GAP (46px)
 * and H_GAP (60px) so nodes NEVER overlap each other or connection arrows.
 */
function layoutElementsIntelligently(
  elements: MagicViewElement[],
  connections: MagicViewConnection[],
  visualType: string = 'diagram'
): MagicViewElement[] {
  if (elements.length === 0) return elements;

  const vType = visualType.toLowerCase();

  const total = elements.length;
  const isCycle = vType.includes('cycle') || vType.includes('loop');
  const isHorizontal = vType.includes('horizontal') || vType.includes('timeline') || vType.includes('pipeline');
  const isComparison = vType.includes('compare') || vType.includes('versus') || (total === 4 && connections.length >= 2);

  // 1. Cycle Layout (Circular Spacing around Center 380, 280)
  if (isCycle && total >= 3) {
    const centerX = 380;
    const centerY = 280;
    const radius = Math.min(240, 170 + total * 15);

    return elements.map((elem, i) => {
      const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
      return {
        ...elem,
        width: 220,
        height: 80,
        position: {
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle)),
        },
      };
    });
  }

  // 2. Horizontal Flow (Left to Right: Node 220px + Gap 60px = 280px Step)
  if (isHorizontal) {
    const nodeWidth = 220;
    const hGap = 60;
    const spacingX = nodeWidth + hGap; // 280px
    const startX = 160;

    return elements.map((elem, i) => ({
      ...elem,
      width: nodeWidth,
      height: 80,
      position: {
        x: startX + i * spacingX,
        y: 140,
      },
    }));
  }

  // 3. 2-Column Comparison Layout (Column 1: 200px, Column 2: 540px, Row Step: 136px)
  if (isComparison && total >= 4) {
    const col1X = 200;
    const col2X = 540;
    const rowStep = 136;
    const startY = 80;

    return elements.map((elem, i) => ({
      ...elem,
      width: 220,
      height: 80,
      position: {
        x: i % 2 === 0 ? col1X : col2X,
        y: startY + Math.floor(i / 2) * rowStep,
      },
    }));
  }

  // 4. Default Vertical Flow (Top to Bottom: Center X=400, Row Step=126px [Node Height 80px + V_GAP 46px])
  const nodeWidth = 220;
  const nodeHeight = 80;
  const vGap = 46;
  const rowStep = nodeHeight + vGap; // 126px between centers
  const startY = 70;

  return elements.map((elem, i) => {
    const labelLines = wrapSvgText(elem.label || '', 18);
    const dynamicH = labelLines.length > 1 || elem.value ? 88 : 80;
    return {
      ...elem,
      width: nodeWidth,
      height: dynamicH,
      position: {
        x: 400,
        y: startY + i * rowStep,
      },
    };
  });
}

/**
 * Ensures visual elements and steps are derived if the backend response contains empty arrays.
 */
function deriveVisualElementsAndSteps(data: MagicViewData): {
  rawElements: MagicViewElement[];
  rawConnections: MagicViewConnection[];
  steps: MagicViewStep[];
} {
  let rawElements = [...(data.elements || [])];
  let rawConnections = [...(data.connections || [])];
  let steps = [...(data.steps || [])];

  if (rawElements.length > 0) {
    if (steps.length === 0) {
      steps = rawElements.map((elem, idx) => ({
        step_number: idx + 1,
        title: elem.label,
        description: elem.details || data.summary || `Step ${idx + 1} of ${data.concept} visual explanation.`,
        active_elements: [elem.id],
        highlight_color: '#C7FF4A',
      }));
    }
    return { rawElements, rawConnections, steps };
  }

  const queryLower = (data.concept || data.title || '').toLowerCase();

  if (queryLower.includes('matrix') || (data.visual_type && data.visual_type.includes('math'))) {
    rawElements = [
      { id: 'm_val1', label: 'Row 1: [ 1  2 ]', type: 'formula', position: { x: 200, y: 100 }, value: '[ 1   2 ]', details: 'Top row entries' },
      { id: 'm_val2', label: 'Row 2: [ 3  4 ]', type: 'formula', position: { x: 200, y: 236 }, value: '[ 3   4 ]', details: 'Bottom row entries' },
      { id: 'm_rows', label: 'ROWS (Horizontal)', type: 'box', position: { x: 540, y: 100 }, color: '#C7FF4A', details: 'Horizontal dimension m' },
      { id: 'm_cols', label: 'COLUMNS (Vertical)', type: 'box', position: { x: 540, y: 236 }, color: '#8B5CF6', details: 'Vertical dimension n' },
    ];
    rawConnections = [
      { from: 'm_val1', to: 'm_rows', label: 'Row 1', direction: 'forward', type: 'arrow' },
      { from: 'm_val2', to: 'm_cols', label: 'Col 1 & 2', direction: 'forward', type: 'arrow' },
    ];
  } else if (queryLower.includes('water') || queryLower.includes('cycle') || (data.visual_type && data.visual_type.includes('cycle'))) {
    rawElements = [
      { id: 'evap', label: 'Evaporation', type: 'circle', position: { x: 220, y: 320 }, value: 'Heat → Vapor', details: 'Solar heat transforms surface water into vapor' },
      { id: 'cond', label: 'Condensation', type: 'circle', position: { x: 380, y: 120 }, value: 'Cloud Formation', details: 'Cooling vapor condenses into clouds' },
      { id: 'prec', label: 'Precipitation', type: 'circle', position: { x: 540, y: 320 }, value: 'Rain / Snow', details: 'Condensed moisture falls to earth' },
    ];
    rawConnections = [
      { from: 'evap', to: 'cond', label: 'Rises', direction: 'forward', type: 'arrow' },
      { from: 'cond', to: 'prec', label: 'Falls', direction: 'forward', type: 'arrow' },
      { from: 'prec', to: 'evap', label: 'Collection', direction: 'forward', type: 'arrow' },
    ];
  } else if (queryLower.includes('binary') || queryLower.includes('search') || (data.visual_type && data.visual_type.includes('algorithm'))) {
    rawElements = [
      { id: 'arr_l', label: 'Left Pointer (0)', type: 'box', position: { x: 160, y: 140 }, value: 'Val: 2', details: 'Lower search index' },
      { id: 'arr_m', label: 'Middle (Mid)', type: 'circle', position: { x: 440, y: 140 }, value: 'Val: 10', color: '#C7FF4A', details: 'Target compared with middle element' },
      { id: 'arr_r', label: 'Right Pointer (N-1)', type: 'box', position: { x: 720, y: 140 }, value: 'Val: 25', details: 'Upper search index' },
    ];
    rawConnections = [
      { from: 'arr_l', to: 'arr_m', label: 'Target > Mid', direction: 'forward', type: 'arrow' },
      { from: 'arr_m', to: 'arr_r', label: 'Search Right', direction: 'forward', type: 'arrow' },
    ];
  } else if (steps.length > 0) {
    rawElements = steps.map((s, idx) => ({
      id: `derived_step_${idx + 1}`,
      label: s.title || `Step ${idx + 1}`,
      type: idx % 2 === 0 ? 'box' : 'circle',
      position: { x: 400, y: 70 + idx * 126 },
      details: s.description,
    }));
    rawConnections = rawElements.slice(0, -1).map((e, idx) => ({
      from: e.id,
      to: rawElements[idx + 1].id,
      label: `Step ${idx + 1} → ${idx + 2}`,
      direction: 'forward',
      type: 'arrow',
    }));
  } else {
    rawElements = [
      { id: 'n_concept', label: data.concept || 'Target Concept', type: 'circle', position: { x: 230, y: 140 }, value: data.visual_type },
      { id: 'n_summary', label: 'Core Mechanism', type: 'box', position: { x: 510, y: 140 }, color: '#C7FF4A', details: data.summary },
    ];
    rawConnections = [
      { from: 'n_concept', to: 'n_summary', label: 'Mechanism', direction: 'forward', type: 'arrow' },
    ];
  }

  if (steps.length === 0) {
    steps = rawElements.map((elem, idx) => ({
      step_number: idx + 1,
      title: elem.label,
      description: elem.details || data.summary || `Step ${idx + 1} of ${data.concept} visual explanation.`,
      active_elements: [elem.id],
      highlight_color: '#C7FF4A',
    }));
  }

  return { rawElements, rawConnections, steps };
}
