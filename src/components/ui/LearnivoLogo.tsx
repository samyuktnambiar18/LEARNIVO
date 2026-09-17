import React from 'react';
import logoImg from '../../assets/logo.png';

interface LearnivoLogoProps {
  size?: number; // Icon width/height in px
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export const LearnivoLogo: React.FC<LearnivoLogoProps> = ({
  size = 42,
  showWordmark = true,
  className = '',
  wordmarkClassName = ''
}) => {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Brand Symbol Badge */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden bg-[#0B0A0F] border border-[#C7FF4A]/40 shadow-[0_0_18px_rgba(199,255,74,0.3)] transition-all duration-300 hover:shadow-[0_0_24px_rgba(199,255,74,0.5)] hover:scale-105"
        style={{ width: size, height: size }}
      >
        <img
          src={logoImg}
          alt="LEARNIVO Symbol"
          className="w-full h-full object-contain p-0.5"
        />
      </div>

      {/* Brand Wordmark */}
      {showWordmark && (
        <span className={`font-extrabold tracking-tight flex items-center ${wordmarkClassName || 'text-xl'}`}>
          <span className="text-[#F7F5FA]">LEARN</span>
          <span className="text-[#C7FF4A]">IVO</span>
        </span>
      )}
    </div>
  );
};
