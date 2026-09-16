import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, X, User as UserIcon, Upload, Sparkles } from 'lucide-react';
import { storageService } from '../../services/storage/storageService';

interface HeaderProps {
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle, isMobileMenuOpen }) => {
  const location = useLocation();
  const user = storageService.getUser();
  const profile = storageService.getProfile();

  const getTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Learning Workspace';
    if (path.includes('practice')) return 'Interactive Practice';
    if (path.includes('progress')) return 'Performance & Analytics';
    if (path.includes('chat')) return 'AI Tutor';
    if (path.includes('test') || path.includes('assessment')) return 'Evaluation & Assessment';
    if (path.includes('upload')) return 'Upload Material';
    if (path.includes('materials')) return 'Learning Materials';
    if (path.includes('settings')) return 'Settings';
    return 'Workspace';
  };

  return (
    <header className="h-16 border-b border-white/10 bg-[#0B0A0F]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden text-[#A6A1B2] hover:text-white p-1 rounded-md"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[#F7F5FA]">{getTitle()}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {profile?.focusArea && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#8B5CF6]/15 text-[#a78bfa] border border-[#8B5CF6]/30">
            <Sparkles className="w-3 h-3 text-[#C7FF4A]" />
            {profile.focusArea}
          </span>
        )}

        <Link
          to="/upload"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 text-[#F7F5FA] transition-all"
        >
          <Upload className="w-3.5 h-3.5 text-[#C7FF4A]" />
          <span>Upload PDF</span>
        </Link>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-[#181620] border border-white/15 flex items-center justify-center text-[#C7FF4A] text-xs font-semibold overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
            ) : user?.name ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-4 h-4 text-[#A6A1B2]" />
            )}
          </div>
          <span className="hidden lg:inline text-xs font-medium text-[#F7F5FA]">
            {user?.name || 'Learner'}
          </span>
        </div>
      </div>
    </header>
  );
};
