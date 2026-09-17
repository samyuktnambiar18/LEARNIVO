import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Target,
  Award,
  BookOpen,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Filter,
  Calendar,
  Layers,
  Clock,
  RotateCcw,
  Check,
  XCircle,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { assessmentHistoryService, AssessmentHistoryRecord } from '../../services/assessmentHistoryService';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';
import { PracticeAttempt } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [assessments, setAssessments] = useState<AssessmentHistoryRecord[]>([]);

  // Client-side Filters
  const [sourceFilter, setSourceFilter] = useState<'all' | 'practice' | 'assessment'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '7days' | '30days'>('all');

  useEffect(() => {
    // Load existing frontend data from localStorage
    const loadedAttempts = storageService.getPracticeAttempts();
    setAttempts(loadedAttempts);

    async function loadAssessmentHistory() {
      try {
        const history = await assessmentHistoryService.getHistory();
        setAssessments(history);
      } catch (err) {
        console.warn('Failed to load assessment history:', err);
      }
    }

    loadAssessmentHistory();
  }, []);

  // Pure client-side calculations memoized for optimal performance
  const analytics = useMemo(() => {
    return computeStudentAnalytics(attempts, assessments, timeFilter, sourceFilter);
  }, [attempts, assessments, timeFilter, sourceFilter]);

  return (
    <MainLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* SECTION 1: PAGE HEADER & FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-black text-[#F7F5FA] tracking-tight">
              Performance & Analytics
            </h2>
            <p className="text-xs text-[#A6A1B2] mt-1">
              Understand your learning progress, identify weak areas, and track your mastery over time.
            </p>
          </div>

          {/* Client-side Filter Toolbar */}
          {analytics.hasData && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Source Filter */}
              <div className="bg-[#13111C] p-1 rounded-xl border border-white/10 flex items-center gap-1">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sourceFilter === 'all'
                      ? 'bg-[#C7FF4A] text-black shadow-md'
                      : 'text-[#A6A1B2] hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSourceFilter('practice')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sourceFilter === 'practice'
                      ? 'bg-[#C7FF4A] text-black shadow-md'
                      : 'text-[#A6A1B2] hover:text-white'
                  }`}
                >
                  Practice
                </button>
                <button
                  onClick={() => setSourceFilter('assessment')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sourceFilter === 'assessment'
                      ? 'bg-[#C7FF4A] text-black shadow-md'
                      : 'text-[#A6A1B2] hover:text-white'
                  }`}
                >
                  Assessment
                </button>
              </div>

              {/* Time Range Filter */}
              <div className="bg-[#13111C] p-1 rounded-xl border border-white/10 flex items-center gap-1">
                <button
                  onClick={() => setTimeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeFilter === 'all'
                      ? 'bg-white/15 text-white'
                      : 'text-[#A6A1B2] hover:text-white'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimeFilter('30days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeFilter === '30days'
                      ? 'bg-white/15 text-white'
                      : 'text-[#A6A1B2] hover:text-white'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setTimeFilter('7days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeFilter === '7days'
                      ? 'bg-white/15 text-white'
                      : 'text-[#A6A1B2] hover:text-white'
                  }`}
                >
                  7 Days
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EMPTY STATE: WHEN NO PERFORMANCE DATA EXISTS */}
        {!analytics.hasData ? (
          <div className="surface-card p-10 border border-white/10 rounded-2xl bg-[#0D0B14] max-w-2xl mx-auto text-center space-y-6 shadow-2xl relative overflow-hidden my-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C7FF4A]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-2xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A] mx-auto">
              <BarChart3 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-white">
                No performance data yet
              </h3>
              <p className="text-xs text-[#A6A1B2] leading-relaxed">
                Complete a practice session or assessment to start building your personalized analytics dashboard.
              </p>
            </div>

            {/* What you'll see preview checklist */}
            <div className="bg-[#13111C] p-5 rounded-xl border border-white/10 text-left space-y-3 max-w-md mx-auto">
              <h4 className="text-[11px] font-bold text-[#A6A1B2] uppercase tracking-wider">
                Your analytics dashboard will track:
              </h4>
              <div className="space-y-2 text-xs text-white">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4A] flex-shrink-0" />
                  <span>Accuracy trends & score progression over time</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4A] flex-shrink-0" />
                  <span>Identified technical strengths & weak areas</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4A] flex-shrink-0" />
                  <span>Topic-by-topic mastery breakdown</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#C7FF4A] flex-shrink-0" />
                  <span>Mistake frequency analysis & recommended practice</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={() => navigate('/practice')}
                className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] px-6 py-3 text-sm shadow-xl shadow-[#C7FF4A]/20 w-full sm:w-auto"
              >
                Start Practice
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/assessment')}
                className="text-white border-white/20 hover:bg-white/10 px-6 py-3 text-sm w-full sm:w-auto"
              >
                Take Assessment
              </Button>
            </div>
          </div>
        ) : (
          /* DATA-DRIVEN DASHBOARD */
          <div className="space-y-8">
            {/* SECTION 2: OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card accentBorder="lime" className="bg-[#0D0B14] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Overall Accuracy</span>
                  <div className="p-2 rounded-lg bg-[#C7FF4A]/10 text-[#C7FF4A]">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-[#C7FF4A] tracking-tight">
                  {analytics.overallAccuracy}%
                </p>
                <p className="text-[11px] text-[#A6A1B2] mt-1 truncate">
                  Based on {analytics.totalQuestions} completed questions
                </p>
              </Card>

              <Card accentBorder="violet" className="bg-[#0D0B14] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Questions Attempted</span>
                  <div className="p-2 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-[#8B5CF6] tracking-tight">
                  {analytics.totalQuestions}
                </p>
                <p className="text-[11px] text-[#A6A1B2] mt-1 truncate">
                  Practice & assessment questions
                </p>
              </Card>

              <Card accentBorder="pink" className="bg-[#0D0B14] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Correct Solutions</span>
                  <div className="p-2 rounded-lg bg-[#FF6B9D]/10 text-[#FF6B9D]">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-[#FF6B9D] tracking-tight">
                  {analytics.correctAnswers}
                </p>
                <p className="text-[11px] text-[#A6A1B2] mt-1 truncate">
                  Successfully solved questions
                </p>
              </Card>

              <Card accentBorder="none" className="bg-[#0D0B14] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#A6A1B2]">Topics Practiced</span>
                  <div className="p-2 rounded-lg bg-white/10 text-white">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white tracking-tight">
                  {analytics.topicMastery.length}
                </p>
                <p className="text-[11px] text-[#A6A1B2] mt-1 truncate">
                  Unique subjects & topics evaluated
                </p>
              </Card>
            </div>

            {/* SECTION 3: PERFORMANCE TREND OVER TIME */}
            <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#C7FF4A]" />
                    Performance Trend Over Time
                  </h3>
                  <p className="text-xs text-[#A6A1B2] mt-0.5">
                    Accuracy percentage across your practice and assessment sessions.
                  </p>
                </div>
              </div>

              {analytics.trends.length >= 2 ? (
                <div className="h-64 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#A6A1B2" fontSize={11} tickLine={false} />
                      <YAxis stroke="#A6A1B2" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181620',
                          borderColor: 'rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          color: '#F7F5FA',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => [`${val}%`, 'Accuracy']}
                        labelFormatter={(label) => `Session Date: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#C7FF4A"
                        strokeWidth={3}
                        dot={{ fill: '#C7FF4A', r: 4, strokeWidth: 2, stroke: '#0D0B14' }}
                        activeDot={{ r: 6, fill: '#C7FF4A' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#13111C] rounded-xl border border-white/5 space-y-2">
                  <Activity className="w-8 h-8 text-[#A6A1B2] mx-auto opacity-40" />
                  <p className="text-xs text-[#A6A1B2]">
                    Performance trends will appear after you complete more sessions.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 4 & 5: STRENGTHS & AREAS TO IMPROVE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* STRENGTHS */}
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Your Strengths
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    High Accuracy (≥70%)
                  </span>
                </div>

                {analytics.strengths.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.strengths.map((item) => (
                      <div
                        key={item.topic}
                        className="p-3.5 rounded-xl bg-[#13111C] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{item.topic}</p>
                          <p className="text-[11px] text-[#A6A1B2]">
                            {item.correct} of {item.total} correct solutions
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-extrabold text-xs border border-emerald-500/30">
                            {item.accuracy}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-[#13111C] rounded-xl border border-white/5">
                    <p className="text-xs text-[#A6A1B2]">
                      Complete more questions to identify your strongest topics.
                    </p>
                  </div>
                )}
              </div>

              {/* AREAS TO IMPROVE (WEAK AREAS) */}
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Areas to Improve
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Needs Practice (&lt;70%)
                  </span>
                </div>

                {analytics.weakAreas.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.weakAreas.map((item) => (
                      <div
                        key={item.topic}
                        className="p-3.5 rounded-xl bg-[#13111C] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-sm text-white">{item.topic}</p>
                          <p className="text-[11px] text-amber-400 font-medium">
                            {item.wrong} incorrect answers ({item.accuracy}% accuracy)
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/practice')}
                          className="text-xs text-[#C7FF4A] border-[#C7FF4A]/30 hover:bg-[#C7FF4A]/10"
                        >
                          Practice this topic
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-[#13111C] rounded-xl border border-white/5">
                    <p className="text-xs text-emerald-400 font-semibold">
                      Great job! No weak topics detected in evaluated questions.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 6: TOPIC MASTERY BREAKDOWN */}
            <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C7FF4A]" />
                Topic Mastery Breakdown
              </h3>

              <div className="space-y-4">
                {analytics.topicMastery.map((item) => {
                  const isHigh = item.accuracy >= 75;
                  const isMid = item.accuracy >= 50 && item.accuracy < 75;

                  return (
                    <div key={item.topic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{item.topic}</span>
                        <span className="font-mono text-[11px] text-[#A6A1B2]">
                          {item.correct}/{item.total} Solved ({item.accuracy}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#181620] rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHigh
                              ? 'bg-emerald-400'
                              : isMid
                              ? 'bg-[#8B5CF6]'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.max(5, item.accuracy)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 7: PRACTICE VS ASSESSMENT COMPARISON (Only if data for both exists) */}
            {analytics.hasPracticeData && analytics.hasAssessmentData && (
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[#C7FF4A]" />
                  Practice vs Assessment Performance
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#13111C] border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-[#A6A1B2] uppercase tracking-wider">
                      Practice Sessions
                    </span>
                    <div className="text-2xl font-black text-[#C7FF4A]">
                      {analytics.practiceAccuracy}% <span className="text-xs font-normal text-[#A6A1B2]">Accuracy</span>
                    </div>
                    <p className="text-[11px] text-[#A6A1B2]">
                      {analytics.practiceCorrect} / {analytics.practiceQuestions} correct in interactive practice
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#13111C] border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-[#A6A1B2] uppercase tracking-wider">
                      Proctored Assessments
                    </span>
                    <div className="text-2xl font-black text-[#8B5CF6]">
                      {analytics.assessmentAccuracy}% <span className="text-xs font-normal text-[#A6A1B2]">Accuracy</span>
                    </div>
                    <p className="text-[11px] text-[#A6A1B2]">
                      {analytics.assessmentCorrect} / {analytics.assessmentQuestions} correct under exam conditions
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8 & 9: RECENT ACTIVITY & MISTAKE ANALYSIS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RECENT ACTIVITY */}
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C7FF4A]" />
                  Recent Activity
                </h3>

                {analytics.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.recentActivity.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl bg-[#13111C] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              act.type === 'Assessment'
                                ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30'
                                : 'bg-[#C7FF4A]/15 text-[#C7FF4A] border border-[#C7FF4A]/30'
                            }`}>
                              {act.type}
                            </span>
                            <span className="text-[11px] text-[#A6A1B2]">{act.timestamp}</span>
                          </div>
                          <p className="font-semibold text-xs text-white mt-1">{act.title}</p>
                        </div>
                        <span className="text-xs font-bold text-white">
                          {act.scoreText}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#A6A1B2] text-center p-4">No recent activity</p>
                )}
              </div>

              {/* MISTAKE ANALYSIS */}
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  Mistake Analysis
                </h3>

                {analytics.frequentMistakes.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.frequentMistakes.map((m) => (
                      <div
                        key={m.topic}
                        className="p-3.5 rounded-xl bg-[#13111C] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <span className="font-semibold text-xs text-white">{m.topic}</span>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 font-bold text-xs border border-rose-500/30">
                          {m.mistakeCount} mistakes
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-semibold text-center p-4">
                    No recorded mistakes in evaluated sessions.
                  </p>
                )}
              </div>
            </div>

            {/* SECTION 10: DATA-DRIVEN LEARNING INSIGHTS */}
            {analytics.insights.length > 0 && (
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C7FF4A]" />
                  Learning Insights
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analytics.insights.map((ins, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#13111C] border border-white/10 text-xs text-[#F7F5FA] leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4A] mt-1.5 flex-shrink-0" />
                      <span>{ins}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 11: RECOMMENDED NEXT STEPS */}
            {analytics.recommendedSteps.length > 0 && (
              <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
                <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#C7FF4A]" />
                  Recommended Next Steps
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analytics.recommendedSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-xl bg-[#13111C] border border-white/10 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-white">{step.title}</h4>
                        <p className="text-xs text-[#A6A1B2] mt-1 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(step.link)}
                        className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] w-full text-xs"
                      >
                        {step.actionText}
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
