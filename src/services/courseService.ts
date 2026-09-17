import { supabase } from './supabase';
import { LearningMaterial, YouTubeMaterialRecord } from '../types';

export interface CourseDataRecord {
  id?: string;
  user_id?: string;
  course_id: string;
  subject_code?: string;
  subject_name?: string;
  course_name?: string;
  syllabus_text?: string;
  unit_1?: string;
  unit_2?: string;
  unit_3?: string;
  unit_4?: string;
  unit_5?: string;
  topics?: any[];
  pdf_name?: string;
  pdf_url?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseVideoRecord {
  id?: string;
  user_id?: string;
  course_id: string;
  topic: string;
  video_id?: string;
  video_title: string;
  video_url: string;
  channel_name?: string;
  thumbnail_url?: string;
  duration?: string;
  description?: string;
  created_at?: string;
}

export const courseService = {
  /**
   * Saves a processed course/syllabus to `courses` table in Supabase
   */
  saveCourse: async (material: LearningMaterial): Promise<string | null> => {
    try {
      let userId = 'usr_anonymous';
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        userId = userData.user.id;
      }

      const courseId = material.id || 'crs_' + Date.now();
      const topicList = material.topics?.map(t => t.name) || [];

      const payload: any = {
        user_id: userId,
        course_id: courseId,
        subject_name: material.title,
        course_name: material.title,
        syllabus_text: material.rawText || '',
        unit_1: topicList[0] || 'Unit 1',
        unit_2: topicList[1] || 'Unit 2',
        unit_3: topicList[2] || 'Unit 3',
        unit_4: topicList[3] || 'Unit 4',
        unit_5: topicList[4] || 'Unit 5',
        topics: material.topics || [],
        pdf_name: material.fileName || material.title,
        status: material.status || 'ready',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('courses')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.warn('Supabase courses insert note:', error.message);
      }

      return data?.id || courseId;
    } catch (err) {
      console.warn('Exception saving course to Supabase:', err);
      return null;
    }
  },

  /**
   * Saves videos associated with a course to `course_videos` table
   */
  saveCourseVideos: async (courseId: string, videos: YouTubeMaterialRecord[]): Promise<void> => {
    if (!videos || videos.length === 0) return;

    try {
      let userId = 'usr_anonymous';
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        userId = userData.user.id;
      }

      const videoRows = videos.map(v => ({
        user_id: userId,
        course_id: courseId,
        topic: v.topic,
        video_id: v.id,
        video_title: v.video_title,
        video_url: v.video_url,
        channel_name: v.channel_name,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        description: v.video_type || 'Educational Video',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('course_videos')
        .insert(videoRows);

      if (error) {
        console.warn('Supabase course_videos insert note:', error.message);
      }
    } catch (err) {
      console.warn('Exception saving course videos to Supabase:', err);
    }
  },

  /**
   * Fetches the user's latest processed course from Supabase based on updated_at/created_at
   */
  getLatestCourse: async (): Promise<{ course: CourseDataRecord | null; videos: CourseVideoRecord[] }> => {
    try {
      let userId: string | null = null;
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;

      let query = supabase
        .from('courses')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: coursesData, error: courseError } = await query;

      if (courseError || !coursesData || coursesData.length === 0) {
        return { course: null, videos: [] };
      }

      const latestCourse = coursesData[0] as CourseDataRecord;
      const courseIdKey = latestCourse.course_id || latestCourse.id || '';

      // Fetch corresponding videos from course_videos table
      let videosQuery = supabase
        .from('course_videos')
        .select('*')
        .eq('course_id', courseIdKey)
        .order('created_at', { ascending: true });

      if (userId) {
        videosQuery = videosQuery.eq('user_id', userId);
      }

      const { data: videosData } = await videosQuery;

      return {
        course: latestCourse,
        videos: (videosData as CourseVideoRecord[]) || []
      };
    } catch (err) {
      console.warn('Exception fetching latest course from Supabase:', err);
      return { course: null, videos: [] };
    }
  }
};
