import React, { useState, useEffect } from 'react';
import {
  Award,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Loader2,
  Maximize2,
  ShieldAlert
} from 'lucide-react';
import {
  AssessmentSuiteData,
  NormalizedAssessmentQuestion,
  UserAssessmentAnswers
} from '../../types';
import { assessmentHistoryService, AssessmentHistoryRecord, QuestionReviewDetail } from '../../services/assessmentHistoryService';
import { Button } from '../ui/Button';

interface AssessmentEngineProps {
  suiteData: AssessmentSuiteData;
  onFinishAssessment: (resultRecord: AssessmentHistoryRecord) => void;
}

export const AssessmentEngine: React.FC<AssessmentEngineProps> = ({
  suiteData,
  onFinishAssessment
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAssessmentAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isFullscreenExited, setIsFullscreenExited] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedRecord, setCompletedRecord] = useState<AssessmentHistoryRecord | null>(null);

  // Fullscreen API protection
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen API request prevented or unsupported:', err);
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmitted) {
        setIsFullscreenExited(true);
      } else {
        setIsFullscreenExited(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isSubmitted]);

  const requestReentryFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreenExited(false);
    } catch (err) {
      console.warn('Re-entry fullscreen error:', err);
      setIsFullscreenExited(false);
    }
  };

  const { questions, subject_code, subject_name, total_questions } = suiteData;
  const currentQ: NormalizedAssessmentQuestion = questions[currentIndex] || questions[0];
  const qNum = currentQ.question_number;
  const selectedKey = userAnswers[qNum];

  const handleSelectOption = (optionKey: string) => {
    if (isSubmitted || isSubmitting) return;
    setUserAnswers(prev => ({
      ...prev,
      [qNum]: optionKey
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleFinishAssessment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const questionDetails: QuestionReviewDetail[] = questions.map(q => {
      const userChoice = userAnswers[q.question_number];
      const isAns = Boolean(userChoice);
      const isCorrect = isAns && userChoice.toUpperCase() === q.correct_answer.toUpperCase();

      if (!isAns) unansweredCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      return {
        question_number: q.question_number,
        unit: q.unit,
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        user_answer: userChoice || '',
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation
      };
    });

    const total = total_questions || questions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const score = correctCount;

    // Exit browser fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Exit fullscreen note:', err);
    }

    // Save result to Supabase & localStorage
    const record = await assessmentHistoryService.saveResult({
      subject_code,
      subject_name,
      total_questions: total,
      correct_answers: correctCount,
      wrong_answers: wrongCount,
      unanswered: unansweredCount,
      score,
      percentage,
      completed_at: new Date().toISOString(),
      details: questionDetails
    });

    setCompletedRecord(record);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  // 1. RESULT SCREEN (After Finishing)
  if (isSubmitted && completedRecord) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto py-8">
        {/* Header / Summary Card */}
        <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C7FF4A]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 uppercase">
                  Assessment Completed
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#F7F5FA] tracking-tight">
                {completedRecord.subject_name}
              </h2>
              <p className="text-xs text-[#A6A1B2] mt-1 font-mono">
                Code: {completedRecord.subject_code} • {completedRecord.total_questions} Questions Evaluated
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => onFinishAssessment(completedRecord)}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              Back to Assessments
            </Button>
          </div>

          {/* Score Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 text-center space-y-2">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider">
                Overall Score
              </div>
              <div className="text-5xl font-black text-[#C7FF4A] tracking-tight">
                {completedRecord.score} <span className="text-2xl font-normal text-[#A6A1B2]">/ {completedRecord.total_questions}</span>
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30">
                {completedRecord.percentage}% Score
              </div>
            </div>

            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 flex flex-col items-center justify-center space-y-3">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider">
                Performance Summary
              </div>
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#C7FF4A] transition-all duration-1000 ease-out"
                    strokeDasharray={`${completedRecord.percentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{completedRecord.percentage}%</span>
                  <span className="text-[9px] text-[#A6A1B2] uppercase font-semibold">Accuracy</span>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 space-y-3">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider mb-2">
                Answer Distribution
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">Correct</span>
                </div>
                <span className="font-bold text-emerald-400">{completedRecord.correct_answers}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-rose-300">Wrong</span>
                </div>
                <span className="font-bold text-rose-400">{completedRecord.wrong_answers}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-amber-300">Unanswered</span>
                </div>
                <span className="font-bold text-amber-400">{completedRecord.unanswered}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        {completedRecord.details && completedRecord.details.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#F7F5FA] flex items-center gap-2">
              <span>Review Answers</span>
              <span className="text-xs font-normal text-[#A6A1B2]">({completedRecord.details.length} Questions)</span>
            </h3>

            <div className="space-y-4">
              {completedRecord.details.map((q) => {
                const userAnsKey = q.user_answer;
                const isAnsProvided = Boolean(userAnsKey);
                const isCorrect = q.is_correct;

                const originalQ = questions.find(item => item.question_number === q.question_number);
                const userOptObj = originalQ?.options.find(o => o.key.toUpperCase() === (userAnsKey || '').toUpperCase());
                const correctOptObj = originalQ?.options.find(o => o.key.toUpperCase() === q.correct_answer.toUpperCase());

                return (
                  <div
                    key={q.question_number}
                    className={`p-6 rounded-2xl border transition-all ${
                      !isAnsProvided
                        ? 'bg-[#13111C] border-amber-500/30'
                        : isCorrect
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-[#A6A1B2]">
                        <span className="font-bold text-white">Question {q.question_number}</span>
                        <span>•</span>
                        <span>{q.unit}</span>
                        <span>•</span>
                        <span>{q.topic}</span>
                      </div>

                      <div>
                        {!isAnsProvided ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <HelpCircle className="w-3.5 h-3.5" /> Unanswered
                          </span>
                        ) : isCorrect ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> ✕ Wrong
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-semibold text-[#F7F5FA] mb-4 leading-relaxed">
                      {q.question}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
                      <div className={`p-3.5 rounded-xl border ${
                        !isAnsProvided
                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                          : isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}>
                        <span className="font-bold block text-[11px] uppercase tracking-wider mb-1 text-white/60">
                          Your Answer:
                        </span>
                        <span className="font-semibold text-sm">
                          {userAnsKey ? `${userAnsKey}. ${userOptObj ? userOptObj.text : ''}` : '—'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-200">
                        <span className="font-bold block text-[11px] uppercase tracking-wider mb-1 text-emerald-400/70">
                          Correct Answer:
                        </span>
                        <span className="font-semibold text-sm text-emerald-300">
                          {q.correct_answer}. {correctOptObj ? correctOptObj.text : ''}
                        </span>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="p-4 rounded-xl bg-[#08070E] border border-white/10 text-xs space-y-1">
                        <div className="font-bold text-[#C7FF4A] flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Explanation:</span>
                        </div>
                        <p className="text-[#A6A1B2] leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. ACTIVE EXAM MODE INTERFACE (FULL-SCREEN VIEWPORT)
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-[#08090D] text-[#F7F5FA] flex flex-col overflow-y-auto min-h-screen">
      {/* Fullscreen Exit Protection Warning Overlay */}
      {isFullscreenExited && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#13111C] border border-amber-500/40 rounded-2xl p-8 max-w-md text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Exam Mode Paused</h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Full-screen browser focus was exited. Click below to re-enter full-screen mode and continue your exam. Your answers are saved.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={requestReentryFullscreen}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] w-full"
            >
              <Maximize2 className="w-4 h-4 mr-2" />
              Resume Fullscreen Exam
            </Button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-[#0D0B14] border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A] font-black text-sm">
            L
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-wider uppercase">
              {subject_name}
            </h1>
            <p className="text-[11px] font-mono text-[#A6A1B2]">
              Code: {subject_code} • Full-Screen Exam Mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-white">
              Question {currentIndex + 1} of {questions.length}
            </div>
            <div className="text-[10px] text-[#C7FF4A] font-semibold">
              Answered: {answeredCount} / {questions.length}
            </div>
          </div>

          <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden hidden sm:block">
            <div
              className="bg-[#C7FF4A] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Progress Dots Bar */}
          <div className="flex items-center gap-1.5 justify-center py-2 overflow-x-auto">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAns = Boolean(userAnswers[q.question_number]);

              return (
                <button
                  key={q.question_number}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#C7FF4A] text-black scale-110 shadow-lg shadow-[#C7FF4A]/20 ring-2 ring-white'
                      : isAns
                      ? 'bg-[#C7FF4A]/20 text-[#C7FF4A] border border-[#C7FF4A]/40'
                      : 'bg-[#13111C] text-[#A6A1B2] border border-white/10 hover:border-white/30'
                  }`}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>

          {/* Active Question Card */}
          <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-full bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 font-bold">
                  Question {currentQ.question_number}
                </span>
                <span className="text-[#A6A1B2] font-mono">
                  {currentQ.unit} • {currentQ.topic} • {currentQ.difficulty}
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#F7F5FA] leading-relaxed pt-2">
                {currentQ.question}
              </h3>
            </div>

            {/* Options Radio List */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = selectedKey?.toUpperCase() === opt.key.toUpperCase();

                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 group ${
                      isSelected
                        ? 'bg-[#C7FF4A]/10 border-[#C7FF4A] text-[#F7F5FA] shadow-lg shadow-[#C7FF4A]/5 ring-1 ring-[#C7FF4A]'
                        : 'bg-[#13111C] border-white/10 text-[#A6A1B2] hover:border-white/20 hover:text-[#F7F5FA] hover:bg-[#181624]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isSelected
                          ? 'border-[#C7FF4A] bg-[#C7FF4A]'
                          : 'border-white/30 group-hover:border-white/50'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>

                    <div className="text-sm leading-relaxed">
                      <span className={`font-bold mr-1.5 ${isSelected ? 'text-[#C7FF4A]' : 'text-white'}`}>
                        {opt.key}.
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {isLastQuestion ? (
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleFinishAssessment}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Finish Assessment
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              className="text-xs"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};
