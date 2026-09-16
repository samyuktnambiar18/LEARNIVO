import React, { useState, useEffect } from 'react';
import { Play, Video, AlertCircle } from 'lucide-react';
import { youtubeService } from '../../services/api/youtubeService';
import { VideoRecommendation } from '../../types';
import { Skeleton } from '../ui/Skeleton';

interface VideoRecommendationsProps {
  topic: string;
}

export const VideoRecommendations: React.FC<VideoRecommendationsProps> = ({ topic }) => {
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!topic) return;

    let isMounted = true;
    setIsLoading(true);
    setIsError(false);

    youtubeService.fetchRecommendations(topic)
      .then(results => {
        if (isMounted) {
          setVideos(results);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.warn('Video fetch error:', err);
        if (isMounted) {
          setIsError(true);
          setIsLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [topic]);

  if (!topic) {
    return null;
  }

  return (
    <div className="surface-card p-6 border border-white/10 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-[#F7F5FA]">
            Recommended Videos for "{topic}"
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center py-6">
          <AlertCircle className="w-6 h-6 text-[#A6A1B2] mx-auto mb-2" />
          <p className="text-xs text-[#A6A1B2]">Video recommendations are currently unavailable.</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center py-6">
          <Video className="w-6 h-6 text-[#A6A1B2] mx-auto mb-2" />
          <p className="text-xs text-[#A6A1B2]">No video recommendations available for this topic yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((vid) => (
            <a
              key={vid.id}
              href={vid.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group surface-card p-3 rounded-lg border border-white/10 hover:border-white/25 transition-all flex flex-col"
            >
              <div className="relative aspect-video rounded bg-black/40 overflow-hidden mb-3 flex items-center justify-center">
                {vid.thumbnailUrl ? (
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-600/80 flex items-center justify-center text-white">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <h4 className="text-xs font-medium text-[#F7F5FA] line-clamp-2 mb-1 group-hover:text-[#C7FF4A] transition-colors">
                {vid.title}
              </h4>
              {vid.channelTitle && (
                <p className="text-[11px] text-[#A6A1B2] mt-auto">
                  {vid.channelTitle}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
