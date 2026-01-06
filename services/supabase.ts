
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://vhhqfubwjbwvmaijxzxz.supabase.co';

// ACHTUNG: Der Key MUSS mit 'eyJ' beginnen! 
// Kopiere ihn aus deinem Supabase Dashboard unter Settings -> API -> anon public
export const SUPABASE_ANON_KEY = 'sb_publishable_a6vMvY35dWfRL3lw3q1rgA_lm-TGLn4'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
