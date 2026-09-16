import { supabase } from './supabase';

export interface ChatHistoryRow {
  id?: string;
  user_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
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
   * Saves a single message to public.chat_history in Supabase
   */
  saveMessage: async (row: {
    userId: string;
    sessionId: string;
    role: 'user' | 'assistant';
    message: string;
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

    console.log(`Saving ${row.role} message...`);
    console.log('Authenticated user:', row.userId);
    console.log('Current session:', row.sessionId);

    try {
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: row.userId,
          session_id: row.sessionId,
          role: row.role,
          message: row.message.trim()
        })
        .select();

      if (error) {
        console.error('SUPABASE CHAT HISTORY ERROR:', error);
        return { success: false, error };
      }

      console.log(`Successfully saved ${row.role} message to Supabase chat_history:`, data);
      return { success: true };
    } catch (err: any) {
      console.error('SUPABASE CHAT HISTORY ERROR (exception):', err);
      return { success: false, error: err };
    }
  },

  /**
   * Retrieves all chat history for an authenticated user ordered by created_at ascending
   */
  getChatHistory: async (userId: string): Promise<ChatHistoryRow[]> => {
    if (!userId) return [];

    console.log('Loading chat history for user:', userId);
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('SUPABASE LOAD CHAT HISTORY ERROR:', error);
        return [];
      }

      console.log(`Loaded ${data?.length || 0} chat_history records from Supabase.`);
      return data || [];
    } catch (err) {
      console.error('SUPABASE LOAD CHAT HISTORY ERROR (exception):', err);
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
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('SUPABASE GET SESSION MESSAGES ERROR:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('SUPABASE GET SESSION MESSAGES ERROR (exception):', err);
      return [];
    }
  }
};
