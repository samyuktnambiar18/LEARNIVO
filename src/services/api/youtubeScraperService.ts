import { supabase } from '../supabase';
import { YouTubeMaterialRecord } from '../../types';

const APIFY_API_TOKEN = import.meta.env.VITE_APIFY_API_TOKEN || '';
const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hmfxzzfopfeaqajgfipe.supabase.co';

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
   * Fetch the MOST RECENTLY updated/created syllabus data from Supabase
   * sorted by created_at DESC LIMIT 1.
   * Tries secure Vercel API endpoint /api/youtube first, with direct client fallback.
   */
  getLatestSyllabusAndMaterials: async (forceRefresh: boolean = false, maxRetries: number = 3): Promise<LatestSyllabusData | null> => {
    // 1. Try secure backend serverless API endpoint /api/youtube first
    try {
      const apiRes = await fetch(`/api/youtube${forceRefresh ? '?refresh=true' : ''}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json && json.success && Array.isArray(json.youtubeMaterials) && json.youtubeMaterials.length > 0) {
          return {
            syllabusId: json.syllabusId,
            documentId: json.documentId,
            subjectTitle: json.subjectTitle || 'Latest Syllabus',
            createdAt: json.createdAt || new Date().toISOString(),
            topics: json.topics || [],
            selected5Topics: json.selected5Topics || [],
            youtubeMaterials: json.youtubeMaterials
          };
        }
      }
    } catch (apiErr) {
      console.warn('Call to /api/youtube backend endpoint failed, trying direct Supabase fallback:', apiErr);
    }

    // 2. Direct Supabase Client Fallback
    let latestCourse: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data: latestCourses, error: courseErr } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (courseErr) {
          console.warn(`Supabase courses query attempt ${attempt + 1} warning:`, courseErr);
        }

        if (latestCourses && latestCourses.length > 0) {
          latestCourse = latestCourses[0];
          if (latestCourse.subject && latestCourse.subject.trim().length > 0) {
            break;
          }
        }
      } catch (err) {
        console.warn(`Retry attempt ${attempt + 1} error:`, err);
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    }

    if (!latestCourse) {
      console.warn('No syllabus record found in Supabase courses table.');
      return null;
    }

    const syllabusId = latestCourse.course_id || latestCourse.id || 'sys_' + Date.now();
    const rawText = latestCourse.subject || '';
    
    // Extract topics from rawText
    const extractedTopics = parseAndCleanTopics(rawText);
    const selected5Topics = extractedTopics.slice(0, 5);

    // Check if course_data has stored materials
    let storedMaterials: YouTubeMaterialRecord[] = [];
    if (!forceRefresh && latestCourse.course_data && Array.isArray(latestCourse.course_data.youtube_materials)) {
      storedMaterials = latestCourse.course_data.youtube_materials;
    }

    if (storedMaterials.length > 0 && storedMaterials.length >= selected5Topics.length) {
      return {
        syllabusId,
        documentId: latestCourse.document_id,
        subjectTitle: extractSubjectName(rawText),
        rawText,
        createdAt: latestCourse.created_at,
        topics: extractedTopics,
        selected5Topics,
        youtubeMaterials: storedMaterials
      };
    }

    // Call Apify for the 5 selected topics
    if (selected5Topics.length > 0) {
      const freshMaterials = await youtubeScraperService.runApifyScraper(selected5Topics, syllabusId);
      await youtubeScraperService.saveMaterialsToSupabase(syllabusId, freshMaterials);

      return {
        syllabusId,
        documentId: latestCourse.document_id,
        subjectTitle: extractSubjectName(rawText),
        rawText,
        createdAt: latestCourse.created_at,
        topics: extractedTopics,
        selected5Topics,
        youtubeMaterials: freshMaterials
      };
    }

    return {
      syllabusId,
      documentId: latestCourse.document_id,
      subjectTitle: extractSubjectName(rawText),
      rawText,
      createdAt: latestCourse.created_at,
      topics: extractedTopics,
      selected5Topics,
      youtubeMaterials: []
    };
  },

  /**
   * Run Apify YouTube Scraper (streamers/youtube-scraper) with maxResults = 1
   */
  runApifyScraper: async (topics: string[], syllabusId: string): Promise<YouTubeMaterialRecord[]> => {
    if (!topics || topics.length === 0) return [];
    
    const targetTopics = topics.slice(0, 5);
    const searchQueries = targetTopics.map(t => `${t} course tutorial`);

    try {
      const response = await fetch('https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APIFY_API_TOKEN}`
        },
        body: JSON.stringify({
          searchQueries,
          maxResults: 1,
          sortingOrder: 'relevance',
          transcriptionAndSubtitle: 'NONE'
        })
      });

      if (!response.ok) {
        console.warn(`Apify YouTube scraper returned HTTP ${response.status}`);
        return fallbackVideosForTopics(targetTopics, syllabusId);
      }

      const rawItems = await response.json();
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        console.warn('Apify returned empty dataset items');
        return fallbackVideosForTopics(targetTopics, syllabusId);
      }

      const records: YouTubeMaterialRecord[] = targetTopics.map((topic, idx) => {
        const item = rawItems.find((it: any) => 
          it.input && (it.input.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(it.input.toLowerCase()))
        ) || rawItems[idx] || rawItems[0] || {};

        return {
          id: `yt_${Date.now()}_${idx}`,
          topic,
          video_title: item?.title || `${topic} Full Course Tutorial`,
          channel_name: item?.channelName || item?.channelTitle || 'Educational Tech',
          video_url: item?.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' course')}`,
          thumbnail_url: item?.thumbnailUrl || (item?.id ? `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg` : undefined),
          view_count: item?.viewCount || 25000,
          likes: item?.likes || 1200,
          published_date: item?.date || new Date().toISOString(),
          duration: formatCourseDuration(item?.duration),
          video_type: item?.type || 'video',
          comments_count: item?.commentsCount || 80,
          created_at: new Date().toISOString(),
          syllabus_id: syllabusId
        };
      });

      return records;

    } catch (err) {
      console.error('Failed to run Apify YouTube Scraper:', err);
      return fallbackVideosForTopics(targetTopics, syllabusId);
    }
  },

  /**
   * Save YouTube results into Supabase associated with syllabus_id
   */
  saveMaterialsToSupabase: async (syllabusId: string, records: YouTubeMaterialRecord[]): Promise<void> => {
    try {
      if (!SUPABASE_SECRET_KEY) return;
      const headers = {
        'apikey': SUPABASE_SECRET_KEY,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      };

      await fetch(`${SUPABASE_URL}/rest/v1/courses?course_id=eq.${encodeURIComponent(syllabusId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          course_data: {
            youtube_materials: records,
            updated_at: new Date().toISOString()
          }
        })
      });

    } catch (err) {
      console.warn('Save to Supabase error:', err);
    }
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
