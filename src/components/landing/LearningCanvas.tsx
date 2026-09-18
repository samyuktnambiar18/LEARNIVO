import React from 'react';
import { ArrowRight, Code2, Bot, Eye, Target } from 'lucide-react';

export const LearningCanvas: React.FC = () => {
  return (
    <div className="w-full relative flex items-center justify-center p-2 sm:p-4 select-none min-h-[520px]">
      {/* Background 3D Workspace Scene Image Layer */}
      <div className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <img
          src="/landing_hero_bg.jpg"
          alt="LEARNIVO AI Learning Workspace 3D Scene"
          className="w-full h-full object-cover object-center opacity-85 hover:scale-102 transition-transform duration-700"
        />
        {/* Dark Vignette Overlay for Seamless Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090D] via-transparent to-[#08090D]/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090D]/40 via-transparent to-[#08090D] pointer-events-none" />
      </div>

      {/* Floating Interactive 3D Feature Cards Overlay */}
      <div className="relative z-20 w-full max-w-[580px] h-[480px] flex items-center justify-center pointer-events-auto">

        {/* 1. Practice Card (Top Left) */}
        <div className="absolute top-[8%] left-[2%] sm:left-[5%] animate-float-1 transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/85 border border-[#C7FF4A]/50 backdrop-blur-xl shadow-[0_0_25px_rgba(199,255,74,0.3)] flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#C7FF4A]/20 border border-[#C7FF4A]/40 flex items-center justify-center text-[#C7FF4A] flex-shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Practice</span>
              </div>
              <div className="text-[11px] text-[#A6A1B2]">Solve & improve</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#A6A1B2] group-hover:text-[#C7FF4A] group-hover:bg-[#C7FF4A]/10 transition-colors ml-1">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 2. AI Tutor Card (Top Right) */}
        <div className="absolute top-[8%] right-[2%] sm:right-[5%] animate-float-2 transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/85 border border-[#8B5CF6]/50 backdrop-blur-xl shadow-[0_0_25px_rgba(139,92,246,0.3)] flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6] flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">AI Tutor</div>
              <div className="text-[11px] text-[#A6A1B2]">Ask anything</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#A6A1B2] group-hover:text-[#8B5CF6] group-hover:bg-[#8B5CF6]/10 transition-colors ml-1">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 3. Magic View Card (Middle Right) */}
        <div className="absolute top-[48%] right-[0%] sm:right-[2%] -translate-y-1/2 animate-float-3 transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/85 border border-[#38BDF8]/50 backdrop-blur-xl shadow-[0_0_25px_rgba(56,189,248,0.3)] flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">Magic View</div>
              <div className="text-[11px] text-[#A6A1B2]">Visualize concepts</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#A6A1B2] group-hover:text-[#38BDF8] group-hover:bg-[#38BDF8]/10 transition-colors ml-1">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 4. Assessment Card (Bottom Right) */}
        <div className="absolute bottom-[10%] right-[2%] sm:right-[5%] animate-float-1 transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="px-4 py-3 rounded-2xl bg-[#13111C]/85 border border-[#A855F7]/50 backdrop-blur-xl shadow-[0_0_25px_rgba(168,85,247,0.3)] flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] flex-shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">Assessment</div>
              <div className="text-[11px] text-[#A6A1B2]">Test yourself</div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#A6A1B2] group-hover:text-[#A855F7] group-hover:bg-[#A855F7]/10 transition-colors ml-1">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
