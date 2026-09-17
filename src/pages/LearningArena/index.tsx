import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Flame,
  Trophy,
  Timer,
  Target,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Lock,
  BookOpen,
  TrendingUp,
  Award,
  Clock,
  Check,
  AlertTriangle,
  Upload,
  BrainCircuit
} from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { assessmentHistoryService } from '../../services/assessmentHistoryService';
import { Button } from '../../components/ui/Button';
import { PracticeAttempt } from '../../types';

interface ChallengeQuestion {
  id: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ArenaStats {
  streakDays: number;
  xp: number;
  bestScore: number;
  highestScore: number;
  bestAccuracy: number;
  fastestSprint: number;
  longestStreak: number;
  challengesCompleted: number;
  lastChallengeDate: string | null;
  completedDates: string[];
}

const STORAGE_KEY_ARENA = 'learnivo_arena_stats';

const DEFAULT_ARENA_STATS: ArenaStats = {
  streakDays: 0,
  xp: 0,
  bestScore: 0,
  highestScore: 0,
  bestAccuracy: 0,
  fastestSprint: 0,
  longestStreak: 0,
  challengesCompleted: 0,
  lastChallengeDate: null,
  completedDates: []
};

// Standard Question Pool for topics extracted from syllabus / practice
const SYSTEM_QUESTION_POOL: ChallengeQuestion[] = [
  {
    id: 'ds_1',
    topic: 'Data Structures',
    question: 'Which data structure operates on a Last-In, First-Out (LIFO) order?',
    options: ['Queue', 'Stack', 'Array', 'Binary Tree'],
    correctIndex: 1,
    explanation: 'A Stack follows the Last-In, First-Out (LIFO) principle.'
  },
  {
    id: 'ds_2',
    topic: 'Data Structures',
    question: 'What is the average time complexity for searching an element in a balanced Binary Search Tree?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correctIndex: 2,
    explanation: 'Searching in a balanced BST splits search space in half each step, taking O(log n) time.'
  },
  {
    id: 'ds_3',
    topic: 'Data Structures',
    question: 'Which data structure is best suited for implementing a Breadth-First Search (BFS) algorithm?',
    options: ['Queue', 'Stack', 'Priority Queue', 'Hash Table'],
    correctIndex: 0,
    explanation: 'BFS uses a FIFO Queue to explore graph level-by-level.'
  },
  {
    id: 'algo_1',
    topic: 'Algorithms',
    question: 'What is the worst-case time complexity of QuickSort?',
    options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'],
    correctIndex: 1,
    explanation: 'QuickSort degenerates to O(n²) when the pivot selection is poor (e.g. already sorted array with end pivot).'
  },
  {
    id: 'algo_2',
    topic: 'Algorithms',
    question: 'Which algorithmic approach solves subproblems once and stores their solutions in a table?',
    options: ['Greedy', 'Divide and Conquer', 'Dynamic Programming', 'Backtracking'],
    correctIndex: 2,
    explanation: 'Dynamic Programming uses memoization or tabulation to store subproblem solutions.'
  },
  {
    id: 'prog_1',
    topic: 'Programming',
    question: 'In Python, which of the following is an immutable data type?',
    options: ['List', 'Dictionary', 'Set', 'Tuple'],
    correctIndex: 3,
    explanation: 'Tuples are immutable in Python once instantiated.'
  },
  {
    id: 'prog_2',
    topic: 'Programming',
    question: 'What keyword in JavaScript is used to declare a block-scoped variable that cannot be reassigned?',
    options: ['var', 'let', 'const', 'static'],
    correctIndex: 2,
    explanation: 'const creates read-only block-scoped variable references.'
  },
  {
    id: 'math_1',
    topic: 'Mathematics',
    question: 'What is the derivative of f(x) = x³ - 4x + 7 with respect to x?',
    options: ['3x² - 4', '3x² - 4x', 'x² - 4', '3x³ - 4'],
    correctIndex: 0,
    explanation: 'Using power rule: d/dx(x³) = 3x² and d/dx(-4x) = -4.'
  },
  {
    id: 'aiml_1',
    topic: 'AI / ML',
    question: 'Which activation function outputs values in the range (0, 1)?',
    options: ['ReLU', 'Sigmoid', 'Tanh', 'Leaky ReLU'],
    correctIndex: 1,
    explanation: 'The Sigmoid function maps real inputs to (0, 1).'
  }
];

export const LearningArenaPage: React.FC = () => {
  const navigate = useNavigate();

  // Mode state: 'landing' | 'quick' | 'sprint' | 'concept_select' | 'concept' | 'weakness' | 'daily' | 'results'
  const [activeMode, setActiveMode] = useState<string>('landing');

  // Arena Stored Stats
  const [stats, setStats] = useState<ArenaStats>(DEFAULT_ARENA_STATS);

  // Available frontend topics & materials
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [weaknessTopic, setWeaknessTopic] = useState<{ topic: string; accuracy: number } | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Challenge Engine State
  const [challengeQuestions, setChallengeQuestions] = useState<ChallengeQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ questionId: string; isCorrect: boolean; selected: number }[]>([]);
  const [score, setScore] = useState(0);

