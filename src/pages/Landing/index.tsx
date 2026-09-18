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
                className="bg-[#C7FF4A] text-[#08090D] font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(199,255,74,0.3)] hover:shadow-[0_0_30px_rgba(199,255,74,0.5)] hover:bg-[#b8f533] transition-all duration-300 inline-flex items-center gap-2 group cursor-pointer"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="pt-12 pb-20 md:pt-20 md:pb-28 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: HERO TEXT & CTA */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {/* Subtle Eyebrow */}
              <div className="text-xs font-mono font-bold tracking-widest text-[#C7FF4A]/80 uppercase">
                AI LEARNING WORKSPACE
              </div>

              {/* Main Wordmark Heading */}
              <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none text-[#F7F5FA]">
                LEARNI<span className="text-[#C7FF4A]">VO</span>
              </h1>

              {/* Single Short Description */}
              <p className="text-base sm:text-lg md:text-xl text-[#A6A1B2] max-w-lg leading-relaxed font-normal">
                An intelligent workspace for learning, practice, and personalized study.
              </p>

              {/* Proportional Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleStartLearning}
                  className="bg-[#C7FF4A] text-[#08090D] font-extrabold text-sm sm:text-base px-8 py-3.5 rounded-full shadow-[0_0_25px_rgba(199,255,74,0.35)] hover:shadow-[0_0_35px_rgba(199,255,74,0.6)] hover:bg-[#b8f533] transition-all duration-300 inline-flex items-center gap-2.5 group cursor-pointer"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </button>

                <button
                  onClick={handleGoToWorkspace}
                  className="bg-white/5 border border-white/10 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                >
                  Explore Workspace
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: PRODUCT VISUAL (~45-50% Hero Width) */}
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
