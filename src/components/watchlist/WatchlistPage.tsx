import { useState, useMemo, useCallback } from 'react';
import { Target, RefreshCw, AlertTriangle, Briefcase, Eye, Plus, Search, ChevronUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { StockDetailModal } from './StockDetailModal';
import { AddStockModal } from '../shared/AddStockModal';
import { SignalBadge } from '../shared/SignalBadge';
import { fetchCurrentPrice } from '../../lib/stockApi';
import { computeRow } from '../../lib/stockRow';
import type { UnifiedRow } from '../../lib/stockRow';
import type { Holding } from '../../types';

// ─── ローカル型 ────────────────────────────────────────────

type FilterType = 'all' | 'holding' | 'watchlist';
type SortKey = 'proximity' | 'ticker' | 'currentPrice' | 'signal' | 'score' | 'tier';
type SortDir = 'asc' | 'desc';

// ─── ミニゲージ ─────────────────────────────────────────────
function MiniPriceGauge({ row }: { row: UnifiedRow }) {
  const { bear, base, bull, entryMin, entryMax, currentPrice } = row;
  const vals = [bear, base, bull, entryMin, entryMax, currentPrice].filter((v): v is number => typeof v === 'number' && v > 0);
  if (vals.length < 2) {
    // targetPrice のみ
    if (row.targetPrice && row.targetPrice > 0) {
      const cp = currentPrice || 0;
      const diff = cp > 0 ? (cp - row.targetPrice) / row.targetPrice * 100 : null;
      return (
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="text-[10px] font-mono-dm text-[var(--text-muted)]">目標</div>
          <div className="font-mono-dm text-xs text-[var(--accent-gold-light)]">${row.targetPrice}</div>
          {diff !== null && (
            <div className={`font-mono-dm text-[10px] ${diff <= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
              {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
            </div>
          )}
        </div>
      );
    }
    return <div className="font-mono-dm text-[10px] text-[var(--text-muted)]">未設定</div>;
  }

  const minScale = Math.min(...vals) * 0.92;
  const maxScale = Math.max(...vals) * 1.08;
  const range = maxScale - minScale || 1;
  const pctN = (v: number) => Math.max(0, Math.min(100, ((v - minScale) / range) * 100));
  const pctS = (v: number) => `${pctN(v).toFixed(2)}%`;

  const hasEntryZone = entryMax != null && entryMax > 0;
  const drawEntryMin = entryMin && entryMin > 0 ? entryMin : minScale;
  const entryL = hasEntryZone ? pctN(drawEntryMin) : 0;
  const entryR = hasEntryZone ? pctN(Math.min(maxScale, entryMax!)) : 0;
  const inZone = hasEntryZone && currentPrice != null && currentPrice > 0 && currentPrice <= entryMax!;

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  // ValuationGauge と同様のラベル近接判定（重複回避）
  const bearPct = bear != null ? pctN(bear) : null;
  const basePct = base != null ? pctN(base) : null;
  const bullPct = bull != null ? pctN(bull) : null;
  const TOO_CLOSE = 14;
  const baseStagger =
    basePct != null && (
      (bearPct != null && Math.abs(basePct - bearPct) < TOO_CLOSE) ||
      (bullPct != null && Math.abs(basePct - bullPct) < TOO_CLOSE)
    );

  return (
    <div className="min-w-[200px] max-w-[240px]">
      {/* バー（ValuationGauge と同スタイル、コンパクト h-5） */}
      <div
        className="relative h-5 rounded-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {/* Entry Zone: 塗り + 左右ボーダー */}
        {hasEntryZone && (
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `${entryL.toFixed(2)}%`,
              width: `${Math.max(0, entryR - entryL).toFixed(2)}%`,
              backgroundColor: inZone ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.08)',
              borderLeft: `1px solid ${inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.35)'}`,
              borderRight: `1px solid ${inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.35)'}`,
            }}
          />
        )}
        {/* Bear ライン */}
        {bear != null && (
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: pctS(bear), backgroundColor: 'var(--accent-red)', opacity: 0.75 }}
          />
        )}
        {/* Base ライン（太め） */}
        {base != null && (
          <div
            className="absolute top-0 bottom-0"
            style={{ left: pctS(base), width: '2px', backgroundColor: 'var(--accent-gold)' }}
          />
        )}
        {/* Bull ライン */}
        {bull != null && (
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: pctS(bull), backgroundColor: 'var(--accent-green)', opacity: 0.75 }}
          />
        )}
        {/* 現在株価ライン */}
        {currentPrice != null && currentPrice > 0 && (
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{
              left: pctS(currentPrice),
              width: '2px',
              backgroundColor: inZone ? 'var(--accent-green)' : 'rgba(255,255,255,0.85)',
            }}
          />
        )}
      </div>

      {/* ラベル行：Bear/Base/Bull テキスト + 価格、近接時 Base を下段にずらす */}
      <div className="relative h-9 mt-0.5">
        {bear != null && (
          <div className="absolute top-1 text-center" style={{ left: pctS(bear), transform: 'translateX(-50%)' }}>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-red)' }}>Bear</div>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-red)' }}>{fmt(bear)}</div>
          </div>
        )}
        {base != null && (
          <div
            className="absolute text-center"
            style={{ left: pctS(base), transform: 'translateX(-50%)', top: baseStagger ? '16px' : '4px' }}
          >
            <div className="font-mono-dm text-[8px] font-bold leading-snug" style={{ color: 'var(--accent-gold)' }}>Base</div>
            <div className="font-mono-dm text-[8px] font-bold leading-snug" style={{ color: 'var(--accent-gold-light)' }}>{fmt(base)}</div>
          </div>
        )}
        {bull != null && (
          <div className="absolute top-1 text-center" style={{ left: pctS(bull), transform: 'translateX(-50%)' }}>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-green)' }}>Bull</div>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-green)' }}>{fmt(bull)}</div>
          </div>
        )}
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
  const { holdings, updateHolding, removeHolding, addAnalysisEntry: addHoldingHistory } = useHoldingsStore();
  const { items: watchlistItems, updateItem: updateWatchlistItem, removeItem: removeWatchlistItem, addAnalysisEntry: addWatchlistHistory } = useWatchlistStore();

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
        const order = { reached: 0, near: 1, far: 2, none: 3 };
        val = order[a.entryStatus] - order[b.entryStatus];
        if (val === 0) val = a.distancePercent - b.distancePercent;
      } else if (sortKey === 'ticker') {
        val = a.ticker.localeCompare(b.ticker);
      } else if (sortKey === 'currentPrice') {
        val = (a.currentPrice ?? -1) - (b.currentPrice ?? -1);
      } else if (sortKey === 'signal') {
        const signalOrder = { 'Strong Buy': 0, 'Buy': 1, 'Buy on Dip': 2, 'Watch': 3, 'Sell': 4, 'None': 5 };
        const aS = (a.rawHolding?.analysis?.investmentSignal ?? a.rawWatchlistItem?.analysis?.investmentSignal ?? 'None') as keyof typeof signalOrder;
        const bS = (b.rawHolding?.analysis?.investmentSignal ?? b.rawWatchlistItem?.analysis?.investmentSignal ?? 'None') as keyof typeof signalOrder;
        val = (signalOrder[aS] ?? 5) - (signalOrder[bS] ?? 5);
      } else if (sortKey === 'score') {
        val = (b.rawHolding?.analysis?.fundamentalScore ?? b.rawWatchlistItem?.analysis?.fundamentalScore ?? -1)
            - (a.rawHolding?.analysis?.fundamentalScore ?? a.rawWatchlistItem?.analysis?.fundamentalScore ?? -1);
      } else if (sortKey === 'tier') {
        val = (a.tier ?? 99) - (b.tier ?? 99);
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

  // ─── ソートカラムヘッダー ────────────────────────────────────
  const ColHeader = ({
    label, keyName, subLabel, align = 'left',
  }: {
    label: string; keyName: SortKey; subLabel?: string; align?: 'left' | 'right' | 'center';
  }) => {
    const active = sortKey === keyName;
    const handleClick = () => {
      if (active) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortKey(keyName); setSortDir('asc'); }
    };
    const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
    return (
      <th
        onClick={handleClick}
        className={`p-3 cursor-pointer select-none group transition-colors ${active ? 'bg-[var(--accent-blue)]/5' : 'hover:bg-[var(--bg-hover)]/50'}`}
      >
        <div className={`flex items-center gap-1 ${alignClass}`}>
          <span className={`font-mono-dm text-[10px] tracking-widest uppercase transition-colors ${active ? 'text-[var(--accent-blue-light)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'}`}>
            {label}
          </span>
          <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
            {active
              ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[var(--accent-blue-light)]" /> : <ChevronDown className="w-3 h-3 text-[var(--accent-blue-light)]" />)
              : <ChevronUp className="w-3 h-3 text-[var(--text-muted)]/30 group-hover:text-[var(--text-muted)]/60 transition-colors" />
            }
          </span>
        </div>
        {subLabel && (
          <div className={`flex ${alignClass}`}>
            <span className="text-[8px] opacity-50 normal-case tracking-normal font-normal font-mono-dm text-[var(--text-muted)]">{subLabel}</span>
          </div>
        )}
      </th>
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
              <Plus className="w-3.5 h-3.5" /> 銘柄を追加
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
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ティッカー / 銘柄名 で検索"
              className="bg-transparent text-xs font-mono-dm text-white outline-none placeholder:text-[var(--text-muted)] w-full"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[var(--text-muted)] hover:text-white transition-colors shrink-0"
                title="検索をクリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {sortKey !== 'proximity' && (
              <button
                onClick={() => { setSortKey('proximity'); setSortDir('asc'); }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono-dm text-[var(--text-muted)] border border-[var(--border)] rounded hover:text-white hover:border-[var(--text-muted)] transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3" /> リセット
              </button>
            )}
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)]">表示: {displayRows.length} 件</span>
          </div>
        </div>
      </div>

      {/* ─── テーブル ─── */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <ColHeader label="価格帯" keyName="proximity" subLabel="クリックで並び替え" />
                <ColHeader label="銘柄" keyName="ticker" />
                <ColHeader label="現在株価" keyName="currentPrice" align="right" />
                <th className="p-3 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal">
                  Bear / Entry Zone / Base / Bull
                </th>
                <ColHeader label="AI推奨" keyName="signal" subLabel="最終分析時" align="center" />
                <ColHeader label="Score" keyName="score" align="right" />
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
          onDelete={(id, source) => {
            if (source === 'holding') removeHolding(id);
            else removeWatchlistItem(id);
            setSelectedRow(null);
          }}
        />
      )}

      {/* 銘柄追加モーダル（統合） */}
      {showAddWatchlist && (
        <AddStockModal
          onClose={() => setShowAddWatchlist(false)}
          onSuccess={(addedTicker) => {
            // 追加した銘柄がすぐ見えるようフィルター・検索を設定
            setFilter('all');
            setSearch(addedTicker);
          }}
        />
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


