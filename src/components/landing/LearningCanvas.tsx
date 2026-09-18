import React from 'react';
import { Sparkles, Eye, Code, Target } from 'lucide-react';
import { LearnivoLogo } from '../ui/LearnivoLogo';

export const LearningCanvas: React.FC = () => {
  return (
    <div className="w-full relative flex items-center justify-center p-4 sm:p-8 select-none">
      {/* Subtle Ambient Background Glow */}
      <div className="absolute w-80 h-80 rounded-full bg-[#C7FF4A]/10 blur-[120px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute w-72 h-72 rounded-full bg-[#8B5CF6]/15 blur-[120px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Main Container for Central Visual */}
      <div className="w-full max-w-[500px] aspect-square relative flex items-center justify-center">

        {/* Central Learnivo Logo Badge */}
        <div className="relative z-20 flex flex-col items-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#0D0B14] border border-[#C7FF4A]/30 flex items-center justify-center shadow-[0_0_40px_rgba(199,255,74,0.25)] transition-all duration-300 hover:scale-105">
            <LearnivoLogo size={56} showWordmark={false} />
          </div>
        </div>

        {/* 4 Clean Feature Cards Positioned Symmetrically */}

        {/* 1. AI Tutor (Top Left) */}
        <div className="absolute top-[8%] left-[2%] sm:left-[4%] z-20 transition-all duration-300 hover:-translate-y-1">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/80 border border-white/10 backdrop-blur-md shadow-xl hover:border-[#8B5CF6]/50 transition-all flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6] flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">AI Tutor</div>
              <div className="text-[11px] text-[#A6A1B2]">Ask anything</div>
            </div>
          </div>
        </div>

        {/* 2. Magic View (Top Right) */}
        <div className="absolute top-[8%] right-[2%] sm:right-[4%] z-20 transition-all duration-300 hover:-translate-y-1">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/80 border border-white/10 backdrop-blur-md shadow-xl hover:border-[#38BDF8]/50 transition-all flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Magic View</div>
              <div className="text-[11px] text-[#A6A1B2]">Visualize concepts</div>
            </div>
          </div>
        </div>

        {/* 3. Practice (Bottom Left) */}
        <div className="absolute bottom-[8%] left-[2%] sm:left-[4%] z-20 transition-all duration-300 hover:-translate-y-1">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/80 border border-white/10 backdrop-blur-md shadow-xl hover:border-[#C7FF4A]/50 transition-all flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C7FF4A]/15 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A] flex-shrink-0">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Practice</div>
              <div className="text-[11px] text-[#A6A1B2]">Solve & improve</div>
            </div>
          </div>
        </div>

        {/* 4. Assessment (Bottom Right) */}
        <div className="absolute bottom-[8%] right-[2%] sm:right-[4%] z-20 transition-all duration-300 hover:-translate-y-1">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/80 border border-white/10 backdrop-blur-md shadow-xl hover:border-[#A855F7]/50 transition-all flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7] flex-shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Assessment</div>
              <div className="text-[11px] text-[#A6A1B2]">Test yourself</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
