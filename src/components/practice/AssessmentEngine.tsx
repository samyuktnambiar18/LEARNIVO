import React, { useState } from 'react';
import { Award, CheckCircle2, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react';
import { Question, AssessmentResult } from '../../types';
import { adaptiveLearningService } from '../../services/api/adaptiveLearningService';
import { storageService } from '../../services/storage/storageService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface AssessmentEngineProps {
  questions: Question[];
  onComplete?: (result: AssessmentResult) => void;
}

export const AssessmentEngine: React.FC<AssessmentEngineProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  if (!questions || questions.length === 0) {
    return null;
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleSelect = (answer: string) => {
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: answer }));
  };

  const handleFinish = async () => {
    setIsEvaluating(true);

    let correctCount = 0;
    const topicMap: Record<string, { correct: number; total: number }> = {};

    questions.forEach(q => {
      const ans = userAnswers[q.id] || '';
      const isCorrect = ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (isCorrect) correctCount++;

      if (!topicMap[q.topic]) topicMap[q.topic] = { correct: 0, total: 0 };
      topicMap[q.topic].total += 1;
      if (isCorrect) topicMap[q.topic].correct += 1;
    });

    const scorePercentage = Math.round((correctCount / questions.length) * 100);

    const topicBreakdown = Object.entries(topicMap).map(([topic, stat]) => ({
      topic,
      correct: stat.correct,
      total: stat.total
    }));

    // Trigger real adaptive learning service webhook if available
    const attempts = questions.map(q => ({
      id: 'att_' + Date.now(),
      questionId: q.id,
      topic: q.topic,
      difficulty: q.difficulty,
      userAnswer: userAnswers[q.id] || '',
      isCorrect: (userAnswers[q.id] || '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
      timestamp: new Date().toISOString(),
      timeSpentSeconds: 30
    }));

    const evaluation = await adaptiveLearningService.evaluateActivity(attempts);

    const finalResult: AssessmentResult = {
      id: 'eval_' + Date.now(),
      assessmentTitle: 'Technical & Mathematical Assessment',
      completedAt: new Date().toISOString(),
      scorePercentage,
      totalQuestions: questions.length,
      correctCount,
      topicBreakdown,
      recommendations: evaluation.recommendedFocus
    };

    storageService.saveAssessmentResult(finalResult);
    setResult(finalResult);
    setIsEvaluating(false);

    if (onComplete) onComplete(finalResult);
  };

  if (result) {
    return (
      <div className="surface-card p-8 border border-white/10 rounded-xl max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto mb-4 text-[#C7FF4A]">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-[#F7F5FA] mb-1">Assessment Evaluation Complete</h3>
          <p className="text-sm text-[#A6A1B2]">
            Targeted evaluation recorded on {new Date(result.completedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Score Pill */}
        <div className="p-6 rounded-xl bg-[#181620] border border-white/10 text-center">
          <div className="text-4xl font-extrabold text-[#C7FF4A] mb-1">
            {result.scorePercentage}%
          </div>
          <p className="text-xs text-[#A6A1B2]">
            {result.correctCount} of {result.totalQuestions} questions solved correctly
          </p>
        </div>

        {/* Topic Breakdown */}
        {result.topicBreakdown.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#F7F5FA] uppercase tracking-wider">
              Topic Breakdown
            </h4>
            <div className="space-y-2">
              {result.topicBreakdown.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 text-xs">
                  <span className="text-[#F7F5FA] font-medium">{t.topic}</span>
                  <span className="text-[#C7FF4A]">
                    {t.correct} / {t.total} ({Math.round((t.correct / t.total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Focus */}
        {result.recommendations.length > 0 && (
          <div className="p-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs">
            <h4 className="font-semibold text-[#8B5CF6] mb-1">Recommended Next Focus</h4>
            <ul className="list-disc list-inside text-[#F7F5FA] space-y-1">
              {result.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setCurrentIndex(0);
              setUserAnswers({});
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Assessment
          </Button>
          <Button
            variant="primary"
            onClick={() => window.location.href = '/pages/progress.html'}
          >
            View Progress Analytics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 md:p-8 border border-white/10 rounded-xl space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-between text-xs text-[#A6A1B2] border-b border-white/10 pb-4">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <Badge variant="lime">{currentQ.topic}</Badge>
      </div>

      {/* Question */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-[#F7F5FA] mb-6">
          {currentQ.questionText}
        </h3>

        <div className="space-y-3">
          {currentQ.options?.map((opt, idx) => {
            const isSelected = userAnswers[currentQ.id] === opt;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left p-4 rounded-lg border text-sm transition-all ${
                  isSelected
                    ? 'border-[#C7FF4A] bg-[#C7FF4A]/10 text-[#F7F5FA] font-medium'
                    : 'border-white/10 bg-[#181620] text-[#F7F5FA] hover:border-white/20'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <Button
          variant="ghost"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(c => c - 1)}
        >
          Previous
        </Button>

        {isLast ? (
          <Button
            variant="primary"
            isLoading={isEvaluating}
            disabled={!userAnswers[currentQ.id]}
            onClick={handleFinish}
          >
            Submit Assessment
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={!userAnswers[currentQ.id]}
            onClick={() => setCurrentIndex(c => c + 1)}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};
