import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, GraduationCap, Check, ArrowRight, BookOpen, BrainCircuit, MessageSquareCode, BarChart3 } from 'lucide-react';
import { authService } from '../../services/auth/authService';

const AVATARS = [
  { id: 1, color: 'from-amber-400 to-orange-500', emoji: '🧑‍🎓', bg: 'bg-amber-100 border-amber-300' },
  { id: 2, color: 'from-[#8B5CF6] to-purple-600', emoji: '👩‍💻', bg: 'bg-purple-100 border-purple-300' },
  { id: 3, color: 'from-blue-400 to-indigo-600', emoji: '👨‍🔬', bg: 'bg-blue-100 border-blue-300' },
  { id: 4, color: 'from-pink-400 to-rose-600', emoji: '👩‍🎨', bg: 'bg-pink-100 border-pink-300' },
  { id: 5, color: 'from-emerald-400 to-teal-600', emoji: '👨‍🏫', bg: 'bg-emerald-100 border-emerald-300' },
  { id: 6, color: 'from-cyan-400 to-blue-500', emoji: '👩‍🚀', bg: 'bg-cyan-100 border-cyan-300' },
];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [studentName, setStudentName] = useState(currentUser?.name || 'Alex Morgan');
  const [grade, setGrade] = useState('Grade 10 (High School)');
  const [selectedAvatar, setSelectedAvatar] = useState(1);

  const handleContinue = () => {
    authService.saveOnboardingProfile({
      focusArea: 'Mathematics',
      level: 'Intermediate',
      dailyTargetMinutes: 30
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F4F1FF] text-[#1E1B4B] flex flex-col justify-between selection:bg-[#7C3AED] selection:text-white">
      {/* Header */}
      <header className="h-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#6D28D9] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-[#4C1D95]">LEARNIVO</span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#64748B] hidden sm:inline">Already have an account?</span>
          <Link
            to={currentUser ? '/dashboard' : '/login'}
            className="px-4 py-2 rounded-xl border border-[#7C3AED]/30 text-[#6D28D9] font-bold hover:bg-[#6D28D9]/10 transition-all shadow-sm"
          >
            {currentUser ? 'Dashboard' : 'Log In'}
          </Link>
        </div>
      </header>

      {/* Main Composition */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 md:py-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* LEFT COLUMN: Profile Setup Form Card */}
        <div className="w-full lg:w-[48%] space-y-6">
          {/* Welcome Pill */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECE9FE] border border-[#DDD6FE] text-xs font-bold text-[#6D28D9]">
            <span>✦ WELCOME TO LEARNIVO</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-[#1E1B4B] tracking-tight">
              Let’s Get Started 👋
            </h1>
            <p className="text-base text-[#64748B] leading-relaxed">
              Tell us a bit about yourself so we can personalize your learning experience.
            </p>
          </div>

          {/* White Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-900/5 border border-purple-100 space-y-6">
            {/* Step Progress Indicator Bar */}
            <div className="flex items-center justify-between bg-[#F8F7FF] p-2 rounded-2xl border border-purple-100/60 text-xs font-bold">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#6D28D9] text-white shadow-md">
                <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Profile</span>
              </div>
              <span className="text-purple-300">→</span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#94A3B8]">
                <span>2</span>
                <span>Courses</span>
              </div>
              <span className="text-purple-300">→</span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#94A3B8]">
                <span>3</span>
                <span>Dashboard</span>
              </div>
            </div>

            {/* Input: Your Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
                Your Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-[#F8F7FF] border border-purple-200/80 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-[#1E1B4B] focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all"
                />
              </div>
            </div>

            {/* Input: Your Grade */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
                Your Grade
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-[#F8F7FF] border border-purple-200/80 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-[#1E1B4B] focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="Grade 10 (High School)">Grade 10 (High School)</option>
                  <option value="Grade 11 (High School)">Grade 11 (High School)</option>
                  <option value="Grade 12 (High School)">Grade 12 (High School)</option>
                  <option value="Undergraduate">Undergraduate Student</option>
                  <option value="Other">Other / Self Learner</option>
                </select>
              </div>
            </div>

            {/* Choose an Avatar */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
                Choose an avatar
              </label>
              <p className="text-xs text-[#64748B]">Pick a character that represents you!</p>

              <div className="grid grid-cols-6 gap-2 pt-1">
                {AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`relative aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all ${
                        av.bg
                      } ${
                        isSelected
                          ? 'ring-4 ring-[#6D28D9] ring-offset-2 scale-105 shadow-md'
                          : 'opacity-70 hover:opacity-100 hover:scale-102'
                      }`}
                    >
                      <span>{av.emoji}</span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#6D28D9] text-white flex items-center justify-center text-[10px] shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-4 px-6 rounded-2xl bg-[#6D28D9] hover:bg-[#581C87] active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-[#94A3B8]">
              You can change these details later in Settings.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Illustration & Tablet Workspace Preview */}
        <div className="w-full lg:w-[48%] flex flex-col items-center justify-center relative min-h-[420px]">
          {/* Soft Sun/Window Backdrop Graphic */}
          <div className="absolute w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full bg-gradient-to-tr from-[#E9D5FF] via-[#F3E8FF] to-[#FAF5FF] border border-purple-200/50 -z-0 opacity-80" />

          {/* Floating Workspace Preview Graphic / Tablet Frame */}
          <div className="relative z-10 w-full max-w-lg bg-[#121118] p-4 rounded-3xl border-4 border-[#334155] shadow-2xl shadow-purple-900/20 text-white space-y-4 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500">
            {/* Tablet Mockup Top Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#7C3AED] flex items-center justify-center text-[10px] font-bold">
                  L
                </div>
                <span className="font-bold text-white tracking-wider">LEARNIVO</span>
              </div>
              <span className="text-[11px] text-[#A6A1B2] bg-white/10 px-2 py-0.5 rounded-full">
                {studentName}
              </span>
            </div>

            {/* Tablet Content Mockup */}
            <div className="bg-[#181620] p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Welcome!</h4>
                  <p className="text-[11px] text-[#A6A1B2]">Your Learning Journey</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#C7FF4A] animate-ping" />
              </div>

              {/* Grid Cards inside Mockup */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <BookOpen className="w-4 h-4 text-purple-400 mb-1" />
                  <span className="text-[10px] font-semibold text-purple-300 block">Courses</span>
                  <span className="text-xs font-bold text-white">Active</span>
                </div>
                <div className="p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/20">
                  <BrainCircuit className="w-4 h-4 text-lime-400 mb-1" />
                  <span className="text-[10px] font-semibold text-lime-300 block">Practice</span>
                  <span className="text-xs font-bold text-white">Adaptive</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <MessageSquareCode className="w-4 h-4 text-blue-400 mb-1" />
                  <span className="text-[10px] font-semibold text-blue-300 block">AI Tutor</span>
                  <span className="text-xs font-bold text-emerald-400">● Ready</span>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20">
                  <BarChart3 className="w-4 h-4 text-pink-400 mb-1" />
                  <span className="text-[10px] font-semibold text-pink-300 block">Progress</span>
                  <span className="text-xs font-bold text-white">Tracked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-purple-200/50 text-center text-xs text-[#94A3B8]">
        <p>© {new Date().getFullYear()} LEARNIVO. All rights reserved.</p>
      </footer>
    </div>
  );
};
