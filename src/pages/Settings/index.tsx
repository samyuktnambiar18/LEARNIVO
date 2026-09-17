import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Sliders, Eye, LogOut, Check } from 'lucide-react';
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

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [focusArea, setFocusArea] = useState<any>('Mathematics');
  const [level, setLevel] = useState<any>('Intermediate');
  const [dailyTarget, setDailyTarget] = useState<number>(30);
  const [reducedMotion, setReducedMotion] = useState(false);

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
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-bold text-[#F7F5FA] mb-1">
            Platform Settings
          </h2>
          <p className="text-xs text-[#A6A1B2]">
            Manage profile information, learning preferences, and accessibility defaults.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Settings updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Section */}
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

          {/* Learning Preferences */}
          <div className="surface-card p-6 border border-white/10 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-[#F7F5FA] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#8B5CF6]" />
              <span>Learning Preferences</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* Accessibility & Motion */}
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
                className="w-4 h-4 accent-[#C7FF4A]"
              />
            </div>
          </div>

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
