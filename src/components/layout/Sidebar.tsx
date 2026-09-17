import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BrainCircuit,
  BarChart3,
  MessageSquareCode,
  FileCheck2,
  FolderOpen,
  Settings,
  Upload,
  LogOut,
  Sparkles
} from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { LearnivoLogo } from '../ui/LearnivoLogo';

interface SidebarProps {
  onLogout?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, className = '' }) => {
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      altPaths: ['/pages/student-dashboard.html'],
      icon: LayoutDashboard
    },
    {
      label: 'Practice',
      path: '/practice',
      altPaths: ['/pages/practice.html'],
      icon: BrainCircuit
    },
    {
      label: 'Progress',
      path: '/progress',
      altPaths: ['/pages/progress.html'],
      icon: BarChart3
    },
    {
      label: 'AI Tutor',
      path: '/ai-tutor',
      altPaths: ['/chat', '/pages/chat.html'],
      icon: MessageSquareCode
    },
    {
      label: 'Assessment',
      path: '/assessment',
      altPaths: ['/test', '/pages/test.html'],
      icon: FileCheck2
    },
    {
      label: 'Materials',
      path: '/materials',
      altPaths: ['/courses', '/upload'],
      icon: FolderOpen
    },
    {
      label: 'Settings',
      path: '/settings',
      altPaths: ['/pages/settings.html'],
      icon: Settings
    },
  ];

  const isItemActive = (path: string, altPaths: string[]) => {
    const current = location.pathname;
    return current === path || altPaths.includes(current);
  };

  return (
    <aside className={`w-64 bg-[#121118] border-r border-white/10 flex flex-col h-screen sticky top-0 z-30 select-none ${className}`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3">
          <LearnivoLogo size={32} wordmarkClassName="text-lg" />
        </NavLink>
      </div>

      {/* Upload Quick CTA */}
      <div className="px-4 pt-5 pb-2">
        <NavLink
          to="/upload"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#C7FF4A]/10 text-[#C7FF4A] border border-[#C7FF4A]/20 hover:bg-[#C7FF4A]/20 text-xs font-semibold tracking-wide transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Material</span>
        </NavLink>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isItemActive(item.path, item.altPaths);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[#181620] text-[#C7FF4A] border-l-2 border-[#C7FF4A]'
                  : 'text-[#A6A1B2] hover:text-[#F7F5FA] hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#C7FF4A]' : 'text-[#6E6A78]'}`} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile / Logout */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => {
            authService.logout();
            if (onLogout) onLogout();
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[#A6A1B2] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
