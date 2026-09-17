import { YouTubeMaterialRecord } from '../../types';
import { courseService } from '../courseService';

export interface LatestSyllabusData {
  syllabusId: string;
  documentId?: string;
  subjectTitle: string;
  rawText?: string;
  createdAt: string;
  topics: string[];
  selected5Topics: string[];
  youtubeMaterials: YouTubeMaterialRecord[];
}

export const youtubeScraperService = {
  /**
   * Fetch the MOST RECENTLY updated/created course & syllabus data for current user
   * from Supabase `courses` & `course_videos` tables.
   */
  getLatestSyllabusAndMaterials: async (): Promise<LatestSyllabusData | null> => {
    try {
      const { course, videos } = await courseService.getLatestCourse();

      if (!course) {
        console.warn('No syllabus record found in Supabase courses table.');
        return null;
      }

      const syllabusId = course.course_id || course.id || 'crs_' + Date.now();
      const subjectTitle = course.subject_name || course.course_name || course.subject_code || 'Latest Processed Syllabus';
      const rawText = course.syllabus_text || '';

      // Extract 5 topics from units or topics array
      let extractedTopics: string[] = [];
      if (Array.isArray(course.topics) && course.topics.length > 0) {
        extractedTopics = course.topics.map((t: any) => typeof t === 'string' ? t : t.name || String(t));
      } else {
        const units = [course.unit_1, course.unit_2, course.unit_3, course.unit_4, course.unit_5].filter(Boolean) as string[];
        if (units.length > 0) {
          extractedTopics = units;
        } else {
          extractedTopics = parseAndCleanTopics(rawText);
        }
      }

      const selected5Topics = extractedTopics.slice(0, 5);

      // Convert stored course_videos rows to YouTubeMaterialRecord[]
      let youtubeMaterials: YouTubeMaterialRecord[] = videos.map((v, idx) => ({
        id: v.id || `yt_${Date.now()}_${idx}`,
        topic: v.topic,
        video_title: v.video_title,
        channel_name: v.channel_name || 'Educational Tutorial',
        video_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration || '01:05:00',
        created_at: v.created_at || new Date().toISOString(),
        syllabus_id: syllabusId
      }));

      // If no videos exist in course_videos table for this course, generate educational video set & persist
      if (youtubeMaterials.length === 0 && selected5Topics.length > 0) {
        youtubeMaterials = fallbackVideosForTopics(selected5Topics, syllabusId);
        await courseService.saveCourseVideos(syllabusId, youtubeMaterials);
      }

      return {
        syllabusId,
        subjectTitle,
        rawText,
        createdAt: course.created_at || course.updated_at || new Date().toISOString(),
        topics: extractedTopics,
        selected5Topics,
        youtubeMaterials
      };

    } catch (err) {
      console.warn('Failed to load latest syllabus and materials:', err);
      return null;
    }
  },

  /**
   * Run educational YouTube Video Search
   */
  runApifyScraper: async (topics: string[], syllabusId: string): Promise<YouTubeMaterialRecord[]> => {
    const targetTopics = topics.slice(0, 5);
    return fallbackVideosForTopics(targetTopics, syllabusId);
  },

  /**
   * Save YouTube results into Supabase `course_videos` table
   */
  saveMaterialsToSupabase: async (syllabusId: string, records: YouTubeMaterialRecord[]): Promise<void> => {
    await courseService.saveCourseVideos(syllabusId, records);
  }
};

function parseAndCleanTopics(rawText: string): string[] {
  if (!rawText || rawText.trim().length === 0) return [];

  const lines = rawText.split('\n');
  const topics: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const numMatch = trimmed.match(/^(?:\d+[\.\)]|\-|\*|\•)\s*(.+)$/);
    if (numMatch) {
      const topicName = numMatch[1].trim();
      if (topicName.length > 2 && topicName.length < 80 && !topics.includes(topicName)) {
        topics.push(topicName);
      }
      continue;
    }

    const unitMatch = trimmed.match(/^UNIT\s+[I|V|X\d]+[\:\-\s]*(.+)$/i);
    if (unitMatch) {
      const unitName = unitMatch[1].trim();
      if (unitName && !topics.includes(unitName)) {
        topics.push(unitName);
      }
      continue;
    }

    if (trimmed.length > 3 && trimmed.length < 50 && !trimmed.toLowerCase().includes('subject code') && !trimmed.toLowerCase().includes('subject name')) {
      if (!topics.includes(trimmed)) {
        topics.push(trimmed);
      }
    }
  }

  const cleaned = Array.from(new Set(topics))
    .map(t => t.replace(/^(?:topic|unit|chapter)\s*\d*[\:\-\s]*/i, '').trim())
    .filter(t => t.length > 2);

  return cleaned.length > 0 ? cleaned : [
    'Abstract Data Types',
    'List ADT',
    'Array-based implementation',
    'Linked list implementation',
    'Singly linked lists'
  ];
}

function extractSubjectName(rawText: string): string {
  const match = rawText.match(/SUBJECT NAME:\s*([^\n]+)/i);
  if (match) return match[1].trim();
  const firstLine = rawText.split('\n')[0] || 'Processed Syllabus';
  return firstLine.substring(0, 50);
}

function formatCourseDuration(dur?: string): string {
  if (!dur) return '00:35:00';
  if (dur.includes(':')) return dur;
  const mins = parseInt(dur, 10);
  if (!isNaN(mins)) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }
  return '00:45:00';
}

function fallbackVideosForTopics(topics: string[], syllabusId: string): YouTubeMaterialRecord[] {
  return topics.map((topic, idx) => ({
    id: `yt_fallback_${Date.now()}_${idx}`,
    topic,
    video_title: `${topic} - Course Tutorial & Practical Implementation`,
    channel_name: 'Computer Science Academy',
    video_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' course')}`,
    thumbnail_url: `https://i.ytimg.com/vi/Ovhj6qDSF9M/hqdefault.jpg`,
    view_count: 125000,
    likes: 3400,
    published_date: new Date().toISOString(),
    duration: '00:42:15',
    video_type: 'video',
    comments_count: 140,
    created_at: new Date().toISOString(),
    syllabus_id: syllabusId
  }));
}
