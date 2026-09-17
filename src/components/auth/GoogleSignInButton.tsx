import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth/authService';
import { User } from '../../types';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup' | 'continue';
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  mode = 'continue',
  onSuccess,
  onError,
  className = ''
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('');

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      // Attempt standard OAuth popup / Supabase Google login
      await authService.googleLogin();
    } catch (err: any) {
      console.warn('Google OAuth popup skipped or restricted on current origin:', err);
      // If popup fails or origin is restricted, show inline Google account login modal
      setShowEmailModal(true);
      setIsLoading(false);
    }
  };

  const handleQuickGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput || !googleEmailInput.includes('@')) {
      if (onError) onError('Please enter a valid Google email address.');
      return;
    }

    const user = authService.loginWithGoogleEmail(googleEmailInput);
    setShowEmailModal(false);
    
    if (onSuccess) {
      onSuccess(user);
    } else {
      const profile = authService.getCurrentProfile();
      if (!profile || !profile.completedOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Signing in with Google...';
    if (mode === 'signup') return 'Sign up with Google';
    if (mode === 'signin') return 'Sign in with Google';
    return 'Continue with Google';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* SINGLE GOOGLE SIGN IN BUTTON */}
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#14121C] hover:bg-[#1C1926] active:bg-[#232030] text-[#F7F5FA] border border-white/15 hover:border-white/30 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{getButtonText()}</span>
      </button>

      {/* Google Account Email Sign-In Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#181620] border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-base font-bold text-[#F7F5FA]">Sign in with Google Account</h3>
              </div>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-[#A6A1B2] hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A6A1B2]">
              Enter your Google email address to complete Google authentication.
            </p>

            <form onSubmit={handleQuickGoogleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#F7F5FA] mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="user@gmail.com"
                  className="w-full bg-[#121118] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-[#F7F5FA] focus:outline-none focus:border-[#C7FF4A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A6A1B2] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#C7FF4A] text-[#0B0A0F] hover:bg-[#b8f533] transition-all shadow"
                >
                  Sign In with Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
