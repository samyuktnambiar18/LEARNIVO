import { parseYoutubeResponse } from '../../utils/adapters';
import { VideoRecommendation } from '../../types';

const YOUTUBE_WEBHOOK_URL = import.meta.env.VITE_YOUTUBE_WEBHOOK_URL || 'https://api.agents.snsihub.ai/webhook/93f412d3-f32c-4e09-bf65-0fc1d3fbe096';

export const youtubeService = {
  fetchRecommendations: async (topic: string): Promise<VideoRecommendation[]> => {
    if (!topic || topic.trim().length === 0) {
      return [];
    }

    try {
      const response = await fetch(YOUTUBE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: topic,
          topic: topic,
          limit: 6
        })
      });

      if (!response.ok) {
        console.warn(`YouTube webhook status: ${response.status}`);
        return [];
      }

      const contentType = response.headers.get('content-type');
      let rawData: any;
      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        rawData = await response.text();
      }

      return parseYoutubeResponse(rawData, topic);
    } catch (error) {
      console.warn('YouTube recommendations service error:', error);
      return [];
    }
  }
};
