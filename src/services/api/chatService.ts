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
    materialText?: string,
    imageFile?: File | null,
    studentId?: string,
    imageUrl?: string,
    sessionId?: string
  ): Promise<ChatServiceResponse> => {
    try {
      let response: Response;

      if (imageFile) {
        const formData = new FormData();
        const isPdf = imageFile.type === 'application/pdf' || imageFile.name.toLowerCase().endsWith('.pdf');

        formData.append('file', imageFile);
        formData.append('image', imageFile);
        if (isPdf) {
          formData.append('pdf', imageFile);
          formData.append('filename', imageFile.name);
        }

        if (messageText.trim()) {
          formData.append('message', messageText.trim());
        }
        formData.append('query', messageText.trim() || (isPdf ? 'Analyze this PDF document' : 'Explain this image'));
        formData.append('text', messageText.trim() || (isPdf ? 'Analyze this PDF document' : 'Explain this image'));
        formData.append('student_id', studentId || 'guest_student');
        if (sessionId) {
          formData.append('session_id', sessionId);
          formData.append('sessionId', sessionId);
        }
        formData.append('subject', materialTitle || 'General');
        formData.append('timestamp', new Date().toISOString());
        if (materialText) {
          formData.append('context', materialText.slice(0, 2000));
        }

        // NOTE: Do NOT set Content-Type header so browser automatically generates multipart/form-data boundary
        response = await fetch(CHAT_WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(CHAT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageText.trim() || 'Explain this image',
            query: messageText.trim() || 'Explain this image',
            text: messageText.trim() || 'Explain this image',
            student_id: studentId || 'guest_student',
            session_id: sessionId || '',
            sessionId: sessionId || '',
            subject: materialTitle || 'General',
            timestamp: new Date().toISOString(),
            materialTitle: materialTitle || '',
            context: materialText ? materialText.slice(0, 2000) : '',
            imageUrl: imageUrl || '',
            image: imageUrl || '',
          })
        });
      }

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

  // Step 1: If rawData is a JSON string, attempt to parse it first
  let parsed = rawData;
  if (typeof rawData === 'string') {
    const trimmed = rawData.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = rawData;
      }
    }
  }

  // Helper to extract text from an object/string
  const extractTextContent = (obj: any): string => {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

    if (typeof obj === 'object') {
      // Check _responseData / responseData keys explicitly
      const resData = obj._responseData ?? obj.responseData ?? obj._RESPONSEDATA ?? obj.response_data;
      if (resData !== undefined && resData !== null) {
        if (typeof resData === 'string') {
          // If _responseData is a JSON string, try parsing it
          const resTrimmed = resData.trim();
          if (resTrimmed.startsWith('{') || resTrimmed.startsWith('[')) {
            try {
              const innerParsed = JSON.parse(resTrimmed);
              const innerText = extractTextContent(innerParsed);
              if (innerText) return innerText;
            } catch {
              // Not JSON, return original string
            }
          }
          return resData;
        }
        const innerText = extractTextContent(resData);
        if (innerText) return innerText;
      }

      // Check standard response fields
      if (obj.output && typeof obj.output === 'string') return obj.output;
      if (obj.text && typeof obj.text === 'string') return obj.text;
      if (obj.response && typeof obj.response === 'string') return obj.response;
      if (obj.message && typeof obj.message === 'string') return obj.message;
      if (obj.reply && typeof obj.reply === 'string') return obj.reply;
      if (obj.answer && typeof obj.answer === 'string') return obj.answer;

      if (obj.output) return extractTextContent(obj.output);
      if (obj.text) return extractTextContent(obj.text);
      if (obj.response) return extractTextContent(obj.response);

      if (Array.isArray(obj)) {
        return obj.map(item => extractTextContent(item)).filter(Boolean).join('\n');
      }
    }

    return '';
  };

  let textResponse = extractTextContent(parsed);

  if (!textResponse && typeof parsed === 'object') {
    textResponse = JSON.stringify(parsed);
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
