import React, { useState } from 'react';
import { Lightbulb, CheckCircle2, XCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { Question } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface QuestionCardProps {
  question: Question;
  onNext: () => void;
  onAttempt: (isCorrect: boolean, userAnswer: string, timeSpentSeconds: number) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onNext, onAttempt }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  const isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

  const handleSubmit = () => {
    if (!selectedAnswer || isSubmitted) return;

    setIsSubmitted(true);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    onAttempt(isCorrect, selectedAnswer, Math.max(5, timeSpent));
  };

  const handleNext = () => {
    setSelectedAnswer('');
    setShowHint(false);
    setIsSubmitted(false);
    onNext();
  };

  return (
    <div className="surface-card p-6 md:p-8 border border-white/10 rounded-xl space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Badge variant="lime">{question.topic}</Badge>
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
        </div>

        {question.hint && !isSubmitted && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1.5 text-xs text-[#A6A1B2] hover:text-[#C7FF4A] transition-colors"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
          </button>
        )}
      </div>

      {/* Hint Alert */}
      {showHint && question.hint && (
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>{question.hint}</span>
        </div>
      )}

      {/* Question Body */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-[#F7F5FA] leading-relaxed mb-6">
          {question.questionText}
        </h3>

        {/* Multiple Choice Options or Text Input */}
        {question.options && question.options.length > 0 ? (
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              let optionStyle = 'border-white/10 bg-[#181620] hover:border-white/20 text-[#F7F5FA]';
              
              if (isSubmitted) {
                if (option === question.correctAnswer) {
                  optionStyle = 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-medium';
                } else if (isSelected) {
                  optionStyle = 'border-rose-500/50 bg-rose-500/15 text-rose-300';
                }
              } else if (isSelected) {
                optionStyle = 'border-[#C7FF4A] bg-[#C7FF4A]/10 text-[#F7F5FA] font-medium';
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => setSelectedAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border text-sm transition-all flex items-center justify-between ${optionStyle}`}
                >
                  <span>{option}</span>
                  {isSubmitted && option === question.correctAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {isSubmitted && isSelected && option !== question.correctAnswer && (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </button>
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
              className="w-full bg-[#181620] border border-white/15 rounded-lg px-4 py-3 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
            />
          </div>
        )}
      </div>

      {/* Submitted Result Explanation */}
      {isSubmitted && (
        <div
          className={`p-4 rounded-xl border ${
            isCorrect
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm mb-2">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Correct Solution</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-400" />
                <span>Incorrect Solution</span>
              </>
            )}
          </div>
          <p className="text-xs leading-relaxed opacity-90">{question.explanation}</p>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
        {!isSubmitted ? (
          <Button
            variant="primary"
            disabled={!selectedAnswer}
            onClick={handleSubmit}
          >
            Submit Answer
          </Button>
        ) : (
          <Button variant="primary" onClick={handleNext}>
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
