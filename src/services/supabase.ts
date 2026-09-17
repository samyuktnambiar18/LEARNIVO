import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmfxzzfopfeaqajgfipe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_jfMlKTao2OnuWm5SHgDurQ_xojEIJSd';
const supabaseSecretKey = import.meta.env.VITE_SUPABASE_SECRET_KEY || supabaseKey;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);
export const supabaseSecret: SupabaseClient = createClient(supabaseUrl, supabaseSecretKey);