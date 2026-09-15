/* ==========================================================================
   LEARNIVO — Supabase Integration & Database Sync Module
   Configured with Supabase Project URL & Publishable Key
   ========================================================================== */

const LEARNIVO_SUPABASE_CONFIG = {
  url: 'https://rlmdcjpeezmjccodalfb.supabase.co',
  anonKey: 'sb_publishable_R9r9wKLHuVZa4C_JvplwnA_EtTjsoNI'
};

const CHAT_LOCAL_STORAGE_KEY = 'learnivo_chat_history';

class LearnivoSupabaseService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.init();
  }

  /**
   * Initialize Supabase client
   */
  async init() {
    if (!LEARNIVO_SUPABASE_CONFIG.url || LEARNIVO_SUPABASE_CONFIG.url === 'YOUR_SUPABASE_PROJECT_URL') {
      console.info('Supabase URL not configured. LEARNIVO running in offline LocalStorage mode.');
      return;
    }

    try {
      if (window.supabase) {
        this.client = window.supabase.createClient(
          LEARNIVO_SUPABASE_CONFIG.url,
          LEARNIVO_SUPABASE_CONFIG.anonKey
        );
        this.isInitialized = true;
        console.log('✅ Supabase client initialized successfully:', LEARNIVO_SUPABASE_CONFIG.url);
      } else {
        // Load CDN dynamically if window.supabase isn't present
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
          if (window.supabase) {
            this.client = window.supabase.createClient(
              LEARNIVO_SUPABASE_CONFIG.url,
              LEARNIVO_SUPABASE_CONFIG.anonKey
            );
            this.isInitialized = true;
            console.log('✅ Supabase client loaded via CDN & initialized.');
          }
        };
        document.head.appendChild(script);
      }
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
    }
  }

  /**
   * Configure project credentials programmatically
   */
  setCredentials(url, key) {
    LEARNIVO_SUPABASE_CONFIG.url = url;
    LEARNIVO_SUPABASE_CONFIG.anonKey = key;
    this.init();
  }

  /**
   * Sync student profile to Supabase `student_profiles` table
   */
  async syncStudentProfile(profile) {
    if (!this.isInitialized || !this.client) return null;

    try {
      const { data, error } = await this.client
        .from('student_profiles')
        .upsert({
          id: profile.id || 'S001',
          name: profile.name,
          grade: profile.grade,
          avatar: profile.avatar,
          completed_onboarding: profile.completedOnboarding,
          courses_json: JSON.stringify(profile.courses || []),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase upsert profile error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('Supabase profile sync error:', err);
      return null;
    }
  }

  /**
   * Fetch student profile from Supabase
   */
  async fetchStudentProfile(studentId = 'S001') {
    if (!this.isInitialized || !this.client) return null;

    try {
      const { data, error } = await this.client
        .from('student_profiles')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        grade: data.grade,
        avatar: data.avatar,
        completedOnboarding: data.completed_onboarding,
        courses: data.courses_json ? JSON.parse(data.courses_json) : []
      };
    } catch (err) {
      console.warn('Supabase profile fetch error:', err);
      return null;
    }
  }

  /**
   * Save chat message to Supabase `chat_history` table & LocalStorage cache
   */
  async saveChatMessage(msgObj) {
    // 1. Always save to LocalStorage cache first for instant UI response & offline support
    try {
      const localHistory = this.getLocalChatHistory();
      localHistory.push(msgObj);
      localStorage.setItem(CHAT_LOCAL_STORAGE_KEY, JSON.stringify(localHistory));
    } catch (e) {
      console.warn('LocalStorage chat save error:', e);
    }

    // 2. Save to Supabase `chat_history` table if client is ready
    if (!this.isInitialized || !this.client) return;

    try {
      const { data, error } = await this.client
        .from('chat_history')
        .insert([{
          student_id: msgObj.studentId || 'S001',
          sender: msgObj.sender || 'user',
          text: msgObj.text || '',
          subject: msgObj.subject || 'Mathematics',
          topic: msgObj.topic || 'General',
          video_title: msgObj.title || null,
          video_url: msgObj.videoUrl || null,
          video_id: msgObj.videoId || null,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.warn('Supabase chat insert message warning:', error.message);
      } else {
        console.log('✅ Chat message saved to Supabase database.');
      }
    } catch (err) {
      console.warn('Supabase chat save error:', err);
    }
  }

  /**
   * Fetch chat history from Supabase or LocalStorage
   */
  async fetchChatHistory(studentId = 'S001', subject = null) {
    // Attempt Supabase fetch first
    if (this.isInitialized && this.client) {
      try {
        let query = this.client
          .from('chat_history')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: true });

        if (subject) {
          query = query.eq('subject', subject);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(item => ({
            id: item.id,
            studentId: item.student_id,
            sender: item.sender,
            text: item.text,
            subject: item.subject,
            topic: item.topic,
            title: item.video_title,
            videoUrl: item.video_url,
            videoId: item.video_id,
            createdAt: item.created_at
          }));
        }
      } catch (e) {
        console.warn('Supabase chat fetch fallback:', e);
      }
    }

    // Fallback to LocalStorage
    return this.getLocalChatHistory();
  }

  getLocalChatHistory() {
    try {
      const raw = localStorage.getItem(CHAT_LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  clearChatHistory() {
    try {
      localStorage.removeItem(CHAT_LOCAL_STORAGE_KEY);
    } catch (e) {}
  }
}

// Instantiate global service
window.learnivoSupabase = new LearnivoSupabaseService();
