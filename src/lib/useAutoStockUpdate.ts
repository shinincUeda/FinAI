import { useEffect, useRef, useCallback } from 'react';
import { useHoldingsStore } from '../stores/holdingsStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useAutoUpdateStore } from '../stores/autoUpdateStore';
import { fetchCurrentPrice } from './stockApi';

const HOUR_MS = 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000; // 1分ごとにザラ場チェック

// 米国市場 (NYSE/NASDAQ) の取引時間内かどうかを判定
// 平日 9:30〜16:00 ET (America/New_York)
export function isUSMarketOpen(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0');

  if (weekday === 'Sat' || weekday === 'Sun') return false;

  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60;
}

// 未上場またはAPIで取得できない銘柄をスキップ
const SKIP_TICKERS = new Set(['Anthropic', '-', '']);

export function useAutoStockUpdate() {
  const holdings = useHoldingsStore((s) => s.holdings);
  const updateHolding = useHoldingsStore((s) => s.updateHolding);
  const watchlistItems = useWatchlistStore((s) => s.items);
  const updateWatchlistItem = useWatchlistStore((s) => s.updateItem);
  const { setIsUpdating, setLastUpdatedAt, setIsMarketOpen } = useAutoUpdateStore();
  const manualTrigger = useAutoUpdateStore((s) => s._manualTrigger);

  // refで常に最新の値を参照（fetchAllPrices を再生成しないため）
  const holdingsRef = useRef(holdings);
  const watchlistRef = useRef(watchlistItems);
  const updateHoldingRef = useRef(updateHolding);
  const updateWatchlistItemRef = useRef(updateWatchlistItem);

  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { watchlistRef.current = watchlistItems; }, [watchlistItems]);
  useEffect(() => { updateHoldingRef.current = updateHolding; }, [updateHolding]);
  useEffect(() => { updateWatchlistItemRef.current = updateWatchlistItem; }, [updateWatchlistItem]);

  const isUpdatingRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);

  const fetchAllPrices = useCallback(async () => {
    if (isUpdatingRef.current) return;

    const apiKey = import.meta.env.VITE_STOCK_API_KEY || '';
    if (!apiKey) {
      console.warn('[AutoUpdate] VITE_STOCK_API_KEY が未設定のため自動更新をスキップします。');
      return;
    }

    isUpdatingRef.current = true;
    setIsUpdating(true);

    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // 保有銘柄の株価を取得
    for (const holding of holdingsRef.current) {
      try {
        const price = await fetchCurrentPrice(holding.ticker, apiKey);
        if (price !== null) {
          updateHoldingRef.current(holding.id, { currentPrice: price });
        }
      } catch (e) {
        console.error(`[AutoUpdate] 保有銘柄 ${holding.ticker} の取得に失敗:`, e);
      }
      await delay(500); // Finnhub 無料枠のレート制限対策
    }

    // ウォッチリスト銘柄の株価を取得（未上場はスキップ）
    for (const item of watchlistRef.current) {
      if (SKIP_TICKERS.has(item.ticker ?? '')) continue;
      try {
        const price = await fetchCurrentPrice(item.ticker, apiKey);
        if (price !== null) {
          updateWatchlistItemRef.current(item.id, { currentPrice: price });
        }
      } catch (e) {
        console.error(`[AutoUpdate] ウォッチリスト ${item.ticker} の取得に失敗:`, e);
      }
      await delay(500);
    }

    const now = Date.now();
    lastUpdateTimeRef.current = now;
    setLastUpdatedAt(now);
    setIsUpdating(false);
    isUpdatingRef.current = false;
    console.log(
      '[AutoUpdate] 完了:',
      new Date(now).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    );
  }, [setIsUpdating, setLastUpdatedAt]);

  // 手動更新トリガーを監視（初回マウント時は 0 なので無視）
  const isFirstManualRef = useRef(true);
  useEffect(() => {
    if (isFirstManualRef.current) {
      isFirstManualRef.current = false;
      return;
    }
    fetchAllPrices();
  }, [manualTrigger, fetchAllPrices]);

  useEffect(() => {
    // 起動時にザラ場なら即時更新
    const marketOpen = isUSMarketOpen();
    setIsMarketOpen(marketOpen);
    if (marketOpen) {
      fetchAllPrices();
    }

    // 1分ごとにザラ場チェックし、1時間経過していれば更新
    const interval = setInterval(() => {
      const open = isUSMarketOpen();
      setIsMarketOpen(open);
      if (!open) return;

      const elapsed = Date.now() - lastUpdateTimeRef.current;
      if (elapsed >= HOUR_MS) {
        fetchAllPrices();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchAllPrices, setIsMarketOpen]);
}
