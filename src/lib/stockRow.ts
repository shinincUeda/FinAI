// 銘柄詳細モーダルで共有する統合行型・ユーティリティ
// WatchlistPage / ThesisPage / DashboardPage から参照される

import type { Holding, WatchlistItem } from '../types';

export type StockSource = 'holding' | 'watchlist';

export interface UnifiedRow {
  id: string;
  source: StockSource;
  ticker: string;
  name: string;
  currentPrice?: number;
  // Bear/Base/Bull
  bear?: number;
  base?: number;
  bull?: number;
  entryMin?: number;
  entryMax?: number;
  // Holdings用
  shares?: number;
  avgCost?: number;
  sharesNisa?: number;
  avgCostNisa?: number;
  status?: 'core' | 'monitor' | 'reduce' | 'sell';
  sector?: string;
  aiAlignmentScore?: 1 | 2 | 3 | 4 | 5;
  // Watchlist用
  tier?: 1 | 2 | 3;
  targetPrice?: number;
  priority?: 1 | 2 | 3 | 4 | 5;
  // 計算済み
  distancePercent: number;
  entryStatus: 'reached' | 'near' | 'far' | 'none';
  // 元データ
  rawHolding?: Holding;
  rawWatchlistItem?: WatchlistItem;
}

export function computeRow(item: Holding | WatchlistItem, source: StockSource): UnifiedRow {
  const analysis = item.analysis;
  const bearVal = analysis?.fairValue?.bear;
  const baseVal = analysis?.fairValue?.base;
  const bullVal = analysis?.fairValue?.bull;
  const entryMin = analysis?.entryZone?.min;
  const entryMax =
    analysis?.entryZone?.max ??
    (source === 'watchlist' ? (item as WatchlistItem).targetPrice || 0 : 0);
  const cp = item.currentPrice || 0;

  let distancePercent = 999;
  let entryStatus: UnifiedRow['entryStatus'] = 'none';

  if (entryMax > 0 && cp > 0) {
    if (cp <= entryMax) {
      distancePercent = ((cp - entryMax) / entryMax) * 100;
      entryStatus = 'reached';
    } else {
      distancePercent = ((cp - entryMax) / entryMax) * 100;
      entryStatus = distancePercent <= 10 ? 'near' : 'far';
    }
  }

  const rowBase: UnifiedRow = {
    id: item.id,
    source,
    ticker: item.ticker,
    name: item.name,
    currentPrice: item.currentPrice,
    bear: bearVal,
    base: baseVal,
    bull: bullVal,
    entryMin,
    entryMax: entryMax || undefined,
    distancePercent,
    entryStatus,
  };

  if (source === 'holding') {
    const h = item as Holding;
    return {
      ...rowBase,
      shares: h.shares,
      avgCost: h.avgCost,
      sharesNisa: h.sharesNisa,
      avgCostNisa: h.avgCostNisa,
      status: h.status,
      sector: h.sector,
      aiAlignmentScore: h.aiAlignmentScore,
      rawHolding: h,
    };
  } else {
    const w = item as WatchlistItem;
    return {
      ...rowBase,
      tier: w.tier,
      targetPrice: w.targetPrice,
      priority: w.priority,
      rawWatchlistItem: w,
    };
  }
}
