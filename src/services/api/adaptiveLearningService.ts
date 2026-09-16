import { parseAdaptiveLearningResponse } from '../../utils/adapters';
import { AdaptiveLearningResult, PracticeAttempt } from '../../types';
import { supabase } from '../supabase';

const ADAPTIVE_LEARNING_WEBHOOK_URL =
  import.meta.env.VITE_ADAPTIVE_LEARNING_WEBHOOK_URL ||
  'https://api.agents.snsihub.ai/webhook/adaptive-learning';

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
  }
};

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
