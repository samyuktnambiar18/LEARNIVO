import React from 'react';

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
        className="relative flex-shrink-0 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(199,255,74,0.25)] transition-shadow duration-300 hover:shadow-[0_0_22px_rgba(199,255,74,0.4)]"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Rounded Square Neon Lime Container */}
          <rect x="2" y="2" width="96" height="96" rx="26" fill="#C7FF4A" />

          {/* Stylized Dark Internal 'L' Symbol */}
          <path
            d="M 28 22 C 28 22, 46 22, 46 38 L 46 56 C 46 68, 54 75, 74 75 C 74 75, 74 58, 60 58 C 48 58, 46 50, 46 38 L 46 22 Z"
            fill="#0B0A0F"
          />

          {/* 4-Point Knowledge Sparkle Star in Top-Right Quadrant */}
          <path
            d="M 68 24 C 68 30, 70 32, 76 32 C 70 32, 68 34, 68 40 C 68 34, 66 32, 60 32 C 66 32, 68 30, 68 24 Z"
            fill="#0B0A0F"
          />
        </svg>
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
