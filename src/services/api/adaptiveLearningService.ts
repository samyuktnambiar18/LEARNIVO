import { parseAdaptiveLearningResponse } from '../../utils/adapters';
import { AdaptiveLearningResult, PracticeAttempt, Question } from '../../types';
import { supabase } from '../supabase';

const ADAPTIVE_LEARNING_WEBHOOK_URL =
  import.meta.env.VITE_ADAPTIVE_LEARNING_WEBHOOK_URL ||
  'https://api.agents.snsihub.ai/webhook/adaptive-learning';

export interface AssessmentAnswerPayload {
  question_id: string;
  selected_option: number;
}

export interface AssessmentSubmissionPayload {
  action: 'submit_assessment';
  student_id: string;
  document_id: string;
  answers: AssessmentAnswerPayload[];
}

export interface AssessmentEvaluationResult {
  score: number;
  total_marks: number;
  obtained_marks: number;
  correct_answers: number;
  incorrect_answers: number;
  weak_topics: string[];
  strong_topics: string[];
  misconceptions: string[];
  knowledge_gaps: string[];
  level: string;
  raw?: any;
}

export const adaptiveLearningService = {
  /**
   * Evaluates student activity and posts practice attempts to the Adaptive Learning server webhook
   */
  evaluateActivity: async (attempts: PracticeAttempt[]): Promise<AdaptiveLearningResult> => {
    if (!attempts || attempts.length === 0) {
      return {
        evaluationSummary: 'No activity logged yet.',
        strengths: [],
        weaknesses: [],
        recommendedFocus: [],
        suggestedDifficulty: 'Medium'
      };
    }

    // Get current authenticated user ID if available
    let userId = 'guest';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {
      // Fall back to guest
    }

    const totalCorrect = attempts.filter(a => a.isCorrect).length;
    const accuracyPercentage = Math.round((totalCorrect / attempts.length) * 100);

    try {
      const response = await fetch(ADAPTIVE_LEARNING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'adaptive_learning',
          user_id: userId,
          attemptsCount: attempts.length,
          correctCount: totalCorrect,
          accuracyPercentage,
          attempts: attempts.slice(0, 15), // send recent attempts
        })
      });

      if (!response.ok) {
        console.warn(`Adaptive learning webhook status ${response.status}. Computing local evaluation.`);
        return buildLocalEvaluation(attempts);
      }

      const contentType = response.headers.get('content-type');
      let rawData: any;

      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        const text = await response.text();
        try {
          const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          rawData = JSON.parse(cleaned);
        } catch {
          rawData = { summary: text };
        }
      }

      console.log('ADAPTIVE LEARNING WEBHOOK RESPONSE:', rawData);
      return parseAdaptiveLearningResponse(rawData);
    } catch (error) {
      console.warn('Adaptive learning webhook connection offline, using fallback model:', error);
      return buildLocalEvaluation(attempts);
    }
  },

  /**
   * Submits all 10 assessment answers in a single request to the backend webhook
   */
  submitAssessment: async (
    studentId: string,
    documentId: string,
    answers: AssessmentAnswerPayload[]
  ): Promise<AssessmentEvaluationResult> => {
    const payload: AssessmentSubmissionPayload = {
      action: 'submit_assessment',
      student_id: studentId || 'guest',
      document_id: documentId || 'doc_diagnostic',
      answers
    };

    console.log('SUBMIT ASSESSMENT PAYLOAD:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(ADAPTIVE_LEARNING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get('content-type');
      let rawData: any;

      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        const text = await response.text();
        try {
          const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          rawData = JSON.parse(cleaned);
        } catch {
          rawData = { summary: text };
        }
      }

      console.log('SUBMIT ASSESSMENT BACKEND RESPONSE:', rawData);
      return parseAssessmentEvaluationResponse(rawData, answers.length);
    } catch (error) {
      console.error('Error submitting assessment to webhook:', error);
      throw error;
    }
  },

  /**
   * Triggers the Attend Assessment webhook and parses questions
   */
  fetchAssessmentQuestionsFromWebhook: async (): Promise<Question[]> => {
    const WEBHOOK_URL = 'https://api.agents.snsihub.ai/webhook/fbe93af0-6a48-4500-8768-788623f218ca';
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'attend_assessment',
          message: 'Attend Assessment',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn(`Attend Assessment Webhook HTTP status ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          data = JSON.parse(cleaned);
        } catch {
          data = { text };
        }
      }

      console.log('ATTEND ASSESSMENT WEBHOOK RESPONSE:', data);
      return parseQuestionsFromWebhook(data);
    } catch (error) {
      console.warn('Attend Assessment webhook connection offline, using fallback suite:', error);
      return [];
    }
  }
};

export function parseQuestionsFromWebhook(data: any): Question[] {
  if (!data) return [];

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.questions)
    ? data.questions
    : Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.result)
    ? data.result
    : [];

  if (list.length === 0) return [];

  return list.map((item: any, idx: number) => {
    const questionText = item.question || item.questionText || item.prompt || item.title || `Question ${idx + 1}`;
    const rawOpts = Array.isArray(item.options) ? item.options : Array.isArray(item.choices) ? item.choices : [];
    const options = rawOpts.map(String);

    let correctAnswer = String(item.correctAnswer || item.correct_answer || item.answer || item.solution || (options[0] || ''));
    if (typeof item.correct_option === 'number' && options[item.correct_option]) {
      correctAnswer = options[item.correct_option];
    } else if (/^\d+$/.test(correctAnswer) && options[parseInt(correctAnswer, 10)]) {
      correctAnswer = options[parseInt(correctAnswer, 10)];
    }

    return {
      id: String(item.id || item.question_id || `wh_q_${idx + 1}`),
      topic: item.topic || item.subject || 'Core Engineering & Math',
      difficulty: item.difficulty || (idx % 3 === 0 ? 'Easy' : idx % 3 === 1 ? 'Medium' : 'Hard'),
      questionText,
      options: options.length > 0 ? options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer,
      explanation: item.explanation || `Correct Solution: ${correctAnswer}`,
      hint: item.hint
    };
  });
}

export function parseAssessmentEvaluationResponse(raw: any, totalQuestions: number = 10): AssessmentEvaluationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      score: 0,
      total_marks: 100,
      obtained_marks: 0,
      correct_answers: 0,
      incorrect_answers: totalQuestions,
      weak_topics: [],
      strong_topics: [],
      misconceptions: [],
      knowledge_gaps: [],
      level: 'Beginner',
      raw
    };
  }

  const source = raw.data || raw.result || raw.output || raw.evaluation || raw;

  const total_marks = Number(source.total_marks ?? source.totalMarks ?? 100);
  const obtained_marks = Number(source.obtained_marks ?? source.obtainedMarks ?? source.score ?? 0);
  const score = Number(source.score ?? source.scorePercentage ?? (total_marks > 0 ? Math.round((obtained_marks / total_marks) * 100) : 0));
  const correct_answers = Number(source.correct_answers ?? source.correctCount ?? Math.round((score / 100) * totalQuestions));
  const incorrect_answers = Number(source.incorrect_answers ?? source.incorrectCount ?? Math.max(0, totalQuestions - correct_answers));

  const weak_topics = Array.isArray(source.weak_topics)
    ? source.weak_topics
    : Array.isArray(source.weaknesses)
    ? source.weaknesses
    : [];

  const strong_topics = Array.isArray(source.strong_topics)
    ? source.strong_topics
    : Array.isArray(source.strengths)
    ? source.strengths
    : [];

  const misconceptions = Array.isArray(source.misconceptions) ? source.misconceptions : [];
  const knowledge_gaps = Array.isArray(source.knowledge_gaps)
    ? source.knowledge_gaps
    : Array.isArray(source.recommendations)
    ? source.recommendations
    : [];

  const level = String(source.level || source.suggestedDifficulty || 'Intermediate');

  return {
    score,
    total_marks,
    obtained_marks,
    correct_answers,
    incorrect_answers,
    weak_topics,
    strong_topics,
    misconceptions,
    knowledge_gaps,
    level,
    raw: source
  };
}

function buildLocalEvaluation(attempts: PracticeAttempt[]): AdaptiveLearningResult {
  const topicStats: Record<string, { correct: number; total: number }> = {};
  
  attempts.forEach(a => {
    if (!topicStats[a.topic]) {
      topicStats[a.topic] = { correct: 0, total: 0 };
    }
    topicStats[a.topic].total += 1;
    if (a.isCorrect) topicStats[a.topic].correct += 1;
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  Object.entries(topicStats).forEach(([topic, stat]) => {
    const accuracy = stat.correct / stat.total;
    if (accuracy >= 0.7) {
      strengths.push(topic);
    } else {
      weaknesses.push(topic);
    }
  });

  const accuracyOverall = attempts.filter(a => a.isCorrect).length / attempts.length;
  let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  if (accuracyOverall >= 0.8) difficulty = 'Hard';
  else if (accuracyOverall < 0.5) difficulty = 'Easy';

  return {
    evaluationSummary: `Evaluated ${attempts.length} practice interactions with ${Math.round(accuracyOverall * 100)}% overall accuracy.`,
    strengths: strengths.length > 0 ? strengths : ['Active problem solving'],
    weaknesses: weaknesses.length > 0 ? weaknesses : [],
    recommendedFocus: weaknesses.length > 0 ? weaknesses : (strengths.length > 0 ? strengths : ['Core Technical Fundamentals']),
    suggestedDifficulty: difficulty
  };
}
