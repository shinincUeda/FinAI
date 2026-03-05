/**
 * クラウド同期モジュール（Supabase）
 *
 * isSupabaseEnabled が true の場合のみ動作する。
 * 起動時: Supabase から全データを取得し Zustand ストアに反映
 * 変更時: Zustand store → (1.5秒デバウンス) → Supabase にアップサート
 *
 * ローカル開発で Supabase 未設定の場合は fileSync.ts がそのまま使われる。
 */

import { supabase, isSupabaseEnabled } from './supabase';
import { useHoldingsStore } from '../stores/holdingsStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useAlertsStore } from '../stores/alertsStore';
import { useReportsStore } from '../stores/reportsStore';
import { useSettingsStore } from '../stores/settingsStore';

interface SnapshotRow {
  user_id: string;
  holdings: unknown[];
  watchlist: unknown[];
  alerts: unknown[];
  reports: unknown[];
  settings: Record<string, unknown>;
  updated_at: string;
}

/**
 * Supabase からデータを読み込み Zustand ストアに反映する。
 * データが存在しない場合（初回 / 新規デバイス）は localStorage の現在のデータを
 * そのまま Supabase にアップロードして移行する。
 */
export async function loadFromCloud(): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[CloudSync] 読み込みエラー:', error.message);
    return false;
  }

  if (!data) {
    // 初回ログイン: localStorage のデータを Supabase に移行アップロード
    console.log('[CloudSync] 初回ログイン: ローカルデータをクラウドに移行します');
    await doCloudSync();
    return true;
  }

  const row = data as SnapshotRow;

  // Zustand persist の localStorage フォーマットに合わせて書き込み
  if (Array.isArray(row.holdings)) {
    localStorage.setItem(
      'ai-portfolio-holdings',
      JSON.stringify({ state: { holdings: row.holdings }, version: 0 })
    );
  }
  if (Array.isArray(row.watchlist)) {
    localStorage.setItem(
      'ai-portfolio-watchlist',
      JSON.stringify({ state: { items: row.watchlist }, version: 0 })
    );
  }
  if (Array.isArray(row.alerts)) {
    localStorage.setItem(
      'ai-portfolio-alerts',
      JSON.stringify({ state: { alerts: row.alerts }, version: 0 })
    );
  }
  if (Array.isArray(row.reports)) {
    localStorage.setItem(
      'ai-portfolio-reports',
      JSON.stringify({ state: { reports: row.reports }, version: 0 })
    );
  }
  if (row.settings?.currency) {
    const existing = JSON.parse(
      localStorage.getItem('ai-portfolio-settings') || '{}'
    );
    const merged = {
      ...(existing?.state ?? {}),
      currency: row.settings.currency,
    };
    localStorage.setItem(
      'ai-portfolio-settings',
      JSON.stringify({ state: merged, version: 0 })
    );
  }

  // Zustand に再読み込みを指示
  await Promise.all([
    useHoldingsStore.persist.rehydrate(),
    useWatchlistStore.persist.rehydrate(),
    useAlertsStore.persist.rehydrate(),
    useReportsStore.persist.rehydrate(),
    useSettingsStore.persist.rehydrate(),
  ]);

  console.log('[CloudSync] 読み込み完了:', row.updated_at);
  return true;
}

// ----- 自動保存 -----

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isInitializing = false;

export async function doCloudSync() {
  if (!isSupabaseEnabled || !supabase || isInitializing) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const holdings = useHoldingsStore.getState().holdings;
  const watchlist = useWatchlistStore.getState().items;

  // 安全装置: 
  // 読み込み完了直後や、意図しないタイミングでの空データでの上書きを防止
  if (holdings.length === 0 && watchlist.length === 0) {
    console.warn('[CloudSync] 空データの送信を検知したためスキップしました（安全回路）');
    return;
  }

  const payload = {
    user_id: user.id,
    holdings: holdings,
    watchlist: watchlist,
    alerts: useAlertsStore.getState().alerts,
    reports: useReportsStore.getState().reports,
    settings: {
      currency: useSettingsStore.getState().currency,
    },
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('portfolio_snapshots')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.warn('[CloudSync] 保存失敗:', error.message);
  }
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(doCloudSync, 1500);
}

/**
 * 全ストアの変更を監視して Supabase へ自動保存を開始する。
 * アプリ起動時・ログイン後に一度だけ呼び出すこと。
 */
export async function startCloudSync() {
  isInitializing = true;
  try {
    const success = await loadFromCloud();
    console.log(`[CloudSync] 初期読み込み ${success ? '成功' : 'スキップ（新規データ）'}`);
  } finally {
    isInitializing = false;
  }

  useHoldingsStore.subscribe(scheduleSync);
  useWatchlistStore.subscribe(scheduleSync);
  useAlertsStore.subscribe(scheduleSync);
  useReportsStore.subscribe(scheduleSync);
  useSettingsStore.subscribe(scheduleSync);
  console.log('[CloudSync] 自動保存開始 → Supabase');
}
