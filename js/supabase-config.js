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
      console.info('Supabase URL not configured.');
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
   * Get current authenticated user or persistent student profile details
   */
  async getCurrentUser() {
    let authUser = null;
    let studentName = null;

    if (this.isInitialized && this.client && this.client.auth) {
      try {
        const { data: { user }, error } = await this.client.auth.getUser();
        if (error) {
          console.log('Supabase auth.getUser() check:', error.message || error);
        }
        if (user && user.id) {
          authUser = user;
          // Check metadata for name
          studentName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name;

          // If profile table exists, attempt to fetch profile display name
          try {
            const { data: profData } = await this.client
              .from('profiles')
              .select('name, display_name, full_name')
              .eq('id', user.id)
              .single();
            if (profData) {
              studentName = profData.display_name || profData.full_name || profData.name || studentName;
            }
          } catch (pErr) {
            // Ignore if profiles table query fails
          }
        }
      } catch (e) {
        console.warn('Supabase auth.getUser error:', e);
      }
    }

    // Fallback to local stored student profile
    const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { id: 'S001', name: 'Alex Morgan' };

    if (!studentName) {
      studentName = student.name || 'Alex Morgan';
    }

    if (!student.uuid || !student.uuid.includes('-')) {
      student.uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';
      if (typeof saveStoredStudent === 'function') saveStoredStudent(student);
    }

    const finalUserId = authUser ? authUser.id : student.uuid;

    return {
      id: finalUserId,
      email: authUser ? authUser.email : (student.email || 'student@learnivo.com'),
      name: studentName,
      user_name: studentName
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

        if (error) {
          console.error('CHAT CONVERSATION CREATION ERROR:', error);
        } else if (data) {
          console.log('✅ Created chat_conversation in Supabase:', data.id);
          this.saveLocalConversation(data);
          return data;
        }
      } catch (err) {
        console.error('Supabase createConversation exception:', err);
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
  async saveMessage({ conversationId, userId, userName, role, content, subject, topic }) {
    if (!content) return null;
    const user = await this.getCurrentUser();
    const finalUserId = userId || user.id;
    const finalUserName = userName || user.name || 'Student';

    const msgObj = {
      conversation_id: conversationId,
      user_id: finalUserId,
      user_name: finalUserName,
      role: role || 'user', // 'user' | 'assistant'
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
          console.error('CHAT MESSAGE SAVE ERROR:', error);
        } else {
          console.log('✅ Saved chat_message to Supabase:', data ? data.id : 'success');
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
        console.error('Supabase saveMessage exception:', err);
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
          .order('updated_at', { ascending: false });

        if (user && user.id) {
          query = query.eq('user_id', user.id);
        }

        if (subject) {
          query = query.eq('subject', subject);
        }

        const { data, error } = await query;
        if (error) {
          console.error('LOAD USER CONVERSATIONS ERROR:', error);
        } else if (data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.error('Supabase loadUserConversations exception:', e);
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

        if (error) {
          console.error('LOAD CONVERSATION MESSAGES ERROR:', error);
        } else if (data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.error('Supabase loadConversationMessages exception:', e);
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
