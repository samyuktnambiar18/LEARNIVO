import React, { useState } from 'react';
import { Award, ArrowRight, RotateCcw, AlertCircle, CheckCircle2, Lightbulb, FileCheck2 } from 'lucide-react';
import { Question } from '../../types';
import { adaptiveLearningService, AssessmentEvaluationResult } from '../../services/api/adaptiveLearningService';
import { authService } from '../../services/auth/authService';
import { storageService } from '../../services/storage/storageService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface AssessmentEngineProps {
  questions: Question[];
  onComplete?: (result: AssessmentEvaluationResult) => void;
  onAttendClick?: () => void;
  isFetchingWebhook?: boolean;
}

export const AssessmentEngine: React.FC<AssessmentEngineProps> = ({ questions, onComplete, onAttendClick, isFetchingWebhook }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Store mapping from question.id to selected_option index (0, 1, 2, or 3)
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});
  // Track locally saved answers per question
  const [savedAnswersMap, setSavedAnswersMap] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<AssessmentEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If no questions fetched from webhook yet, render empty start container
  if (!questions || questions.length === 0) {
    return (
      <div className="surface-card p-8 border border-white/10 rounded-xl max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto text-[#C7FF4A]">
          <FileCheck2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-[#F7F5FA]">No Assessment Questions Loaded</h3>
        <p className="text-sm text-[#A6A1B2]">
          Click the "Attend Assessment" button above or below to trigger the webhook and fetch your evaluation test questions.
        </p>
        {onAttendClick && (
          <div className="pt-2">
            <Button variant="primary" isLoading={isFetchingWebhook} onClick={onAttendClick}>
              Attend Assessment
            </Button>
          </div>
        )}
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const selectedOptionIndex = answersMap[currentQ.id];
  const isAnswerSaved = savedAnswersMap[currentQ.id] || false;
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleSelectOption = (optionIdx: number) => {
    if (isSubmitting) return;
    setAnswersMap(prev => ({
      ...prev,
      [currentQ.id]: optionIdx
    }));
  };

  const handleSaveAnswer = () => {
    if (selectedOptionIndex === undefined) return;
    setSavedAnswersMap(prev => ({
      ...prev,
      [currentQ.id]: true
    }));
  };

  const handleNext = () => {
    setShowHint(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setShowHint(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmitAssessment = async () => {
    // Save Q10 answer locally
    if (selectedOptionIndex !== undefined) {
      setSavedAnswersMap(prev => ({ ...prev, [currentQ.id]: true }));
    }

    setIsSubmitting(true);
    setError(null);

    // Compare user selected answers with correctAnswer received from webhook
    let correctCount = 0;
    const answerBreakdown = questions.map(q => {
      const selectedIdx = answersMap[q.id];
      const userAnswer = (selectedIdx !== undefined && q.options && q.options[selectedIdx])
        ? q.options[selectedIdx]
        : '';
      const isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        questionText: q.questionText,
        topic: q.topic,
        userAnswer: userAnswer || 'No answer selected',
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        isCorrect
      };
    });

    const totalQuestions = questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const obtainedMarks = correctCount * 10;
    const totalMarks = totalQuestions * 10;

    // Format expected answers payload for webhook
    const answersPayload = questions.map(q => ({
      question_id: q.id,
      selected_option: answersMap[q.id] !== undefined ? answersMap[q.id] : 0
    }));

    const user = authService.getCurrentUser();
    const studentId = user?.id || 'usr_student';
    const documentId = questions[0]?.materialId || 'doc_diagnostic_10';

    try {
      const evaluationResult = await adaptiveLearningService.submitAssessment(
        studentId,
        documentId,
        answersPayload
      );

      const finalResult: AssessmentEvaluationResult = {
        score: scorePercentage,
        total_marks: totalMarks,
        obtained_marks: obtainedMarks,
        correct_answers: correctCount,
        incorrect_answers: totalQuestions - correctCount,
        weak_topics: Array.from(new Set(answerBreakdown.filter(a => !a.isCorrect).map(a => a.topic))),
        strong_topics: Array.from(new Set(answerBreakdown.filter(a => a.isCorrect).map(a => a.topic))),
        misconceptions: evaluationResult.misconceptions || [],
        knowledge_gaps: evaluationResult.knowledge_gaps || [],
        level: scorePercentage >= 80 ? 'Advanced' : scorePercentage >= 50 ? 'Intermediate' : 'Beginner',
        raw: { ...evaluationResult, answerBreakdown }
      };

      setResult(finalResult);

      // Save result to local storage for history/progress tracking
      storageService.saveAssessmentResult({
        id: 'eval_' + Date.now(),
        assessmentTitle: 'Diagnostic Assessment Suite',
        completedAt: new Date().toISOString(),
        scorePercentage,
        totalQuestions,
        correctCount,
        topicBreakdown: answerBreakdown.map(a => ({
          topic: a.topic,
          correct: a.isCorrect ? 1 : 0,
          total: 1
        })),
        recommendations: finalResult.weak_topics
      });

      if (onComplete) {
        onComplete(finalResult);
      }
    } catch (err: any) {
      console.warn('Backend webhook submission fallback to direct score calculation:', err);
      const fallbackResult: AssessmentEvaluationResult = {
        score: scorePercentage,
        total_marks: totalMarks,
        obtained_marks: obtainedMarks,
        correct_answers: correctCount,
        incorrect_answers: totalQuestions - correctCount,
        weak_topics: Array.from(new Set(answerBreakdown.filter(a => !a.isCorrect).map(a => a.topic))),
        strong_topics: Array.from(new Set(answerBreakdown.filter(a => a.isCorrect).map(a => a.topic))),
        misconceptions: [],
        knowledge_gaps: answerBreakdown.filter(a => !a.isCorrect).map(a => `Review topic: ${a.topic}`),
        level: scorePercentage >= 80 ? 'Advanced' : scorePercentage >= 50 ? 'Intermediate' : 'Beginner',
        raw: { answerBreakdown }
      };

      setResult(fallbackResult);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If final assessment response is received, display evaluation dashboard
  if (result) {
    const answerBreakdown: any[] = result.raw?.answerBreakdown || [];

    return (
      <div className="surface-card p-8 border border-white/10 rounded-xl max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto mb-4 text-[#C7FF4A]">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-[#F7F5FA] mb-1">Assessment Evaluation Complete</h3>
          <p className="text-sm text-[#A6A1B2]">
            Assessed against Webhook Benchmark • Proficiency Level: <span className="text-[#C7FF4A] font-semibold">{result.level}</span>
          </p>
        </div>

        {/* Score Summary */}
        <div className="p-6 rounded-xl bg-[#181620] border border-white/10 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-4xl font-extrabold text-[#C7FF4A] mb-1">
              {result.score}%
            </div>
            <p className="text-xs text-[#A6A1B2]">Overall Score</p>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white mb-1">
              {result.obtained_marks} / {result.total_marks}
            </div>
            <p className="text-xs text-[#A6A1B2]">Obtained Marks</p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <div className="text-4xl font-extrabold text-emerald-400 mb-1">
              {result.correct_answers} / {result.correct_answers + result.incorrect_answers}
            </div>
            <p className="text-xs text-[#A6A1B2]">Right Questions</p>
          </div>
        </div>

        {/* Question Breakdown List */}
        {answerBreakdown.length > 0 && (
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-[#F7F5FA] border-b border-white/10 pb-2">
              Question & Answer Breakdown
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {answerBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border text-xs space-y-2 ${
                    item.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">
                      Q{idx + 1}. {item.questionText}
                    </span>
                    <Badge variant={item.isCorrect ? 'lime' : 'hard'}>
                      {item.isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </div>
                  <div className="text-[#A6A1B2]">
                    <span>Your Answer: </span>
                    <span className={item.isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                      {item.userAnswer}
                    </span>
                  </div>
                  {!item.isCorrect && (
                    <div className="text-emerald-300">
                      <span>Correct Answer: </span>
                      <span className="font-semibold">{item.correctAnswer}</span>
                    </div>
                  )}
                  {item.explanation && (
                    <p className="text-[11px] text-[#A6A1B2] italic pt-1 border-t border-white/5">
                      {item.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strong & Weak Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.strong_topics && result.strong_topics.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Strong Topics</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.strong_topics.map((t: string, idx: number) => (
                  <Badge key={idx} variant="lime">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {result.weak_topics && result.weak_topics.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs">
              <h4 className="font-semibold text-rose-300 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Areas Needing Focus</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.weak_topics.map((t: string, idx: number) => (
                  <Badge key={idx} variant="hard">{t}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setCurrentIndex(0);
              setAnswersMap({});
              setSavedAnswersMap({});
              setError(null);
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Assessment
          </Button>
          <Button
            variant="primary"
            onClick={() => window.location.href = '/progress'}
          >
            View Progress Analytics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 md:p-8 border border-white/10 rounded-xl space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#A6A1B2]">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <Badge variant="lime">{currentQ.topic}</Badge>
          <Badge
            variant={
              currentQ.difficulty === 'Easy'
                ? 'easy'
                : currentQ.difficulty === 'Medium'
                ? 'medium'
                : 'hard'
            }
          >
            {currentQ.difficulty}
          </Badge>
        </div>

        {currentQ.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1.5 text-xs text-[#A6A1B2] hover:text-[#C7FF4A] transition-colors"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
          </button>
        )}
      </div>

      {/* Hint Box */}
      {showHint && currentQ.hint && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>{currentQ.hint}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Question Body */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-[#F7F5FA] leading-relaxed mb-6">
          {currentQ.questionText}
        </h3>

        {/* 4 Options */}
        <div className="space-y-3">
          {currentQ.options?.map((optionText, optIdx) => {
            const isSelected = selectedOptionIndex === optIdx;
            return (
              <button
                key={optIdx}
                disabled={isSubmitting}
                onClick={() => handleSelectOption(optIdx)}
                className={`w-full text-left p-4 rounded-lg border text-sm transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-[#C7FF4A] bg-[#C7FF4A]/10 text-[#F7F5FA] font-medium'
                    : 'border-white/10 bg-[#181620] hover:border-white/20 text-[#F7F5FA]'
                }`}
              >
                <span>{optionText}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Controls */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <Button
          variant="ghost"
          disabled={currentIndex === 0 || isSubmitting}
          onClick={handlePrevious}
        >
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {!isLastQuestion ? (
            <>
              {!isAnswerSaved ? (
                <Button
                  variant="primary"
                  disabled={selectedOptionIndex === undefined || isSubmitting}
                  onClick={() => {
                    handleSaveAnswer();
                    handleNext();
                  }}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={isSubmitting}
                  onClick={handleNext}
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              isLoading={isSubmitting}
              disabled={selectedOptionIndex === undefined || isSubmitting}
              onClick={handleSubmitAssessment}
            >
              {isSubmitting ? 'Evaluating Assessment...' : 'Submit Assessment'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
