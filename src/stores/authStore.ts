import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

interface AuthState {
  user: User | null;
  /** 初期セッション確認中は true */
  loading: boolean;
  /** ログイン操作のエラーメッセージ */
  error: string | null;
  /** Magic Link 送信済みフラグ */
  emailSent: boolean;
  setUser: (user: User | null) => void;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  emailSent: false,

  setUser: (user) => set({ user }),

  signInWithEmail: async (email: string) => {
    if (!supabase) return;
    set({ error: null, emailSent: false });

    // 許可されたメールアドレスのチェック
    const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS || '';
    if (allowedEmailsStr) {
      const allowedEmails = allowedEmailsStr.split(',').map((e: string) => e.trim().toLowerCase());
      if (!allowedEmails.includes(email.toLowerCase())) {
        set({ error: 'このメールアドレスはログインを許可されていません。' });
        return;
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      // データベース（トリガー）側で制限された場合のエラーメッセージ等を考慮
      if (error.message.includes('permission') || error.message.includes('allowed')) {
        set({ error: 'このメールアドレスは登録されていないか、ログインが許可されていません。' });
      } else {
        set({ error: error.message });
      }
    } else {
      set({ emailSent: true });
    }
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, emailSent: false });
  },
}));

/**
 * アプリ起動時に一度だけ呼び出す。
 * Supabase が無効な場合は loading を即座に false にして終了。
 */
export function initAuth(onAuthenticated: () => void) {
  if (!isSupabaseEnabled || !supabase) {
    useAuthStore.setState({ loading: false, user: null });
    return;
  }

  // 現在のセッションを確認
  supabase.auth.getSession().then(({ data: { session } }) => {
    const user = session?.user ?? null;
    useAuthStore.setState({ user, loading: false });
    if (user) onAuthenticated();
  });

  // 以降の認証状態変化（Magic Link クリック等）を監視
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    const prev = useAuthStore.getState().user;
    useAuthStore.setState({ user });
    // 未ログイン → ログイン に変わった時のみコールバック実行
    if (!prev && user) onAuthenticated();
  });
}
