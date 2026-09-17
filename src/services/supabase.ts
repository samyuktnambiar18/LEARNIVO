import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmfxzzfopfeaqajgfipe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_I2L5Z6YWuVEPCO_eHW2bfA_-0dygSEk';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Supabase environment variables missing from import.meta.env. Using default client settings.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);