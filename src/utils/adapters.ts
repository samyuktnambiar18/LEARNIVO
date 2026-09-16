import {
  LearningMaterial,
  VideoRecommendation,
  AdaptiveLearningResult,
  AssessmentResult,
  Topic,
  Chapter
} from '../types';

/**
 * Normalizes raw PDF webhook response or extracted content into frontend LearningMaterial model
 */
export function parsePdfResponse(
  raw: any,
  fileName: string,
  fileSize: number
): LearningMaterial {
  const id = 'mat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const uploadedAt = new Date().toISOString();

  if (!raw) {
    return {
      id,
      fileName,
      fileSize,
      uploadedAt,
      topics: [],
      status: 'error',
      errorMessage: 'Empty server response'
    };
  }

  // Handle case where server returns text, object, or nested arrays
  let title = raw.title || raw.document_title || raw.filename || fileName.replace(/\.pdf$/i, '');
  let extractedText = raw.text || raw.extracted_text || raw.content || (typeof raw === 'string' ? raw : '');
  
  let rawTopics: any = raw.topics || raw.tags || raw.key_concepts || [];
  if (typeof rawTopics === 'string') {
    rawTopics = (rawTopics as string).split(',').map((t: string) => t.trim());
  }
  const rawTopicsArray: any[] = Array.isArray(rawTopics) ? rawTopics : [];

  const topics: Topic[] = rawTopicsArray.map((t: any, index: number) => {
    if (typeof t === 'string') {
      return {
        id: `top_${index}_${Date.now()}`,
        name: t,
        difficulty: index % 2 === 0 ? 'Medium' : 'Hard'
      };
    }
    return {
      id: t.id || `top_${index}_${Date.now()}`,
      name: t.name || t.topic || 'General Topic',
      description: t.description,
      difficulty: t.difficulty || 'Medium',
      masteryPercentage: t.mastery
    };
  });

  let rawChapters: any[] = raw.chapters || raw.sections || raw.outline || [];
  const chapters: Chapter[] = rawChapters.map((c: any, index: number) => ({
    id: `chap_${index}_${Date.now()}`,
    title: c.title || c.name || `Section ${index + 1}`,
    summary: c.summary || c.overview,
    topics: Array.isArray(c.topics) ? c.topics : []
  }));

  const rawVideos = raw.videos || raw.youtube_videos || raw.recommendations || raw.youtubeVideos;
  const videos = rawVideos ? parseYoutubeResponse(rawVideos, title) : [];

  return {
    id,
    fileName,
    fileSize,
    uploadedAt,
    title,
    rawText: extractedText,
    topics,
    chapters,
    videos,
    status: 'ready'
  };
}

/**
 * Normalizes raw YouTube webhook response into clean VideoRecommendation array
 */
export function parseYoutubeResponse(raw: any, defaultTopic: string = 'General'): VideoRecommendation[] {
  if (!raw) return [];

  let items: any[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw.results && Array.isArray(raw.results)) {
    items = raw.results;
  } else if (raw.videos && Array.isArray(raw.videos)) {
    items = raw.videos;
  } else if (raw.items && Array.isArray(raw.items)) {
    items = raw.items;
  } else if (typeof raw === 'object' && raw.title && (raw.url || raw.youtubeUrl)) {
    items = [raw];
  }

  return items.map((item, index) => {
    const youtubeUrl = item.url || item.youtubeUrl || item.link || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : '');
    const title = item.title || item.name || 'Educational Resource Video';
    const thumbnailUrl = item.thumbnail || item.thumbnailUrl || item.image || item.snippet?.thumbnails?.medium?.url;
    const channelTitle = item.channel || item.channelTitle || item.author || 'Educational Partner';
    const duration = item.duration || item.length;

    return {
      id: item.id || `vid_${Date.now()}_${index}`,
      title,
      youtubeUrl,
      thumbnailUrl,
      channelTitle,
      duration,
      topic: item.topic || defaultTopic
    };
  }).filter(video => Boolean(video.youtubeUrl));
}

/**
 * Normalizes raw Adaptive Learning Webhook response
 */
export function parseAdaptiveLearningResponse(raw: any): AdaptiveLearningResult {
  if (!raw || typeof raw !== 'object') {
    return {
      evaluationSummary: 'Assessment logged successfully.',
      strengths: [],
      weaknesses: [],
      recommendedFocus: [],
      suggestedDifficulty: 'Medium'
    };
  }

  return {
    evaluationSummary: raw.summary || raw.evaluationSummary || raw.message || 'Learning activity analyzed.',
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    weaknesses: Array.isArray(raw.weaknesses) ? raw.weaknesses : [],
    recommendedFocus: Array.isArray(raw.recommendedFocus || raw.recommendations) ? (raw.recommendedFocus || raw.recommendations) : [],
    suggestedDifficulty: raw.suggestedDifficulty || raw.difficulty || 'Medium'
  };
}

/**
 * Normalizes Assessment submission response
 */
export function parseAssessmentResponse(raw: any, totalQuestions: number): AssessmentResult {
  const score = raw.scorePercentage ?? (raw.correctCount ? Math.round((raw.correctCount / totalQuestions) * 100) : 0);
  
  return {
    id: raw.id || 'eval_' + Date.now(),
    assessmentTitle: raw.title || 'Technical & Mathematical Assessment',
    completedAt: new Date().toISOString(),
    scorePercentage: score,
    totalQuestions,
    correctCount: raw.correctCount ?? Math.round((score / 100) * totalQuestions),
    topicBreakdown: Array.isArray(raw.topicBreakdown) ? raw.topicBreakdown : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : []
  };
}
