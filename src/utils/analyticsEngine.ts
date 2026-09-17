import { PracticeAttempt } from '../types';
import { AssessmentHistoryRecord, QuestionReviewDetail } from '../services/assessmentHistoryService';

export interface TopicMetric {
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface TrendPoint {
  date: string;
  timestamp: number;
  title: string;
  type: 'Practice' | 'Assessment';
  accuracy: number;
  totalQuestions: number;
  correctAnswers: number;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  type: 'Practice' | 'Assessment';
  scoreText: string;
  accuracy: number;
  timestamp: string;
  detailsCount?: number;
}

export interface AnalyticsSummary {
  hasData: boolean;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  overallAccuracy: number;
  totalStudyMinutes: number;

  // Practice vs Assessment Split
  practiceQuestions: number;
  practiceCorrect: number;
  practiceAccuracy: number;
  hasPracticeData: boolean;

  assessmentQuestions: number;
  assessmentCorrect: number;
  assessmentAccuracy: number;
  hasAssessmentData: boolean;

  // Calculated Collections
  topicMastery: TopicMetric[];
  strengths: TopicMetric[];
  weakAreas: TopicMetric[];
  trends: TrendPoint[];
  recentActivity: RecentActivityItem[];
  frequentMistakes: { topic: string; mistakeCount: number }[];
  insights: string[];
  recommendedSteps: { title: string; description: string; actionText: string; link: string }[];
}

export function computeStudentAnalytics(
  attempts: PracticeAttempt[],
  assessments: AssessmentHistoryRecord[],
  timeFilter: 'all' | '7days' | '30days' = 'all',
  sourceFilter: 'all' | 'practice' | 'assessment' = 'all'
): AnalyticsSummary {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Filter Practice Attempts by time
  const filteredAttempts = attempts.filter(a => {
    if (sourceFilter === 'assessment') return false;
    if (!a.timestamp) return true;
    const itemTime = new Date(a.timestamp).getTime();
    if (isNaN(itemTime)) return true;
    if (timeFilter === '7days') return now - itemTime <= 7 * dayMs;
    if (timeFilter === '30days') return now - itemTime <= 30 * dayMs;
    return true;
  });

  // Filter Assessments by time
  const filteredAssessments = assessments.filter(a => {
    if (sourceFilter === 'practice') return false;
    if (!a.completed_at) return true;
    const itemTime = new Date(a.completed_at).getTime();
    if (isNaN(itemTime)) return true;
    if (timeFilter === '7days') return now - itemTime <= 7 * dayMs;
    if (timeFilter === '30days') return now - itemTime <= 30 * dayMs;
    return true;
  });

  const hasPracticeData = filteredAttempts.length > 0;
  const hasAssessmentData = filteredAssessments.length > 0;
  const hasData = hasPracticeData || hasAssessmentData;

  if (!hasData) {
    return {
      hasData: false,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      overallAccuracy: 0,
      totalStudyMinutes: 0,
      practiceQuestions: 0,
      practiceCorrect: 0,
      practiceAccuracy: 0,
      hasPracticeData: false,
      assessmentQuestions: 0,
      assessmentCorrect: 0,
      assessmentAccuracy: 0,
      hasAssessmentData: false,
      topicMastery: [],
      strengths: [],
      weakAreas: [],
      trends: [],
      recentActivity: [],
      frequentMistakes: [],
      insights: [],
      recommendedSteps: [
        {
          title: 'Start Practice Session',
          description: 'Solve interactive questions to identify your technical strengths.',
          actionText: 'Start Practice',
          link: '/practice'
        },
        {
          title: 'Take Diagnostic Assessment',
          description: 'Attend a proctored exam to build your performance benchmark.',
          actionText: 'Take Assessment',
          link: '/assessment'
        }
      ]
    };
  }

  // 1. Practice Stats
  const practiceQuestions = filteredAttempts.length;
  const practiceCorrect = filteredAttempts.filter(a => a.isCorrect).length;
  const practiceAccuracy = practiceQuestions > 0 ? Math.round((practiceCorrect / practiceQuestions) * 100) : 0;
  const practiceStudySeconds = filteredAttempts.reduce((acc, a) => acc + (a.timeSpentSeconds || 30), 0);

  // 2. Assessment Stats
  let assessmentQuestions = 0;
  let assessmentCorrect = 0;
  filteredAssessments.forEach(rec => {
    assessmentQuestions += rec.total_questions || 0;
    assessmentCorrect += rec.correct_answers || 0;
  });
  const assessmentAccuracy = assessmentQuestions > 0 ? Math.round((assessmentCorrect / assessmentQuestions) * 100) : 0;
  const assessmentStudySeconds = filteredAssessments.length * 15 * 60; // Est 15 min per assessment

  // 3. Combined Stats
  const totalQuestions = practiceQuestions + assessmentQuestions;
  const correctAnswers = practiceCorrect + assessmentCorrect;
  const wrongAnswers = totalQuestions - correctAnswers;
  const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const totalStudyMinutes = Math.round((practiceStudySeconds + assessmentStudySeconds) / 60);

  // 4. Topic Performance Aggregation
  const topicMap: Record<string, { total: number; correct: number }> = {};

  filteredAttempts.forEach(a => {
    const t = a.topic || 'General';
    if (!topicMap[t]) topicMap[t] = { total: 0, correct: 0 };
    topicMap[t].total += 1;
    if (a.isCorrect) topicMap[t].correct += 1;
  });

  filteredAssessments.forEach(rec => {
    if (rec.details && Array.isArray(rec.details)) {
      rec.details.forEach((d: QuestionReviewDetail) => {
        const t = d.topic || rec.subject_name || 'General';
        if (!topicMap[t]) topicMap[t] = { total: 0, correct: 0 };
        topicMap[t].total += 1;
        if (d.is_correct) topicMap[t].correct += 1;
      });
    }
  });

  const topicMastery: TopicMetric[] = Object.entries(topicMap).map(([topic, stats]) => ({
    topic,
    total: stats.total,
    correct: stats.correct,
    wrong: stats.total - stats.correct,
    accuracy: Math.round((stats.correct / stats.total) * 100)
  })).sort((a, b) => b.accuracy - a.accuracy);

  // Strengths (Accuracy >= 70%)
  const strengths = topicMastery.filter(t => t.accuracy >= 70);

  // Weak Areas (Accuracy < 70%)
  const weakAreas = topicMastery.filter(t => t.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy);

  // 5. Frequent Mistakes Analysis
  const frequentMistakes = topicMastery
    .filter(t => t.wrong > 0)
    .map(t => ({ topic: t.topic, mistakeCount: t.wrong }))
    .sort((a, b) => b.mistakeCount - a.mistakeCount);

  // 6. Chronological Trends
  const trendPoints: TrendPoint[] = [];

  // Group practice attempts into daily buckets
  const practiceByDate: Record<string, { total: number; correct: number; timestamp: number }> = {};
  filteredAttempts.forEach(a => {
    const dStr = a.timestamp ? new Date(a.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent';
    const ts = a.timestamp ? new Date(a.timestamp).getTime() : now;
    if (!practiceByDate[dStr]) {
      practiceByDate[dStr] = { total: 0, correct: 0, timestamp: ts };
    }
    practiceByDate[dStr].total += 1;
    if (a.isCorrect) practiceByDate[dStr].correct += 1;
  });

  Object.entries(practiceByDate).forEach(([dStr, stats]) => {
    trendPoints.push({
      date: dStr,
      timestamp: stats.timestamp,
      title: 'Practice Session',
      type: 'Practice',
      accuracy: Math.round((stats.correct / stats.total) * 100),
      totalQuestions: stats.total,
      correctAnswers: stats.correct
    });
  });

  filteredAssessments.forEach(rec => {
    const dStr = rec.completed_at ? new Date(rec.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent';
    const ts = rec.completed_at ? new Date(rec.completed_at).getTime() : now;
    trendPoints.push({
      date: dStr,
      timestamp: ts,
      title: rec.subject_name || 'Assessment',
      type: 'Assessment',
      accuracy: rec.percentage || (rec.total_questions ? Math.round((rec.correct_answers / rec.total_questions) * 100) : 0),
      totalQuestions: rec.total_questions || 10,
      correctAnswers: rec.correct_answers || 0
    });
  });

  trendPoints.sort((a, b) => a.timestamp - b.timestamp);

  // 7. Recent Activity Items
  const recentActivity: RecentActivityItem[] = [];

  filteredAssessments.forEach(rec => {
    recentActivity.push({
      id: rec.id || `asm_${rec.completed_at}`,
      title: rec.subject_name || 'Proctored Assessment',
      type: 'Assessment',
      scoreText: `${rec.correct_answers} / ${rec.total_questions} Correct`,
      accuracy: rec.percentage || 0,
      timestamp: rec.completed_at ? new Date(rec.completed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now',
      detailsCount: rec.details?.length || rec.total_questions
    });
  });

  if (filteredAttempts.length > 0) {
    const lastAttempt = filteredAttempts[0];
    recentActivity.push({
      id: `prac_${lastAttempt.id}`,
      title: `Practice: ${lastAttempt.topic || 'General'}`,
      type: 'Practice',
      scoreText: lastAttempt.isCorrect ? 'Correct Solution' : 'Incorrect Solution',
      accuracy: lastAttempt.isCorrect ? 100 : 0,
      timestamp: lastAttempt.timestamp ? new Date(lastAttempt.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'
    });
  }

  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 8. Learning Insights (Data Driven)
  const insights: string[] = [];

  if (overallAccuracy >= 80) {
    insights.push(`Strong technical proficiency: Your overall accuracy is ${overallAccuracy}% across ${totalQuestions} evaluated questions.`);
  } else if (overallAccuracy >= 50) {
    insights.push(`Steady learning trajectory: Overall accuracy stands at ${overallAccuracy}%. Regular practice will improve retention.`);
  } else {
    insights.push(`Foundational practice recommended: Current overall accuracy is ${overallAccuracy}%. Focus on key weak topics.`);
  }

  if (strengths.length > 0) {
    insights.push(`Highest topic mastery: You excel in "${strengths[0].topic}" with ${strengths[0].accuracy}% accuracy.`);
  }

  if (weakAreas.length > 0) {
    insights.push(`Priority focus topic: "${weakAreas[0].topic}" currently has your highest mistake rate (${weakAreas[0].wrong} incorrect).`);
  }

  if (hasPracticeData && hasAssessmentData) {
    if (assessmentAccuracy > practiceAccuracy) {
      insights.push(`Strong exam performance: Assessment accuracy (${assessmentAccuracy}%) exceeds practice accuracy (${practiceAccuracy}%).`);
    } else if (practiceAccuracy > assessmentAccuracy) {
      insights.push(`Exam preparation gap: Practice accuracy (${practiceAccuracy}%) is higher than assessment accuracy (${assessmentAccuracy}%). Review under exam conditions.`);
    }
  }

  // 9. Recommended Next Steps
  const recommendedSteps: { title: string; description: string; actionText: string; link: string }[] = [];

  if (weakAreas.length > 0) {
    recommendedSteps.push({
      title: `Practice ${weakAreas[0].topic}`,
      description: `Target your weakest topic (${weakAreas[0].accuracy}% accuracy) to build conceptual clarity.`,
      actionText: 'Start Practice',
      link: '/practice'
    });
  }

  if (hasAssessmentData && assessmentAccuracy < 70) {
    recommendedSteps.push({
      title: 'Review Recent Mistakes',
      description: 'Analyze questions missed in your last proctored assessment to avoid repeating errors.',
      actionText: 'Take Assessment',
      link: '/assessment'
    });
  } else {
    recommendedSteps.push({
      title: 'Take Proctored Assessment',
      description: 'Evaluate your knowledge under exam security conditions.',
      actionText: 'Start Assessment',
      link: '/assessment'
    });
  }

  return {
    hasData: true,
    totalQuestions,
    correctAnswers,
    wrongAnswers,
    overallAccuracy,
    totalStudyMinutes,
    practiceQuestions,
    practiceCorrect,
    practiceAccuracy,
    hasPracticeData,
    assessmentQuestions,
    assessmentCorrect,
    assessmentAccuracy,
    hasAssessmentData,
    topicMastery,
    strengths,
    weakAreas,
    trends: trendPoints,
    recentActivity: recentActivity.slice(0, 6),
    frequentMistakes: frequentMistakes.slice(0, 5),
    insights,
    recommendedSteps: recommendedSteps.slice(0, 2)
  };
}
