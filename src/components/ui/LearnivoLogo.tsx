import React from 'react';
import logoImg from '../../assets/logo.png';

interface LearnivoLogoProps {
  size?: number; // Icon width/height in px
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export const LearnivoLogo: React.FC<LearnivoLogoProps> = ({
  size = 36,
  showWordmark = true,
  className = '',
  wordmarkClassName = ''
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon Badge */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-[0_0_15px_rgba(199,255,74,0.25)] transition-all duration-300 hover:shadow-[0_0_22px_rgba(199,255,74,0.4)] hover:scale-105"
        style={{ width: size, height: size }}
      >
        <img
          src={logoImg}
          alt="LEARNIVO Logo"
          className="w-full h-full object-cover rounded-xl"
        />
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <span className={`font-bold tracking-tight flex items-center ${wordmarkClassName || 'text-xl'}`}>
          <span className="text-[#F7F5FA]">LEARN</span>
          <span className="text-[#C7FF4A]">IVO</span>
        </span>
      )}
    </div>
  );
};
