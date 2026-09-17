import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, BrainCircuit, BarChart3, Upload, ArrowRight, Video, Sparkles, MessageSquareCode } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
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

  useEffect(() => {
    const loadedMaterials = storageService.getMaterials();
    const loadedProgress = storageService.getProgress();
    const loadedAttempts = storageService.getPracticeAttempts();

    setMaterials(loadedMaterials);
    setProgress(loadedProgress);
    setAttempts(loadedAttempts);
  }, []);

  const activeMaterial = materials.length > 0 ? materials[0] : null;
  const activeTopic = activeMaterial?.topics[0]?.name || (attempts.length > 0 ? attempts[0].topic : null);

  const hasAnyData = materials.length > 0 || attempts.length > 0;

  return (
    <MainLayout>
      {!hasAnyData ? (
        <div className="py-12">
          <EmptyState
            icon={Sparkles}
            title="Your learning workspace is ready"
            description="Upload learning material or begin an assessment to start building your personalized learning path."
            actionLabel="Upload Material"
            onAction={() => window.location.href = '/upload'}
          />
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
                Overview of active learning materials, practice interactions, and video resources.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/upload">
                <Button variant="primary" size="sm">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload PDF
                </Button>
              </Link>
              <Link to="/practice">
                <Button variant="secondary" size="sm">
                  <BrainCircuit className="w-4 h-4 mr-1.5" />
                  Practice
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar (ONLY shown when real activity exists) */}
          {progress && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card accentBorder="lime">
                <p className="text-xs font-semibold text-[#A6A1B2] mb-1">Accuracy Rate</p>
                <p className="text-2xl font-bold text-[#C7FF4A]">{progress.accuracyPercentage}%</p>
                <p className="text-[11px] text-[#A6A1B2] mt-1">{progress.correctAnswers} / {progress.questionsAttempted} correct</p>
              </Card>

              <Card accentBorder="violet">
                <p className="text-xs font-semibold text-[#A6A1B2] mb-1">Questions Attempted</p>
                <p className="text-2xl font-bold text-[#8B5CF6]">{progress.questionsAttempted}</p>
                <p className="text-[11px] text-[#A6A1B2] mt-1">Practice & Assessment</p>
              </Card>

              <Card accentBorder="pink">
                <p className="text-xs font-semibold text-[#A6A1B2] mb-1">Study Time</p>
                <p className="text-2xl font-bold text-[#FF6B9D]">{progress.totalStudyMinutes} min</p>
                <p className="text-[11px] text-[#A6A1B2] mt-1">Total active sessions</p>
              </Card>

              <Card accentBorder="none">
                <p className="text-xs font-semibold text-[#A6A1B2] mb-1">Materials Loaded</p>
                <p className="text-2xl font-bold text-[#F7F5FA]">{materials.length}</p>
                <p className="text-[11px] text-[#A6A1B2] mt-1">Processed documents</p>
              </Card>
            </div>
          )}

          {/* Active Material Section */}
          {activeMaterial && (
            <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#F7F5FA]">{activeMaterial.title}</h3>
                    <p className="text-xs text-[#A6A1B2]">
                      Uploaded {new Date(activeMaterial.uploadedAt).toLocaleDateString()} • {(activeMaterial.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <Link to="/ai-tutor">
                  <Button variant="outline" size="sm">
                    <MessageSquareCode className="w-4 h-4 mr-1.5" />
                    Ask AI Tutor
                  </Button>
                </Link>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider mb-2">
                  Key Document Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeMaterial.topics.map((t) => (
                    <Badge key={t.id} variant="neutral">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* YouTube Video Discovery for Active Topic */}
          {activeTopic && (
            <VideoRecommendations topic={activeTopic} />
          )}

          {/* Recent Activity List */}
          {attempts.length > 0 && (
            <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
              <h3 className="text-base font-semibold text-[#F7F5FA]">Recent Practice History</h3>
              <div className="space-y-2">
                {attempts.slice(0, 5).map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${att.isCorrect ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-[#F7F5FA] font-medium">{att.topic}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[#A6A1B2]">
                      <Badge variant={att.difficulty === 'Easy' ? 'easy' : att.difficulty === 'Medium' ? 'medium' : 'hard'}>
                        {att.difficulty}
                      </Badge>
                      <span>{new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
};
