import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authService } from '../../services/auth/authService';
import { Button } from '../../components/ui/Button';
import { LearnivoLogo } from '../../components/ui/LearnivoLogo';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { User } from '../../types';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.signup(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to create account.');
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (_user: User) => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0B0A0F] flex items-center justify-center p-6 text-[#F7F5FA]">
      <div className="w-full max-w-md surface-card p-8 border border-white/10 rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center">
            <LearnivoLogo size={36} wordmarkClassName="text-xl" />
          </Link>
          <h2 className="text-xl font-bold text-[#F7F5FA]">Create Learning Workspace Account</h2>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#A6A1B2] mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#6E6A78] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-[#181620] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
              />
            </div>
          </div>

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
            <label className="block text-xs font-medium text-[#A6A1B2] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6E6A78] absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181620] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-[#6E6A78] hover:text-[#A6A1B2]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A6A1B2] mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6E6A78] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181620] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#F7F5FA] placeholder-[#6E6A78] focus:outline-none focus:border-[#C7FF4A]"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#121118] px-3 text-[11px] text-[#A6A1B2] absolute">OR</span>
        </div>

        <GoogleSignInButton
          mode="signup"
          onSuccess={handleGoogleSuccess}
          onError={(msg) => setError(msg)}
        />

        <p className="text-center text-xs text-[#A6A1B2]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#C7FF4A] font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
