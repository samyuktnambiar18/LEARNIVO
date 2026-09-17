import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BrainCircuit, BarChart3, Upload, ArrowRight, Video, Sparkles, MessageSquareCode, Award, Play } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { assessmentHistoryService, AssessmentHistoryRecord } from '../../services/assessmentHistoryService';
import { LearningMaterial, LearningProgress, PracticeAttempt } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { VideoRecommendations } from '../../components/learning/VideoRecommendations';

export const DashboardPage: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [latestAssessment, setLatestAssessment] = useState<AssessmentHistoryRecord | null>(null);
  const [totalAssessmentsCount, setTotalAssessmentsCount] = useState<number>(0);

  useEffect(() => {
    const loadedMaterials = storageService.getMaterials();
    const loadedProgress = storageService.getProgress();
    const loadedAttempts = storageService.getPracticeAttempts();

    setMaterials(loadedMaterials);
    setProgress(loadedProgress);
    setAttempts(loadedAttempts);

    loadAssessmentData();
  }, []);

  const loadAssessmentData = async () => {
    try {
      const history = await assessmentHistoryService.getHistory();
      setTotalAssessmentsCount(history.length);
      if (history.length > 0) {
        setLatestAssessment(history[0]);
      }
    } catch (err) {
      console.warn('Dashboard assessment history error:', err);
    }
  };

  const activeMaterial = materials.length > 0 ? materials[0] : null;
  const activeTopic = activeMaterial?.topics[0]?.name || (attempts.length > 0 ? attempts[0].topic : null);
  const hasAnyData = materials.length > 0 || attempts.length > 0 || latestAssessment !== null;

  return (
    <MainLayout>
      {!hasAnyData ? (
        <div className="py-8 space-y-8 max-w-4xl mx-auto">
          <EmptyState
            icon={Sparkles}
            title="Your learning workspace is ready"
            description="Upload learning material or begin an assessment to start building your personalized learning path."
            actionLabel="Upload Material"
            onAction={() => window.location.href = '/materials'}
          />

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <Link to="/materials">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#C7FF4A]/40 transition-all text-center space-y-2 group">
                <Upload className="w-6 h-6 mx-auto text-[#C7FF4A]" />
                <div className="text-xs font-bold text-white group-hover:text-[#C7FF4A]">Upload Material</div>
              </div>
            </Link>

            <Link to="/assessment">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#C7FF4A]/40 transition-all text-center space-y-2 group">
                <Play className="w-6 h-6 mx-auto text-[#C7FF4A]" />
                <div className="text-xs font-bold text-white group-hover:text-[#C7FF4A]">Take Assessment</div>
              </div>
            </Link>

            <Link to="/ai-tutor">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#8B5CF6]/40 transition-all text-center space-y-2 group">
                <MessageSquareCode className="w-6 h-6 mx-auto text-[#8B5CF6]" />
                <div className="text-xs font-bold text-white group-hover:text-[#8B5CF6]">Open AI Tutor</div>
              </div>
            </Link>

            <Link to="/practice">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#FF6B9D]/40 transition-all text-center space-y-2 group">
                <BrainCircuit className="w-6 h-6 mx-auto text-[#FF6B9D]" />
                <div className="text-xs font-bold text-white group-hover:text-[#FF6B9D]">Practice</div>
              </div>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
                Student Learning Workspace
              </h2>
              <p className="text-xs text-[#A6A1B2]">
                Overview of active learning materials, assessment results, and study progress.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/materials">
                <Button variant="primary" size="sm">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload PDF
                </Button>
              </Link>
              <Link to="/assessment">
                <Button variant="secondary" size="sm" className="bg-[#C7FF4A] text-black hover:bg-[#b8f533]">
                  <Play className="w-4 h-4 mr-1.5" />
                  Take Assessment
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link to="/materials">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#C7FF4A]/40 transition-all flex items-center gap-3 group bg-[#0D0B14]">
                <div className="w-10 h-10 rounded-lg bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#C7FF4A]">Upload Material</div>
                  <div className="text-[10px] text-[#A6A1B2]">Add syllabus PDF</div>
                </div>
              </div>
            </Link>

            <Link to="/assessment">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#C7FF4A]/40 transition-all flex items-center gap-3 group bg-[#0D0B14]">
                <div className="w-10 h-10 rounded-lg bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#C7FF4A]">Take Assessment</div>
                  <div className="text-[10px] text-[#A6A1B2]">Evaluate knowledge</div>
                </div>
              </div>
            </Link>

            <Link to="/ai-tutor">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#8B5CF6]/40 transition-all flex items-center gap-3 group bg-[#0D0B14]">
                <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                  <MessageSquareCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#8B5CF6]">Open AI Tutor</div>
                  <div className="text-[10px] text-[#A6A1B2]">Ask concepts</div>
                </div>
              </div>
            </Link>

            <Link to="/practice">
              <div className="surface-card p-4 rounded-xl border border-white/10 hover:border-[#FF6B9D]/40 transition-all flex items-center gap-3 group bg-[#0D0B14]">
                <div className="w-10 h-10 rounded-lg bg-[#FF6B9D]/10 border border-[#FF6B9D]/30 flex items-center justify-center text-[#FF6B9D]">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-[#FF6B9D]">Practice</div>
                  <div className="text-[10px] text-[#A6A1B2]">Adaptive questions</div>
                </div>
              </div>
            </Link>
          </div>

          {/* Real Assessment Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latest Assessment Result Card */}
            <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F7F5FA] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C7FF4A]" />
                  <span>Recent Assessment</span>
                </h3>

                <Link to="/assessment" className="text-xs text-[#C7FF4A] font-semibold hover:underline">
                  View All →
                </Link>
              </div>

              {latestAssessment ? (
                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{latestAssessment.subject_name}</h4>
                      <p className="text-xs font-mono text-[#A6A1B2]">{latestAssessment.subject_code}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#C7FF4A]">{latestAssessment.score} / {latestAssessment.total_questions}</div>
                      <div className="text-xs font-bold text-white">{latestAssessment.percentage}% Score</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#A6A1B2] pt-1 border-t border-white/5">
                    Completed {new Date(latestAssessment.completed_at).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#13111C] border border-white/10 text-center space-y-2">
                  <p className="text-xs text-[#A6A1B2]">No assessment history yet.</p>
                  <Link to="/assessment">
                    <Button variant="outline" size="sm" className="mt-2 text-xs">
                      Take First Assessment
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Real Learning Activity Summary */}
            <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4">
              <h3 className="text-sm font-bold text-[#F7F5FA] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#8B5CF6]" />
                <span>Learning Activity</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-bold text-[#C7FF4A]">{totalAssessmentsCount}</div>
                  <div className="text-xs font-medium text-[#A6A1B2]">Assessments Completed</div>
                </div>

                <div className="p-4 rounded-xl bg-[#13111C] border border-white/10">
                  <div className="text-2xl font-bold text-[#8B5CF6]">{progress ? progress.questionsAttempted : (totalAssessmentsCount * 10)}</div>
                  <div className="text-xs font-medium text-[#A6A1B2]">Questions Attempted</div>
                </div>
              </div>

              {activeMaterial && (
                <div className="p-3.5 rounded-xl bg-[#13111C] border border-white/10 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[#A6A1B2] block text-[10px] uppercase font-semibold">Active Material</span>
                    <span className="text-white font-bold">{activeMaterial.title}</span>
                  </div>
                  <Badge variant="neutral">{activeMaterial.topics.length} Topics</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Continue Learning Section (Only shown if real material topic exists) */}
          {activeTopic && (
            <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#C7FF4A] uppercase tracking-wider block">Continue Learning</span>
                  <h4 className="text-base font-bold text-white">{activeTopic}</h4>
                </div>

                <Link to="/ai-tutor">
                  <Button variant="primary" size="sm" className="bg-[#C7FF4A] text-black hover:bg-[#b8f533]">
                    Continue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* YouTube Video Recommendations */}
          {activeTopic && (
            <VideoRecommendations topic={activeTopic} />
          )}
        </div>
      )}
    </MainLayout>
  );
};
