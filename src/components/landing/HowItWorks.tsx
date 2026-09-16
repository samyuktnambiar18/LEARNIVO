import React from 'react';
import { Upload, Cpu, CheckCircle2, TrendingUp } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Ingest Material',
      description: 'Upload PDF lecture notes, textbooks, or technical guides. LEARNIVO parses key topics and chapter structures.',
      icon: Upload,
      accent: '#C7FF4A'
    },
    {
      num: '02',
      title: 'AI Tutoring & Synthesis',
      description: 'Interact with an intelligent assistant equipped with full document context to clarify complex proofs and concepts.',
      icon: Cpu,
      accent: '#8B5CF6'
    },
    {
      num: '03',
      title: 'Targeted Practice',
      description: 'Attempt dynamically structured problem sets with hints, detailed solutions, and difficulty adaptivity.',
      icon: CheckCircle2,
      accent: '#FF6B9D'
    },
    {
      num: '04',
      title: 'Performance Analysis',
      description: 'Track mastery across mathematical and technical domains with evidence-based diagnostic evaluation.',
      icon: TrendingUp,
      accent: '#C7FF4A'
    },
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold tracking-widest text-[#C7FF4A] uppercase mb-3">
            Workflow Architecture
          </h2>
          <p className="text-3xl font-bold text-[#F7F5FA] tracking-tight">
            How LEARNIVO Drives Learning Excellence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="surface-card p-6 relative group hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-2xl font-mono font-semibold text-white/30">{step.num}</span>
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[#F7F5FA]">
                    <Icon className="w-5 h-5" style={{ color: step.accent }} />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-[#F7F5FA] mb-2">{step.title}</h3>
                <p className="text-xs text-[#A6A1B2] leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
