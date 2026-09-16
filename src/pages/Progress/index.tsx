import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle, Target, Award, BrainCircuit, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { adaptiveLearningService } from '../../services/api/adaptiveLearningService';
import { LearningProgress, PracticeAttempt, AdaptiveLearningResult } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const ProgressPage: React.FC = () => {
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [evaluation, setEvaluation] = useState<AdaptiveLearningResult | null>(null);

  useEffect(() => {
    const loadedProgress = storageService.getProgress();
    const loadedAttempts = storageService.getPracticeAttempts();
    setProgress(loadedProgress);
    setAttempts(loadedAttempts);

    if (loadedAttempts.length > 0) {
      adaptiveLearningService.evaluateActivity(loadedAttempts)
        .then(res => setEvaluation(res))
        .catch(err => console.warn('Adaptive evaluation error:', err));
    }
  }, []);


  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Performance & Mastery Analytics
          </h2>
          <p className="text-xs text-[#A6A1B2]">
            Evidence-based analysis calculated strictly from your completed practice and assessment attempts.
          </p>
        </div>

        {!progress || attempts.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No progress data available yet"
            description="Your progress and mastery charts will appear here after you complete your first practice or assessment session."
            actionLabel="Start Practice"
            onAction={() => window.location.href = '/pages/practice.html'}
          />
        ) : (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card accentBorder="lime">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Overall Accuracy</span>
                  <Target className="w-4 h-4 text-[#C7FF4A]" />
                </div>
                <p className="text-3xl font-extrabold text-[#C7FF4A]">
                  {progress.accuracyPercentage}%
                </p>
              </Card>

              <Card accentBorder="violet">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Total Questions</span>
                  <CheckCircle className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <p className="text-3xl font-extrabold text-[#8B5CF6]">
                  {progress.questionsAttempted}
                </p>
              </Card>

              <Card accentBorder="pink">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Correct Solutions</span>
                  <Award className="w-4 h-4 text-[#FF6B9D]" />
                </div>
                <p className="text-3xl font-extrabold text-[#FF6B9D]">
                  {progress.correctAnswers}
                </p>
              </Card>

              <Card accentBorder="none">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Study Time</span>
                  <TrendingUp className="w-4 h-4 text-[#F7F5FA]" />
                </div>
                <p className="text-3xl font-extrabold text-[#F7F5FA]">
                  {progress.totalStudyMinutes} min
                </p>
              </Card>
            </div>

            {/* Recharts Bar Chart for Topic Performance */}
            {progress.topicPerformance && progress.topicPerformance.length > 0 && (
              <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
                <h3 className="text-base font-semibold text-[#F7F5FA]">
                  Topic Mastery Scores (%)
                </h3>
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progress.topicPerformance}>
                      <XAxis dataKey="topic" stroke="#A6A1B2" fontSize={11} tickLine={false} />
                      <YAxis stroke="#A6A1B2" fontSize={11} domain={[0, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#181620', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F7F5FA' }}
                      />
                      <Bar dataKey="masteryScore" radius={[4, 4, 0, 0]}>
                        {progress.topicPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#C7FF4A' : '#8B5CF6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
