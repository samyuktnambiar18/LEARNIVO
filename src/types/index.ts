export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface LearningProfile {
  userId: string;
  focusArea: 'Mathematics' | 'Programming' | 'Data Structures' | 'Algorithms' | 'AI / ML' | 'Other';
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  dailyTargetMinutes: number;
  completedOnboarding: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  masteryPercentage?: number;
}

export interface Chapter {
  id: string;
  title: string;
  summary?: string;
  topics: string[];
}

export interface LearningMaterial {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  rawText?: string;
  title?: string;
  topics: Topic[];
  chapters?: Chapter[];
  videos?: VideoRecommendation[];
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface Question {
  id: string;
  materialId?: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint?: string;
}

export interface PracticeAttempt {
  id: string;
  questionId: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  userAnswer: string;
  isCorrect: boolean;
  timestamp: string;
  timeSpentSeconds: number;
}

export interface AssessmentResult {
  id: string;
  assessmentTitle: string;
  completedAt: string;
  scorePercentage: number;
  totalQuestions: number;
  correctCount: number;
  topicBreakdown: {
    topic: string;
    correct: number;
    total: number;
  }[];
  recommendations: string[];
}

export interface LearningProgress {
  totalPracticeSessions: number;
  questionsAttempted: number;
  correctAnswers: number;
  accuracyPercentage: number;
  activeStreakDays: number;
  totalStudyMinutes: number;
  topicPerformance: {
    topic: string;
    masteryScore: number; // 0 - 100
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  contextMaterialId?: string;
  suggestedFollowups?: string[];
  videoUrl?: string;
  youtubeId?: string;
  videos?: VideoRecommendation[];
  magicViewData?: MagicViewData;
}

export interface VideoRecommendation {
  id: string;
  title: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  duration?: string;
  topic: string;
}

export interface YouTubeMaterialRecord {
  id?: string;
  topic: string;
  video_title: string;
  channel_name: string;
  video_url: string;
  thumbnail_url?: string;
  view_count?: number;
  likes?: number;
  published_date?: string;
  duration?: string;
  video_type?: string;
  comments_count?: number;
  created_at?: string;
  syllabus_id?: string;
}

export interface AdaptiveLearningResult {
  evaluationSummary: string;
  strengths: string[];
  weaknesses: string[];
  recommendedFocus: string[];
  suggestedDifficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface MagicViewStep {
  step_number: number;
  title: string;
  description: string;
  active_elements?: string[];
  highlight_color?: string;
}

export interface MagicViewElement {
  id: string;
  label: string;
  type?: 'box' | 'circle' | 'text' | 'arrow' | 'image_placeholder' | 'formula' | 'node' | string;
  position?: { x: number; y: number };
  value?: string | number;
  color?: string;
  state?: 'active' | 'highlighted' | 'dimmed' | 'normal' | string;
  details?: string;
  width?: number;
  height?: number;
}

export interface MagicViewConnection {
  from: string;
  to: string;
  label?: string;
  type?: 'arrow' | 'line' | 'dashed' | string;
  direction?: 'forward' | 'backward' | 'both' | string;
  color?: string;
}

export interface MagicViewAnimation {
  step?: number;
  action?: 'appear' | 'highlight' | 'move' | 'pulse' | 'draw' | string;
  target_ids?: string[];
  description?: string;
}

export interface MagicViewInteraction {
  id?: string;
  type?: 'click' | 'hover' | 'next' | 'previous' | 'play' | 'pause' | 'reset' | string;
  target?: string;
  action_description?: string;
}

export interface MagicViewData {
  title: string;
  concept: string;
  visual_type: string;
  summary: string;
  steps: MagicViewStep[];
  elements: MagicViewElement[];
  connections: MagicViewConnection[];
  animations: MagicViewAnimation[];
  interactions: MagicViewInteraction[];
  key_takeaway: string;
}

export interface MagicViewResult {
  success: boolean;
  action: string;
  data?: MagicViewData;
  errorMessage?: string;
}


