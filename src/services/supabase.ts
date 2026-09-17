import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hmfxzzfopfeaqajgfipe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_jfMlKTao2OnuWm5SHgDurQ_xojEIJSd';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);