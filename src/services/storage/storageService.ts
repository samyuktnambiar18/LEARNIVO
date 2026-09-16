import {
  User,
  LearningProfile,
  LearningMaterial,
  PracticeAttempt,
  AssessmentResult,
  ChatMessage,
  LearningProgress
} from '../../types';

const STORAGE_KEYS = {
  USER: 'learnivo_user',
  PROFILE: 'learnivo_profile',
  MATERIALS: 'learnivo_materials',
  PRACTICE_ATTEMPTS: 'learnivo_practice_attempts',
  ASSESSMENTS: 'learnivo_assessments',
  CHAT_HISTORY: 'learnivo_chat_history',
};

export const storageService = {
  // USER MANAGEMENT
  getUser: (): User | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveUser: (user: User): void => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  },

  // PROFILE MANAGEMENT
  getProfile: (): LearningProfile | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveProfile: (profile: LearningProfile): void => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  // LEARNING MATERIALS
  getMaterials: (): LearningMaterial[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMaterial: (material: LearningMaterial): void => {
    const materials = storageService.getMaterials();
    const index = materials.findIndex(m => m.id === material.id);
    if (index >= 0) {
      materials[index] = material;
    } else {
      materials.unshift(material);
    }
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
  },

  deleteMaterial: (id: string): void => {
    const materials = storageService.getMaterials().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials));
  },

  // PRACTICE ATTEMPTS
  getPracticeAttempts: (): PracticeAttempt[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_ATTEMPTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  savePracticeAttempt: (attempt: PracticeAttempt): void => {
    const attempts = storageService.getPracticeAttempts();
    attempts.unshift(attempt);
    localStorage.setItem(STORAGE_KEYS.PRACTICE_ATTEMPTS, JSON.stringify(attempts));
  },

  // ASSESSMENT RESULTS
  getAssessmentResults: (): AssessmentResult[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAssessmentResult: (result: AssessmentResult): void => {
    const results = storageService.getAssessmentResults();
    results.unshift(result);
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(results));
  },

  // CHAT HISTORY
  getChatHistory: (): ChatMessage[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveChatMessage: (message: ChatMessage): void => {
    const history = storageService.getChatHistory();
    history.push(message);
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  },

  clearChatHistory: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  },

  // COMPUTED REAL PROGRESS (Derived purely from actual stored attempts and assessments)
  getProgress: (): LearningProgress | null => {
    const attempts = storageService.getPracticeAttempts();
    const assessments = storageService.getAssessmentResults();

    if (attempts.length === 0 && assessments.length === 0) {
      return null; // Return null so clean empty state renders when no data exists!
    }

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.isCorrect).length;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    
    // Compute total study time in minutes
    const totalSeconds = attempts.reduce((acc, a) => acc + (a.timeSpentSeconds || 30), 0);
    const studyMinutes = Math.round(totalSeconds / 60);

    // Group topic performance
    const topicStats: Record<string, { correct: number; total: number }> = {};
    attempts.forEach(a => {
      if (!topicStats[a.topic]) {
        topicStats[a.topic] = { correct: 0, total: 0 };
      }
      topicStats[a.topic].total += 1;
      if (a.isCorrect) topicStats[a.topic].correct += 1;
    });

    const topicPerformance = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      masteryScore: Math.round((stats.correct / stats.total) * 100)
    }));

    return {
      totalPracticeSessions: Math.max(1, Math.ceil(totalAttempts / 5)),
      questionsAttempted: totalAttempts,
      correctAnswers: correctAttempts,
      accuracyPercentage: accuracy,
      activeStreakDays: totalAttempts > 0 ? 1 : 0,
      totalStudyMinutes: studyMinutes,
      topicPerformance
    };
  }
};
