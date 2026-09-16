import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`surface-card p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto ${className}`}>
      <div className="w-14 h-14 rounded-full bg-[#181620] border border-white/10 flex items-center justify-center mb-5 text-[#C7FF4A]">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-xl font-semibold text-[#F7F5FA] mb-2">{title}</h3>
      <p className="text-sm text-[#A6A1B2] max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
