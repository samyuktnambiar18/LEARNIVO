import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LearnivoLogo } from '../../components/ui/LearnivoLogo';
import { LearningCanvas } from '../../components/landing/LearningCanvas';
import { HowItWorks } from '../../components/landing/HowItWorks';
import { authService } from '../../services/auth/authService';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const handleStartLearning = () => {
    if (currentUser) {
      navigate('/pages/student-dashboard.html');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0A0F] text-[#F7F5FA] flex flex-col justify-between">
      <div>
        {/* Top Navbar */}
        <header className="h-20 border-b border-white/10 px-6 md:px-12 flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-3">
            <LearnivoLogo size={36} wordmarkClassName="text-xl" />
          </Link>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <Button variant="primary" onClick={() => navigate('/pages/student-dashboard.html')}>
                Go to Workspace
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-[#A6A1B2] hover:text-white transition-colors px-3 py-2">
                  Sign In
                </Link>
                <Button variant="primary" onClick={() => navigate('/signup')}>
                  Start Learning
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="pt-16 pb-20 px-6 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#C7FF4A] mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intelligent Learning Workspace</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-[#F7F5FA] tracking-tight mb-4">
            LEARNIVO
          </h1>

          <p className="text-xl md:text-2xl font-medium text-[#C7FF4A] tracking-wide mb-6">
            Learn. Evolve. Excel.
          </p>

          <p className="text-base md:text-lg text-[#A6A1B2] max-w-2xl mx-auto leading-relaxed mb-10">
            An intelligent learning workspace for mathematics, technical skills, practice, and personalized learning.
          </p>

          <div className="flex justify-center mb-16">
            <Button variant="primary" size="lg" onClick={handleStartLearning}>
              <span>Start Learning</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          {/* Abstract Learning Visual */}
          <div className="max-w-4xl mx-auto">
            <LearningCanvas />
          </div>
        </section>

        {/* Workflow Architecture */}
        <HowItWorks />
      </div>

      {/* Clean Restrained Minimal Footer */}
      <footer className="py-8 border-t border-white/5 text-center text-xs text-[#A6A1B2] mt-12">
        <p>© {new Date().getFullYear()} LEARNIVO. All rights reserved.</p>
      </footer>
    </div>
  );
};
