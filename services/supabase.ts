
import { createClient } from '@supabase/supabase-js';

// DEINE PROJEKT-URL
export const SUPABASE_URL = 'https://vhhqfubwjbwvmaijxzxz.supabase.co';

// Dein Key
export const SUPABASE_ANON_KEY = 'sb_publishable_mmM60DulSzH7YyXx04uZlw_YDlGZ'; 

// Client-Initialisierung mit Standard-Einstellungen für Web-Apps
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
