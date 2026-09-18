import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  HelpCircle,
  EyeOff,
  RotateCcw,
  Brain,
  Edit3,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { Question } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export type ConfidenceLevel = 'Low' | 'Medium' | 'High' | null;
export type MasteryLevel = 'Needs Practice' | 'Developing' | 'Understood' | null;

export interface QuestionAttemptDetail {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  confidence: ConfidenceLevel;
  hintsUsed: number;
  attemptsCount: number;
  mastery: MasteryLevel;
  timeSpentSeconds: number;
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onNext: () => void;
  onAttempt: (detail: QuestionAttemptDetail) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  onNext,
  onAttempt
}) => {
  // Practice Lab Controls State
  const [thinkMode, setThinkMode] = useState<boolean>(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [hintsRevealed, setHintsRevealed] = useState<number>(0);
  const [confidence, setConfidence] = useState<ConfidenceLevel>(null);
  const [scratchpadOpen, setScratchpadOpen] = useState<boolean>(false);
  const [scratchpadText, setScratchpadText] = useState<string>('');

  // Answering & Evaluation State
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [mastery, setMastery] = useState<MasteryLevel>(null);

  // Restore Scratchpad from localStorage on Question Change
  useEffect(() => {
    setThinkMode(false);
    setEliminatedOptions([]);
    setHintsRevealed(0);
    setConfidence(null);
    setSelectedAnswer('');
    setIsSubmitted(false);
    setAttemptsCount(0);
    setShowExplanation(false);
    setMastery(null);
    setStartTime(Date.now());

    try {
      const savedScratch = localStorage.getItem(`learnivo_scratchpad_${question.id}`);
      if (savedScratch) {
        setScratchpadText(savedScratch);
      } else {
        setScratchpadText('');
      }
    } catch {
      setScratchpadText('');
    }
  }, [question.id]);

  // Scratchpad Local Autosave
  const handleScratchpadChange = (text: string) => {
    setScratchpadText(text);
    try {
      localStorage.setItem(`learnivo_scratchpad_${question.id}`, text);
    } catch {}
  };

  const handleClearScratchpad = () => {
    setScratchpadText('');
    try {
      localStorage.removeItem(`learnivo_scratchpad_${question.id}`);
    } catch {}
  };

  // Option Elimination Toggle (Right-click or Eliminate Icon)
  const handleToggleEliminate = (e: React.MouseEvent | null, option: string) => {
    if (e) e.preventDefault();
    if (isSubmitted) return;

    if (eliminatedOptions.includes(option)) {
      setEliminatedOptions(prev => prev.filter(o => o !== option));
    } else {
      setEliminatedOptions(prev => [...prev, option]);
      if (selectedAnswer === option) {
        setSelectedAnswer('');
      }
    }
  };

  // Progressive Hint Handler
  const handleRevealNextHint = () => {
    if (hintsRevealed < 3) {
      setHintsRevealed(prev => prev + 1);
    }
  };

  const isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  // Compute Question Mastery State
  const computeMastery = (correct: boolean, currentAttempts: number, hintsUsed: number): MasteryLevel => {
    if (correct && currentAttempts === 1 && hintsUsed === 0) {
      return 'Understood';
    } else if (correct && (hintsUsed > 0 || currentAttempts > 1)) {
      return 'Developing';
    } else {
      return 'Needs Practice';
    }
  };

  const handleSubmit = () => {
    if (!selectedAnswer || isSubmitted) return;

    const currentAttempts = attemptsCount + 1;
    setAttemptsCount(currentAttempts);
    setIsSubmitted(true);
    setShowExplanation(true);

    const calculatedMastery = computeMastery(isCorrect, currentAttempts, hintsRevealed);
    setMastery(calculatedMastery);

    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    onAttempt({
      questionId: question.id,
      isCorrect,
      userAnswer: selectedAnswer,
      confidence,
      hintsUsed: hintsRevealed,
      attemptsCount: currentAttempts,
      mastery: calculatedMastery,
      timeSpentSeconds: Math.max(5, timeSpent)
    });
  };

  const handleTryAgain = () => {
    setSelectedAnswer('');
    setIsSubmitted(false);
    setShowExplanation(false);
  };

  const handleNextQuestion = () => {
    onNext();
  };

  // Progressive Hint Definitions
  const hintList = [
    `Identify the main concept being tested: ${question.topic}`,
    `Think about how key components interact in ${question.topic}. Consider formal principles and boundary conditions.`,
    question.hint || `In ${question.topic}, focus on: ${question.explanation.slice(0, 100)}...`
  ];

  return (
    <div className="surface-card p-6 md:p-8 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-6 shadow-2xl relative overflow-hidden">
      {/* Top Bar: Topic, Difficulty, Mastery & Think Mode Control */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="lime" className="font-bold">{question.topic}</Badge>
          <Badge
            variant={
              question.difficulty === 'Easy'
                ? 'easy'
                : question.difficulty === 'Medium'
                ? 'medium'
                : 'hard'
            }
          >
            {question.difficulty}
          </Badge>

          {/* Dynamic Question Mastery Badge */}
          {mastery && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1.5 transition-all ${
                mastery === 'Understood'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : mastery === 'Developing'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
              title="Question Mastery Indicator based on your practice session attempts and hint usage."
            >
              <BarChart2 className="w-3 h-3" />
              <span>
                {mastery === 'Understood' ? '● Understood' : mastery === 'Developing' ? '◐ Developing' : '○ Needs Practice'}
              </span>
            </span>
          )}
        </div>

        {/* Think Mode & Progressive Hint Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setThinkMode(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              thinkMode
                ? 'bg-[#C7FF4A]/15 border-[#C7FF4A] text-[#C7FF4A] shadow-md shadow-[#C7FF4A]/10'
                : 'bg-white/5 border-white/10 text-[#A6A1B2] hover:text-white hover:bg-white/10'
            }`}
            title="Enable Think Mode to focus on reasoning before selecting an answer choice."
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Think Mode</span>
          </button>

          {!isSubmitted && (
            <button
              onClick={handleRevealNextHint}
              disabled={hintsRevealed >= 3}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                hintsRevealed > 0
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-[#A6A1B2] hover:text-amber-300 hover:border-amber-500/30'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>{hintsRevealed >= 3 ? 'All Hints Used' : 'Need a hint?'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Think Mode Notice Banner */}
      {thinkMode && (
        <div className="p-3.5 rounded-xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 text-[#C7FF4A] text-xs flex items-center gap-2.5 animate-fadeIn">
          <Brain className="w-4 h-4 text-[#C7FF4A] flex-shrink-0" />
          <span className="font-medium">Take a moment to reason through it before choosing.</span>
        </div>
      )}

      {/* Progressive Hints Display Section */}
      {hintsRevealed > 0 && (
        <div className="space-y-2.5 bg-[#13111C] p-4 rounded-xl border border-amber-500/20">
          <div className="flex items-center justify-between pb-1 border-b border-white/5">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Progressive Hints ({hintsRevealed}/3)
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: hintsRevealed }).map((_, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Hint {i + 1} used
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1 text-xs text-amber-200 leading-relaxed">
            {hintList.slice(0, hintsRevealed).map((hintText, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <span className="font-bold text-amber-400 font-mono text-[11px] flex-shrink-0">
                  Hint {idx + 1}:
                </span>
                <span>{hintText}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Text */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-[#F7F5FA] leading-relaxed mb-6">
          {question.questionText}
        </h3>

        {/* Options List */}
        {question.options && question.options.length > 0 ? (
          <div className="space-y-3">
            <div className="text-[11px] text-[#A6A1B2] flex items-center justify-between px-1">
              <span>Select an answer:</span>
              <span className="text-[10px] italic">Right-click an option to eliminate it</span>
            </div>

            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isEliminated = eliminatedOptions.includes(option);

              let optionStyle = 'border-white/10 bg-[#13111C] hover:border-white/20 text-[#F7F5FA]';

              if (isSubmitted) {
                if (option === question.correctAnswer) {
                  optionStyle = 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-bold ring-1 ring-emerald-500/30';
                } else if (isSelected) {
                  optionStyle = 'border-rose-500/60 bg-rose-500/15 text-rose-300 font-medium';
                } else {
                  optionStyle = 'border-white/5 bg-[#13111C]/50 opacity-40 text-[#A6A1B2]';
                }
              } else if (isEliminated) {
                optionStyle = 'border-white/5 bg-white/5 opacity-40 line-through text-[#6E6A78]';
              } else if (isSelected) {
                optionStyle = 'border-[#C7FF4A] bg-[#C7FF4A]/10 text-[#F7F5FA] font-bold shadow-lg shadow-[#C7FF4A]/5 ring-1 ring-[#C7FF4A]';
              } else if (thinkMode) {
                optionStyle = 'border-white/10 bg-[#13111C]/80 hover:border-white/20 text-[#F7F5FA]/80 scale-[0.99]';
              }

              return (
                <div key={idx} className="relative group flex items-center">
                  <button
                    disabled={isSubmitted || isEliminated}
                    onClick={() => setSelectedAnswer(option)}
                    onContextMenu={(e) => handleToggleEliminate(e, option)}
                    className={`w-full text-left p-4 pr-12 rounded-xl border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center font-mono text-[11px] text-[#A6A1B2] flex-shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </span>

                    {/* Status Icons */}
                    {isSubmitted && option === question.correctAnswer && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                    {isSubmitted && isSelected && option !== question.correctAnswer && (
                      <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    {!isSubmitted && isEliminated && (
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1 font-mono">
                        <XCircle className="w-3.5 h-3.5" /> ELIMINATED
                      </span>
                    )}
                  </button>

                  {/* Eliminate Toggle Button */}
                  {!isSubmitted && (
                    <button
                      onClick={(e) => handleToggleEliminate(e, option)}
                      className={`absolute right-3 p-1.5 rounded-lg transition-colors text-xs ${
                        isEliminated
                          ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10'
                          : 'text-[#A6A1B2]/60 hover:text-rose-400 hover:bg-rose-500/10'
                      }`}
                      title={isEliminated ? 'Restore option' : 'Eliminate option'}
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              disabled={isSubmitted}
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full bg-[#13111C] border border-white/15 rounded-xl px-4 py-3.5 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
            />
          </div>
        )}
      </div>

      {/* Confidence Check Selector (Before Submission) */}
      {!isSubmitted && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#13111C] border border-white/10">
          <span className="text-xs font-semibold text-[#A6A1B2] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C7FF4A]" />
            How confident are you in your answer?
          </span>

          <div className="flex items-center gap-2">
            {(['Low', 'Medium', 'High'] as ConfidenceLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setConfidence(level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  confidence === level
                    ? level === 'High'
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                      : level === 'Medium'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                      : 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-1 ring-rose-400'
                    : 'bg-white/5 border border-white/10 text-[#A6A1B2] hover:text-white hover:bg-white/10'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Scratchpad */}
      <div className="border border-white/10 rounded-xl bg-[#13111C] overflow-hidden">
        <button
          onClick={() => setScratchpadOpen(prev => !prev)}
          className="w-full px-4 py-3 text-xs font-bold text-[#A6A1B2] hover:text-white flex items-center justify-between transition-colors bg-white/5"
        >
          <span className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[#C7FF4A]" />
            Scratchpad {scratchpadText.trim() ? '(Saved)' : ''}
          </span>
          {scratchpadOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {scratchpadOpen && (
          <div className="p-4 space-y-3 border-t border-white/10 bg-[#0D0B14]">
            <textarea
              rows={3}
              value={scratchpadText}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              placeholder="Jot down your reasoning, calculations, or key steps here..."
              className="w-full bg-[#13111C] border border-white/10 rounded-lg p-3 text-xs text-white placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A] resize-y"
            />
            {scratchpadText.trim() && (
              <div className="flex justify-end">
                <button
                  onClick={handleClearScratchpad}
                  className="text-[11px] text-rose-400/80 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear Scratchpad
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submitted Feedback & Detailed Rationale */}
      {isSubmitted && (
        <div
          className={`p-5 rounded-2xl border space-y-3 ${
            isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 font-black text-sm">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300">✓ Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-300">Not quite.</span>
                </>
              )}
            </div>

            {confidence && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/10">
                Confidence: {confidence}
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs leading-relaxed">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              Concept Involved: {question.topic}
            </div>

            {!isCorrect && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-200">
                <span className="font-bold text-rose-300">Why your selection was incorrect: </span>
                Selected choice &quot;{selectedAnswer}&quot; does not satisfy all constraint conditions in {question.topic}.
              </div>
            )}

            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white/90">
              <span className="font-bold text-[#C7FF4A]">Explanation & Rationale: </span>
              {question.explanation}
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="text-xs text-[#A6A1B2] font-mono">
          Question {questionNumber} of {totalQuestions}
        </div>

        <div className="flex items-center gap-3">
          {isSubmitted && !isCorrect && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTryAgain}
              className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Try Again
            </Button>
          )}

          {!isSubmitted ? (
            <Button
              variant="primary"
              disabled={!selectedAnswer}
              onClick={handleSubmit}
              className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              Submit Answer
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNextQuestion}
              className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20 text-xs"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
