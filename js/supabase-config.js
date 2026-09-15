/* ==========================================================================
   LEARNIVO — Supabase Database Service & Chat Persistence Module
   Configured with Supabase Project URL & Publishable Key
   Database Tables: public.chat_conversations & public.chat_messages
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
    if (!LEARNIVO_SUPABASE_CONFIG.url || LEARNIVO_SUPABASE_CONFIG.url.includes('YOUR_SUPABASE')) {
      console.info('Supabase URL not configured. LEARNIVO running in LocalStorage mode.');
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
   * Get current authenticated user or persistent student UUID fallback
   */
  async getCurrentUser() {
    if (this.isInitialized && this.client && this.client.auth) {
      try {
        const { data: { user } } = await this.client.auth.getUser();
        if (user && user.id) return user;
      } catch (e) {
        console.warn('Supabase auth.getUser error:', e);
      }
    }

    const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { id: 'S001', name: 'Alex Morgan' };
    if (!student.uuid || !student.uuid.includes('-')) {
      student.uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      if (typeof saveStoredStudent === 'function') saveStoredStudent(student);
    }

    return {
      id: student.uuid,
      email: 'alex.morgan@student.learnivo.com',
      name: student.name || 'Alex Morgan'
    };
  }

  /**
   * Create a new conversation row in public.chat_conversations
   */
  async createConversation(subject, topic, firstQuestionText = '') {
    const user = await this.getCurrentUser();
    const title = this.generateTitle(firstQuestionText, subject, topic);

    const newConv = {
      user_id: user.id,
      title: title,
      subject: subject || 'Mathematics',
      topic: topic || 'General',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.isInitialized && this.client) {
      try {
        const { data, error } = await this.client
          .from('chat_conversations')
          .insert([newConv])
          .select()
          .single();

        if (!error && data) {
          console.log('✅ Created chat_conversation in Supabase:', data.id);
          this.saveLocalConversation(data);
          return data;
        } else if (error) {
          console.warn('Supabase chat_conversations insert error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase createConversation exception:', err);
      }
    }

    // Local fallback if offline or table not present
    newConv.id = 'conv-' + Date.now();
    this.saveLocalConversation(newConv);
    return newConv;
  }

  /**
   * Save a chat message row into public.chat_messages
   */
  async saveMessage({ conversationId, userId, role, content, subject, topic }) {
    if (!content) return null;
    const user = userId ? { id: userId } : await this.getCurrentUser();

    const msgObj = {
      conversation_id: conversationId,
      user_id: user.id,
      role: role || 'user', // 'user' | 'assistant' | 'system'
      content: content,
      subject: subject || 'Mathematics',
      topic: topic || 'General',
      created_at: new Date().toISOString()
    };

    // Save to LocalStorage for instant cache fallback
    this.saveLocalMessage(msgObj);

    if (this.isInitialized && this.client) {
      try {
        const { data, error } = await this.client
          .from('chat_messages')
          .insert([msgObj])
          .select()
          .single();

        if (error) {
          console.warn('Supabase chat_messages insert error:', error.message);
        } else {
          console.log('✅ Saved chat_message to Supabase:', data.id);
          // Touch parent conversation updated_at
          if (conversationId) {
            await this.client
              .from('chat_conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);
          }
          return data;
        }
      } catch (err) {
        console.warn('Supabase saveMessage exception:', err);
      }
    }

    return msgObj;
  }

  /**
   * Load user's conversations ordered by updated_at descending
   */
  async loadUserConversations(subject = null) {
    const user = await this.getCurrentUser();
    if (this.isInitialized && this.client) {
      try {
        let query = this.client
          .from('chat_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (subject) {
          query = query.eq('subject', subject);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn('Supabase loadUserConversations fallback:', e);
      }
    }

    return this.getLocalConversations(user.id, subject);
  }

  /**
   * Load all messages belonging to a conversation ordered by created_at ascending
   */
  async loadConversationMessages(conversationId) {
    if (!conversationId) return [];

    if (this.isInitialized && this.client) {
      try {
        const { data, error } = await this.client
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn('Supabase loadConversationMessages error:', e);
      }
    }

    return this.getLocalMessages(conversationId);
  }

  /**
   * Helper to generate a friendly title from first user question
   */
  generateTitle(questionText, subject, topic) {
    if (!questionText) return `${subject || 'Study'} Discussion`;
    let clean = questionText.replace(/^(explain|what is|how to|can you|tell me about|how do i)\s+/i, '').trim();
    if (clean.length > 36) {
      clean = clean.substring(0, 36) + '...';
    }
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Local Storage Cache Helpers
  saveLocalConversation(conv) {
    try {
      const raw = localStorage.getItem('learnivo_conversations');
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(c => c.id === conv.id);
      if (idx >= 0) list[idx] = conv;
      else list.unshift(conv);
      localStorage.setItem('learnivo_conversations', JSON.stringify(list));
    } catch(e) {}
  }

  getLocalConversations(userId, subject) {
    try {
      const raw = localStorage.getItem('learnivo_conversations');
      if (raw) {
        let list = JSON.parse(raw);
        if (subject) list = list.filter(c => c.subject === subject);
        return list;
      }
    } catch(e) {}
    return [];
  }

  saveLocalMessage(msg) {
    try {
      const key = 'learnivo_msgs_' + (msg.conversation_id || 'default');
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.push(msg);
      localStorage.setItem(key, JSON.stringify(list));
    } catch(e) {}
  }

  getLocalMessages(conversationId) {
    try {
      const key = 'learnivo_msgs_' + conversationId;
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [];
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
      return data;
    } catch (err) {
      return null;
    }
  }
}

// Instantiate global service
window.learnivoSupabase = new LearnivoSupabaseService();
