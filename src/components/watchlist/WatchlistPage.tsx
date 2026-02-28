import { useState, useMemo, useCallback } from 'react';
import { Target, RefreshCw, AlertTriangle, Briefcase, Eye, Plus, Search, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { StockDetailModal } from './StockDetailModal';
import { fetchCurrentPrice } from '../../lib/stockApi';
import type { Holding, WatchlistItem } from '../../types';

// ─── 統合行型 ──────────────────────────────────────────────
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
  aiAlignmentScore?: 1|2|3|4|5;
  // Watchlist用
  tier?: 1 | 2 | 3;
  targetPrice?: number;
  priority?: 1|2|3|4|5;
  // 計算済み
  distancePercent: number;
  entryStatus: 'reached' | 'near' | 'far' | 'none';
  // 元データ
  rawHolding?: Holding;
  rawWatchlistItem?: WatchlistItem;
}

// ─── ユーティリティ ─────────────────────────────────────────
function computeRow(item: Holding | WatchlistItem, source: StockSource): UnifiedRow {
  const analysis = item.analysis;
  const bearVal = analysis?.fairValue?.bear;
  const baseVal = analysis?.fairValue?.base;
  const bullVal = analysis?.fairValue?.bull;
  const entryMin = analysis?.entryZone?.min;
  const entryMax = analysis?.entryZone?.max
    ?? (source === 'watchlist' ? (item as WatchlistItem).targetPrice || 0 : 0);
  const cp = item.currentPrice || 0;

  let distancePercent = 999;
  let entryStatus: UnifiedRow['entryStatus'] = 'none';

  if (entryMax > 0 && cp > 0) {
    if (cp <= entryMax) {
      distancePercent = (cp - entryMax) / entryMax * 100;
      entryStatus = 'reached';
    } else {
      distancePercent = (cp - entryMax) / entryMax * 100;
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
    return { ...rowBase, shares: h.shares, avgCost: h.avgCost, sharesNisa: h.sharesNisa, avgCostNisa: h.avgCostNisa, status: h.status, sector: h.sector, aiAlignmentScore: h.aiAlignmentScore, rawHolding: h };
  } else {
    const w = item as WatchlistItem;
    return { ...rowBase, tier: w.tier, targetPrice: w.targetPrice, priority: w.priority, rawWatchlistItem: w };
  }
}

type FilterType = 'all' | 'holding' | 'watchlist';
type SortKey = 'proximity' | 'ticker' | 'signal' | 'tier';
type SortDir = 'asc' | 'desc';

// ─── ミニゲージ ─────────────────────────────────────────────
function MiniPriceGauge({ row }: { row: UnifiedRow }) {
  const { bear, base, bull, entryMin, entryMax, currentPrice } = row;
  const vals = [bear, base, bull, entryMin, entryMax, currentPrice].filter((v): v is number => typeof v === 'number' && v > 0);
  if (vals.length < 2) {
    // targetPrice のみ
    if (row.targetPrice && row.targetPrice > 0) {
      const cp = currentPrice || 0;
      const pct = cp > 0 ? (cp - row.targetPrice) / row.targetPrice * 100 : null;
      return (
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="text-[10px] font-mono-dm text-[var(--text-muted)]">目標</div>
          <div className="font-mono-dm text-xs text-[var(--accent-gold-light)]">${row.targetPrice}</div>
          {pct !== null && (
            <div className={`font-mono-dm text-[10px] ${pct <= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
              {pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
            </div>
          )}
        </div>
      );
    }
    return <div className="font-mono-dm text-[10px] text-[var(--text-muted)]">未設定</div>;
  }

  const minScale = Math.min(...vals) * 0.92;
  const maxScale = Math.max(...vals) * 1.08;
  const range = maxScale - minScale;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - minScale) / range) * 100))}%`;

  const hasEntryZone = entryMax != null && entryMax > 0;
  const drawEntryMin = entryMin && entryMin > 0 ? entryMin : minScale;
  const inZone = hasEntryZone && currentPrice != null && currentPrice > 0 && currentPrice <= entryMax!;

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  return (
    <div className="min-w-[200px] max-w-[240px]">
      {/* バー */}
      <div className="relative h-5 bg-[var(--bg-secondary)] rounded border border-[var(--border)] overflow-hidden">
        {/* Entry zone 塗り */}
        {hasEntryZone && (
          <div
            className={`absolute top-0 h-full transition-colors ${inZone ? 'bg-[var(--accent-green)]/30' : 'bg-[var(--accent-green)]/10'}`}
            style={{
              left: pct(drawEntryMin),
              width: `${Math.max(0, Math.min(100, ((Math.min(maxScale, entryMax!) - drawEntryMin) / range) * 100))}%`,
            }}
          />
        )}
        {/* Bear ライン */}
        {bear != null && (
          <div className="absolute top-0 h-full w-[1.5px] bg-[var(--accent-red)]/70" style={{ left: pct(bear) }} />
        )}
        {/* Base ライン */}
        {base != null && (
          <div className="absolute top-0 h-full w-[1.5px] bg-[var(--accent-gold)]" style={{ left: pct(base) }} />
        )}
        {/* Bull ライン */}
        {bull != null && (
          <div className="absolute top-0 h-full w-[1.5px] bg-[var(--accent-green-dark)]/80" style={{ left: pct(bull) }} />
        )}
        {/* 現在株価 ▼ */}
        {currentPrice != null && currentPrice > 0 && (
          <div
            className={`absolute top-0 h-full w-[2px] z-10 ${inZone ? 'bg-[var(--accent-green)]' : 'bg-white/80'}`}
            style={{ left: pct(currentPrice) }}
          />
        )}
      </div>
      {/* ラベル行 */}
      <div className="flex justify-between items-center mt-0.5 px-0.5">
        {bear != null && <span className="font-mono-dm text-[9px] text-[var(--accent-red)]/80">{fmt(bear)}</span>}
        {base != null && <span className="font-mono-dm text-[9px] text-[var(--accent-gold-light)]">{fmt(base)}</span>}
        {bull != null && <span className="font-mono-dm text-[9px] text-[var(--accent-green-dark)]/80">{fmt(bull)}</span>}
      </div>
    </div>
  );
}

// ─── ステータスバッジ ────────────────────────────────────────
function EntryStatusBadge({ status, distancePercent }: { status: UnifiedRow['entryStatus']; distancePercent: number }) {
  if (status === 'reached') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-widest bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30 rounded shadow-[0_0_8px_rgba(61,214,140,0.3)] animate-pulse">
        🔥 IN ZONE
      </span>
    );
  }
  if (status === 'near') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold tracking-widest bg-[var(--accent-gold)]/15 text-[var(--accent-gold-light)] border border-[var(--accent-gold)]/30 rounded">
        🟡 あと{distancePercent.toFixed(1)}%
      </span>
    );
  }
  if (status === 'far') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-widest text-[var(--text-muted)] border border-[var(--border)] rounded">
        {distancePercent.toFixed(0)}%遠
      </span>
    );
  }
  return <span className="text-[var(--text-muted)] text-[10px]">-</span>;
}

// ─── メインページ ────────────────────────────────────────────
export function WatchlistPage() {
  const { holdings, updateHolding, addAnalysisEntry: addHoldingHistory } = useHoldingsStore();
  const { items: watchlistItems, updateItem: updateWatchlistItem, addAnalysisEntry: addWatchlistHistory } = useWatchlistStore();

  const [selectedRow, setSelectedRow] = useState<UnifiedRow | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortKey, setSortKey] = useState<SortKey>('proximity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);

  // ─── 統合行リスト ───────────────────────────────────────────
  const allRows = useMemo<UnifiedRow[]>(() => {
    const holdingRows = holdings.map(h => computeRow(h, 'holding'));
    const watchlistRows = watchlistItems.map(w => computeRow(w, 'watchlist'));
    return [...holdingRows, ...watchlistRows];
  }, [holdings, watchlistItems]);

  // ─── フィルター + 検索 + ソート ─────────────────────────────
  const displayRows = useMemo(() => {
    let rows = allRows;

    // フィルター
    if (filter === 'holding') rows = rows.filter(r => r.source === 'holding');
    if (filter === 'watchlist') rows = rows.filter(r => r.source === 'watchlist');

    // 検索
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      rows = rows.filter(r => r.ticker.includes(q) || r.name.toUpperCase().includes(q));
    }

    // ソート
    rows = [...rows].sort((a, b) => {
      let val = 0;
      if (sortKey === 'proximity') {
        // 買いゾーン到達 → 接近 → 遠い → 未設定 の順
        const order = { reached: 0, near: 1, far: 2, none: 3 };
        val = order[a.entryStatus] - order[b.entryStatus];
        if (val === 0) val = a.distancePercent - b.distancePercent;
      } else if (sortKey === 'ticker') {
        val = a.ticker.localeCompare(b.ticker);
      } else if (sortKey === 'signal') {
        const signalOrder = { 'Strong Buy': 0, 'Buy': 1, 'Buy on Dip': 2, 'Watch': 3, 'Sell': 4, 'None': 5 };
        const aS = (a.rawHolding?.analysis?.investmentSignal ?? a.rawWatchlistItem?.analysis?.investmentSignal ?? 'None') as keyof typeof signalOrder;
        const bS = (b.rawHolding?.analysis?.investmentSignal ?? b.rawWatchlistItem?.analysis?.investmentSignal ?? 'None') as keyof typeof signalOrder;
        val = (signalOrder[aS] ?? 5) - (signalOrder[bS] ?? 5);
      } else if (sortKey === 'tier') {
        const aTier = a.tier ?? 99;
        const bTier = b.tier ?? 99;
        val = aTier - bTier;
      }
      return sortDir === 'asc' ? val : -val;
    });

    return rows;
  }, [allRows, filter, search, sortKey, sortDir]);

  // ─── 一括株価更新 ────────────────────────────────────────────
  const handleBatchUpdate = useCallback(async () => {
    if (isUpdating) return;
    const apiKey = import.meta.env.VITE_STOCK_API_KEY || '';
    if (!apiKey) {
      alert('VITE_STOCK_API_KEY が設定されていません。');
      return;
    }
    setIsUpdating(true);
    const allItems = [
      ...holdings.map(h => ({ id: h.id, ticker: h.ticker, source: 'holding' as const })),
      ...watchlistItems.map(w => ({ id: w.id, ticker: w.ticker, source: 'watchlist' as const })),
    ];
    setUpdateProgress({ current: 0, total: allItems.length });
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      try {
        const price = await fetchCurrentPrice(item.ticker, apiKey);
        if (price !== null) {
          if (item.source === 'holding') {
            updateHolding(item.id, { currentPrice: price });
          } else {
            updateWatchlistItem(item.id, { currentPrice: price });
          }
        }
      } catch (err) {
        console.error(`Failed ${item.ticker}`, err);
      }
      setUpdateProgress({ current: i + 1, total: allItems.length });
      await new Promise(r => setTimeout(r, 1200));
    }
    setIsUpdating(false);
    setUpdateProgress({ current: 0, total: 0 });
  }, [isUpdating, holdings, watchlistItems, updateHolding, updateWatchlistItem]);

  // ─── ソートヘッダーボタン ────────────────────────────────────
  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => {
    const active = sortKey === keyName;
    return (
      <button
        onClick={() => {
          if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setSortKey(keyName); setSortDir('asc'); }
        }}
        className={`flex items-center gap-1 font-mono-dm text-[10px] tracking-widest uppercase transition-colors ${active ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
      >
        {label}
        {active ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
      </button>
    );
  };

  // 統計サマリー
  const stats = useMemo(() => ({
    total: allRows.length,
    inZone: allRows.filter(r => r.entryStatus === 'reached').length,
    near: allRows.filter(r => r.entryStatus === 'near').length,
    holdings: allRows.filter(r => r.source === 'holding').length,
    watchlist: allRows.filter(r => r.source === 'watchlist').length,
  }), [allRows]);

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto">
      {/* ─── ヘッダー ─── */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif-display text-white mb-2 flex items-center gap-3">
              <Target className="w-8 h-8 text-[var(--accent-blue-light)]" />
              エントリー・レーダー
            </h1>
            <p className="font-mono-dm text-xs text-[var(--text-muted)] tracking-widest uppercase">
              全銘柄統合 — 買いゾーンへの近さ順
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddWatchlist(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-mono-dm tracking-widest text-[var(--accent-purple)] border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/10 hover:bg-[var(--accent-purple)]/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> ウォッチ追加
            </button>
            <button
              onClick={handleBatchUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 text-xs font-mono-dm tracking-widest text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating
                ? `更新中 ${updateProgress.current}/${updateProgress.total}`
                : '株価を一括更新（低速）'}
            </button>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: '総銘柄数', value: stats.total, color: 'text-white' },
            { label: '🔥 IN ZONE', value: stats.inZone, color: 'text-[var(--accent-green)]' },
            { label: '🟡 接近中', value: stats.near, color: 'text-[var(--accent-gold-light)]' },
            { label: '保有銘柄', value: stats.holdings, color: 'text-[var(--accent-blue-light)]' },
            { label: 'ウォッチ', value: stats.watchlist, color: 'text-[var(--accent-purple)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 rounded text-center">
              <div className={`font-mono-dm text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="font-mono-dm text-[10px] text-[var(--text-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* フィルター + 検索 + ソート */}
        <div className="flex flex-wrap items-center gap-3">
          {/* フィルタータブ */}
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border)] rounded overflow-hidden">
            {([['all', 'すべて'], ['holding', '保有銘柄'], ['watchlist', 'ウォッチリスト']] as [FilterType, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 text-xs font-mono-dm tracking-widest transition-colors ${
                  filter === key
                    ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue-light)] border-b-2 border-[var(--accent-blue)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 検索 */}
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border)] px-3 py-2 rounded flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ティッカー / 銘柄名 で検索"
              className="bg-transparent text-xs font-mono-dm text-white outline-none placeholder:text-[var(--text-muted)] w-full"
            />
          </div>

          {/* ソート */}
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <SortHeader label="近さ順" keyName="proximity" />
            <span className="text-[var(--border)]">|</span>
            <SortHeader label="Ticker" keyName="ticker" />
            <span className="text-[var(--border)]">|</span>
            <SortHeader label="Signal" keyName="signal" />
            <span className="text-[var(--border)]">|</span>
            <SortHeader label="Tier" keyName="tier" />
          </div>

          <div className="ml-auto font-mono-dm text-[10px] text-[var(--text-muted)]">
            表示: {displayRows.length} 件
          </div>
        </div>
      </div>

      {/* ─── テーブル ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal w-28 cursor-help" title="現在価格とエントリーゾーンの位置関係（リアルタイム計算）">
                  価格帯
                  <span className="block text-[8px] opacity-50 normal-case tracking-normal font-normal">リアルタイム</span>
                </th>
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal">銘柄</th>
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal text-right">現在株価</th>
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal">
                  Bear / Entry Zone / Base / Bull
                </th>
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal text-center cursor-help" title="最後にインポートしたAI分析レポートの推奨（スナップショット）。リアルタイムではありません。">
                  AI推奨
                  <span className="block text-[8px] opacity-50 normal-case tracking-normal font-normal">最終分析時</span>
                </th>
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <AlertTriangle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)]">
                      {search ? `"${search}" に一致する銘柄が見つかりません` : '銘柄が登録されていません'}
                    </p>
                  </td>
                </tr>
              )}
              {displayRows.map(row => {
                const signal = row.rawHolding?.analysis?.investmentSignal ?? row.rawWatchlistItem?.analysis?.investmentSignal;
                const score = row.rawHolding?.analysis?.fundamentalScore ?? row.rawWatchlistItem?.analysis?.fundamentalScore;
                const grade = row.rawHolding?.analysis?.fundamentalGrade ?? row.rawWatchlistItem?.analysis?.fundamentalGrade;
                const analysisHistory = row.rawHolding?.analysisHistory ?? row.rawWatchlistItem?.analysisHistory;
                const lastAnalysisDate = analysisHistory?.[0]?.date;
                const isOwned = ((row.shares || 0) + (row.sharesNisa || 0)) > 0;
                const totalShares = (row.shares || 0) + (row.sharesNisa || 0);
                const totalCostBasis = (row.shares || 0) * (row.avgCost || 0) + (row.sharesNisa || 0) * (row.avgCostNisa || 0);
                const blendedAvgCost = totalShares > 0 ? totalCostBasis / totalShares : 0;

                return (
                  <tr
                    key={`${row.source}-${row.id}`}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
                  >
                    {/* 状態 */}
                    <td className="p-3 align-middle">
                      <EntryStatusBadge status={row.entryStatus} distancePercent={row.distancePercent} />
                    </td>

                    {/* 銘柄 */}
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div>
                          <div className="font-mono-dm font-bold text-white text-sm group-hover:text-[var(--accent-blue-light)] transition-colors">
                            {row.ticker}
                          </div>
                          <div className="font-sans text-[11px] text-[var(--text-secondary)] truncate max-w-[140px]">{row.name}</div>
                        </div>
                        {/* ソースバッジ */}
                        {row.source === 'holding' ? (
                          <span className={`flex items-center gap-1 text-[9px] font-mono-dm px-1.5 py-0.5 border ${isOwned ? 'text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/20' : 'text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border)]'}`} title="保有銘柄">
                            <Briefcase className="w-2.5 h-2.5" /> {isOwned ? '保有' : '観察'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[9px] font-mono-dm px-1.5 py-0.5 text-[var(--accent-purple)] bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20" title={`Tier ${row.tier}`}>
                            <Eye className="w-2.5 h-2.5" /> T{row.tier}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 現在株価 */}
                    <td className="p-3 align-middle text-right">
                      <div className={`font-mono-dm text-sm font-medium ${row.entryStatus === 'reached' ? 'text-[var(--accent-green)]' : 'text-white'}`}>
                        {row.currentPrice != null ? `$${row.currentPrice.toFixed(2)}` : '---'}
                      </div>
                      {isOwned && blendedAvgCost > 0 && row.currentPrice ? (
                        <div className={`font-mono-dm text-[10px] ${row.currentPrice >= blendedAvgCost ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                          {((row.currentPrice - blendedAvgCost) / blendedAvgCost * 100).toFixed(1)}%
                        </div>
                      ) : null}
                    </td>

                    {/* ミニゲージ */}
                    <td className="p-3 align-middle">
                      <MiniPriceGauge row={row} />
                    </td>

                    {/* Signal */}
                    <td className="p-3 align-middle text-center">
                      {signal ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <SignalBadge signal={signal} />
                          {lastAnalysisDate && (
                            <span className="text-[9px] text-[var(--text-muted)] font-mono-dm">
                              {formatRelativeDate(lastAnalysisDate)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[10px]">-</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="p-3 align-middle text-right">
                      {score != null ? (
                        <div className="flex items-center justify-end gap-1">
                          {grade && (
                            <span className="font-mono-dm text-xs text-[var(--accent-gold-light)] font-bold">{grade}</span>
                          )}
                          <span className="font-mono-dm text-xs text-[var(--text-secondary)]">{score}/90</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 詳細モーダル ─── */}
      {selectedRow && (
        <StockDetailModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          onSaveHolding={(id, updates) => {
            updateHolding(id, updates);
            // ローカル選択行の更新（モーダル内でリアルタイム反映するため）
            setSelectedRow(prev => prev ? { ...prev, currentPrice: (updates as Holding).currentPrice ?? prev.currentPrice } : prev);
          }}
          onSaveWatchlist={(id, updates) => {
            updateWatchlistItem(id, updates);
          }}
          onAddHoldingHistory={addHoldingHistory}
          onAddWatchlistHistory={addWatchlistHistory}
        />
      )}

      {/* ウォッチリスト追加モーダル */}
      {showAddWatchlist && (
        <AddWatchlistModal onClose={() => setShowAddWatchlist(false)} />
      )}
    </div>
  );
}

// ─── 相対日付フォーマット ─────────────────────────────────────
function formatRelativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '本日';
  if (days === 1) return '昨日';
  if (days < 30) return `${days}日前`;
  const months = Math.floor(days / 30);
  return `${months}ヶ月前`;
}

// ─── シグナルバッジ ──────────────────────────────────────────
function SignalBadge({ signal }: { signal: string }) {
  const styles: Record<string, string> = {
    'Strong Buy': 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] border-[var(--accent-green)]/30',
    'Buy': 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue-light)] border-[var(--accent-blue)]/30',
    'Buy on Dip': 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold-light)] border-[var(--accent-gold)]/30',
    'Watch': 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border)]',
    'Sell': 'bg-[var(--accent-red)]/20 text-[var(--accent-red)] border-[var(--accent-red)]/30',
    'None': 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)]',
  };
  const cls = styles[signal] ?? styles['None'];
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono-dm tracking-wide border rounded ${cls}`}>
      {signal}
    </span>
  );
}

// ─── ウォッチリスト追加モーダル ──────────────────────────────
function AddWatchlistModal({ onClose }: { onClose: () => void }) {
  const { addItem } = useWatchlistStore();
  const [form, setForm] = useState({ ticker: '', name: '', tier: 1 as 1|2|3, category: '', thesis: '', targetPrice: '', priority: 3 as 1|2|3|4|5, notes: '' });

  const handleAdd = () => {
    if (!form.ticker.trim() || !form.name.trim()) return;
    addItem({
      id: `w-${Date.now()}`,
      ticker: form.ticker.toUpperCase().trim(),
      name: form.name.trim(),
      tier: form.tier,
      category: form.category,
      thesis: form.thesis,
      targetPrice: parseFloat(form.targetPrice) || 0,
      priority: form.priority,
      notes: form.notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-[var(--accent-purple)]" /> ウォッチリストに追加</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">ティッカー *</span>
              <input className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)]" value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value})} placeholder="AAPL" />
            </label>
            <label>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">企業名 *</span>
              <input className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)]" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Apple Inc." />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">Tier</span>
              <select className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none" value={form.tier} onChange={e => setForm({...form, tier: Number(e.target.value) as 1|2|3})}>
                <option value={1}>Tier 1（最優先）</option>
                <option value={2}>Tier 2（検討）</option>
                <option value={3}>Tier 3（ウォッチ）</option>
              </select>
            </label>
            <label>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">目標株価 ($)</span>
              <input type="number" className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)]" value={form.targetPrice} onChange={e => setForm({...form, targetPrice: e.target.value})} placeholder="0.00" />
            </label>
            <label>
              <span className="text-[11px] text-[var(--text-secondary)] block mb-1">優先度</span>
              <select className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none" value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value) as 1|2|3|4|5})}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span className="text-[11px] text-[var(--text-secondary)] block mb-1">投資テーゼ</span>
            <textarea className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)] resize-none" rows={3} value={form.thesis} onChange={e => setForm({...form, thesis: e.target.value})} placeholder="なぜこの銘柄を注目しているか..." />
          </label>
          <label>
            <span className="text-[11px] text-[var(--text-secondary)] block mb-1">メモ</span>
            <input className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors">キャンセル</button>
          <button onClick={handleAdd} disabled={!form.ticker || !form.name} className="px-6 py-2 text-sm font-bold bg-[var(--accent-purple)] text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity">追加する</button>
        </div>
      </div>
    </div>
  );
}
