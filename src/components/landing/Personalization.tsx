import React from 'react';
import { Target, Activity, RefreshCw } from 'lucide-react';

export const Personalization: React.FC = () => {
  return (
    <section className="py-20 border-t border-white/5 bg-[#121118]/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-widest text-[#FF6B9D] uppercase mb-3 block">
            Adaptive Intelligence
          </span>
          <h2 className="text-3xl font-bold text-[#F7F5FA] tracking-tight mb-4">
            Personalized Learning Driven by Actual Activity
          </h2>
          <p className="text-sm text-[#A6A1B2]">
            LEARNIVO dynamically evaluates practice attempts to calibrate question difficulty and recommend targeted educational resources.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="surface-card p-6 border-t-2 border-t-[#C7FF4A]">
            <Target className="w-6 h-6 text-[#C7FF4A] mb-4" />
            <h3 className="text-base font-semibold text-[#F7F5FA] mb-2">Targeted Diagnostics</h3>
            <p className="text-xs text-[#A6A1B2] leading-relaxed">
              Pinpoints exact conceptual gaps in problem-solving sessions without relying on arbitrary test heuristics.
            </p>
          </div>

          <div className="surface-card p-6 border-t-2 border-t-[#8B5CF6]">
            <Activity className="w-6 h-6 text-[#8B5CF6] mb-4" />
            <h3 className="text-base font-semibold text-[#F7F5FA] mb-2">Difficulty Calibration</h3>
            <p className="text-xs text-[#A6A1B2] leading-relaxed">
              Automatically adjusts practice intensity between Easy, Medium, and Hard based on real mastery data.
            </p>
          </div>

          <div className="surface-card p-6 border-t-2 border-t-[#FF6B9D]">
            <RefreshCw className="w-6 h-6 text-[#FF6B9D] mb-4" />
            <h3 className="text-base font-semibold text-[#F7F5FA] mb-2">Curated Resources</h3>
            <p className="text-xs text-[#A6A1B2] leading-relaxed">
              Discovers precise video tutorials for topics where further conceptual reinforcement is required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
