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
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
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
   * Save a newly completed assessment result to Supabase (evaluation & assessment_history tables) & localStorage
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

    const assessmentId = 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const fullRecord: AssessmentHistoryRecord = {
      ...record,
      id: assessmentId,
      user_id: userId
    };

    // Save to localStorage fallback
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: AssessmentHistoryRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [fullRecord, ...existing];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save assessment to localStorage:', e);
    }

    // 1. Save to Supabase table `evaluation`
    try {
      const attemptedCount = record.total_questions - record.unanswered;
      const perfLevel = record.percentage >= 80 ? 'Excellent' : record.percentage >= 50 ? 'Good' : 'Needs Practice';

      const { error: evalError } = await supabase.from('evaluation').insert([{
        user_id: userId,
        assessment_id: assessmentId,
        subject_code: record.subject_code,
        subject_name: record.subject_name,
        total_questions: record.total_questions,
        attempted_questions: attemptedCount,
        correct_answers: record.correct_answers,
        wrong_answers: record.wrong_answers,
        score: record.score,
        percentage: record.percentage,
        performance_level: perfLevel,
        warning_count: record.warning_count || 0,
        status: record.status || 'completed',
        created_at: record.completed_at
      }]);

      if (evalError) {
        console.warn('Supabase evaluation insert note:', evalError.message);
      }
    } catch (err) {
      console.warn('Supabase evaluation insert exception:', err);
    }

    // 2. Save to Supabase table `assessment_history`
    try {
      const { error: asmError } = await supabase.from('assessment_history').insert([{
        id: assessmentId,
        user_id: userId,
        assessment_id: assessmentId,
        subject_code: record.subject_code,
        subject_name: record.subject_name,
        total_questions: record.total_questions,
        correct_answers: record.correct_answers,
        wrong_answers: record.wrong_answers,
        unanswered: record.unanswered,
        score: record.score,
        percentage: record.percentage,
        completed_at: record.completed_at,
        details: record.details || [],
        violations: record.violations || [],
        warning_count: record.warning_count || 0,
        status: record.status || 'completed'
      }]);

      if (asmError) {
        console.warn('Supabase assessment_history insert note:', asmError.message);
      }
    } catch (err) {
      console.warn('Supabase assessment_history insert exception:', err);
    }

    return fullRecord;
  },

  /**
   * Fetch assessment history for the logged-in user from evaluation / assessment_history
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

    let userId: string | null = null;
    try {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id || null;
    } catch {}

    try {
      let query = supabase.from('assessment_history').select('*').order('completed_at', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const map = new Map<string, AssessmentHistoryRecord>();
        data.forEach((r: any) => {
          map.set(r.id || r.assessment_id, {
            id: r.id || r.assessment_id,
            user_id: r.user_id,
            subject_code: r.subject_code,
            subject_name: r.subject_name,
            total_questions: r.total_questions || 0,
            correct_answers: r.correct_answers || 0,
            wrong_answers: r.wrong_answers || 0,
            unanswered: r.unanswered || 0,
            score: r.score || 0,
            percentage: r.percentage || 0,
            completed_at: r.completed_at || r.created_at || new Date().toISOString(),
            details: r.details || [],
            status: r.status || 'completed',
            warning_count: r.warning_count || 0,
            violations: r.violations || []
          });
        });

        localHistory.forEach(r => {
          if (!map.has(r.id)) map.set(r.id, r);
        });

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        );
        return merged;
      }
    } catch {
      // Fallback
    }

    return localHistory;
  },

  /**
   * Fetch evaluation records from Supabase `evaluation` table
   */
  getEvaluationRecords: async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return [];

      const { data, error } = await supabase
        .from('evaluation')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch the most recent assessment record
   */
  getLatest: async (): Promise<AssessmentHistoryRecord | null> => {
    const history = await assessmentHistoryService.getHistory();
    return history.length > 0 ? history[0] : null;
  }
};
