import React from 'react';
import { Code2, Cpu, Database, ShieldCheck } from 'lucide-react';

export const TechnicalSkills: React.FC = () => {
  const domains = [
    {
      icon: Code2,
      title: 'Algorithms & Data Structures',
      desc: 'Trees, graphs, dynamic programming, space-time complexity analysis, and algorithmic optimization.'
    },
    {
      icon: Cpu,
      title: 'Systems & Architecture',
      desc: 'Operating systems principles, computer organization, concurrency, and memory management.'
    },
    {
      icon: Database,
      title: 'Database & Data Systems',
      desc: 'Relational algebra, SQL query execution plans, indexing strategies, and distributed storage.'
    },
    {
      icon: ShieldCheck,
      title: 'Artificial Intelligence & ML',
      desc: 'Neural networks, optimization techniques, loss functions, and machine learning pipelines.'
    }
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 order-2 lg:order-1">
            {domains.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="surface-card p-5 border-l-2 border-l-[#C7FF4A]">
                  <Icon className="w-6 h-6 text-[#C7FF4A] mb-3" />
                  <h3 className="text-sm font-semibold text-[#F7F5FA] mb-1.5">{item.title}</h3>
                  <p className="text-xs text-[#A6A1B2] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2">
            <span className="text-xs font-semibold tracking-widest text-[#C7FF4A] uppercase mb-3 block">
              Applied Engineering
            </span>
            <h2 className="text-3xl font-bold text-[#F7F5FA] tracking-tight mb-4">
              Technical & Software Engineering Competencies
            </h2>
            <p className="text-sm text-[#A6A1B2] leading-relaxed">
              Bridge theoretical computer science with practical system design through contextual PDF uploads, practice questions, and AI tutoring.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
