import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { Button } from '../../components/ui/Button';
import { LearnivoLogo } from '../../components/ui/LearnivoLogo';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { User } from '../../types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const googleUser = authService.checkAndHandleGoogleHashRedirect();
    if (googleUser) {
      handleGoogleSuccess(googleUser);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.login(email, password);
      const profile = authService.getCurrentProfile();
      if (!profile || !profile.completedOnboarding) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (_user: User) => {
    const profile = authService.getCurrentProfile();
    if (!profile || !profile.completedOnboarding) {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0A0F] flex items-center justify-center p-6 text-[#F7F5FA]">
      <div className="w-full max-w-md surface-card p-8 border border-white/10 rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center">
            <LearnivoLogo size={36} wordmarkClassName="text-xl" />
          </Link>
          <h2 className="text-xl font-bold text-[#F7F5FA]">Sign In to Workspace</h2>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A6A1B2] mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6E6A78] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-[#181620] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#A6A1B2]">Password</label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset email sent.'); }} className="text-xs text-[#C7FF4A] hover:underline">
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6E6A78] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181620] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#121118] px-3 text-[11px] text-[#A6A1B2] absolute">OR</span>
        </div>

        <GoogleSignInButton
          mode="continue"
          onSuccess={handleGoogleSuccess}
          onError={(msg) => setError(msg)}
        />

        <p className="text-center text-xs text-[#A6A1B2]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#C7FF4A] font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};
