import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Sliders,
  Eye,
  LogOut,
  Check,
  Flame,
  Target,
  Sparkles,
  Award,
  Calendar,
  Bell,
  Clock,
  Zap,
  TrendingUp,
  Lock,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { authService } from '../../services/auth/authService';
import { profileService } from '../../services/profileService';
import { assessmentHistoryService } from '../../services/assessmentHistoryService';
import { User as UserModel, LearningProfile } from '../../types';
import { Button } from '../../components/ui/Button';
import { computeMotivationData, MotivationData } from '../../utils/motivationEngine';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserModel | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Existing Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Existing Preferences State
  const [focusArea, setFocusArea] = useState<any>('Mathematics');
  const [level, setLevel] = useState<any>('Intermediate');
  const [dailyTarget, setDailyTarget] = useState<number>(30);
  const [studyStyle, setStudyStyle] = useState<'Short Sessions' | 'Balanced' | 'Deep Study'>('Balanced');

  // Existing Accessibility State
  const [reducedMotion, setReducedMotion] = useState(false);

  // New Study Reminder State
  const [studyReminder, setStudyReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('19:00');

  // Computed Motivation Data
  const [motivationData, setMotivationData] = useState<MotivationData>(() => 
    computeMotivationData([], [], 30)
  );

  useEffect(() => {
    const u = storageService.getUser();
    const p = storageService.getProfile();
    setUser(u);
    setProfile(p);

    if (u) {
      setName(u.name);
      setEmail(u.email);
    }
    if (p) {
      setFocusArea(p.focusArea);
      setLevel(p.level);
      setDailyTarget(p.dailyTargetMinutes);
    }

    // Load local preferences for Study Style & Reminder
    const savedStyle = localStorage.getItem('learnivo_study_style');
    if (savedStyle) {
      setStudyStyle(savedStyle as any);
    }

    const savedReminderStr = localStorage.getItem('learnivo_reminder');
    if (savedReminderStr) {
      try {
        const parsed = JSON.parse(savedReminderStr);
        setStudyReminder(parsed.enabled ?? false);
        setReminderTime(parsed.time || '19:00');
      } catch {}
    }

    // Fetch live profile data from Supabase profile table
    async function loadSupabaseProfile() {
      const dbProf = await profileService.getProfile();
      if (dbProf) {
        if (dbProf.full_name) setName(dbProf.full_name);
        if (dbProf.email) setEmail(dbProf.email);
        if (dbProf.focus_area) setFocusArea(dbProf.focus_area);
        if (dbProf.level) setLevel(dbProf.level);
        if (dbProf.daily_target_minutes) setDailyTarget(dbProf.daily_target_minutes);
      }
    }
    loadSupabaseProfile();

    // Load actual learning activity data to calculate streak, XP, achievements
    async function loadMotivation() {
      const attempts = storageService.getPracticeAttempts();
      const asmList = await assessmentHistoryService.getHistory();
      const computed = computeMotivationData(attempts, asmList, p?.dailyTargetMinutes || dailyTarget);
      setMotivationData(computed);
    }
    loadMotivation();
  }, []);

  // Update motivation computed metrics when dailyTarget changes
  useEffect(() => {
    const attempts = storageService.getPracticeAttempts();
    assessmentHistoryService.getHistory().then(asmList => {
      setMotivationData(computeMotivationData(attempts, asmList, dailyTarget));
    });
  }, [dailyTarget]);

  const handleReminderToggle = async (checked: boolean) => {
    setStudyReminder(checked);
    if (checked && 'Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch {
        // Fallback gracefully without breaking UI
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      const updatedUser = { ...user, name, email };
      storageService.saveUser(updatedUser);
      setUser(updatedUser);
    }
    const updatedProfile: LearningProfile = {
      userId: user?.id || 'usr',
      focusArea,
      level,
      dailyTargetMinutes: dailyTarget,
      completedOnboarding: true
    };
    storageService.saveProfile(updatedProfile);
    setProfile(updatedProfile);

    // Save newly added local preferences
    localStorage.setItem('learnivo_study_style', studyStyle);
    localStorage.setItem('learnivo_reminder', JSON.stringify({
      enabled: studyReminder,
      time: reminderTime
    }));

    // Persist to Supabase profile table
    await profileService.saveProfile({
      full_name: name,
      email: email,
      focus_area: focusArea,
      level: level,
      daily_target_minutes: dailyTarget
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const hasAnyActivity = motivationData.weeklyLearningDays > 0 || 
    motivationData.streakDays > 0 || 
    motivationData.xp > 0;

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Platform Settings
          </h2>
          <p className="text-xs text-[#A6A1B2]">
            Manage profile information, learning preferences, motivation goals, and accessibility defaults.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Profile Settings */}
          <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-[#F7F5FA] flex items-center gap-2">
              <User className="w-4 h-4 text-[#C7FF4A]" />
              <span>Profile Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A6A1B2] mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#181620] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#C7FF4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A6A1B2] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#181620] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#C7FF4A]"
                />
              </div>
            </div>
          </div>

          {/* 2. Learning Preferences */}
          <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-[#F7F5FA] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#8B5CF6]" />
              <span>Learning Preferences</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#A6A1B2] mb-1">Focus Area</label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-[#181620] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Programming">Programming</option>
                  <option value="Data Structures">Data Structures</option>
                  <option value="Algorithms">Algorithms</option>
                  <option value="AI / ML">AI / ML</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A6A1B2] mb-1">Proficiency Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-[#181620] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A6A1B2] mb-1">Daily Target</label>
                <select
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  className="w-full bg-[#181620] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90+ minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A6A1B2] mb-1">Preferred Study Style</label>
                <select
                  value={studyStyle}
                  onChange={(e) => setStudyStyle(e.target.value as any)}
                  className="w-full bg-[#181620] border border-white/10 rounded-lg px-3.5 py-2 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="Short Sessions">Short Sessions</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Deep Study">Deep Study</option>
                </select>
              </div>
            </div>
          </div>

          {/* NEW SECTION: Learning & Motivation */}
          <div className="surface-card p-6 border border-white/10 rounded-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-semibold text-[#F7F5FA] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#C7FF4A]" />
                <span>Learning & Motivation</span>
              </h3>
              <span className="text-[11px] font-medium text-[#C7FF4A] bg-[#C7FF4A]/10 px-2.5 py-0.5 rounded-full">
                Gamification & Goals
              </span>
            </div>

            {/* Streak & Daily Goal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Daily Learning Streak */}
              <div className="bg-[#181620] p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A6A1B2]">
                  <span className="flex items-center gap-1.5 font-medium text-[#F7F5FA]">
                    <Flame className="w-4 h-4 text-orange-500" /> Current Streak
                  </span>
                  <span className="text-orange-400 font-semibold">{motivationData.streakDays} Days</span>
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-2xl font-bold text-[#F7F5FA]">🔥 {motivationData.streakDays}</span>
                  <span className="text-xs text-[#A6A1B2]">days consecutive</span>
                </div>

                <p className="text-xs text-[#A6A1B2] pt-1">
                  {motivationData.streakDays > 0
                    ? 'Keep the momentum going by completing a learning session today.'
                    : 'Start learning today to begin your streak.'}
                </p>
              </div>

              {/* Daily Goal Progress */}
              <div className="bg-[#181620] p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A6A1B2]">
                  <span className="flex items-center gap-1.5 font-medium text-[#F7F5FA]">
                    <Target className="w-4 h-4 text-[#C7FF4A]" /> Today's Goal
                  </span>
                  <span className="text-[#C7FF4A] font-semibold">
                    {motivationData.todayMinutes} / {motivationData.targetMinutes} minutes
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#C7FF4A] to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round((motivationData.todayMinutes / motivationData.targetMinutes) * 100))}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#A6A1B2]">
                    <span>{motivationData.todayQuestions} questions completed today</span>
                    <span>{Math.min(100, Math.round((motivationData.todayMinutes / motivationData.targetMinutes) * 100))}%</span>
                  </div>
                </div>

                <p className="text-xs text-[#A6A1B2]">
                  {motivationData.todayMinutes > 0 || motivationData.todayQuestions > 0
                    ? 'Actual daily activity recorded from completed practice & assessments.'
                    : 'Complete your first learning session to start tracking your goal.'}
                </p>
              </div>
            </div>

            {/* XP / Learning Level & Weekly Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* XP & Level */}
              <div className="bg-[#181620] p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#F7F5FA]">
                    <Sparkles className="w-4 h-4 text-[#8B5CF6]" /> Learnivo XP
                  </span>
                  <span className="text-xs font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded">
                    Level {motivationData.level}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-[#F7F5FA]">⭐ {motivationData.xp} <span className="text-xs font-normal text-[#A6A1B2]">XP</span></span>
                  <span className="text-xs text-[#A6A1B2]">Progress to Level {motivationData.level + 1}</span>
                </div>

                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#8B5CF6] to-purple-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${motivationData.xpProgressPercent}%` }}
                  />
                </div>

                <p className="text-xs text-[#A6A1B2]">
                  {motivationData.xp > 0
                    ? `Earn XP by completing practice questions, assessments, and streaks.`
                    : 'Start learning to earn XP.'}
                </p>
              </div>

              {/* Weekly Learning Summary */}
              <div className="bg-[#181620] p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#A6A1B2]">
                  <span className="flex items-center gap-1.5 font-medium text-[#F7F5FA]">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> This Week
                  </span>
                  <span className="text-[11px] text-[#A6A1B2]">Actual data</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <span className="block text-xs text-[#A6A1B2]">Learning Days</span>
                    <span className="text-sm font-bold text-[#F7F5FA]">
                      {motivationData.weeklyLearningDays > 0 ? motivationData.weeklyLearningDays : '—'}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <span className="block text-xs text-[#A6A1B2]">Questions</span>
                    <span className="text-sm font-bold text-[#F7F5FA]">
                      {motivationData.weeklyQuestions > 0 ? motivationData.weeklyQuestions : '—'}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <span className="block text-xs text-[#A6A1B2]">Practice Sessions</span>
                    <span className="text-sm font-bold text-[#F7F5FA]">
                      {motivationData.weeklySessions > 0 ? motivationData.weeklySessions : '—'}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg text-center">
                    <span className="block text-xs text-[#A6A1B2]">Assessments</span>
                    <span className="text-sm font-bold text-[#F7F5FA]">
                      {motivationData.weeklyAssessments > 0 ? motivationData.weeklyAssessments : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Consistency Visualization */}
            <div className="bg-[#181620] p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A6A1B2]">
                <span className="flex items-center gap-1.5 font-medium text-[#F7F5FA]">
                  <Calendar className="w-4 h-4 text-[#C7FF4A]" /> Learning Consistency
                </span>
                <span className="text-[11px] text-[#A6A1B2]">Current Week</span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center py-2">
                {motivationData.consistencyWeek.map((day) => (
                  <div key={day.dayName} className="space-y-1.5">
                    <span className={`block text-xs ${day.isToday ? 'font-bold text-[#C7FF4A]' : 'text-[#A6A1B2]'}`}>
                      {day.dayName}
                    </span>
                    <div className="flex justify-center">
                      {day.hasActivity ? (
                        <div className="w-4 h-4 rounded-full bg-[#C7FF4A] shadow-sm shadow-[#C7FF4A]/50 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-white/10 border border-white/10" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#A6A1B2] text-center pt-1 border-t border-white/5">
                {hasAnyActivity
                  ? 'Visual representation of days with verified learning activity.'
                  : 'No learning activity recorded yet.'}
              </p>
            </div>

            {/* Achievements Subsection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#F7F5FA]">
                  <Award className="w-4 h-4 text-amber-400" /> Achievements
                </span>
                <span className="text-xs text-[#A6A1B2]">
                  {motivationData.achievements.filter(a => a.unlocked).length} / {motivationData.achievements.length} Unlocked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {motivationData.achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      ach.unlocked
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-[#181620] border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-xl">{ach.icon}</span>
                      {ach.unlocked ? (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#A6A1B2] bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-[#F7F5FA] mb-0.5">{ach.title}</h4>
                    <p className="text-[11px] text-[#A6A1B2] leading-tight">{ach.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Reminder Preference */}
            <div className="bg-[#181620] p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#FF6B9D]" />
                  <div>
                    <p className="text-sm font-medium text-[#F7F5FA]">Study Reminder</p>
                    <p className="text-xs text-[#A6A1B2]">Remind me to complete my daily learning goal.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={studyReminder}
                  onChange={(e) => handleReminderToggle(e.target.checked)}
                  className="w-4 h-4 accent-[#C7FF4A] cursor-pointer"
                />
              </div>

              {studyReminder && (
                <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#A6A1B2]" />
                  <label className="text-xs text-[#A6A1B2]">Reminder Time:</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-[#121118] border border-white/10 rounded-lg px-3 py-1 text-xs text-[#F7F5FA] focus:outline-none focus:border-[#FF6B9D]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Appearance & Accessibility */}
          <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-[#F7F5FA] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#FF6B9D]" />
              <span>Appearance & Accessibility</span>
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#F7F5FA]">Reduced Motion</p>
                <p className="text-xs text-[#A6A1B2]">Minimize subtle background animations</p>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="w-4 h-4 accent-[#C7FF4A] cursor-pointer"
              />
            </div>
          </div>

          {/* 5. Sign Out & Save Settings */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                authService.logout();
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>

            <Button type="submit" variant="primary">
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

