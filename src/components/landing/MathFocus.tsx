import React from 'react';
import { Sigma, Binary, Network, LineChart } from 'lucide-react';

export const MathFocus: React.FC = () => {
  const features = [
    {
      icon: Sigma,
      title: 'Calculus & Analysis',
      desc: 'Step-by-step breakdown of differentiation, integration, series, and differential equations.'
    },
    {
      icon: Binary,
      title: 'Linear Algebra',
      desc: 'Vector spaces, matrix decompositions, eigenvalues, and geometric transformations.'
    },
    {
      icon: Network,
      title: 'Discrete Mathematics',
      desc: 'Graph theory, combinatorics, logic, set theory, and formal proof verification.'
    },
    {
      icon: LineChart,
      title: 'Probability & Statistics',
      desc: 'Probability distributions, hypothesis testing, Bayesian analysis, and stochastic processes.'
    }
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <span className="text-xs font-semibold tracking-widest text-[#8B5CF6] uppercase mb-3 block">
              Core Discipline
            </span>
            <h2 className="text-3xl font-bold text-[#F7F5FA] tracking-tight mb-4">
              Rigorous Mathematical Mastery
            </h2>
            <p className="text-sm text-[#A6A1B2] leading-relaxed mb-6">
              Designed specifically for engineering, computer science, and data science students needing high precision in mathematical reasoning.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="surface-card p-5 border-l-2 border-l-[#8B5CF6]">
                  <Icon className="w-6 h-6 text-[#8B5CF6] mb-3" />
                  <h3 className="text-sm font-semibold text-[#F7F5FA] mb-1.5">{item.title}</h3>
                  <p className="text-xs text-[#A6A1B2] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
