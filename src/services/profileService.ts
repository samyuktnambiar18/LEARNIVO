import { supabase } from './supabase';

export interface UserProfileData {
  id?: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  college?: string;
  department?: string;
  year?: string;
  bio?: string;
  focus_area?: string;
  level?: string;
  daily_target_minutes?: number;
  preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const profileService = {
  /**
   * Fetch profile for current authenticated user
   */
  getProfile: async (): Promise<UserProfileData | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return null;

      const userId = userData.user.id;

      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as UserProfileData;
      }

      // Return basic user info from auth user if no profile row yet
      return {
        user_id: userId,
        full_name: userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'Student',
        email: userData.user.email || '',
        focus_area: 'Mathematics',
        level: 'Intermediate',
        daily_target_minutes: 30
      };
    } catch (err) {
      console.warn('Error fetching profile from Supabase:', err);
      return null;
    }
  },

  /**
   * Save or update profile for current authenticated user
   */
  saveProfile: async (profileData: Partial<UserProfileData>): Promise<UserProfileData | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        console.warn('saveProfile error: User is not authenticated.');
        return null;
      }

      const userId = userData.user.id;
      const payload = {
        ...profileData,
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profile')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.warn('Supabase profile upsert note:', error.message);
        return null;
      }

      return data as UserProfileData;
    } catch (err) {
      console.warn('Exception updating profile in Supabase:', err);
      return null;
    }
  }
};
