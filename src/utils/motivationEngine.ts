import { PracticeAttempt } from '../types';
import { AssessmentHistoryRecord } from '../services/assessmentHistoryService';

export interface AchievementItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface DayConsistency {
  dayName: string;
  dateStr: string;
  hasActivity: boolean;
  isToday: boolean;
}

export interface MotivationData {
  streakDays: number;
  todayMinutes: number;
  targetMinutes: number;
  todayQuestions: number;

  weeklyLearningDays: number;
  weeklyQuestions: number;
  weeklySessions: number;
  weeklyAssessments: number;

  xp: number;
  level: number;
  xpCurrentLevel: number;
  xpNextLevel: number;
  xpProgressPercent: number;

  achievements: AchievementItem[];
  consistencyWeek: DayConsistency[];
}

export function computeMotivationData(
  attempts: PracticeAttempt[],
  assessments: AssessmentHistoryRecord[],
  targetMinutes: number = 30
): MotivationData {
  const now = new Date();
  const todayStr = getLocalDateStr(now);

  // Collect all unique activity dates (YYYY-MM-DD)
  const activityDatesSet = new Set<string>();

  attempts.forEach(a => {
    if (a.timestamp) {
      const dStr = getLocalDateStr(new Date(a.timestamp));
      activityDatesSet.add(dStr);
    }
  });

  assessments.forEach(asm => {
    if (asm.completed_at) {
      const dStr = getLocalDateStr(new Date(asm.completed_at));
      activityDatesSet.add(dStr);
    }
  });

  // 1. STREAK CALCULATION
  let streakDays = 0;
  let checkDate = new Date(now);

  // If today has activity, start counting from today.
  // Else if yesterday has activity, start counting from yesterday.
  if (!activityDatesSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (activityDatesSet.has(getLocalDateStr(checkDate))) {
    streakDays++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // 2. TODAY'S PROGRESS
  const todayAttempts = attempts.filter(a => a.timestamp && getLocalDateStr(new Date(a.timestamp)) === todayStr);
  const todayAssessments = assessments.filter(asm => asm.completed_at && getLocalDateStr(new Date(asm.completed_at)) === todayStr);

  const todayAttemptSeconds = todayAttempts.reduce((acc, a) => acc + (a.timeSpentSeconds || 30), 0);
  const todayAssessmentSeconds = todayAssessments.length * 15 * 60; // 15 min per assessment
  const todayMinutes = Math.round((todayAttemptSeconds + todayAssessmentSeconds) / 60);

  let todayQuestions = todayAttempts.length;
  todayAssessments.forEach(asm => {
    todayQuestions += asm.total_questions || 10;
  });

  // 3. WEEKLY LEARNING SUMMARY (Current Week Mon-Sun)
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay(); // 0 is Sun, 1 is Mon
  const diffToMon = (dayOfWeek + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMon);
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyAttempts = attempts.filter(a => a.timestamp && new Date(a.timestamp) >= startOfWeek);
  const weeklyAssessmentsList = assessments.filter(asm => asm.completed_at && new Date(asm.completed_at) >= startOfWeek);

  const weeklyDatesSet = new Set<string>();
  weeklyAttempts.forEach(a => a.timestamp && weeklyDatesSet.add(getLocalDateStr(new Date(a.timestamp))));
  weeklyAssessmentsList.forEach(asm => asm.completed_at && weeklyDatesSet.add(getLocalDateStr(new Date(asm.completed_at))));

  const weeklyLearningDays = weeklyDatesSet.size;

  let weeklyQuestions = weeklyAttempts.length;
  weeklyAssessmentsList.forEach(asm => {
    weeklyQuestions += asm.total_questions || 10;
  });

  const weeklySessions = Math.max(weeklyAttempts.length > 0 ? 1 : 0, Math.ceil(weeklyAttempts.length / 5));
  const weeklyAssessments = weeklyAssessmentsList.length;

  // 4. XP & LEVEL SYSTEM
  let xp = 0;
  attempts.forEach(a => {
    xp += 10; // 10 XP for attempting a question
    if (a.isCorrect) xp += 15; // +15 XP for correct solution
  });

  assessments.forEach(asm => {
    xp += 100; // 100 XP per assessment
    if (asm.percentage === 100) xp += 50; // +50 XP perfect score
  });

  xp += streakDays * 20; // +20 XP per active streak day

  // Level Progression Math
  // Level 1: 0 - 100 XP
  // Level 2: 101 - 250 XP
  // Level 3: 251 - 500 XP
  // Level 4: 501 - 900 XP
  let level = 1;
  let xpCurrentLevel = 0;
  let xpNextLevel = 100;

  if (xp >= 900) {
    level = 5 + Math.floor((xp - 900) / 500);
    xpCurrentLevel = 900 + (level - 5) * 500;
    xpNextLevel = xpCurrentLevel + 500;
  } else if (xp >= 500) {
    level = 4;
    xpCurrentLevel = 500;
    xpNextLevel = 900;
  } else if (xp >= 250) {
    level = 3;
    xpCurrentLevel = 250;
    xpNextLevel = 500;
  } else if (xp >= 100) {
    level = 2;
    xpCurrentLevel = 100;
    xpNextLevel = 250;
  }

  const xpProgressPercent = xpNextLevel > xpCurrentLevel
    ? Math.min(100, Math.round(((xp - xpCurrentLevel) / (xpNextLevel - xpCurrentLevel)) * 100))
    : 100;

  // 5. ACHIEVEMENTS
  const totalQuestionsAllTime = attempts.length + assessments.reduce((acc, asm) => acc + (asm.total_questions || 10), 0);
  const hasPerfectScore = assessments.some(asm => asm.percentage === 100);
  const totalUniqueDays = activityDatesSet.size;

  const achievements: AchievementItem[] = [
    {
      id: 'first_step',
      icon: '🌱',
      title: 'First Step',
      description: 'Complete your first learning session.',
      unlocked: attempts.length > 0 || assessments.length > 0
    },
    {
      id: 'streak_3',
      icon: '🔥',
      title: '3 Day Streak',
      description: 'Learn for 3 consecutive days.',
      unlocked: streakDays >= 3
    },
    {
      id: 'streak_7',
      icon: '🔥',
      title: '7 Day Streak',
      description: 'Learn for 7 consecutive days.',
      unlocked: streakDays >= 7
    },
    {
      id: 'questions_50',
      icon: '🧠',
      title: '50 Questions',
      description: 'Complete 50 questions.',
      unlocked: totalQuestionsAllTime >= 50
    },
    {
      id: 'perfect_score',
      icon: '🏆',
      title: 'Perfect Score',
      description: 'Get 100% in an assessment.',
      unlocked: hasPerfectScore
    },
    {
      id: 'consistent_learner',
      icon: '📚',
      title: 'Consistent Learner',
      description: 'Learn on 10 different days.',
      unlocked: totalUniqueDays >= 10
    }
  ];

  // 6. LEARNING CONSISTENCY (Mon..Sun of current week)
  const daysOfWeekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const consistencyWeek: DayConsistency[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dStr = getLocalDateStr(d);
    consistencyWeek.push({
      dayName: daysOfWeekNames[i],
      dateStr: dStr,
      hasActivity: activityDatesSet.has(dStr),
      isToday: dStr === todayStr
    });
  }

  return {
    streakDays,
    todayMinutes,
    targetMinutes,
    todayQuestions,
    weeklyLearningDays,
    weeklyQuestions,
    weeklySessions,
    weeklyAssessments,
    xp,
    level,
    xpCurrentLevel,
    xpNextLevel,
    xpProgressPercent,
    achievements,
    consistencyWeek
  };
}

function getLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
