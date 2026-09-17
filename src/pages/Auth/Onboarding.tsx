import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { Button } from '../../components/ui/Button';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();

  const [focusArea, setFocusArea] = useState<'Mathematics' | 'Programming' | 'Data Structures' | 'Algorithms' | 'AI / ML' | 'Other'>('Mathematics');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number>(30);

  const focusOptions = ['Mathematics', 'Programming', 'Data Structures', 'Algorithms', 'AI / ML', 'Other'] as const;
  const levelOptions = ['Beginner', 'Intermediate', 'Advanced'] as const;
  const targetOptions = [15, 30, 60, 90] as const;

  const handleComplete = () => {
    authService.saveOnboardingProfile({
      focusArea,
      level,
      dailyTargetMinutes
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0B0A0F] flex items-center justify-center p-6 text-[#F7F5FA]">
      <div className="w-full max-w-xl surface-card p-8 md:p-10 border border-white/10 rounded-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 flex items-center justify-center mx-auto mb-3 text-[#C7FF4A]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#F7F5FA]">Calibrate Your Learning Workspace</h2>
          <p className="text-xs text-[#A6A1B2]">
            Select your core technical discipline and target preferences.
          </p>
        </div>

        {/* Focus Area */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#C7FF4A]">
            1. Primary Focus Discipline
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {focusOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFocusArea(item)}
                className={`p-3 rounded-lg border text-xs font-medium text-left transition-all ${
                  focusArea === item
                    ? 'border-[#C7FF4A] bg-[#C7FF4A]/10 text-[#F7F5FA]'
                    : 'border-white/10 bg-[#181620] text-[#A6A1B2] hover:text-[#F7F5FA] hover:border-white/20'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
            2. Current Proficiency Level
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {levelOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={`p-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  level === item
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#F7F5FA]'
                    : 'border-white/10 bg-[#181620] text-[#A6A1B2] hover:text-[#F7F5FA]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Daily Target */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#FF6B9D]">
            3. Daily Learning Commitment
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {targetOptions.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDailyTargetMinutes(min)}
                className={`p-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  dailyTargetMinutes === min
                    ? 'border-[#FF6B9D] bg-[#FF6B9D]/15 text-[#F7F5FA]'
                    : 'border-white/10 bg-[#181620] text-[#A6A1B2] hover:text-[#F7F5FA]'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" size="lg" className="w-full" onClick={handleComplete}>
          <span>Enter Workspace</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
