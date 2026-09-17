import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { LearnivoLogo } from '../../components/ui/LearnivoLogo';
import { LearningCanvas } from '../../components/landing/LearningCanvas';
import { HowItWorks } from '../../components/landing/HowItWorks';
import { authService } from '../../services/auth/authService';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const handleStartLearning = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleGoToWorkspace = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-[#F7F5FA] flex flex-col justify-between selection:bg-[#C7FF4A] selection:text-[#08090D] relative overflow-hidden">
      
      {/* SUBTLE BACKGROUND EDUCATIONAL & FUTURISTIC OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle Coordinate Axis & Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '36px 36px'
          }}
        />

        {/* Ambient Top Glow Spheres */}
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-[#C7FF4A]/5 blur-[140px]" />
        <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full bg-[#8B5CF6]/10 blur-[150px]" />

        {/* Subtle Mathematical Equations Floating in Background */}
        <div className="absolute top-28 left-[8%] text-xs font-mono text-white/10 tracking-widest rotate-[-6deg]">
          a² + b² = c²
        </div>

        <div className="absolute top-44 right-[12%] text-xs font-mono text-[#C7FF4A]/15 tracking-widest rotate-[4deg]">
          ∫ x² dx = x³/3 + C
        </div>

        <div className="absolute top-[55%] left-[5%] text-xs font-mono text-[#8B5CF6]/15 tracking-widest rotate-[8deg]">
          x² + y² = r²
        </div>

        <div className="absolute top-[65%] right-[6%] text-xs font-mono text-[#38BDF8]/15 tracking-widest rotate-[-4deg]">
          ∇ × E = -∂B/∂t
        </div>

        <div className="absolute bottom-40 left-[18%] text-xs font-mono text-white/10 tracking-widest">
          f(x) = σ(Wᵀx + b)
        </div>

        {/* Geometric Diagrams & Sparkles */}
        <div className="absolute top-36 right-[25%] opacity-15">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <polygon points="20,5 35,35 5,35" stroke="#C7FF4A" strokeWidth="1" />
          </svg>
        </div>

        <div className="absolute top-[48%] left-[22%] opacity-15">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="12" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        <div className="absolute top-20 left-[45%] text-[#C7FF4A]/20 text-sm">✦</div>
        <div className="absolute bottom-60 right-[35%] text-[#8B5CF6]/20 text-xs">✦</div>
      </div>

      {/* LANDING PAGE CONTENT WRAPPER */}
      <div className="relative z-10">
        
        {/* NAVBAR */}
        <header className="h-20 border-b border-white/10 bg-[#08090D]/80 backdrop-blur-xl sticky top-0 z-50 px-6 md:px-12">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <LearnivoLogo size={36} wordmarkClassName="text-xl" />
            </Link>

            {/* Right Action Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoToWorkspace}
                className="bg-[#C7FF4A] text-[#08090D] font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(199,255,74,0.3)] hover:shadow-[0_0_25px_rgba(199,255,74,0.5)] hover:bg-[#d5ff6b] transition-all duration-300 inline-flex items-center gap-2 group cursor-pointer"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="pt-10 pb-16 md:pt-16 md:pb-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: HERO TEXT & CTA */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {/* AI-Powered Platform Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C7FF4A]/10 border border-[#C7FF4A]/30 text-xs font-semibold text-[#C7FF4A] tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                <span>✦ AI-Powered Learning Platform</span>
              </div>

              {/* Large Title with Lime VO */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none text-[#F7F5FA]">
                LEARNI<span className="text-[#C7FF4A] drop-shadow-[0_0_25px_rgba(199,255,74,0.4)]">VO</span>
              </h1>

              {/* Tagline Subtitle */}
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#F7F5FA]">
                Learn. Evolve. <span className="text-[#C7FF4A]">Excel.</span>
              </p>

              {/* Supporting Text */}
              <p className="text-sm sm:text-base md:text-lg text-[#A6A1B2] max-w-lg leading-relaxed font-normal">
                An intelligent learning workspace for mathematics, technical skills, practice, and personalized learning.
              </p>

              {/* Main CTA Button */}
              <div className="pt-4">
                <button
                  onClick={handleStartLearning}
                  className="bg-[#C7FF4A] text-[#08090D] font-extrabold text-sm sm:text-base px-8 py-4 rounded-full shadow-[0_0_25px_rgba(199,255,74,0.35)] hover:shadow-[0_0_35px_rgba(199,255,74,0.6)] hover:bg-[#d5ff6b] transition-all duration-300 inline-flex items-center gap-3 group cursor-pointer"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: INTELLIGENT LEARNING NETWORK VISUAL */}
            <div className="lg:col-span-6 w-full flex justify-center">
              <LearningCanvas />
            </div>

          </div>
        </section>

        {/* WORKFLOW ARCHITECTURE SECTION */}
        <HowItWorks />

      </div>

      {/* ABSTRACT CURVED GRADIENT WAVE AT BOTTOM */}
      <div className="w-full h-16 bg-gradient-to-t from-[#08090D] via-[#100F17] to-transparent pointer-events-none relative z-10" />

      {/* FOOTER */}
      <footer className="py-8 border-t border-white/5 text-center text-xs text-[#A6A1B2] relative z-10 bg-[#08090D]">
        <p>© {new Date().getFullYear()} LEARNIVO. All rights reserved.</p>
      </footer>

    </div>
  );
};
