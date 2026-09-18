import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Sliders,
  Eye,
  LogOut,
  Check
} from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { storageService } from '../../services/storage/storageService';
import { authService } from '../../services/auth/authService';
import { profileService } from '../../services/profileService';
import { User as UserModel, LearningProfile } from '../../types';
import { Button } from '../../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserModel | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Profile State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Preferences State
  const [focusArea, setFocusArea] = useState<any>('Mathematics');
  const [level, setLevel] = useState<any>('Intermediate');
  const [dailyTarget, setDailyTarget] = useState<number>(30);
  const [studyStyle, setStudyStyle] = useState<'Short Sessions' | 'Balanced' | 'Deep Study'>('Balanced');

  // Accessibility State
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const u = storageService.getUser();
    const p = storageService.getProfile();
    setUser(u);
    setProfile(p);

    if (u) {
      setName(u.name || '');
      setEmail(u.email || '');
    }
    if (p) {
      setFocusArea(p.focusArea || 'Mathematics');
      setLevel(p.level || 'Intermediate');
      setDailyTarget(p.dailyTargetMinutes || 30);
    }

    // Load local preference for Study Style
    const savedStyle = localStorage.getItem('learnivo_study_style');
    if (savedStyle) {
      setStudyStyle(savedStyle as any);
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
  }, []);

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

    // Save study style preference locally
    localStorage.setItem('learnivo_study_style', studyStyle);

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

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Platform Settings
          </h2>
          <p className="text-xs text-[#A6A1B2]">
            Manage profile information, learning preferences, and accessibility defaults.
          </p>
        </div>

        {/* Save Success Alert */}
        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 1 — PROFILE SETTINGS */}
          <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2.5 pb-2 border-b border-white/10">
              <User className="w-4 h-4 text-[#C7FF4A]" />
              <span>Profile Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#A6A1B2] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#13111C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#C7FF4A] transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A6A1B2] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#13111C] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#C7FF4A] transition-colors"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 — LEARNING PREFERENCES */}
          <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2.5 pb-2 border-b border-white/10">
              <Sliders className="w-4 h-4 text-[#8B5CF6]" />
              <span>Learning Preferences</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#A6A1B2] mb-1.5">Focus Area</label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-[#13111C] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
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
                <label className="block text-xs font-semibold text-[#A6A1B2] mb-1.5">Proficiency Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-[#13111C] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A6A1B2] mb-1.5">Daily Target</label>
                <select
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  className="w-full bg-[#13111C] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90+ minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A6A1B2] mb-1.5">Preferred Study Style</label>
                <select
                  value={studyStyle}
                  onChange={(e) => setStudyStyle(e.target.value as any)}
                  className="w-full bg-[#13111C] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                >
                  <option value="Short Sessions">Short Sessions</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Deep Study">Deep Study</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3 — APPEARANCE & ACCESSIBILITY */}
          <div className="surface-card p-6 border border-white/10 rounded-2xl bg-[#0D0B14] space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2.5 pb-2 border-b border-white/10">
              <Eye className="w-4 h-4 text-[#FF6B9D]" />
              <span>Appearance & Accessibility</span>
            </h3>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-semibold text-[#F7F5FA]">Reduced Motion</p>
                <p className="text-xs text-[#A6A1B2]">Minimize subtle background animations and visual transitions.</p>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="w-4 h-4 accent-[#C7FF4A] cursor-pointer"
              />
            </div>
          </div>

          {/* SECTION 4 — ACTION AREA */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                authService.logout();
                navigate('/login');
              }}
              className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>

            <Button
              type="submit"
              variant="primary"
              className="bg-[#C7FF4A] text-black font-extrabold hover:bg-[#b8f533] px-6 py-2.5 text-xs shadow-lg shadow-[#C7FF4A]/20"
            >
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};
