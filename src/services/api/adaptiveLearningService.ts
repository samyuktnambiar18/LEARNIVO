import { parseAdaptiveLearningResponse } from '../../utils/adapters';
import { AdaptiveLearningResult, PracticeAttempt, Question, AssessmentSuiteData, NormalizedAssessmentQuestion, NormalizedAssessmentOption } from '../../types';
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
  fetchAssessmentQuestionsFromWebhook: async (): Promise<AssessmentSuiteData | null> => {
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

      console.log('ATTEND ASSESSMENT WEBHOOK RAW RESPONSE:', data);
      const parsedSuite = parseAssessmentPayload(data);
      console.log('PARSED ASSESSMENT SUITE:', parsedSuite);
      return parsedSuite;
    } catch (error) {
      console.error('Attend Assessment webhook fetch error:', error);
      return null;
    }
  }
};

export function parseAssessmentPayload(rawData: any): AssessmentSuiteData | null {
  if (!rawData) return null;

  const tryParseJson = (val: any) => {
    if (typeof val === 'string') {
      try {
        const cleaned = val.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(cleaned);
      } catch {
        const first = val.indexOf('{');
        const last = val.lastIndexOf('}');
        if (first !== -1 && last > first) {
          try {
            return JSON.parse(val.slice(first, last + 1));
          } catch {}
        }
      }
    }
    return val;
  };

  const parsedData = tryParseJson(rawData);
  const candidates: any[] = [];

  if (Array.isArray(parsedData)) {
    candidates.push(...parsedData);
  } else if (parsedData && typeof parsedData === 'object') {
    candidates.push(parsedData);
  }

  let foundContainer: any = null;
  let questionsArray: any[] | null = null;

  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;

    if (Array.isArray(c.questions)) {
      foundContainer = c;
      questionsArray = c.questions;
      break;
    }

    const subWrappers = [
      c._RESPONSEDATA,
      c.responseData,
      c.output,
      c.data,
      c.result,
      c.body,
      c.payload,
      c.response,
      c.text
    ];

    for (const sub of subWrappers) {
      if (!sub) continue;
      const parsedSub = tryParseJson(sub);
      if (parsedSub && typeof parsedSub === 'object') {
        if (Array.isArray(parsedSub.questions)) {
          foundContainer = parsedSub;
          questionsArray = parsedSub.questions;
          break;
        }
      }
    }
    if (questionsArray) break;
  }

  if (!questionsArray && Array.isArray(parsedData) && parsedData.length > 0 && (parsedData[0].question || parsedData[0].question_number)) {
    foundContainer = { subject_code: '23ITT201', subject_name: 'DATA STRUCTURES', total_questions: parsedData.length, questions: parsedData };
    questionsArray = parsedData;
  }

  if (!questionsArray || questionsArray.length === 0) {
    return null;
  }

  const subject_code = String(foundContainer?.subject_code || foundContainer?.subjectCode || '23ITT201');
  const subject_name = String(foundContainer?.subject_name || foundContainer?.subjectName || 'DATA STRUCTURES');
  const total_questions = Number(foundContainer?.total_questions || foundContainer?.totalQuestions || questionsArray.length);

  const normalizedQuestions: NormalizedAssessmentQuestion[] = questionsArray.map((q: any, idx: number) => {
    const qNum = Number(q.question_number || q.number || (idx + 1));
    const unit = String(q.unit || `UNIT ${Math.ceil(qNum / 2)}`);
    const topic = String(q.topic || q.concept || subject_name);
    const difficulty = String(q.difficulty || 'Medium');
    const questionText = String(q.question || q.questionText || q.prompt || `Question ${qNum}`);

    const optionsList: NormalizedAssessmentOption[] = [];

    if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      Object.entries(q.options).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          optionsList.push({
            key: String(k).trim().toUpperCase(),
            text: String(v).trim()
          });
        }
      });
    } else if (Array.isArray(q.options)) {
      const keys = ['A', 'B', 'C', 'D', 'E', 'F'];
      q.options.forEach((optText: any, optIdx: number) => {
        optionsList.push({
          key: keys[optIdx] || String(optIdx + 1),
          text: String(optText).trim()
        });
      });
    } else {
      optionsList.push(
        { key: 'A', text: 'Option A' },
        { key: 'B', text: 'Option B' },
        { key: 'C', text: 'Option C' },
        { key: 'D', text: 'Option D' }
      );
    }

    optionsList.sort((a, b) => a.key.localeCompare(b.key));

    let correctAnswerKey = String(q.correct_answer || q.correctAnswer || q.answer || 'A').trim();

    const matchedByKey = optionsList.find(o => o.key.toUpperCase() === correctAnswerKey.toUpperCase());
    if (matchedByKey) {
      correctAnswerKey = matchedByKey.key;
    } else {
      const matchedByText = optionsList.find(o => o.text.toLowerCase() === correctAnswerKey.toLowerCase());
      if (matchedByText) {
        correctAnswerKey = matchedByText.key;
      }
    }

    const explanation = String(q.explanation || q.solution || `The correct answer is Option ${correctAnswerKey}.`);

    return {
      question_number: qNum,
      unit,
      topic,
      difficulty,
      question: questionText,
      options: optionsList,
      correct_answer: correctAnswerKey,
      explanation
    };
  });

  return {
    subject_code,
    subject_name,
    total_questions: total_questions || normalizedQuestions.length,
    questions: normalizedQuestions
  };
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
