import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase クライアント。
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が未設定の場合は null。
 * isSupabaseEnabled で有効判定してから使用すること。
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseEnabled = !!supabaseUrl && !!supabaseAnonKey;
