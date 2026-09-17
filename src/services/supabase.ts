import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultUrl = 'https://hmfxzzfopfeaqajgfipe.supabase.co';
const defaultKey = typeof atob === 'function' 
  ? atob('c2Jfc2VjcmV0X3B3SGVNc3J2b1lvb3B6aDBkb1RpVlFfcVJSd0cyajk=') 
  : '';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_SECRET_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || defaultKey;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);