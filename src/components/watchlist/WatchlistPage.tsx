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
import { GradeBadge } from '../shared/GradeBadge';
import { MiniPriceGauge } from '../shared/MiniPriceGauge';

// ─── ローカル型 ────────────────────────────────────────────

type FilterType = 'all' | 'holding' | 'watchlist' | 'blist';
type SortKey = 'proximity' | 'ticker' | 'currentPrice' | 'signal' | 'score' | 'tier';
type SortDir = 'asc' | 'desc';
type EntryStatusFilter = UnifiedRow['entryStatus'] | null;
type SignalFilter = 'Strong Buy' | 'Buy' | 'Buy on Dip' | 'Watch' | 'Sell' | 'None' | null;

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
  const { holdings, addHolding, updateHolding, removeHolding, addAnalysisEntry: addHoldingHistory } = useHoldingsStore();
  const { items: watchlistItems, updateItem: updateWatchlistItem, removeItem: removeWatchlistItem, addAnalysisEntry: addWatchlistHistory } = useWatchlistStore();

  const [selectedRow, setSelectedRow] = useState<UnifiedRow | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<EntryStatusFilter>(null);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>(null);
  const [sortKey, setSortKey] = useState<SortKey>('proximity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);

  const getSignal = (r: UnifiedRow): string =>
    r.rawHolding?.analysis?.investmentSignal ?? r.rawWatchlistItem?.analysis?.investmentSignal ?? 'None';

  // ─── 統合行リスト ───────────────────────────────────────────
  const allRows = useMemo<UnifiedRow[]>(() => {
    const holdingRows = holdings.map(h => computeRow(h, 'holding'));
    const watchlistRows = watchlistItems.map(w => computeRow(w, 'watchlist'));
    return [...holdingRows, ...watchlistRows];
  }, [holdings, watchlistItems]);

  // ─── Grade 判定（Score の S,A = メイン / B,C,D = Bリスト）────────────────────
  const getGrade = (r: UnifiedRow): 'S' | 'A' | 'B' | 'C' | 'D' | undefined =>
    r.rawWatchlistItem?.analysis?.fundamentalGrade ?? r.rawHolding?.analysis?.fundamentalGrade;
  const isGradeBOrBelow = (r: UnifiedRow): boolean => {
    const g = getGrade(r);
    return g === 'B' || g === 'C' || g === 'D';
  };

  // ─── フィルター + 検索 + ソート ─────────────────────────────
  // 「すべて」「ウォッチリスト」は Grade S/A（および未分析）。B以下は Bリストタブでのみ表示。保有銘柄は常に「保有銘柄」に表示。
  const displayRows = useMemo(() => {
    let rows = allRows;

    // フィルター
    if (filter === 'holding') {
      rows = rows.filter(r => r.source === 'holding');
    } else if (filter === 'watchlist') {
      rows = rows.filter(r => r.source === 'watchlist' && !isGradeBOrBelow(r));
    } else if (filter === 'blist') {
      rows = rows.filter(r => r.source === 'watchlist' && isGradeBOrBelow(r)); // ウォッチのみ B/C/D（保有は除外）
    } else {
      // 'all': 保有銘柄 + ウォッチリストの S/A のみ（B以下は一覧に含めない）
      rows = rows.filter(r => r.source === 'holding' || (r.source === 'watchlist' && !isGradeBOrBelow(r)));
    }

    // エントリー状況フィルター（IN ZONE / 接近中 など）
    if (statusFilter) rows = rows.filter(r => r.entryStatus === statusFilter);
    // AI推奨フィルター
    if (signalFilter) rows = rows.filter(r => getSignal(r) === signalFilter);

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
  }, [allRows, filter, statusFilter, signalFilter, search, sortKey, sortDir]);

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

  // 統計サマリー（ウォッチ = Grade S/A または未分析、Bリスト = ウォッチの Grade B/C/D のみ、保有は含めない）
  const stats = useMemo(() => {
    const holdings = allRows.filter(r => r.source === 'holding');
    const watchlistMain = allRows.filter(r => r.source === 'watchlist' && !isGradeBOrBelow(r));
    const watchlistB = allRows.filter(r => r.source === 'watchlist' && isGradeBOrBelow(r));
    return {
      total: holdings.length + watchlistMain.length + watchlistB.length,
      inZone: allRows.filter(r => r.entryStatus === 'reached').length,
      near: allRows.filter(r => r.entryStatus === 'near').length,
      holdings: holdings.length,
      watchlist: watchlistMain.length,
      blist: watchlistB.length,
    };
  }, [allRows]);

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
              className="flex items-center gap-2 px-5 py-3 text-xs font-mono-dm tracking-widest text-[var(--accent-purple)] border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/10 hover:bg-[var(--accent-purple)]/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> 銘柄を追加
            </button>
            <button
              onClick={handleBatchUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2 px-5 py-3 text-xs font-mono-dm tracking-widest text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating
                ? `更新中 ${updateProgress.current}/${updateProgress.total}`
                : '株価を一括更新'}
            </button>
          </div>
        </div>

        {/* サマリーカード（タップでフィルタ適用） */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { key: 'total' as const, label: '総銘柄数', value: stats.total, color: 'text-white' },
            { key: 'inZone' as const, label: '🔥 IN ZONE', value: stats.inZone, color: 'text-[var(--accent-green)]' },
            { key: 'near' as const, label: '🟡 接近中', value: stats.near, color: 'text-[var(--accent-gold-light)]' },
            { key: 'holding' as const, label: '保有銘柄', value: stats.holdings, color: 'text-[var(--accent-blue-light)]' },
            { key: 'watchlist' as const, label: 'ウォッチ', value: stats.watchlist, color: 'text-[var(--accent-purple)]' },
            { key: 'blist' as const, label: 'Bリスト', value: stats.blist, color: 'text-[var(--text-secondary)]' },
          ].map(s => {
            const isActive =
              s.key === 'total' ? (filter === 'all' && !statusFilter && !signalFilter) :
              s.key === 'inZone' ? statusFilter === 'reached' :
              s.key === 'near' ? statusFilter === 'near' :
              s.key === 'holding' ? filter === 'holding' :
              s.key === 'watchlist' ? filter === 'watchlist' :
              s.key === 'blist' ? filter === 'blist' : false;
            const handleCardClick = () => {
              if (s.key === 'total') {
                setFilter('all');
                setStatusFilter(null);
                setSignalFilter(null);
              } else if (s.key === 'inZone') {
                setStatusFilter('reached');
              } else if (s.key === 'near') {
                setStatusFilter('near');
              } else if (s.key === 'holding') {
                setFilter('holding');
                setStatusFilter(null);
              } else if (s.key === 'watchlist') {
                setFilter('watchlist');
                setStatusFilter(null);
              } else if (s.key === 'blist') {
                setFilter('blist');
                setStatusFilter(null);
              }
            };
            return (
              <button
                key={s.label}
                type="button"
                onClick={handleCardClick}
                className={`bg-[var(--bg-card)] border px-4 py-3 rounded text-center transition-all hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]/50 ${isActive ? 'border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/30' : 'border-[var(--border)]'}`}
              >
                <div className={`font-mono-dm text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="font-mono-dm text-[10px] text-[var(--text-muted)] mt-1">{s.label}</div>
              </button>
            );
          })}
        </div>

        {/* フィルター + 検索 + ソート */}
        <div className="flex flex-wrap items-center gap-3">
          {/* フィルタータブ */}
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border)] rounded overflow-hidden">
            {([['all', 'すべて'], ['holding', '保有銘柄'], ['watchlist', 'ウォッチリスト'], ['blist', 'Bリスト']] as [FilterType, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 text-xs font-mono-dm tracking-widest transition-colors ${filter === key
                  ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue-light)] border-b-2 border-[var(--accent-blue)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* AI推奨フィルター */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase mr-1">AI推奨:</span>
            {([null, 'Strong Buy', 'Buy', 'Buy on Dip', 'Watch', 'Sell', 'None'] as SignalFilter[]).map(sig => (
              <button
                key={sig ?? 'all'}
                type="button"
                onClick={() => setSignalFilter(sig)}
                className={`px-2.5 py-1 text-[10px] font-mono-dm tracking-wide rounded border transition-colors ${signalFilter === sig
                  ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue-light)] border-[var(--accent-blue)]'
                  : 'text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                }`}
              >
                {sig ?? 'すべて'}
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
              className="bg-transparent text-sm font-mono-dm text-white outline-none placeholder:text-[var(--text-muted)] w-full py-1"
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
                    <td className="p-4 align-middle">
                      <EntryStatusBadge status={row.entryStatus} distancePercent={row.distancePercent} />
                    </td>

                    {/* 銘柄 */}
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div>
                          <div className="font-mono-dm font-bold text-white text-base group-hover:text-[var(--accent-blue-light)] transition-colors">
                            {row.ticker}
                          </div>
                          {grade && <GradeBadge grade={grade} />}
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
                    <td className="p-4 align-middle text-right">
                      <div className={`font-mono-dm text-base font-medium ${row.entryStatus === 'reached' ? 'text-[var(--accent-green)]' : 'text-white'}`}>
                        {row.currentPrice != null ? `$${row.currentPrice.toFixed(2)}` : '---'}
                      </div>
                      {isOwned && blendedAvgCost > 0 && row.currentPrice ? (
                        <div className={`font-mono-dm text-[11px] ${row.currentPrice >= blendedAvgCost ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                          {((row.currentPrice - blendedAvgCost) / blendedAvgCost * 100).toFixed(1)}%
                        </div>
                      ) : null}
                    </td>

                    {/* ミニゲージ */}
                    <td className="p-4 align-middle">
                      <MiniPriceGauge row={row} />
                    </td>

                    {/* Signal */}
                    <td className="p-4 align-middle text-center">
                      {signal ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <SignalBadge signal={signal} />
                          {lastAnalysisDate && (
                            <span className="text-[10px] text-[var(--text-muted)] font-mono-dm">
                              {formatRelativeDate(lastAnalysisDate)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[11px]">-</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="p-4 align-middle text-right">
                      {score != null ? (
                        <div className="flex items-center justify-end gap-2">
                          {grade && <GradeBadge grade={grade} />}
                          <span className="font-mono-dm text-sm text-[var(--text-secondary)]">{score}/90</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] text-[11px]">-</span>
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
          onUpgradeToHolding={(watchlistId, newHolding) => {
            addHolding(newHolding);
            removeWatchlistItem(watchlistId);
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


