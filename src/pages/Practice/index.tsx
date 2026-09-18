import React, { useState, useEffect } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { adaptiveLearningService } from '../../services/api/adaptiveLearningService';
import { Question, LearningMaterial } from '../../types';
import { QuestionCard, QuestionAttemptDetail } from '../../components/practice/QuestionCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  BarChart2,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Award,
  Lightbulb,
  FileText
} from 'lucide-react';

interface QuestionSessionRecord extends QuestionAttemptDetail {
  question: Question;
}

export const PracticePage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [sessionRecords, setSessionRecords] = useState<Record<string, QuestionSessionRecord>>({});
  const [viewMode, setViewMode] = useState<'active' | 'summary'>('active');
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // Load materials & practice questions
  useEffect(() => {
    const loaded = storageService.getMaterials();
    setMaterials(loaded);

    if (loaded.length > 0) {
      const generated: Question[] = [];
      loaded.forEach((mat, mIdx) => {
        mat.topics.forEach((top, tIdx) => {
          generated.push({
            id: `q_${mIdx}_${tIdx}_1`,
            materialId: mat.id,
            topic: top.name,
            difficulty: top.difficulty || 'Medium',
            questionText: `Which fundamental principle governs problem solving in ${top.name}?`,
            options: [
              `Systematic decomposition and formal verification of ${top.name}`,
              `Heuristic approximation without boundary constraints`,
              `Arbitrary numerical substitution`,
              `Ignoring initial edge conditions`
            ],
            correctAnswer: `Systematic decomposition and formal verification of ${top.name}`,
            explanation: `In ${top.name}, systematic decomposition ensures all boundary conditions and initial parameters are properly satisfied.`,
            hint: `Focus on formal verification and boundary conditions.`
          });
          generated.push({
            id: `q_${mIdx}_${tIdx}_2`,
            materialId: mat.id,
            topic: top.name,
            difficulty: 'Hard',
            questionText: `When analyzing performance bounds for ${top.name}, what is the primary consideration?`,
            options: [
              `Worst-case algorithmic time/space complexity analysis`,
              `Single test-case execution speed`,
              `Hardware clock speed exclusively`,
              `Visual representation density`
            ],
            correctAnswer: `Worst-case algorithmic time/space complexity analysis`,
            explanation: `Performance bounds are fundamentally derived from asymptotic upper bounds (Big-O notation) in asymptotic analysis.`,
            hint: `Consider asymptotic bounds in computer science.`
          });
        });
      });
      setQuestions(generated);
    }

    // Restore Session Records from localStorage if active
    try {
      const savedSession = localStorage.getItem('learnivo_practice_lab_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && typeof parsed === 'object') {
          setSessionRecords(parsed);
        }
      }
    } catch {}
  }, []);

  // Save Session Records to localStorage on Update
  const updateSessionRecords = (newRecords: Record<string, QuestionSessionRecord>) => {
    setSessionRecords(newRecords);
    try {
      localStorage.setItem('learnivo_practice_lab_session', JSON.stringify(newRecords));
    } catch (e) {
      console.warn('Failed to save session records to localStorage:', e);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
    } else {
      setViewMode('summary');
    }
  };

  const handleAttempt = (detail: QuestionAttemptDetail) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    // Save attempt record locally for Session Insights
    const record: QuestionSessionRecord = {
      ...detail,
      question: currentQ
    };

    const updated = {
      ...sessionRecords,
      [currentQ.id]: record
    };
    updateSessionRecords(updated);

    // Save attempt to global storage & trigger adaptive learning service
    const newAttempt = {
      id: 'att_' + Date.now(),
      questionId: currentQ.id,
      topic: currentQ.topic,
      difficulty: currentQ.difficulty,
      userAnswer: detail.userAnswer,
      isCorrect: detail.isCorrect,
      timestamp: new Date().toISOString(),
      timeSpentSeconds: detail.timeSpentSeconds
    };

    storageService.savePracticeAttempt(newAttempt);
    const allAttempts = storageService.getPracticeAttempts();
    adaptiveLearningService.evaluateActivity(allAttempts).catch((err: any) => {
      console.warn('Adaptive learning evaluation warning:', err);
    });
  };

  const handleRetryQuestionFromReview = (qIndex: number) => {
    setCurrentIndex(qIndex);
    setViewMode('active');
  };

  const handleRestartSession = () => {
    setCurrentIndex(0);
    setSessionRecords({});
    setViewMode('active');
    try {
      localStorage.removeItem('learnivo_practice_lab_session');
    } catch {}
  };

  // Compute Real Session Statistics
  const completedList = Object.values(sessionRecords);
  const totalCompleted = completedList.length;
  const correctCount = completedList.filter(r => r.isCorrect).length;
  const accuracyPercent = totalCompleted > 0 ? Math.round((correctCount / totalCompleted) * 100) : 0;
  const totalHintsUsed = completedList.reduce((acc, r) => acc + (r.hintsUsed || 0), 0);
  const totalRetried = completedList.filter(r => (r.attemptsCount || 1) > 1).length;

  const validConfidences = completedList.filter(r => r.confidence !== null);
  const highConfCount = validConfidences.filter(r => r.confidence === 'High').length;
  const avgConfidenceLabel = validConfidences.length > 0
    ? highConfCount >= validConfidences.length / 2 ? 'High' : 'Medium'
    : 'N/A';

  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + (viewMode === 'summary' ? 1 : 0)) / questions.length) * 100) : 0;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Practice Lab Header */}
        <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] relative overflow-hidden shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 uppercase">
                Interactive Learning Environment
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#F7F5FA] tracking-tight">
              Practice Lab
            </h2>
            <p className="text-xs text-[#A6A1B2]">
              Think. Solve. Understand. Improve.
            </p>
          </div>

          {questions.length > 0 && (
            <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white font-mono">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {totalCompleted > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(prev => prev === 'active' ? 'summary' : 'active')}
                    className="text-xs border-white/10 text-white hover:bg-white/5"
                  >
                    {viewMode === 'active' ? 'Session Summary' : 'Back to Lab'}
                  </Button>
                )}
              </div>

              {/* Session Progress Bar */}
              <div className="w-48 bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#C7FF4A] h-full transition-all duration-300 shadow-md shadow-[#C7FF4A]/30"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Empty State when no questions exist */}
        {questions.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="No practice questions available yet"
            description="Upload a learning material to automatically generate practice questions."
            actionLabel="Upload Material"
            onAction={() => window.location.href = '/upload'}
          />
        ) : viewMode === 'active' ? (
          /* Active Question Card View */
          <QuestionCard
            question={questions[currentIndex]}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            onNext={handleNext}
            onAttempt={handleAttempt}
          />
        ) : (
          /* Session Summary & Review Mode View */
          <div className="space-y-8">
            {/* Session Summary Card */}
            <div className="surface-card p-8 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-bold text-[#C7FF4A] uppercase tracking-wider">
                    Performance Summary
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    Practice Session Summary
                  </h3>
                  <p className="text-xs text-[#A6A1B2]">
                    Statistics calculated directly from your current practice lab session.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('active')}
                    className="text-xs"
                  >
                    Continue Practice
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRestartSession}
                    className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] text-xs shadow-lg shadow-[#C7FF4A]/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    New Session
                  </Button>
                </div>
              </div>

              {/* Real Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-black text-white">{totalCompleted}</div>
                  <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Completed</div>
                </div>

                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-black text-emerald-400">{correctCount}</div>
                  <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Correct</div>
                </div>

                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-black text-[#C7FF4A]">{accuracyPercent}%</div>
                  <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Accuracy</div>
                </div>

                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-black text-amber-400">{totalHintsUsed}</div>
                  <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Hints Used</div>
                </div>

                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-black text-purple-400">{avgConfidenceLabel}</div>
                  <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Avg Confidence</div>
                </div>

                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-black text-rose-400">{totalRetried}</div>
                  <div className="text-[10px] text-[#A6A1B2] uppercase font-semibold">Retried</div>
                </div>
              </div>

              {/* Practice Insights Section */}
              <div className="p-5 rounded-xl bg-[#13111C] border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C7FF4A]" />
                  Your Practice Insights
                </h4>

                {totalCompleted === 0 ? (
                  <p className="text-xs text-[#A6A1B2]">
                    Complete more questions to unlock session insights.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs text-[#A6A1B2] leading-relaxed">
                    {totalHintsUsed === 0 && (
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        <span>You solved all completed questions without using any hints! Excellent reasoning.</span>
                      </div>
                    )}
                    {totalHintsUsed > 0 && (
                      <div className="flex items-center gap-2 text-amber-300">
                        <Lightbulb className="w-4 h-4 flex-shrink-0 text-amber-400" />
                        <span>You used progressive hints on {completedList.filter(r => r.hintsUsed > 0).length} questions during this session.</span>
                      </div>
                    )}
                    {totalRetried > 0 && (
                      <div className="flex items-center gap-2 text-purple-300">
                        <RotateCcw className="w-4 h-4 flex-shrink-0 text-purple-400" />
                        <span>You retried {totalRetried} questions. Re-attempting after errors strengthens concept retention.</span>
                      </div>
                    )}
                    {accuracyPercent >= 80 && (
                      <div className="flex items-center gap-2 text-[#C7FF4A] font-medium">
                        <Award className="w-4 h-4 flex-shrink-0" />
                        <span>High Session Accuracy: {accuracyPercent}%. You demonstrated strong mastery of these topics.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Review Answers List */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C7FF4A]" />
                <span>Review Answers</span>
              </h3>

              {completedList.length === 0 ? (
                <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] text-center text-xs text-[#A6A1B2]">
                  No completed questions to review yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const record = sessionRecords[q.id];
                    if (!record) return null;

                    const isExpanded = expandedReviewId === q.id;

                    return (
                      <div
                        key={q.id}
                        className="surface-card p-5 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-3 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold">
                              <Badge variant="lime">Q{idx + 1}</Badge>
                              <span className="text-[#A6A1B2] font-mono">{q.topic}</span>
                              <span className={`px-2 py-0.5 rounded font-extrabold ${
                                record.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}>
                                {record.isCorrect ? '✓ Correct' : '✕ Incorrect'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white">
                              {q.questionText}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            {!record.isCorrect && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRetryQuestionFromReview(idx)}
                                className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Retry Question
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedReviewId(isExpanded ? null : q.id)}
                              className="text-xs"
                            >
                              {isExpanded ? 'Hide Details' : 'View Explanation'}
                            </Button>
                          </div>
                        </div>

                        {/* Breakdown Row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-white/5 font-mono text-[#A6A1B2]">
                          <span>Your answer: <strong className="text-white">{record.userAnswer || 'None'}</strong></span>
                          <span>•</span>
                          <span>Confidence: <strong className="text-white">{record.confidence || 'Unspecified'}</strong></span>
                          <span>•</span>
                          <span>Hints used: <strong className="text-amber-400">{record.hintsUsed}</strong></span>
                        </div>

                        {/* Expanded Explanation */}
                        {isExpanded && (
                          <div className="p-4 rounded-xl bg-[#13111C] border border-white/10 space-y-2 text-xs text-white/90 pt-3">
                            <div className="font-bold text-[#C7FF4A] uppercase text-[10px] tracking-wider">
                              Solution Rationale & Concept
                            </div>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
