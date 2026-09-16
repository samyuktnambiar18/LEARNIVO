import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  accentBorder?: 'none' | 'lime' | 'violet' | 'pink';
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  accentBorder = 'none',
  className = '',
  ...props
}) => {
  const accentClasses = {
    none: '',
    lime: 'border-l-2 border-l-[#C7FF4A]',
    violet: 'border-l-2 border-l-[#8B5CF6]',
    pink: 'border-l-2 border-l-[#FF6B9D]',
  };

  return (
    <div
      className={`surface-card p-6 ${hoverable ? 'surface-card-hover cursor-pointer' : ''} ${accentClasses[accentBorder]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
