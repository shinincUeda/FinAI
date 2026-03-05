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
    console.log('[CloudSync] 初回ログイン: クラウドにデータがないため、現在のローカルデータを移行(アップロード)します');
    await doCloudSync(true);
    return true;
  }

  const row = data as SnapshotRow;

  // 取得したデータが空（初期状態）かつローカルに既にデータがある場合は、上書きを警告/スキップする安全策
  const hasLocalData = useHoldingsStore.getState().holdings.length > 0;
  const isCloudEmpty = (!row.holdings || row.holdings.length === 0) && (!row.watchlist || row.watchlist.length === 0);

  if (isCloudEmpty && hasLocalData) {
    console.warn('[CloudSync] クラウド側のデータが空のため、ローカルデータの上書きを回避しました。');
    return false;
  }

  console.log('[CloudSync] クラウドからデータを取得しました。同期中...');

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

export async function doCloudSync(force = false) {
  // 自動保存の場合は初期化中はスキップ。手動(force=true)の場合は実行。
  if (!isSupabaseEnabled || !supabase) return;
  if (isInitializing && !force) {
    console.log('[CloudSync] 初期化中のため自動同期をスキップします');
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const holdings = useHoldingsStore.getState().holdings;
  const watchlist = useWatchlistStore.getState().items;

  // 安全装置1: 完全に空のデータは意図的な全削除以外では送らない
  if (holdings.length === 0 && watchlist.length === 0 && !force) {
    console.warn('[CloudSync] 空データの送信を検知したためスキップしました（安全回路）');
    return;
  }

  // 安全装置2: 初期サンプルデータのままの場合は自動同期しない
  const isInitialData = holdings.length > 0 && holdings[0].id === 'nvda' && holdings[0].lastUpdated === '2026-02-21';
  if (isInitialData && !force) {
    console.info('[CloudSync] 初期サンプルデータのため自動同期をスキップします');
    return;
  }

  console.log(`[CloudSync] クラウドへデータを保存中... (Force: ${force}, Holdings: ${holdings.length})`);

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
  } else {
    console.log('[CloudSync] 保存完了');
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
