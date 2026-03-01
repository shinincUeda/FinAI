/**
 * ファイル同期モジュール
 *
 * Vite dev サーバーのミドルウェア経由で data/portfolio.json に
 * 全ポートフォリオデータを自動保存する。
 *
 * localStorage はブラウザのキャッシュ削除やポート変更で消えるが、
 * このファイルはそれらに依存せず永続する。
 *
 * フロー:
 *   起動時: data/portfolio.json → localStorage → Zustand rehydrate
 *   変更時: Zustand store → (1.5秒デバウンス) → data/portfolio.json
 */

import { useHoldingsStore } from '../stores/holdingsStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useAlertsStore } from '../stores/alertsStore';
import { useReportsStore } from '../stores/reportsStore';
import { useSettingsStore } from '../stores/settingsStore';

const API_URL = '/api/storage';

interface PortfolioFile {
  savedAt: string;
  holdings: unknown[];
  watchlist: unknown[];
  alerts: unknown[];
  reports: unknown[];
  settings: { currency: string };
}

/**
 * data/portfolio.json からデータを読み込み、Zustand ストアに反映する。
 * ファイルが存在しない（初回起動）場合は localStorage のデータをそのまま使う。
 *
 * @returns ファイルからデータを読み込めた場合 true
 */
export async function loadFromFile(): Promise<boolean> {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) return false;

    const data: Partial<PortfolioFile> = await res.json();

    // savedAt がなければ空ファイル = 初回起動
    if (!data?.savedAt) return false;

    // Zustand persist の保存フォーマットに合わせて localStorage を上書きする
    // フォーマット: { state: { ...fields }, version: 0 }
    if (Array.isArray(data.holdings)) {
      localStorage.setItem(
        'ai-portfolio-holdings',
        JSON.stringify({ state: { holdings: data.holdings }, version: 0 })
      );
    }
    if (Array.isArray(data.watchlist)) {
      localStorage.setItem(
        'ai-portfolio-watchlist',
        JSON.stringify({ state: { items: data.watchlist }, version: 0 })
      );
    }
    if (Array.isArray(data.alerts)) {
      localStorage.setItem(
        'ai-portfolio-alerts',
        JSON.stringify({ state: { alerts: data.alerts }, version: 0 })
      );
    }
    if (Array.isArray(data.reports)) {
      localStorage.setItem(
        'ai-portfolio-reports',
        JSON.stringify({ state: { reports: data.reports }, version: 0 })
      );
    }
    if (data.settings?.currency) {
      // API キーは .env.local で管理するためファイルには含めない。
      // currency だけ既存の settings にマージする。
      const existing = JSON.parse(
        localStorage.getItem('ai-portfolio-settings') || '{}'
      );
      const mergedState = { ...(existing?.state ?? {}), currency: data.settings.currency };
      localStorage.setItem(
        'ai-portfolio-settings',
        JSON.stringify({ state: mergedState, version: 0 })
      );
    }

    // Zustand に localStorage の再読み込みを指示
    await Promise.all([
      useHoldingsStore.persist.rehydrate(),
      useWatchlistStore.persist.rehydrate(),
      useAlertsStore.persist.rehydrate(),
      useReportsStore.persist.rehydrate(),
      useSettingsStore.persist.rehydrate(),
    ]);

    console.log('[FileSync] 読み込み完了:', data.savedAt);
    return true;
  } catch (e) {
    // 開発サーバーが未起動 or プロダクションビルド → localStorage で動作
    console.info('[FileSync] ファイルストレージ利用不可。localStorage で動作します。', e);
    return false;
  }
}

// ----- 自動保存 -----

let syncTimer: ReturnType<typeof setTimeout> | null = null;

async function doSync() {
  const payload: PortfolioFile = {
    savedAt: new Date().toISOString(),
    holdings: useHoldingsStore.getState().holdings,
    watchlist: useWatchlistStore.getState().items,
    alerts: useAlertsStore.getState().alerts,
    reports: useReportsStore.getState().reports,
    settings: {
      currency: useSettingsStore.getState().currency,
      // APIキーはファイルに書かない（.env.local で管理）
    },
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.warn('[FileSync] 保存失敗:', e);
  }
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(doSync, 1500); // 1.5 秒デバウンス
}

/**
 * 全ストアの変更を監視して data/portfolio.json へ自動保存を開始する。
 * アプリ起動時に一度だけ呼び出すこと。
 */
export function startAutoSync() {
  useHoldingsStore.subscribe(scheduleSync);
  useWatchlistStore.subscribe(scheduleSync);
  useAlertsStore.subscribe(scheduleSync);
  useReportsStore.subscribe(scheduleSync);
  useSettingsStore.subscribe(scheduleSync);
  console.log('[FileSync] 自動保存開始 → data/portfolio.json');
}
