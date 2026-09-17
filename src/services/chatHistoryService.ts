import { supabase } from './supabase';

export interface ChatHistoryRow {
  id?: string;
  user_id: string;
  session_id: string;
  question?: string;
  user_message?: string;
  ai_response?: string;
  topic?: string;
  subject?: string;
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
  updated_at?: string;
}

export const chatHistoryService = {
  /**
   * Gets current authenticated Supabase user
   */
  getAuthUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('Supabase auth.getUser error:', error.message);
    }
    return user;
  },

  /**
   * Saves a conversation message into public.ai_tutor_history in Supabase
   */
  saveMessage: async (row: {
    userId: string;
    sessionId: string;
    role: 'user' | 'assistant';
    message: string;
    question?: string;
    user_message?: string;
    ai_response?: string;
    topic?: string;
    subject?: string;
  }): Promise<{ success: boolean; error?: any }> => {
    if (!row.userId) {
      console.warn('saveMessage cancelled: No authenticated user_id provided.');
      return { success: false, error: 'No authenticated user.' };
    }
    if (!row.sessionId) {
      console.warn('saveMessage cancelled: Missing session_id.');
      return { success: false, error: 'Missing session_id.' };
    }
    if (!row.message.trim()) {
      return { success: false, error: 'Empty message.' };
    }

    try {
      const payload: any = {
        user_id: row.userId,
        session_id: row.sessionId,
        role: row.role,
        message: row.message.trim(),
        user_message: row.role === 'user' ? row.message.trim() : (row.user_message || undefined),
        ai_response: row.role === 'assistant' ? row.message.trim() : (row.ai_response || undefined),
        question: row.question || (row.role === 'user' ? row.message.trim() : undefined),
        topic: row.topic || null,
        subject: row.subject || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('ai_tutor_history')
        .insert(payload)
        .select();

      if (error) {
        console.warn('Supabase ai_tutor_history insert note:', error.message);
        // Fallback insertion ignoring optional schema parameters if table exists with simple schema
        const fallbackPayload = {
          user_id: row.userId,
          session_id: row.sessionId,
          role: row.role,
          message: row.message.trim()
        };
        const { error: err2 } = await supabase.from('ai_tutor_history').insert(fallbackPayload);
        if (err2) {
          console.error('SUPABASE AI TUTOR HISTORY FALLBACK ERROR:', err2.message);
        }
        return { success: !err2 };
      }

      return { success: true };
    } catch (err: any) {
      console.error('SUPABASE AI TUTOR HISTORY EXCEPTION:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Retrieves all AI tutor history for an authenticated user ordered by created_at ascending
   */
  getChatHistory: async (userId: string): Promise<ChatHistoryRow[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('ai_tutor_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          session_id: r.session_id || 'default_session',
          role: (r.role || (r.ai_response ? 'assistant' : 'user')) as 'user' | 'assistant',
          message: r.message || r.user_message || r.ai_response || r.question || '',
          user_message: r.user_message,
          ai_response: r.ai_response,
          topic: r.topic,
          subject: r.subject,
          created_at: r.created_at
        }));
      }

      if (error) {
        console.warn('SUPABASE LOAD AI TUTOR HISTORY NOTE:', error.message);
      }
      return [];
    } catch (err) {
      console.error('SUPABASE LOAD AI TUTOR HISTORY EXCEPTION:', err);
      return [];
    }
  },

  /**
   * Retrieves messages for a specific session ID
   */
  getSessionMessages: async (userId: string, sessionId: string): Promise<ChatHistoryRow[]> => {
    if (!userId || !sessionId) return [];

    try {
      const { data, error } = await supabase
        .from('ai_tutor_history')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        return [];
      }

      return data || [];
    } catch (err) {
      return [];
    }
  }
};
