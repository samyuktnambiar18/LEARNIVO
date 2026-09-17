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
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || '1038478166086-cegsniu6uj5nnc4kk69elej0ip8h1efq.apps.googleusercontent.com';
  },

  handleGoogleCredential: async (credential: string): Promise<User> => {
    const payload = decodeGoogleJwt(credential);
    if (!payload || !payload.email) {
      throw new Error('Unable to read Google profile from login token.');
    }

    const user: User = {
      id: payload.sub || 'google_' + Date.now(),
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      avatar: payload.picture || 'https://lh3.googleusercontent.com/a/default-user',
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(user);
    return user;
  },

  /**
   * Fetch Google user profile directly from Google UserInfo API using Access Token
   */
  loginWithGoogleAccessToken: async (accessToken: string): Promise<User> => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      throw new Error('Failed to retrieve user profile from Google UserInfo API.');
    }

    const data = await res.json();
    const user: User = {
      id: data.sub || 'google_' + Date.now(),
      name: data.name || data.given_name || data.email.split('@')[0],
      email: data.email,
      avatar: data.picture || 'https://lh3.googleusercontent.com/a/default-user',
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(user);
    return user;
  },

  /**
   * Direct Google OAuth 2.0 Authorization Endpoint (No Supabase involved)
   */
  googleLoginDirect: (): void => {
    const clientId = authService.getGoogleClientId();
    const redirectUri = window.location.origin;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token id_token',
      scope: 'email profile openid',
      prompt: 'select_account',
      nonce: Math.random().toString(36).substring(2)
    }).toString();

    window.location.href = googleAuthUrl;
  },

  /**
   * Parse ID token or Access Token from Google redirect hash (#id_token=...)
   */
  checkAndHandleGoogleHashRedirect: (): User | null => {
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('id_token=')) return null;

      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const idToken = params.get('id_token');
      if (!idToken) return null;

      const payload = decodeGoogleJwt(idToken);
      if (!payload || !payload.email) return null;

      const user: User = {
        id: payload.sub || 'google_' + Date.now(),
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        avatar: payload.picture || 'https://lh3.googleusercontent.com/a/default-user',
        createdAt: new Date().toISOString()
      };

      storageService.saveUser(user);
      // Clean URL hash
      window.history.replaceState(null, '', window.location.pathname);
      return user;
    } catch (err) {
      console.warn('Failed to parse Google OAuth hash token:', err);
      return null;
    }
  },

  loginWithGoogleEmail: (email: string, name?: string): User => {
    const cleanEmail = email.trim();
    const displayName = name || cleanEmail.split('@')[0];
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    
    const user: User = {
      id: 'google_' + Math.random().toString(36).substring(2, 11),
      name: formattedName,
      email: cleanEmail,
      avatar: 'https://lh3.googleusercontent.com/a/default-user',
      createdAt: new Date().toISOString()
    };

    storageService.saveUser(user);
    return user;
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
