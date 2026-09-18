import { supabase, supabaseSecret } from './supabase';

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
   * Save a newly completed assessment result to Supabase (evaluations & assessment_history tables) & localStorage
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

    // 1. Save to Supabase table `evaluations` using secret key
    try {
      const detailsList = record.details || [];
      const weakTopics = Array.from(new Set(detailsList.filter(d => !d.is_correct && d.topic).map(d => d.topic!)));
      const strongTopics = Array.from(new Set(detailsList.filter(d => d.is_correct && d.topic).map(d => d.topic!)));
      const misconceptions = Array.from(new Set(detailsList.filter(d => !d.is_correct && d.explanation).map(d => `${d.question}: ${d.explanation}`)));
      const knowledgeGaps = Array.from(new Set(weakTopics.map(t => `Needs review: ${t}`)));

      const evalPayload = {
        evaluation_id: assessmentId,
        student_id: userId,
        document_id: record.subject_code || 'doc_assessment',
        total_marks: record.total_questions,
        obtained_marks: record.correct_answers,
        score: record.score || record.percentage,
        correct_answers: record.correct_answers,
        incorrect_answers: record.wrong_answers,
        weak_topics: weakTopics,
        strong_topics: strongTopics,
        misconceptions: misconceptions,
        knowledge_gaps: knowledgeGaps,
        final_level: {
          percentage: record.percentage,
          status: record.status || 'completed',
          subject_name: record.subject_name,
          warning_count: record.warning_count || 0
        },
        created_at: record.completed_at || new Date().toISOString()
      };

      const { error: evalError } = await supabaseSecret.from('evaluations').insert([evalPayload]);

      if (evalError) {
        console.warn('Supabase evaluations insert note:', evalError.message);
      } else {
        console.log('Successfully saved assessment result to evaluations table in Supabase.');
      }
    } catch (err) {
      console.warn('Supabase evaluations insert exception:', err);
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
    let clearedAt = 0;
    try {
      const clearedStr = localStorage.getItem('learnivo_assessment_history_cleared_at');
      if (clearedStr) {
        clearedAt = parseInt(clearedStr, 10) || 0;
      }
    } catch {}

    let localHistory: AssessmentHistoryRecord[] = [];
    try {
      const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (existingStr) {
        localHistory = JSON.parse(existingStr);
      }
    } catch {
      localHistory = [];
    }

    if (clearedAt > 0) {
      localHistory = localHistory.filter(
        r => new Date(r.completed_at).getTime() > clearedAt
      );
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
          const recTimestamp = new Date(r.completed_at || r.created_at || 0).getTime();
          if (clearedAt === 0 || recTimestamp > clearedAt) {
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
          }
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
   * Fetch evaluation records from Supabase `evaluations` table
   */
  getEvaluationRecords: async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let query = supabaseSecret.from('evaluations').select('*').order('created_at', { ascending: false });
      if (userId) {
        query = query.eq('student_id', userId);
      }

      const { data, error } = await query;
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
  },

  /**
   * Clear all frontend assessment history records from localStorage
   */
  clearHistory: async (): Promise<void> => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.setItem('learnivo_assessment_history_cleared_at', Date.now().toString());
    } catch (e) {
      console.warn('Failed to clear assessment history from localStorage:', e);
    }
  }
};
