import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'lime' | 'violet' | 'pink' | 'neutral' | 'easy' | 'medium' | 'hard';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = ''
}) => {
  const variantStyles = {
    lime: 'bg-[#C7FF4A]/10 text-[#C7FF4A] border-rgba(199, 255, 74, 0.2)',
    violet: 'bg-[#8B5CF6]/15 text-[#a78bfa] border-[#8B5CF6]/30',
    pink: 'bg-[#FF6B9D]/15 text-[#ff8dae] border-[#FF6B9D]/30',
    neutral: 'bg-white/5 text-[#A6A1B2] border-white/10',
    easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
