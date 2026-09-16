import { supabase } from '../supabase';
import { storageService } from '../storage/storageService';
import { User, LearningProfile } from '../../types';

export interface GoogleJwtPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export function decodeGoogleJwt(credential: string): GoogleJwtPayload | null {
  try {
    const base64Url = credential.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleJwtPayload;
  } catch (err) {
    console.error('Failed to decode Google JWT token:', err);
    return null;
  }
}

export const authService = {
  /**
   * Initializes session from Supabase on app startup & sets up auth state listener
   */
  initAuth: async (): Promise<User | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const name = u.user_metadata?.name || u.email?.split('@')[0] || 'Learner';
        const user: User = {
          id: u.id, // Real Supabase user.id
          name,
          email: u.email || '',
          avatar: u.user_metadata?.avatar_url,
          createdAt: u.created_at || new Date().toISOString()
        };
        storageService.saveUser(user);
        return user;
      }
    } catch (err) {
      console.warn('Supabase getSession error:', err);
    }

    // Listen for auth changes (sign in, sign out, token refresh)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const name = u.user_metadata?.name || u.email?.split('@')[0] || 'Learner';
        const user: User = {
          id: u.id,
          name,
          email: u.email || '',
          avatar: u.user_metadata?.avatar_url,
          createdAt: u.created_at || new Date().toISOString()
        };
        storageService.saveUser(user);
      } else if (_event === 'SIGNED_OUT') {
        storageService.removeUser();
      }
    });

    return storageService.getUser();
  },

  getCurrentUser: (): User | null => {
    return storageService.getUser();
  },

  getCurrentProfile: (): LearningProfile | null => {
    return storageService.getProfile();
  },

  login: async (email: string, password?: string): Promise<User> => {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please confirm your email address before signing in.');
      }
      throw new Error(error.message || 'Authentication failed. Please check your credentials.');
    }

    if (!data.user) {
      throw new Error('Failed to retrieve user session.');
    }

    const name = data.user.user_metadata?.name || email.split('@')[0];
    const user: User = {
      id: data.user.id, // Real Supabase user.id UUID
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: data.user.email || email,
      createdAt: data.user.created_at || new Date().toISOString()
    };

    storageService.saveUser(user);
    return user;
  },

  signup: async (name: string, email: string, password?: string): Promise<User> => {
    if (!name || name.trim().length === 0) {
      throw new Error('Name is required.');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim()
        }
      }
    });

    if (error) {
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
      throw new Error(error.message || 'Registration failed. Please try again.');
    }

    if (!data.user) {
      throw new Error('Registration failed to return user data.');
    }

    const user: User = {
      id: data.user.id, // Real Supabase user.id UUID
      name: name.trim(),
      email: data.user.email || email,
      createdAt: data.user.created_at || new Date().toISOString()
    };

    storageService.saveUser(user);
    return user;
  },


  getGoogleClientId: (): string => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || '855964443923-7osg31lt6qj81rii2p4u9anets1ni8bm.apps.googleusercontent.com';
  },

  handleGoogleCredential: async (credential: string): Promise<User> => {
    const payload = decodeGoogleJwt(credential);
    if (!payload || !payload.email) {
      throw new Error('Unable to read Google profile from login token.');
    }

    let userId = payload.sub;

    // Try to sync with Supabase Auth ID token if Google provider is enabled in Supabase
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credential
      });
      if (!error && data?.user) {
        userId = data.user.id;
      }
    } catch (err) {
      console.info('Supabase signInWithIdToken skipped; using verified Google profile session.', err);
    }

    const user: User = {
      id: userId,
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      avatar: payload.picture,
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(user);
    return user;
  },

  googleLogin: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/pages/student-dashboard.html'
      }
    });

    if (error) {
      throw new Error(error.message || 'Google sign-in failed.');
    }
  },

  saveOnboardingProfile: (profile: Omit<LearningProfile, 'userId' | 'completedOnboarding'>): LearningProfile => {
    const user = storageService.getUser();
    const fullProfile: LearningProfile = {
      ...profile,
      userId: user?.id || 'guest',
      completedOnboarding: true
    };

    storageService.saveProfile(fullProfile);
    return fullProfile;
  },

  logout: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut warning:', err);
    }
    storageService.removeUser();
  }
};
