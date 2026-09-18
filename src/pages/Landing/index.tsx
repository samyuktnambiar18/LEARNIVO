import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
      
      {/* SUBTLE PREMIUM AMBIENT GLOW BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-[#C7FF4A]/5 blur-[140px]" />
        <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full bg-[#8B5CF6]/10 blur-[150px]" />
      </div>

      {/* LANDING PAGE CONTENT WRAPPER */}
      <div className="relative z-10">
        
        {/* NAVBAR */}
        <header className="h-20 border-b border-white/10 bg-[#08090D]/80 backdrop-blur-xl sticky top-0 z-50 px-6 md:px-12">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <LearnivoLogo size={36} wordmarkClassName="text-xl font-bold" />
            </Link>

            {/* Right Action Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoToWorkspace}
                className="bg-[#C7FF4A] text-[#08090D] font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(199,255,74,0.4)] hover:shadow-[0_0_30px_rgba(199,255,74,0.6)] hover:bg-[#b8f533] transition-all duration-300 inline-flex items-center gap-2 group cursor-pointer"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="pt-10 pb-16 md:pt-16 md:pb-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
            
            {/* LEFT COLUMN: HERO TEXT & CTA */}
            <div className="lg:col-span-6 space-y-6 text-left pr-0 lg:pr-4">
              
              {/* Eyebrow */}
              <div className="text-[11px] font-mono font-semibold tracking-[0.25em] text-[#C7FF4A]/80 uppercase mb-2">
                A I   L E A R N I N G   W O R K S P A C E
              </div>

              {/* Main Wordmark Heading */}
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none text-white">
                LEARN<span className="text-[#C7FF4A] drop-shadow-[0_0_30px_rgba(199,255,74,0.3)]">IVO</span>
              </h1>

              {/* Single Short Description */}
              <p className="text-sm sm:text-base md:text-lg text-[#A6A1B2] max-w-md leading-relaxed font-normal">
                An intelligent workspace for learning, practice, and personalized study.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleStartLearning}
                  className="bg-[#C7FF4A] text-[#08090D] font-black text-sm sm:text-base px-8 py-3.5 rounded-full shadow-[0_0_25px_rgba(199,255,74,0.4)] hover:shadow-[0_0_35px_rgba(199,255,74,0.7)] hover:bg-[#b8f533] transition-all duration-300 inline-flex items-center gap-2.5 group cursor-pointer"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>

                <button
                  onClick={handleGoToWorkspace}
                  className="bg-transparent border border-white/20 text-white font-bold text-sm sm:text-base px-8 py-3.5 rounded-full hover:border-white/40 hover:bg-white/5 transition-all duration-300 cursor-pointer"
                >
                  Explore Workspace
                </button>
              </div>

              {/* Bottom Left Quote / Subtext */}
              <div className="pt-6">
                <div className="border-l border-white/20 pl-4 py-0.5 text-xs text-[#A6A1B2] leading-tight font-medium space-y-0.5">
                  <div>Knowledge</div>
                  <div>moves with you.</div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: PRODUCT VISUAL (50% Hero Width) */}
            <div className="lg:col-span-6 w-full flex justify-center">
              <LearningCanvas />
            </div>

          </div>
        </section>

        {/* WORKFLOW ARCHITECTURE SECTION */}
        <HowItWorks />

      </div>

      {/* FOOTER */}
      <footer className="py-8 border-t border-white/5 text-center text-xs text-[#A6A1B2] relative z-10 bg-[#08090D]">
        <p>© {new Date().getFullYear()} LEARNIVO. All rights reserved.</p>
      </footer>

    </div>
  );
};
