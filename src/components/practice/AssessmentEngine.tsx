import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import {
  AssessmentSuiteData,
  NormalizedAssessmentQuestion,
  UserAssessmentAnswers
} from '../../types';
import { Button } from '../ui/Button';

interface AssessmentEngineProps {
  suiteData: AssessmentSuiteData | null;
  onAttendClick?: () => void;
  isFetchingWebhook?: boolean;
}

export const AssessmentEngine: React.FC<AssessmentEngineProps> = ({
  suiteData,
  onAttendClick,
  isFetchingWebhook
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAssessmentAnswers>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // 1. Loading State
  if (isFetchingWebhook) {
    return (
      <div className="surface-card p-12 border border-[#C7FF4A]/20 rounded-2xl max-w-xl mx-auto text-center space-y-6 shadow-xl bg-[#0D0B14]">
        <div className="w-16 h-16 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto text-[#C7FF4A] animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#F7F5FA]">Generating Assessment...</h3>
          <p className="text-xs text-[#A6A1B2]">
            Fetching dynamic evaluation questions from the assessment webhook. Please wait a moment.
          </p>
        </div>
      </div>
    );
  }

  // 2. Empty / No Questions State
  if (!suiteData || !suiteData.questions || suiteData.questions.length === 0) {
    return (
      <div className="surface-card p-10 border border-white/10 rounded-2xl max-w-xl mx-auto text-center space-y-5 bg-[#0D0B14]">
        <div className="w-16 h-16 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto text-[#C7FF4A]">
          <FileCheck2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-[#F7F5FA]">No Assessment Questions Loaded</h3>
          <p className="text-xs text-[#A6A1B2] leading-relaxed">
            Click the "Attend Assessment" button to generate dynamic questions from the assessment webhook.
          </p>
        </div>
        {onAttendClick && (
          <div className="pt-2">
            <Button
              variant="primary"
              isLoading={isFetchingWebhook}
              onClick={onAttendClick}
              className="shadow-lg shadow-[#C7FF4A]/10"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Attend Assessment
            </Button>
          </div>
        )}
      </div>
    );
  }

  const { questions, subject_code, subject_name, total_questions } = suiteData;
  const currentQ: NormalizedAssessmentQuestion = questions[currentIndex] || questions[0];
  const qNum = currentQ.question_number;
  const selectedKey = userAnswers[qNum];

  const handleSelectOption = (optionKey: string) => {
    if (isSubmitted) return;
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

  const handleSubmit = () => {
    setIsSubmitted(true);
    setCurrentIndex(0);
  };

  // 3. Result Screen (After Submission)
  if (isSubmitted) {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    questions.forEach(q => {
      const userChoice = userAnswers[q.question_number];
      if (!userChoice) {
        unansweredCount++;
      } else if (userChoice.toUpperCase() === q.correct_answer.toUpperCase()) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const total = total_questions || questions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="space-y-8 max-w-4xl mx-auto">
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
                {subject_name}
              </h2>
              <p className="text-xs text-[#A6A1B2] mt-1 font-mono">
                Code: {subject_code} • {total} Questions Evaluated
              </p>
            </div>

            {onAttendClick && (
              <Button
                variant="outline"
                onClick={onAttendClick}
                isLoading={isFetchingWebhook}
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                Retake Assessment
              </Button>
            )}
          </div>

          {/* Score Grid & Circular Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
            {/* Big Score Box */}
            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 text-center space-y-2 relative">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider">
                Overall Score
              </div>
              <div className="text-5xl font-black text-[#C7FF4A] tracking-tight">
                {correctCount} <span className="text-2xl font-normal text-[#A6A1B2]">/ {total}</span>
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30">
                {percentage}% Score
              </div>
            </div>

            {/* Circular Progress Bar Indicator */}
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
                    strokeDasharray={`${percentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-white">{percentage}%</span>
                  <span className="text-[9px] text-[#A6A1B2] uppercase font-semibold">Accuracy</span>
                </div>
              </div>
            </div>

            {/* Breakdown Pills */}
            <div className="col-span-1 md:col-span-1 bg-[#13111C] p-6 rounded-xl border border-white/10 space-y-3">
              <div className="text-xs text-[#A6A1B2] font-medium uppercase tracking-wider mb-2">
                Answer Distribution
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">Correct</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">{correctCount}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-300">Wrong</span>
                </div>
                <span className="text-sm font-bold text-rose-400">{wrongCount}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">Unanswered</span>
                </div>
                <span className="text-sm font-bold text-amber-400">{unansweredCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 10: QUESTION REVIEW */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-[#F7F5FA] flex items-center gap-2">
              <span>Review Answers</span>
              <span className="text-xs font-normal text-[#A6A1B2]">({questions.length} Questions)</span>
            </h3>
          </div>

          <div className="space-y-4">
            {questions.map((q) => {
              const userAnsKey = userAnswers[q.question_number];
              const isAnsProvided = Boolean(userAnsKey);
              const isCorrect = isAnsProvided && userAnsKey.toUpperCase() === q.correct_answer.toUpperCase();

              const userOptObj = q.options.find(o => o.key.toUpperCase() === (userAnsKey || '').toUpperCase());
              const correctOptObj = q.options.find(o => o.key.toUpperCase() === q.correct_answer.toUpperCase());

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
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] uppercase">
                        {q.difficulty}
                      </span>
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

                  {/* Question Text */}
                  <h4 className="text-base font-semibold text-[#F7F5FA] mb-4 leading-relaxed">
                    {q.question}
                  </h4>

                  {/* Answer Comparison Grid */}
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

                  {/* Explanation from Webhook */}
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
      </div>
    );
  }

  // 4. ACTIVE QUESTION TAKING INTERFACE
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner with Subject Code, Name, Assessment, and Question Count */}
      <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-extrabold text-[#C7FF4A] uppercase tracking-wider mb-0.5">
            {subject_name}
          </div>
          <div className="text-xs font-mono text-[#A6A1B2]">
            {subject_code} • Assessment
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#13111C] border border-white/10 text-xs font-semibold text-[#F7F5FA]">
            {total_questions || questions.length} Questions
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 text-xs font-bold text-[#C7FF4A]">
            Answered: {answeredCount} / {total_questions || questions.length}
          </div>
        </div>
      </div>

      {/* Question Navigator Bar (1 2 3 ... N) */}
      <div className="surface-card p-4 border border-white/10 rounded-2xl bg-[#0D0B14]">
        <div className="text-[11px] font-semibold text-[#A6A1B2] uppercase tracking-wider mb-2.5 px-1 flex justify-between items-center">
          <span>Question Navigator</span>
          <span className="text-[10px] text-[#A6A1B2]">
            Click any index to skip
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = Boolean(userAnswers[q.question_number]);

            return (
              <button
                key={q.question_number}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-[#C7FF4A] text-black shadow-lg shadow-[#C7FF4A]/20 scale-105 border-2 border-white'
                    : isAnswered
                    ? 'bg-[#C7FF4A]/20 text-[#C7FF4A] border border-[#C7FF4A]/40 hover:bg-[#C7FF4A]/30'
                    : 'bg-[#13111C] text-[#A6A1B2] border border-white/10 hover:border-white/30 hover:text-white'
                }`}
              >
                {q.question_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Question Card */}
      <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-6 shadow-2xl">
        {/* Question Header Metadata */}
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

        {/* Options List (Radio Selection) */}
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
                {/* Radio Indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    isSelected
                      ? 'border-[#C7FF4A] bg-[#C7FF4A]'
                      : 'border-white/30 group-hover:border-white/50'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>

                {/* Option Text with Key */}
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

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
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
              onClick={handleSubmit}
              className="bg-[#C7FF4A] text-black font-bold hover:bg-[#b8f533] shadow-lg shadow-[#C7FF4A]/20"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Assessment
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
      </div>
    </div>
  );
};
