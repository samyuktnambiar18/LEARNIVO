import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Trash2, FileText, Upload, Video, ChevronDown, ChevronUp, Play, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { LearningMaterial } from '../../types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { VideoRecommendations } from '../../components/learning/VideoRecommendations';
import { youtubeScraperService, LatestSyllabusData } from '../../services/api/youtubeScraperService';

export const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [expandedVideosId, setExpandedVideosId] = useState<string | null>(null);
  
  // State for Most Recent Syllabus & 5 YouTube Materials from Supabase
  const [latestSyllabus, setLatestSyllabus] = useState<LatestSyllabusData | null>(null);
  const [isLoadingLatest, setIsLoadingLatest] = useState<boolean>(true);

  useEffect(() => {
    // 1. Load local materials
    setMaterials(storageService.getMaterials());

    // 2. Fetch MOST RECENT syllabus data & 5 YouTube materials from Supabase
    fetchMostRecentSyllabus();
  }, []);

  const fetchMostRecentSyllabus = async () => {
    setIsLoadingLatest(true);
    try {
      const data = await youtubeScraperService.getLatestSyllabusAndMaterials();
      setLatestSyllabus(data);
    } catch (err) {
      console.warn('Failed to load latest syllabus YouTube materials:', err);
    } finally {
      setIsLoadingLatest(false);
    }
  };

  const handleDelete = (id: string) => {
    storageService.deleteMaterial(id);
    setMaterials(storageService.getMaterials());
  };

  const toggleVideos = (id: string) => {
    setExpandedVideosId(prev => prev === id ? null : id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
              Learning Materials Repository
            </h2>
            <p className="text-xs text-[#A6A1B2]">
              All processed PDF documents, extracted topics, and matched YouTube concept videos.
            </p>
          </div>

          <Link to="/upload">
            <Button variant="primary" size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Upload PDF
            </Button>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* MOST RECENT SYLLABUS & 5 YOUTUBE LEARNING MATERIALS FROM SUPABASE         */}
        {/* ========================================================================= */}
        <div className="surface-card p-6 border border-[#C7FF4A]/30 rounded-xl space-y-6 bg-[#121118]/90 relative overflow-hidden shadow-[0_0_25px_rgba(199,255,74,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-widest text-[#C7FF4A] uppercase font-bold px-2 py-0.5 rounded bg-[#C7FF4A]/10 border border-[#C7FF4A]/30">
                    MOST RECENT SYLLABUS
                  </span>
                  {latestSyllabus?.createdAt && (
                    <span className="text-[11px] text-[#A6A1B2]">
                      • Uploaded {new Date(latestSyllabus.createdAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#F7F5FA] mt-0.5">
                  {latestSyllabus?.subjectTitle || 'Latest Processed Syllabus'}
                </h3>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchMostRecentSyllabus}
              isLoading={isLoadingLatest}
            >
              Refresh Latest Data
            </Button>
          </div>

          {isLoadingLatest ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4A] mx-auto" />
              <p className="text-xs text-[#A6A1B2]">
                Fetching latest syllabus topics and running Apify YouTube Scraper for 5 topics...
              </p>
            </div>
          ) : !latestSyllabus || latestSyllabus.selected5Topics.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#A6A1B2]">
              No uploaded syllabus found in Supabase yet. Upload a syllabus PDF to auto-generate YouTube concept videos!
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* EXTRACTED TOPICS (5 SELECTED) */}
              <div>
                <h4 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>EXTRACTED TOPICS (5 Selected for YouTube Search)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {latestSyllabus.selected5Topics.map((topic, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 text-xs font-semibold text-[#C7FF4A] flex items-center gap-1.5"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#C7FF4A] text-[#08090D] font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span>{topic}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* YOUTUBE LEARNING MATERIALS (5 VIDEO CARDS) */}
              <div>
                <h4 className="text-xs font-semibold text-[#F7F5FA] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-red-500" />
                  <span>YOUTUBE LEARNING MATERIALS (5 Concept Videos)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {latestSyllabus.youtubeMaterials.map((vid, idx) => (
                    <div 
                      key={vid.id || idx}
                      className="group surface-card p-4 rounded-xl border border-white/10 hover:border-[#C7FF4A]/40 transition-all flex flex-col justify-between bg-[#181620]"
                    >
                      <div>
                        {/* Topic Tag */}
                        <div className="mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-wide text-[#C7FF4A] font-semibold px-2 py-0.5 rounded bg-[#C7FF4A]/10 border border-[#C7FF4A]/20">
                            Topic {idx + 1}: {vid.topic}
                          </span>
                        </div>

                        {/* Video Thumbnail */}
                        <div className="relative aspect-video rounded-lg bg-black/60 overflow-hidden mb-3 flex items-center justify-center">
                          {vid.thumbnail_url ? (
                            <img
                              src={vid.thumbnail_url}
                              alt={vid.video_title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center text-white">
                              <Play className="w-6 h-6 fill-current ml-0.5" />
                            </div>
                          )}

                          {/* Duration Badge */}
                          {vid.duration && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                              {vid.duration}
                            </span>
                          )}

                          {/* Hover Play Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                              <Play className="w-6 h-6 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Title & Details */}
                        <h5 className="text-xs font-bold text-[#F7F5FA] line-clamp-2 mb-1 group-hover:text-[#C7FF4A] transition-colors leading-snug">
                          {vid.video_title}
                        </h5>

                        <div className="text-[11px] text-[#A6A1B2] space-y-0.5 mb-4">
                          <p className="font-medium text-[#E2E8F0] truncate">{vid.channel_name}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            {vid.view_count && (
                              <span>{vid.view_count.toLocaleString()} views</span>
                            )}
                            {vid.published_date && (
                              <span>• {new Date(vid.published_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Watch Video Button */}
                      <a
                        href={vid.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#C7FF4A] text-[#08090D] font-bold text-xs hover:bg-[#d5ff6b] transition-all shadow-md group-hover:shadow-[#C7FF4A]/20"
                      >
                        <span>Watch Video</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Existing Materials List */}
        {materials.length === 0 && (!latestSyllabus || latestSyllabus.selected5Topics.length === 0) ? (
          <EmptyState
            icon={FolderOpen}
            title="No learning material yet"
            description="Upload a PDF document to begin your intelligent learning experience."
            actionLabel="Upload Material"
            onAction={() => window.location.href = '/upload'}
          />
        ) : (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold text-[#A6A1B2] uppercase tracking-wider">
              All Stored Documents ({materials.length})
            </h3>

            {materials.map((mat) => {
              const topTopic = mat.topics[0]?.name || mat.title || 'General';
              const isExpanded = expandedVideosId === mat.id;

              return (
                <div key={mat.id} className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#F7F5FA]">{mat.title}</h3>
                        <p className="text-xs text-[#A6A1B2]">
                          {(mat.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded {new Date(mat.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-1.5 text-[#A6A1B2] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-[#C7FF4A] uppercase tracking-wider mb-2">
                      Extracted Topics ({mat.topics.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {mat.topics.map(t => (
                        <Badge key={t.id} variant="neutral">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <Link to="/ai-tutor">
                        <Button variant="outline" size="sm">
                          Study with AI
                        </Button>
                      </Link>
                      <Link to="/practice">
                        <Button variant="ghost" size="sm">
                          Practice Problems
                        </Button>
                      </Link>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleVideos(mat.id)}
                    >
                      <Video className="w-4 h-4 mr-1.5 text-red-500" />
                      {isExpanded ? 'Hide Videos' : 'YouTube Concept Videos'}
                      {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-white/10 animate-fade-in">
                      <VideoRecommendations topic={topTopic} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </MainLayout>
  );
};
