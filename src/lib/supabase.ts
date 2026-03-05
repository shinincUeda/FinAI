import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// URLとKeyが設定されている場合のみ有効とする
export const isSupabaseEnabled =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== 'https://xxxxxxxxxxxx.supabase.co' &&
  supabaseAnonKey !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxx';

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  })
  : null;
