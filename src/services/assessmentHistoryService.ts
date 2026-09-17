import { supabase } from './supabase';

export interface QuestionReviewDetail {
  question_number: number;
  unit?: string;
  topic?: string;
  difficulty?: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

export interface AssessmentHistoryRecord {
  id: string;
  user_id: string;
  subject_code: string;
  subject_name: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unanswered: number;
  score: number;
  percentage: number;
  completed_at: string;
  details?: QuestionReviewDetail[];
  status?: 'completed' | 'cancelled' | 'terminated';
  warning_count?: number;
  violations?: { type: string; timestamp: string; question_number: number }[];
}

const LOCAL_STORAGE_KEY = 'learnivo_assessment_history';

export const assessmentHistoryService = {
  /**
   * Save a newly completed assessment result to Supabase & localStorage fallback
   */
  saveResult: async (record: Omit<AssessmentHistoryRecord, 'id' | 'user_id'>): Promise<AssessmentHistoryRecord> => {
    let userId = 'usr_anonymous';
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        userId = userData.user.id;
      }
    } catch {
      // Fallback if auth check fails
    }

    const fullRecord: AssessmentHistoryRecord = {
      ...record,
      id: 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId
    };

    // Save to localStorage
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: AssessmentHistoryRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [fullRecord, ...existing];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save assessment to localStorage:', e);
    }

    // Save to Supabase table assessment_history if table exists
    try {
      const { error } = await supabase.from('assessment_history').insert([{
        id: fullRecord.id,
        user_id: fullRecord.user_id,
        subject_code: fullRecord.subject_code,
        subject_name: fullRecord.subject_name,
        total_questions: fullRecord.total_questions,
        correct_answers: fullRecord.correct_answers,
        wrong_answers: fullRecord.wrong_answers,
        unanswered: fullRecord.unanswered,
        score: fullRecord.score,
        percentage: fullRecord.percentage,
        completed_at: fullRecord.completed_at,
        details: fullRecord.details || []
      }]);

      if (error) {
        console.warn('Supabase assessment_history insert note:', error.message);
      }
    } catch (err) {
      console.warn('Supabase insert exception:', err);
    }

    return fullRecord;
  },

  /**
   * Fetch assessment history for the logged-in user
   */
  getHistory: async (): Promise<AssessmentHistoryRecord[]> => {
    let localHistory: AssessmentHistoryRecord[] = [];
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (existingStr) {
        localHistory = JSON.parse(existingStr);
      }
    } catch {
      localHistory = [];
    }

    try {
      const { data, error } = await supabase
        .from('assessment_history')
        .select('*')
        .order('completed_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Merge Supabase records with local records avoiding duplicates
        const map = new Map<string, AssessmentHistoryRecord>();
        data.forEach((r: any) => map.set(r.id, r));
        localHistory.forEach(r => {
          if (!map.has(r.id)) map.set(r.id, r);
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        return merged;
      }
    } catch {
      // Return localHistory if Supabase query fails
    }

    return localHistory;
  },

  /**
   * Fetch the most recent assessment record
   */
  getLatest: async (): Promise<AssessmentHistoryRecord | null> => {
    const history = await assessmentHistoryService.getHistory();
    return history.length > 0 ? history[0] : null;
  }
};
