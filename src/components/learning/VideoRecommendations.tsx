import React, { useState, useEffect } from 'react';
import { Play, Video, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { youtubeScraperService, LatestSyllabusData } from '../../services/api/youtubeScraperService';
import { YouTubeMaterialRecord } from '../../types';

interface VideoRecommendationsProps {
  topic?: string;
}

export const VideoRecommendations: React.FC<VideoRecommendationsProps> = () => {
  const [syllabusData, setSyllabusData] = useState<LatestSyllabusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setIsError(false);

    youtubeScraperService.getLatestSyllabusAndMaterials()
      .then(data => {
        if (isMounted) {
          setSyllabusData(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.warn('Video fetch error from Supabase/Apify:', err);
        if (isMounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, []);

  return (
    <div className="surface-card p-6 border border-white/10 rounded-xl bg-[#121118]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-[#F7F5FA]">
            Recommended YouTube Course Videos (5 Topics from Latest Syllabus)
          </h3>
        </div>

        {syllabusData?.subjectTitle && (
          <span className="text-xs text-[#C7FF4A] font-mono font-medium px-2.5 py-1 rounded bg-[#C7FF4A]/10 border border-[#C7FF4A]/20">
            {syllabusData.subjectTitle}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#C7FF4A] mx-auto" />
          <p className="text-xs text-[#A6A1B2]">Fetching topics from Supabase database & running Apify YouTube Scraper...</p>
        </div>
      ) : isError ? (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center py-6">
          <AlertCircle className="w-6 h-6 text-[#A6A1B2] mx-auto mb-2" />
          <p className="text-xs text-[#A6A1B2]">Video recommendations are currently unavailable.</p>
        </div>
      ) : !syllabusData || syllabusData.youtubeMaterials.length === 0 ? (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center py-6">
          <Video className="w-6 h-6 text-[#A6A1B2] mx-auto mb-2" />
          <p className="text-xs text-[#A6A1B2]">No video recommendations found for the latest syllabus in Supabase yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {syllabusData.youtubeMaterials.map((vid: YouTubeMaterialRecord, idx: number) => (
            <div
              key={vid.id || idx}
              className="group surface-card p-3.5 rounded-xl border border-white/10 hover:border-[#C7FF4A]/40 transition-all flex flex-col justify-between bg-[#181620]"
            >
              <div>
                <div className="mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-[#C7FF4A] font-semibold px-2 py-0.5 rounded bg-[#C7FF4A]/10 border border-[#C7FF4A]/20">
                    Topic {idx + 1}: {vid.topic}
                  </span>
                </div>

                <div className="relative aspect-video rounded-lg bg-black/50 overflow-hidden mb-2.5 flex items-center justify-center">
                  {vid.thumbnail_url ? (
                    <img
                      src={vid.thumbnail_url}
                      alt={vid.video_title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-600/80 flex items-center justify-center text-white">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  )}

                  {vid.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                      {vid.duration}
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-[#F7F5FA] line-clamp-2 mb-1 group-hover:text-[#C7FF4A] transition-colors leading-snug">
                  {vid.video_title}
                </h4>

                <p className="text-[11px] text-[#A6A1B2] truncate mb-3">
                  {vid.channel_name} • {vid.view_count ? vid.view_count.toLocaleString() + ' views' : ''}
                </p>
              </div>

              <a
                href={vid.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#C7FF4A] text-[#08090D] font-bold text-xs hover:bg-[#d5ff6b] transition-all"
              >
                <span>Watch Video</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