  // Sprint Timer State
  const [sprintTimeLeft, setSprintTimeLeft] = useState<number>(60);
  const [sprintTimerActive, setSprintTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results State
  const [completedTitle, setCompletedTitle] = useState('Challenge Complete');
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Load Arena Stats & Real Frontend Activity on Mount
  useEffect(() => {
    // 1. Load Arena Stats from localStorage
    const savedStatsStr = localStorage.getItem(STORAGE_KEY_ARENA);
    if (savedStatsStr) {
      try {
        const parsed = JSON.parse(savedStatsStr);
        setStats(parsed);
      } catch {}
    }

    // 2. Discover available topics from materials & practice attempts
    const materials = storageService.getMaterials();
    const attempts = storageService.getPracticeAttempts();

    const topicSet = new Set<string>();
    materials.forEach(m => {
      if (m.title) topicSet.add(m.title);
      if (m.topics && Array.isArray(m.topics)) {
        m.topics.forEach(t => t.name && topicSet.add(t.name));
      }
    });
    attempts.forEach(a => a.topic && topicSet.add(a.topic));
    SYSTEM_QUESTION_POOL.forEach(q => topicSet.add(q.topic));

    setAvailableTopics(Array.from(topicSet));

    // 3. Identify Weakness Topic if practice history exists
    if (attempts.length >= 3) {
      const topicStats: Record<string, { total: number; correct: number }> = {};
      attempts.forEach(a => {
        if (!topicStats[a.topic]) topicStats[a.topic] = { total: 0, correct: 0 };
        topicStats[a.topic].total += 1;
        if (a.isCorrect) topicStats[a.topic].correct += 1;
      });

      let lowestAcc = 101;
      let lowestTopic: string | null = null;

      Object.entries(topicStats).forEach(([t, s]) => {
        const acc = Math.round((s.correct / s.total) * 100);
        if (acc < lowestAcc) {
          lowestAcc = acc;
          lowestTopic = t;
        }
      });

      if (lowestTopic && lowestAcc < 80) {
        setWeaknessTopic({ topic: lowestTopic, accuracy: lowestAcc });
      }
    }
  }, []);

  // Handle 60-Second Sprint Timer
  useEffect(() => {
    if (sprintTimerActive && sprintTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        setSprintTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setSprintTimerActive(false);
            finishChallenge('60-Second Sprint');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (sprintTimeLeft === 0 && sprintTimerActive) {
      setSprintTimerActive(false);
      finishChallenge('60-Second Sprint');
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sprintTimerActive, sprintTimeLeft]);

  // Save Stats Helper
  const saveArenaStats = (newStats: ArenaStats) => {
    setStats(newStats);
    localStorage.setItem(STORAGE_KEY_ARENA, JSON.stringify(newStats));
  };

  // Level Math
  const getLevelInfo = (xp: number) => {
    if (xp >= 900) return { level: 5, name: 'Learning Pro', currentXp: xp, nextXp: 1400, percent: 100 };
    if (xp >= 500) return { level: 4, name: 'Concept Master', currentXp: xp - 500, nextXp: 400, percent: Math.round(((xp - 500) / 400) * 100) };
    if (xp >= 250) return { level: 3, name: 'Problem Solver', currentXp: xp - 250, nextXp: 250, percent: Math.round(((xp - 250) / 250) * 100) };
    if (xp >= 100) return { level: 2, name: 'Explorer', currentXp: xp - 100, nextXp: 150, percent: Math.round(((xp - 100) / 150) * 100) };
    return { level: 1, name: 'Novice', currentXp: xp, nextXp: 100, percent: Math.round((xp / 100) * 100) };
  };

  // Start Challenge Handlers
  const startQuickChallenge = () => {
    const qList = [...SYSTEM_QUESTION_POOL].sort(() => 0.5 - Math.random()).slice(0, 5);
    setChallengeQuestions(qList);
    resetChallengeState('Quick Challenge');
    setActiveMode('quick');
  };

  const startSprintChallenge = () => {
    const qList = [...SYSTEM_QUESTION_POOL].sort(() => 0.5 - Math.random());
    setChallengeQuestions(qList);
    setSprintTimeLeft(60);
    setSprintTimerActive(true);
    resetChallengeState('60-Second Sprint');
    setActiveMode('sprint');
  };

  const startConceptChallenge = (topicName: string) => {
    const qList = SYSTEM_QUESTION_POOL.filter(q => q.topic === topicName);
    const finalPool = qList.length > 0 ? qList : SYSTEM_QUESTION_POOL.slice(0, 5);
    setChallengeQuestions(finalPool);
    resetChallengeState(`Concept: ${topicName}`);
    setActiveMode('concept');
  };

  const startWeaknessChallenge = () => {
    if (!weaknessTopic) return;
    const qList = SYSTEM_QUESTION_POOL.filter(q => q.topic === weaknessTopic.topic);
    const finalPool = qList.length > 0 ? qList : SYSTEM_QUESTION_POOL.slice(0, 5);
    setChallengeQuestions(finalPool);
    resetChallengeState(`Weakness Train: ${weaknessTopic.topic}`);
    setActiveMode('weakness');
  };

  const startDailyChallenge = () => {
    // Deterministic selection based on today's YYYY-MM-DD
    const todayStr = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) hash += todayStr.charCodeAt(i);

    const startIndex = hash % SYSTEM_QUESTION_POOL.length;
    const qList = [
      SYSTEM_QUESTION_POOL[startIndex % SYSTEM_QUESTION_POOL.length],
      SYSTEM_QUESTION_POOL[(startIndex + 1) % SYSTEM_QUESTION_POOL.length],
      SYSTEM_QUESTION_POOL[(startIndex + 2) % SYSTEM_QUESTION_POOL.length],
      SYSTEM_QUESTION_POOL[(startIndex + 3) % SYSTEM_QUESTION_POOL.length],
      SYSTEM_QUESTION_POOL[(startIndex + 4) % SYSTEM_QUESTION_POOL.length],
    ];
    setChallengeQuestions(qList);
    resetChallengeState('Daily Challenge');
    setActiveMode('daily');
  };

  const resetChallengeState = (title: string) => {
    setCompletedTitle(title);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setScore(0);
    startTimeRef.current = Date.now();
  };

  // Answer Option Selection
  const handleSelectOption = (optIndex: number) => {
    if (selectedOption !== null) return; // Prevent changing answer after selection
    setSelectedOption(optIndex);

    const currentQ = challengeQuestions[currentQIndex];
    const isCorrect = optIndex === currentQ.correctIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setUserAnswers(prev => [
      ...prev,
      { questionId: currentQ.id, isCorrect, selected: optIndex }
    ]);
  };

  const handleNextQuestion = () => {
    if (currentQIndex < challengeQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      finishChallenge(completedTitle);
    }
  };

  // Finish Challenge & Compute Real XP / Records / Streak
  const finishChallenge = (title: string) => {
    setSprintTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    setTimeSpentSeconds(timeSpent);

    const totalAns = userAnswers.length;
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const acc = totalAns > 0 ? Math.round((correctCount / totalAns) * 100) : 0;

    // Calculate Real XP
    // Correct Answer: +10 XP
    // Complete Challenge: +20 XP
    // Perfect Challenge: +50 XP
    let xpGain = correctCount * 10 + 20;
    if (acc === 100 && totalAns >= 3) {
      xpGain += 50;
    }
    setEarnedXp(xpGain);

    // Update Local Storage Arena Stats
    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedCompletedDates = Array.from(new Set([...stats.completedDates, todayStr]));

    // Streak Logic
    let newStreak = stats.streakDays;
    if (stats.lastChallengeDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (stats.lastChallengeDate === yesterdayStr) {
        newStreak += 1;
      } else if (!stats.lastChallengeDate) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }
    }

    const updatedStats: ArenaStats = {
      streakDays: newStreak,
      xp: stats.xp + xpGain,
      bestScore: Math.max(stats.bestScore, acc),
      highestScore: Math.max(stats.highestScore, correctCount),
      bestAccuracy: Math.max(stats.bestAccuracy, acc),
      fastestSprint: title.includes('Sprint') ? Math.max(stats.fastestSprint, correctCount) : stats.fastestSprint,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      challengesCompleted: stats.challengesCompleted + 1,
      lastChallengeDate: todayStr,
      completedDates: updatedCompletedDates
    };

    saveArenaStats(updatedStats);
    setActiveMode('results');
  };

  const levelInfo = getLevelInfo(stats.xp);
  const currentQ = challengeQuestions[currentQIndex];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl">
        {/* ==================================================================== */}
        {/* LANDING VIEW */}
        {/* ==================================================================== */}
        {activeMode === 'landing' && (
          <>
            {/* Hero Section */}
            <div className="surface-card p-6 sm:p-8 border border-[#C7FF4A]/30 rounded-2xl bg-gradient-to-r from-[#181620] via-[#121118] to-[#181620] relative overflow-hidden shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C7FF4A] bg-[#C7FF4A]/10 px-2.5 py-0.5 rounded-full border border-[#C7FF4A]/20">
                      ⚡ ARENA MODE
                    </span>
                    <span className="text-[10px] text-[#A6A1B2] capitalize bg-white/5 px-2 py-0.5 rounded">
                      Gamified Challenges
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-2">
                    ⚡ LEARNING ARENA
                  </h1>
                  <p className="text-sm font-semibold text-[#C7FF4A]">
                    "Challenge yourself. Find your gaps. Level up."
                  </p>
                  <p className="text-xs sm:text-sm text-[#A6A1B2] leading-relaxed">
                    Turn your syllabus into short, focused challenges and see how far you can go.
                  </p>
                </div>

                {/* Hero Stat Badges */}
                <div className="grid grid-cols-3 gap-3 bg-[#0B0A0F]/80 p-3.5 rounded-xl border border-white/10 text-center flex-shrink-0">
                  <div className="space-y-0.5">
                    <span className="block text-[11px] text-[#A6A1B2] font-medium flex items-center justify-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" /> Streak
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#F7F5FA]">
                      🔥 {stats.streakDays} <span className="text-[10px] text-[#A6A1B2]">days</span>
                    </span>
                  </div>

                  <div className="space-y-0.5 border-x border-white/10 px-2">
                    <span className="block text-[11px] text-[#A6A1B2] font-medium flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" /> Total XP
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#F7F5FA]">
                      ⭐ {stats.xp}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block text-[11px] text-[#A6A1B2] font-medium flex items-center justify-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> Best Score
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#F7F5FA]">
                      {stats.bestScore > 0 ? `${stats.bestScore}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Challenge Banner */}
            <div className="bg-gradient-to-r from-purple-900/30 via-[#181620] to-emerald-900/20 p-5 rounded-xl border border-[#8B5CF6]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F7F5FA] flex items-center gap-2">
                    🌟 DAILY CHALLENGE
                  </h3>
                  <p className="text-xs text-[#A6A1B2]">
                    One challenge. Every day. Earn bonus XP for keeping your daily streak active!
                  </p>
                </div>
              </div>

              <Button variant="primary" onClick={startDailyChallenge} className="w-full sm:w-auto text-xs whitespace-nowrap">
                START CHALLENGE →
              </Button>
            </div>

            {/* Challenge Modes Grid */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#C7FF4A]" /> Challenge Modes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CARD 1: Quick Challenge */}
                <div className="surface-card p-5 border border-white/10 rounded-xl space-y-3 hover:border-[#C7FF4A]/40 transition-all group flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-[#F7F5FA] group-hover:text-[#C7FF4A] transition-colors">
                      ⚡ QUICK CHALLENGE
                    </h4>
                    <p className="text-xs text-[#A6A1B2] leading-relaxed">
                      5 questions. One focused session. Test your speed and retention across key concepts.
                    </p>
                  </div>

                  <Button variant="outline" onClick={startQuickChallenge} className="w-full text-xs justify-between group-hover:border-[#C7FF4A] group-hover:text-[#C7FF4A]">
                    <span>START CHALLENGE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* CARD 2: 60-Second Sprint */}
                <div className="surface-card p-5 border border-white/10 rounded-xl space-y-3 hover:border-[#8B5CF6]/40 transition-all group flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
                      <Timer className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-[#F7F5FA] group-hover:text-[#8B5CF6] transition-colors">
                      ⏱️ 60-SECOND SPRINT
                    </h4>
                    <p className="text-xs text-[#A6A1B2] leading-relaxed">
                      How much can you solve in one minute? Beat your personal record against the clock.
                    </p>
                  </div>

                  <Button variant="outline" onClick={startSprintChallenge} className="w-full text-xs justify-between group-hover:border-[#8B5CF6] group-hover:text-[#8B5CF6]">
                    <span>START SPRINT</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* CARD 3: Concept Challenge */}
                <div className="surface-card p-5 border border-white/10 rounded-xl space-y-3 hover:border-[#FF6B9D]/40 transition-all group flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-[#FF6B9D]/10 border border-[#FF6B9D]/30 flex items-center justify-center text-[#FF6B9D]">
                      <Target className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-[#F7F5FA] group-hover:text-[#FF6B9D] transition-colors">
                      🎯 CONCEPT CHALLENGE
                    </h4>
                    <p className="text-xs text-[#A6A1B2] leading-relaxed">
                      Pick a specific topic from your syllabus and test your deep understanding.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setActiveMode('concept_select')}
                    className="w-full text-xs justify-between group-hover:border-[#FF6B9D] group-hover:text-[#FF6B9D]"
                  >
                    <span>CHOOSE TOPIC</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* CARD 4: Weakness Challenge */}
                <div className="surface-card p-5 border border-white/10 rounded-xl space-y-3 hover:border-amber-500/40 transition-all group flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-bold text-[#F7F5FA] group-hover:text-amber-400 transition-colors">
                      🔥 WEAKNESS CHALLENGE
                    </h4>
                    <p className="text-xs text-[#A6A1B2] leading-relaxed">
                      {weaknessTopic
                        ? `Focus session on ${weaknessTopic.topic} (Recent accuracy: ${weaknessTopic.accuracy}%).`
                        : 'Practice the concepts you need to strengthen based on recent activity.'}
                    </p>
                  </div>

                  {weaknessTopic ? (
                    <Button variant="outline" onClick={startWeaknessChallenge} className="w-full text-xs justify-between border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                      <span>TRAIN WEAKNESS</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-[#A6A1B2] flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-[#A6A1B2] flex-shrink-0" />
                      <span>Complete a few practice questions to unlock personalized weakness challenges.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Level Progression & Personal Records */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Level Progress */}
              <div className="surface-card p-5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-[#A6A1B2]">
                  <span className="flex items-center gap-1.5 font-medium text-[#F7F5FA]">
                    <Award className="w-4 h-4 text-[#8B5CF6]" /> Level System
                  </span>
                  <span className="text-xs font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded">
                    Level {levelInfo.level}: {levelInfo.name}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-[#F7F5FA] font-medium">
                    <span>LEVEL {levelInfo.level}</span>
                    <span className="text-[#A6A1B2]">{stats.xp} XP total</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#8B5CF6] to-purple-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${levelInfo.percent}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-[#A6A1B2]">
                  Level up by completing challenges, maintaining daily streaks, and achieving high accuracy.
                </p>
              </div>

              {/* Personal Records */}
              <div className="surface-card p-5 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-[#A6A1B2]">
                  <span className="flex items-center gap-1.5 font-medium text-[#F7F5FA]">
                    <Trophy className="w-4 h-4 text-amber-400" /> Personal Records
                  </span>
                  <span className="text-[11px] text-[#A6A1B2]">Saved locally</span>
                </div>

                {stats.challengesCompleted > 0 ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[11px] text-[#A6A1B2]">Highest Score</span>
                      <span className="font-bold text-[#F7F5FA]">{stats.highestScore} correct</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[11px] text-[#A6A1B2]">Best Accuracy</span>
                      <span className="font-bold text-[#F7F5FA]">{stats.bestAccuracy}%</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[11px] text-[#A6A1B2]">Fastest Sprint</span>
                      <span className="font-bold text-[#F7F5FA]">{stats.fastestSprint > 0 ? `${stats.fastestSprint} in 60s` : '—'}</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                      <span className="block text-[11px] text-[#A6A1B2]">Challenges Done</span>
                      <span className="font-bold text-[#F7F5FA]">{stats.challengesCompleted}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#A6A1B2] py-2 text-center">
                    No records yet. Complete your first challenge to set personal records!
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==================================================================== */}
        {/* CONCEPT SELECTOR VIEW */}
        {/* ==================================================================== */}
        {activeMode === 'concept_select' && (
          <div className="surface-card p-6 border border-white/10 rounded-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#F7F5FA] flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#FF6B9D]" /> CHOOSE YOUR CONCEPT
                </h3>
                <p className="text-xs text-[#A6A1B2]">
                  Select a topic to launch a targeted concept challenge.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveMode('landing')} className="text-xs">
                Back to Arena
              </Button>
            </div>

            {availableTopics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => startConceptChallenge(topic)}
                    className="p-4 rounded-xl bg-[#181620] border border-white/10 hover:border-[#FF6B9D] text-left transition-all group flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-bold text-[#F7F5FA] group-hover:text-[#FF6B9D] transition-colors">
                        {topic}
                      </h4>
                      <span className="text-[11px] text-[#A6A1B2]">Topic Challenge</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#A6A1B2] group-hover:text-[#FF6B9D] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <BookOpen className="w-10 h-10 text-[#A6A1B2] mx-auto" />
                <p className="text-sm text-[#A6A1B2]">
                  Upload a syllabus or complete practice activities to unlock concept challenges.
                </p>
                <Button variant="primary" onClick={() => navigate('/upload')} className="text-xs">
                  <Upload className="w-4 h-4 mr-1.5" /> Upload Syllabus
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* ACTIVE CHALLENGE INTERFACE */}
        {/* ==================================================================== */}
        {(activeMode === 'quick' || activeMode === 'sprint' || activeMode === 'concept' || activeMode === 'weakness' || activeMode === 'daily') && (
          <div className="surface-card p-6 border border-[#C7FF4A]/40 rounded-2xl space-y-6 bg-[#0B0A0F] shadow-2xl">
            {/* Header / Timer Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/30 font-bold text-xs flex items-center justify-center">
                  ⚡
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#F7F5FA] uppercase tracking-wider">
                    {completedTitle}
                  </h3>
                  <span className="text-xs text-[#A6A1B2]">
                    Question {currentQIndex + 1} of {challengeQuestions.length}
                  </span>
                </div>
              </div>

              {activeMode === 'sprint' ? (
                <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 font-mono font-bold text-sm">
                  <Timer className="w-4 h-4 animate-pulse" />
                  <span>00:{String(sprintTimeLeft).padStart(2, '0')}</span>
                </div>
              ) : (
                <div className="text-xs font-semibold text-[#C7FF4A] bg-[#C7FF4A]/10 px-3 py-1 rounded-full border border-[#C7FF4A]/20">
                  Score: {score}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#C7FF4A] to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${((currentQIndex + 1) / challengeQuestions.length) * 100}%` }}
              />
            </div>

            {/* Question Display Card */}
            {currentQ ? (
              <div className="space-y-6">
                <div className="bg-[#181620] p-5 rounded-xl border border-white/10 space-y-2">
                  <span className="text-[11px] font-semibold text-[#C7FF4A] uppercase tracking-wider bg-[#C7FF4A]/10 px-2.5 py-0.5 rounded">
                    {currentQ.topic}
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-[#F7F5FA] pt-1">
                    {currentQ.question}
                  </h4>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQ.correctIndex;
                    const showResult = selectedOption !== null;

                    let btnStyle = 'bg-[#181620] border-white/10 text-[#F7F5FA] hover:border-[#C7FF4A]/50';
                    if (showResult) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
                      } else {
                        btnStyle = 'bg-[#181620]/50 border-white/5 text-[#A6A1B2] opacity-60';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        disabled={showResult}
                        className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Question Explanation Banner */}
                {selectedOption !== null && currentQ.explanation && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-[#A6A1B2] space-y-1">
                    <span className="font-bold text-[#C7FF4A]">Explanation:</span>
                    <p>{currentQ.explanation}</p>
                  </div>
                )}

                {/* Next Question / Finish Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    variant="primary"
                    onClick={handleNextQuestion}
                    disabled={selectedOption === null}
                    className="text-xs"
                  >
                    {currentQIndex < challengeQuestions.length - 1 ? 'NEXT QUESTION →' : 'FINISH CHALLENGE →'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <BrainCircuit className="w-10 h-10 text-[#A6A1B2] mx-auto" />
                <p className="text-sm text-[#A6A1B2]">No questions available for this challenge.</p>
                <Button variant="primary" onClick={() => setActiveMode('landing')} className="text-xs">
                  Back to Arena
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* CHALLENGE RESULTS VIEW */}
        {/* ==================================================================== */}
        {activeMode === 'results' && (
          <div className="surface-card p-6 sm:p-8 border border-[#C7FF4A]/40 rounded-2xl space-y-6 text-center bg-[#0B0A0F] shadow-2xl max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#C7FF4A]/20 border border-[#C7FF4A]/40 flex items-center justify-center text-[#C7FF4A] mx-auto text-2xl animate-bounce">
              🏆
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[#F7F5FA]">
                CHALLENGE COMPLETE
              </h2>
              <p className="text-xs text-[#A6A1B2]">
                Great effort! Here is your performance breakdown for {completedTitle}.
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#181620] p-4 rounded-xl border border-white/10 text-center">
              <div>
                <span className="block text-[11px] text-[#A6A1B2]">Score</span>
                <span className="text-lg font-bold text-[#F7F5FA]">
                  {userAnswers.filter(a => a.isCorrect).length} / {userAnswers.length}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#A6A1B2]">Accuracy</span>
                <span className="text-lg font-bold text-[#C7FF4A]">
                  {userAnswers.length > 0 ? Math.round((userAnswers.filter(a => a.isCorrect).length / userAnswers.length) * 100) : 0}%
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#A6A1B2]">Time</span>
                <span className="text-lg font-bold text-[#F7F5FA]">
                  {Math.floor(timeSpentSeconds / 60)}m {timeSpentSeconds % 60}s
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#A6A1B2]">XP Earned</span>
                <span className="text-lg font-bold text-[#8B5CF6]">
                  +{earnedXp} XP
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => startQuickChallenge()} className="text-xs">
                <RotateCcw className="w-4 h-4 mr-1.5" /> TRY AGAIN
              </Button>
              <Button variant="primary" onClick={() => setActiveMode('landing')} className="text-xs">
                BACK TO ARENA →
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default LearningArenaPage;
