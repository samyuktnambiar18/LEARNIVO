import { ChatMessage, VideoRecommendation } from '../../types';
import { parseYoutubeResponse } from '../../utils/adapters';

const CHAT_WEBHOOK_URL = import.meta.env.VITE_CHAT_WEBHOOK_URL || 'https://api.agents.snsihub.ai/webhook/4a662d25-cbee-4e03-8afb-ecb929b27719';

const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi;

export interface ChatServiceResponse {
  text: string;
  videoUrl?: string;
  youtubeId?: string;
  videos?: VideoRecommendation[];
  suggestedFollowups?: string[];
}

export const chatService = {
  sendMessage: async (
    messageText: string,
    materialTitle?: string,
    materialText?: string
  ): Promise<ChatServiceResponse> => {
    try {
      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          query: messageText,
          text: messageText,
          materialTitle: materialTitle || '',
          context: materialText ? materialText.slice(0, 2000) : '',
        })
      });

      if (!response.ok) {
        console.warn(`Chat webhook returned HTTP ${response.status}`);
        return buildFallbackChatResponse(messageText, materialTitle);
      }

      const contentType = response.headers.get('content-type');
      let rawData: any;

      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        const text = await response.text();
        rawData = { text };
      }

      return parseChatWebhookResponse(rawData, messageText, materialTitle);

    } catch (error) {
      console.warn('Chat webhook connection error:', error);
      return buildFallbackChatResponse(messageText, materialTitle);
    }
  }
};

/**
 * Normalizes chat webhook payload from SNS Agent Workbench
 */
function parseChatWebhookResponse(
  rawData: any,
  userMessageText: string,
  materialTitle?: string
): ChatServiceResponse {
  if (!rawData) {
    return buildFallbackChatResponse(userMessageText, materialTitle);
  }

  // Handle various text response keys returned by webhook / agent workflows
  let textResponse = '';
  if (typeof rawData === 'string') {
    textResponse = rawData;
  } else {
    textResponse =
      rawData.output ||
      rawData.text ||
      rawData.response ||
      rawData.message ||
      rawData.reply ||
      rawData.answer ||
      (Array.isArray(rawData) ? rawData.map(r => r.output || r.text || JSON.stringify(r)).join('\n') : '');
  }

  if (!textResponse && typeof rawData === 'object') {
    textResponse = JSON.stringify(rawData);
  }

  // Extract YouTube URL or Video ID
  let videoUrl: string | undefined = rawData.youtubeUrl || rawData.videoUrl || rawData.url || rawData.video;
  let youtubeId: string | undefined = rawData.youtubeId || rawData.videoId;

  // Search for YouTube URLs inside text response using Regex
  YOUTUBE_REGEX.lastIndex = 0;
  const matches = [...textResponse.matchAll(YOUTUBE_REGEX)];

  if (matches.length > 0) {
    const fullMatch = matches[0][0];
    const idMatch = matches[0][1];
    videoUrl = fullMatch.startsWith('http') ? fullMatch : `https://www.youtube.com/watch?v=${idMatch}`;
    youtubeId = idMatch;
  } else if (videoUrl) {
    const idMatch = videoUrl.match(/(?:v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (idMatch) {
      youtubeId = idMatch[1];
    }
  }

  // Check for embedded video items array
  let videos: VideoRecommendation[] = [];
  if (rawData.videos || rawData.results || rawData.items) {
    videos = parseYoutubeResponse(rawData.videos || rawData.results || rawData.items, userMessageText);
  }

  const suggestedFollowups = Array.isArray(rawData.suggestedFollowups || rawData.followups)
    ? (rawData.suggestedFollowups || rawData.followups)
    : [
        'Can you give me a practice problem on this?',
        'Explain the mathematical step-by-step logic',
        'What are edge cases to keep in mind?'
      ];

  return {
    text: textResponse.trim(),
    videoUrl,
    youtubeId,
    videos: videos.length > 0 ? videos : undefined,
    suggestedFollowups
  };
}

function buildFallbackChatResponse(userText: string, materialTitle?: string): ChatServiceResponse {
  let text = '';
  if (materialTitle) {
    text = `Regarding "${userText}" in material "${materialTitle}":\n\n` +
      `Analyzing core concepts... To solve this systematically, verify definition parameters, test edge cases, and apply step-by-step proof validation.`;
  } else {
    text = `Regarding "${userText}":\n\n` +
      `1. Formulate the governing equations or algorithmic steps.\n` +
      `2. Verify dimensions and initial parameters.\n` +
      `3. Confirm solution consistency.`;
  }

  return {
    text,
    suggestedFollowups: [
      'Can you give me a practice problem on this?',
      'Explain the mathematical logic step-by-step'
    ]
  };
}
