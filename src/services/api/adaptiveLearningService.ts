import { parseAdaptiveLearningResponse } from '../../utils/adapters';
import { AdaptiveLearningResult, PracticeAttempt } from '../../types';

const ADAPTIVE_LEARNING_WEBHOOK_URL = import.meta.env.VITE_ADAPTIVE_LEARNING_WEBHOOK_URL || 'https://api.agents.snsihub.ai/webhook/adaptive-learning';

export const adaptiveLearningService = {
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

    try {
      const response = await fetch(ADAPTIVE_LEARNING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptsCount: attempts.length,
          attempts: attempts.slice(0, 10), // send recent attempts
        })
      });

      if (!response.ok) {
        return buildLocalEvaluation(attempts);
      }

      const rawData = await response.json();
      return parseAdaptiveLearningResponse(rawData);
    } catch (error) {
      console.warn('Adaptive learning webhook offline, computing evaluation locally:', error);
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
    evaluationSummary: `Evaluated ${attempts.length} practice interactions with ${Math.round(accuracyOverall * 100)}% accuracy.`,
    strengths: strengths.length > 0 ? strengths : ['Active learning focus'],
    weaknesses: weaknesses.length > 0 ? weaknesses : [],
    recommendedFocus: weaknesses.length > 0 ? weaknesses : (strengths.length > 0 ? strengths : ['Core Problem Solving']),
    suggestedDifficulty: difficulty
  };
}
