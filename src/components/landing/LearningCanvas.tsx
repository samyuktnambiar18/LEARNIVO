import React from 'react';
import { Sparkles, Sliders, Eye, Target, Code } from 'lucide-react';
import { LearnivoLogo } from '../ui/LearnivoLogo';

export const LearningCanvas: React.FC = () => {
  return (
    <div className="w-full relative flex items-center justify-center p-2 sm:p-6 select-none">
      {/* Background Ambient Glows */}
      <div className="absolute w-72 h-72 rounded-full bg-[#C7FF4A]/10 blur-[100px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute w-80 h-80 rounded-full bg-[#8B5CF6]/15 blur-[120px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Main Container for Central Visual */}
      <div className="w-full max-w-[560px] aspect-[4/3.8] sm:aspect-square relative flex items-center justify-center">

        {/* SVG Connecting Curved Lines & Pulse Rays */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            {/* Gradients for Glowing Connecting Lines */}
            <linearGradient id="grad-lime-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C7FF4A" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="grad-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#C7FF4A" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#C7FF4A" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.5" />
            </linearGradient>

            {/* Glowing Drop Shadows */}
            <filter id="glow-lime" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connected Curves from outer 5 nodes to center (50% 50%) */}
          {/* Node 1: AI Tutor (Top Left ~ 20% 18%) */}
          <path
            d="M 120 70 Q 200 130 280 240"
            stroke="url(#grad-violet)"
            strokeWidth="1.5"
            fill="none"
            className="animate-line-flow opacity-70"
            filter="url(#glow-lime)"
          />

          {/* Node 2: Adaptive Learning (Top Right ~ 80% 18%) */}
          <path
            d="M 440 70 Q 360 130 280 240"
            stroke="url(#grad-lime-violet)"
            strokeWidth="1.5"
            fill="none"
            className="animate-line-flow opacity-75"
            filter="url(#glow-lime)"
          />

          {/* Node 3: Magic View (Middle Left ~ 12% 55%) */}
          <path
            d="M 90 260 Q 185 250 280 240"
            stroke="url(#grad-blue)"
            strokeWidth="1.5"
            fill="none"
            className="animate-line-flow opacity-70"
          />

          {/* Node 4: Assessment (Middle Right ~ 88% 55%) */}
          <path
            d="M 470 260 Q 375 250 280 240"
            stroke="url(#grad-purple)"
            strokeWidth="1.5"
            fill="none"
            className="animate-line-flow opacity-75"
          />

          {/* Node 5: Practice (Bottom Center ~ 50% 88%) */}
          <path
            d="M 280 410 Q 280 325 280 240"
            stroke="url(#grad-lime-violet)"
            strokeWidth="1.5"
            fill="none"
            className="animate-line-flow opacity-80"
            filter="url(#glow-lime)"
          />

          {/* Concentric Decorative Circular Lines */}
          <circle cx="280" cy="240" r="160" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" fill="none" strokeDasharray="4 8" />
          <circle cx="280" cy="240" r="110" stroke="rgba(199, 255, 74, 0.12)" strokeWidth="1" fill="none" />
          <circle cx="280" cy="240" r="70" stroke="rgba(139, 92, 246, 0.2)" strokeWidth="1.5" fill="none" strokeDasharray="3 6" />
        </svg>

        {/* Central Glowing AI Core */}
        <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          {/* Outer Pulsing Glow Rings */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-[#C7FF4A]/20 bg-[#C7FF4A]/5 animate-pulse-glow absolute pointer-events-none" />
          <div className="w-28 h-28 sm:w-34 sm:h-34 rounded-full border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 animate-pulse-subtle absolute pointer-events-none" />

          {/* Core Symbol Badge */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0B0A0F] border border-[#C7FF4A]/50 flex items-center justify-center shadow-[0_0_30px_rgba(199,255,74,0.35)] transition-transform duration-300 hover:scale-105">
            <LearnivoLogo size={42} showWordmark={false} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#C7FF4A] rounded-full animate-ping opacity-75" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#C7FF4A] rounded-full shadow-[0_0_10px_#C7FF4A]" />
          </div>

          <div className="mt-3 px-3 py-1 rounded-full bg-[#121118]/90 border border-white/10 shadow-lg text-[10px] sm:text-xs font-mono tracking-widest text-[#C7FF4A] uppercase font-bold backdrop-blur-md">
            LEARNIVO CORE
          </div>
        </div>

        {/* Outer 5 Connected Feature Nodes */}

        {/* Node 1: AI Tutor (Top Left) */}
        <div className="absolute top-[3%] left-[2%] sm:left-[5%] z-20 animate-float-1">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#121118]/90 border border-[#8B5CF6]/40 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:border-[#8B5CF6] transition-all flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">AI Tutor</div>
              <div className="text-[10px] sm:text-xs text-[#A6A1B2]">Ask. Learn. Grow.</div>
            </div>
          </div>
        </div>

        {/* Node 2: Adaptive Learning (Top Right) */}
        <div className="absolute top-[3%] right-[2%] sm:right-[5%] z-20 animate-float-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#121118]/90 border border-[#C7FF4A]/40 backdrop-blur-md shadow-[0_0_20px_rgba(199,255,74,0.2)] hover:border-[#C7FF4A] transition-all flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C7FF4A]/15 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Adaptive Learning</div>
              <div className="text-[10px] sm:text-xs text-[#C7FF4A]">Personalized for you.</div>
            </div>
          </div>
        </div>

        {/* Node 3: Magic View (Middle Left) */}
        <div className="absolute top-[52%] left-[0%] sm:left-[2%] -translate-y-1/2 z-20 animate-float-3">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#121118]/90 border border-[#38BDF8]/40 backdrop-blur-md shadow-[0_0_20px_rgba(56,189,248,0.2)] hover:border-[#38BDF8] transition-all flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Magic View</div>
              <div className="text-[10px] sm:text-xs text-[#A6A1B2]">See the concept.</div>
            </div>
          </div>
        </div>

        {/* Node 4: Assessment (Middle Right) */}
        <div className="absolute top-[52%] right-[0%] sm:right-[2%] -translate-y-1/2 z-20 animate-float-1">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#121118]/90 border border-[#A855F7]/40 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:border-[#A855F7] transition-all flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#A855F7]/15 border border-[#A855F7]/30 flex items-center justify-center text-[#A855F7]">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Assessment</div>
              <div className="text-[10px] sm:text-xs text-[#A6A1B2]">Track your progress.</div>
            </div>
          </div>
        </div>

        {/* Node 5: Practice (Bottom Center) */}
        <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 z-20 animate-float-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#121118]/90 border border-[#C7FF4A]/40 backdrop-blur-md shadow-[0_0_20px_rgba(199,255,74,0.2)] hover:border-[#C7FF4A] transition-all flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C7FF4A]/15 border border-[#C7FF4A]/30 flex items-center justify-center text-[#C7FF4A]">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[#F7F5FA]">Practice</div>
              <div className="text-[10px] sm:text-xs text-[#C7FF4A]">Build real skills.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
