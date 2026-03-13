import { useState, useMemo, useEffect } from 'react';
import { Plus, Briefcase, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, X, FlaskConical, ChevronDown, ChevronUp, Search, Save } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { StockDetailModal } from '../watchlist/StockDetailModal';
import { AddStockModal } from '../shared/AddStockModal';
import { SIGNAL_STYLE } from '../shared/SignalBadge';
import { ValuationGauge } from '../shared/ValuationGauge';
import { MiniPriceGauge } from '../shared/MiniPriceGauge';
import { computeRow } from '../../lib/stockRow';
import type { UnifiedRow } from '../../lib/stockRow';
import type { Holding, WatchlistItem } from '../../types';
import { GradeBadge, getGradeMeta, getWeightFromFundamentalScore } from '../shared/GradeBadge';

const SIGNAL_MULT: Record<string, number> = {
  'Strong Buy': 1.5, 'Buy': 1.25, 'Buy on Dip': 1.0, 'Watch': 0.75, 'Sell': 0.5, 'None': 1.0,
};

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6',
  '#a78bfa', '#fbbf24', '#34d399', '#fb7185', '#60a5fa',
  '#e879f9', '#4ade80', '#fb923c', '#38bdf8', '#a3e635',
];

const SIM_COLORS = [
  '#f43f5e', '#0ea5e9', '#d946ef', '#22d3ee', '#a3e635',
  '#fb923c', '#818cf8', '#34d399', '#fbbf24', '#c084fc',
];

function getIdealWeight(h: Holding): number {
  const base = h.analysis != null && h.analysis.fundamentalScore != null
    ? getWeightFromFundamentalScore(h.analysis.fundamentalScore)
    : h.aiAlignmentScore;
  const signalMult = h.analysis?.investmentSignal
    ? (SIGNAL_MULT[h.analysis.investmentSignal] ?? 1.0)
    : 1.0;
  const statusMult = (h.status === 'sell' || h.status === 'reduce') ? 0.5 : 1.0;
  return base * signalMult * statusMult;
}

function getSimWeight(w: WatchlistItem | Holding): number {
  if (w.analysis != null && w.analysis.fundamentalScore != null) {
    const base = getWeightFromFundamentalScore(w.analysis.fundamentalScore);
    const signalMult = w.analysis.investmentSignal ? (SIGNAL_MULT[w.analysis.investmentSignal] ?? 1.0) : 1.0;
    return base * signalMult;
  }
  if ('tier' in w) {
    const tierMult = w.tier === 1 ? 1.0 : w.tier === 2 ? 0.75 : 0.5;
    return (w.priority ?? 3) * tierMult;
  }
  return w.aiAlignmentScore;
}

interface SimEntry {
  id: string;
  ticker: string;
  name: string;
  source: 'holding' | 'watchlist';
  account: 'tokutei' | 'nisa';
  shares: number;       // プラスは買付、マイナスは売却
  currentPrice: number;
}

const GRID = 'grid grid-cols-[16px_1fr_220px_110px_72px_72px_72px_108px_110px] gap-x-4 items-center';

export function ThesisPage() {
  const { holdings, addHolding, updateHolding, removeHolding, addAnalysisEntry: addHoldingHistory } = useHoldingsStore();
  const { items: watchlistItems, removeItem: removeWatchlistItem } = useWatchlistStore();
  const [selected, setSelected] = useState<UnifiedRow | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [showAllCurrentDetails, setShowAllCurrentDetails] = useState(false);
  const [showAllIdealDetails, setShowAllIdealDetails] = useState(false);

  const [showSim, setShowSim] = useState(false);
  const [showSimPicker, setShowSimPicker] = useState(false);
  const [simSearch, setSimSearch] = useState('');

  const [simEntries, setSimEntries] = useState<SimEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem('finai-sim-entries');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    sessionStorage.setItem('finai-sim-entries', JSON.stringify(simEntries));
  }, [simEntries]);

  const portfolioHoldings = useMemo(() => {
    return holdings
      .filter(h => (h.shares || 0) + (h.sharesNisa || 0) > 0)
      .sort((a, b) => {
        const valA = ((a.shares || 0) + (a.sharesNisa || 0)) * (a.currentPrice || 0);
        const valB = ((b.shares || 0) + (b.sharesNisa || 0)) * (b.currentPrice || 0);
        return valB - valA;
      });
  }, [holdings]);

  const totalValue = portfolioHoldings.reduce((sum, h) => {
    const totalShares = (h.shares || 0) + (h.sharesNisa || 0);
    return sum + totalShares * (h.currentPrice || 0);
  }, 0);
  const totalCost = portfolioHoldings.reduce((sum, h) => {
    return sum + (h.shares || 0) * (h.avgCost || 0) + (h.sharesNisa || 0) * (h.avgCostNisa || 0);
  }, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isProfit = totalPnl >= 0;

  const currentData = useMemo(() => {
    if (totalValue === 0) return [];
    return portfolioHoldings
      .map((h, i) => {
        const totalShares = (h.shares || 0) + (h.sharesNisa || 0);
        const value = totalShares * (h.currentPrice || 0);
        return { id: h.id, name: h.ticker, value, pct: (value / totalValue) * 100, color: CHART_COLORS[i % CHART_COLORS.length] };
      })
      .filter(d => d.value > 0);
  }, [portfolioHoldings, totalValue]);

  const idealData = useMemo(() => {
    const totalWeight = portfolioHoldings.reduce((sum, h) => sum + getIdealWeight(h), 0);
    if (totalWeight === 0) return [];
    return portfolioHoldings.map((h, i) => {
      const idealPct = (getIdealWeight(h) / totalWeight) * 100;
      const totalShares = (h.shares || 0) + (h.sharesNisa || 0);
      const value = totalShares * (h.currentPrice || 0);
      const sharesToBuy = h.currentPrice && h.currentPrice > 0 && totalValue > 0
        ? (totalValue * (idealPct / 100) - value) / h.currentPrice
        : null;
      return { id: h.id, name: h.ticker, pct: idealPct, sharesToBuy, color: CHART_COLORS[i % CHART_COLORS.length] };
    });
  }, [portfolioHoldings, totalValue]);

  const rows = useMemo(() => {
    const totalIdealWeight = portfolioHoldings.reduce((sum, h) => sum + getIdealWeight(h), 0);
    return portfolioHoldings.map((h, i) => {
      const totalShares = (h.shares || 0) + (h.sharesNisa || 0);
      const value = totalShares * (h.currentPrice || 0);
      const cost = (h.shares || 0) * (h.avgCost || 0) + (h.sharesNisa || 0) * (h.avgCostNisa || 0);
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const currentPct = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const idealWeight = getIdealWeight(h);
      const idealPct = totalIdealWeight > 0 ? (idealWeight / totalIdealWeight) * 100 : 0;
      const gap = idealPct - currentPct;
      const sharesToBuy = h.currentPrice && h.currentPrice > 0 && totalValue > 0
        ? (totalValue * (idealPct / 100) - value) / h.currentPrice
        : null;
      return { holding: h, value, pnl, pnlPct, currentPct, idealPct, gap, sharesToBuy, color: CHART_COLORS[i % CHART_COLORS.length], grade: h.analysis?.fundamentalGrade };
    });
  }, [portfolioHoldings, totalValue]);

  const focusedHolding = focusedId
    ? portfolioHoldings.find(h => h.id === focusedId) ?? null
    : null;

  const simAvailableItems = useMemo(() => {
    const usedIds = new Set(simEntries.map(e => e.id));
    const wItems = watchlistItems
      .filter(w => !usedIds.has(w.id) && (w.currentPrice ?? 0) > 0)
      .map(w => ({ item: w, source: 'watchlist' as const, row: computeRow(w, 'watchlist') }));

    const hItems = portfolioHoldings
      .filter(h => !usedIds.has(h.id) && (h.currentPrice ?? 0) > 0)
      .map(h => ({ item: h, source: 'holding' as const, row: computeRow(h, 'holding') }));

    return [...hItems, ...wItems].sort((a, b) => {
      const SIM_STATUS_ORDER: Record<string, number> = { reached: 0, near: 1, far: 2, none: 3 };
      const sA = SIM_STATUS_ORDER[a.row.entryStatus] ?? 3;
      const sB = SIM_STATUS_ORDER[b.row.entryStatus] ?? 3;
      if (sA !== sB) return sA - sB;
      return a.row.distancePercent - b.row.distancePercent;
    });
  }, [watchlistItems, portfolioHoldings, simEntries]);

  const filteredSimAvailable = useMemo(() => {
    if (!simSearch.trim()) return simAvailableItems;
    const q = simSearch.trim().toUpperCase();
    return simAvailableItems.filter(({ item }) =>
      item.ticker.toUpperCase().includes(q) || item.name.toUpperCase().includes(q)
    );
  }, [simAvailableItems, simSearch]);

  const simAddedValue = useMemo(() =>
    simEntries.reduce((sum, e) => sum + (e.shares * e.currentPrice), 0),
    [simEntries]
  );

  const simIdealData = useMemo(() => {
    if (simEntries.length === 0) return [];

    let totalWeight = portfolioHoldings.reduce((s, h) => s + getIdealWeight(h), 0);
    simEntries.filter(e => e.source === 'watchlist').forEach(e => {
      const w = watchlistItems.find(x => x.id === e.id);
      if (w) totalWeight += getSimWeight(w);
    });

    return simEntries.map(e => {
      let weight = 0;
      let refItem: Holding | WatchlistItem | undefined;

      if (e.source === 'watchlist') {
        refItem = watchlistItems.find(x => x.id === e.id);
        weight = refItem ? getSimWeight(refItem) : 1;
      } else {
        refItem = portfolioHoldings.find(x => x.id === e.id);
        weight = refItem ? getIdealWeight(refItem as Holding) : 1;
      }

      const idealPct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      const projectedTotalValue = totalValue + simAddedValue;
      const targetValue = projectedTotalValue * (idealPct / 100);

      let currentOwnedShares = 0;
      if (e.source === 'holding') {
        const h = portfolioHoldings.find(x => x.id === e.id);
        if (h) currentOwnedShares = (h.shares || 0) + (h.sharesNisa || 0);
      }

      const suggestedDeltaShares = e.currentPrice > 0
        ? Math.round((targetValue - (currentOwnedShares * e.currentPrice)) / e.currentPrice)
        : 0;

      return {
        id: e.id, idealPct, suggestedDeltaShares,
        grade: refItem?.analysis?.fundamentalGrade,
        signal: refItem?.analysis?.investmentSignal,
      };
    });
  }, [simEntries, watchlistItems, portfolioHoldings, totalValue, simAddedValue]);

  const simChartData = useMemo(() => {
    let updatedTotal = 0;

    const updatedItems = portfolioHoldings.map((h, i) => {
      let totalS = (h.shares || 0) + (h.sharesNisa || 0);
      const sim = simEntries.find(e => e.id === h.id);
      if (sim) {
        totalS += sim.shares;
      }
      const val = Math.max(0, totalS * (h.currentPrice || 0));
      updatedTotal += val;
      return { id: h.id, name: h.ticker, value: val, simulated: !!sim && sim.shares !== 0, source: 'holding' as const, color: CHART_COLORS[i % CHART_COLORS.length] };
    });

    const newItems = simEntries.filter(e => e.source === 'watchlist' && e.shares > 0).map((e, i) => {
      const val = e.shares * e.currentPrice;
      updatedTotal += val;
      return { id: e.id, name: e.ticker, value: val, simulated: true, source: 'watchlist' as const, color: SIM_COLORS[i % SIM_COLORS.length] };
    });

    const combined = [...updatedItems, ...newItems].filter(x => x.value > 0);
    return combined.map(item => ({
      ...item,
      pct: updatedTotal > 0 ? (item.value / updatedTotal) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [portfolioHoldings, simEntries]);

  const handleReflectSimulation = () => {
    if (!window.confirm('シミュレーションの構成をポートフォリオに反映しますか？\n(※買付の平均取得単価は現在の価格で再計算されます)')) return;

    simEntries.forEach(entry => {
      if (entry.shares === 0) return;
      const isBuy = entry.shares > 0;
      const absShares = Math.abs(entry.shares);

      if (entry.source === 'holding') {
        const holding = holdings.find(h => h.id === entry.id);
        if (!holding) return;

        let newShares = holding.shares || 0;
        let newCost = holding.avgCost || 0;
        let newSharesNisa = holding.sharesNisa || 0;
        let newCostNisa = holding.avgCostNisa || 0;

        if (entry.account === 'tokutei') {
          if (isBuy) {
            newCost = ((newShares * newCost) + (absShares * entry.currentPrice)) / (newShares + absShares);
            newShares += absShares;
          } else {
            newShares -= absShares;
            if (newShares <= 0) { newShares = 0; newCost = 0; }
          }
          updateHolding(entry.id, { shares: newShares, avgCost: newCost });
        } else {
          if (isBuy) {
            newCostNisa = ((newSharesNisa * newCostNisa) + (absShares * entry.currentPrice)) / (newSharesNisa + absShares);
            newSharesNisa += absShares;
          } else {
            newSharesNisa -= absShares;
            if (newSharesNisa <= 0) { newSharesNisa = 0; newCostNisa = 0; }
          }
          updateHolding(entry.id, { sharesNisa: newSharesNisa, avgCostNisa: newCostNisa });
        }
      } else {
        if (!isBuy) return;
        const w = watchlistItems.find(w => w.id === entry.id);
        if (!w) return;

        addHolding({
          id: w.ticker.toLowerCase().replace(/\s+/g, '-'),
          ticker: w.ticker,
          name: w.name,
          sector: 'other',
          aiAlignmentScore: 3,
          thesis: w.thesis || '',
          sellTriggers: '',
          watchMetrics: '',
          status: 'monitor',
          notes: w.notes || '',
          shares: entry.account === 'tokutei' ? absShares : undefined,
          avgCost: entry.account === 'tokutei' ? entry.currentPrice : undefined,
          sharesNisa: entry.account === 'nisa' ? absShares : undefined,
          avgCostNisa: entry.account === 'nisa' ? entry.currentPrice : undefined,
          currentPrice: w.currentPrice,
          lastUpdated: new Date().toISOString().slice(0, 10),
          analysis: w.analysis,
          analysisHistory: w.analysisHistory
        });
        removeWatchlistItem(w.id);
      }
    });

    setSimEntries([]);
    setShowSim(false);
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif-display text-white mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-[var(--accent-gold)]" /> ポートフォリオ管理
          </h1>
          <p className="font-mono-dm text-xs text-[var(--text-muted)] tracking-widest uppercase">
            現在の配分 vs 理想の配分（ファンダメンタル・スコア × AI推奨ベース）
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 font-mono-dm text-[11px] tracking-widest bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold-light)] transition-colors"
        >
          <Plus className="w-4 h-4" /> 銘柄を追加
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] border-t-2 border-t-[var(--accent-blue)] p-6">
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">Total Market Value</div>
          <div className="font-mono-dm text-3xl text-white">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] border-t-2 border-t-[var(--accent-gold)] p-6">
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">Total Cost Basis</div>
          <div className="font-mono-dm text-3xl text-white">
            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`bg-[var(--bg-card)] border border-[var(--border)] border-t-2 p-6 ${isProfit ? 'border-t-[var(--accent-green)]' : 'border-t-[var(--accent-red)]'}`}>
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">Unrealized P&L</div>
          <div className="flex items-end gap-3">
            <div className={`font-mono-dm text-3xl ${isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
              {isProfit ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`font-mono-dm text-sm pb-1 ${isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
              ({isProfit ? '+' : ''}{totalPnlPct.toFixed(2)}%)
            </div>
          </div>
          {isProfit
            ? <TrendingUp className="w-5 h-5 text-[var(--accent-green)] mt-1" />
            : <TrendingDown className="w-5 h-5 text-[var(--accent-red)] mt-1" />
          }
        </div>
      </div>

      {showAddForm && <AddStockModal onClose={() => setShowAddForm(false)} />}

      {portfolioHoldings.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[var(--border-light)] rounded-lg">
          <Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)] tracking-wider">保有銘柄がありません</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">銘柄を追加して保有数を入力するとここに表示されます</p>
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 mb-6 space-y-6">

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">現在の配分</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">時価ベース</div>
                </div>
                <button onClick={() => setShowAllCurrentDetails(v => !v)} className="flex items-center gap-1 font-mono-dm text-[10px] text-[var(--accent-blue)] hover:text-white transition-colors">
                  {showAllCurrentDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAllCurrentDetails ? '詳細を閉じる' : '全銘柄の詳細'}
                </button>
              </div>
              <div className="flex w-full h-10 rounded overflow-hidden">
                {currentData.map((entry) => {
                  const isFocused = focusedId === entry.id;
                  const dimmed = focusedId && !isFocused;
                  return (
                    <div
                      key={entry.id}
                      className="relative flex items-center justify-center overflow-hidden transition-all cursor-pointer"
                      style={{ width: `${entry.pct}%`, backgroundColor: entry.color, minWidth: entry.pct > 0 ? '2px' : '0', opacity: dimmed ? 0.3 : 1, outline: isFocused ? '2px solid white' : 'none', outlineOffset: '-2px' }}
                      title={`${entry.name}: $${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${entry.pct.toFixed(1)}%)`}
                      onClick={() => setFocusedId(isFocused ? null : entry.id)}
                    >
                      {entry.pct >= 5 && (
                        <span className="font-mono-dm text-[9px] font-bold text-white leading-tight text-center whitespace-nowrap px-0.5 select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                          {entry.name}<br />{entry.pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {showAllCurrentDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
                  {currentData.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-[11px] px-2 py-1 bg-[var(--bg-card)] rounded">
                      <div className="flex items-center gap-1.5 font-mono-dm font-bold text-white">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                        {entry.name}
                      </div>
                      <div className="font-mono-dm text-[var(--text-muted)] text-right">
                        {entry.pct.toFixed(1)}% <span className="opacity-60">(${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)]" />

            <div>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">理想の配分</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                    <span className="text-[11px] text-[var(--text-muted)]">Grade：</span>
                    {(['S', 'A', 'B', 'C', 'D'] as const).map((g) => (
                      <GradeBadge key={g} grade={g} />
                    ))}
                    <span className="text-[11px] text-[var(--text-muted)] ml-2">× AI推奨：</span>
                    {(['Strong Buy', 'Buy', 'Buy on Dip', 'Watch', 'Sell'] as const).map((s) => (
                      <span key={s} className={`font-mono-dm text-[9px] px-1.5 py-0.5 border rounded ${SIGNAL_STYLE[s]}`}>{s} ×{SIGNAL_MULT[s]}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setShowAllIdealDetails(v => !v)} className="flex items-center gap-1 font-mono-dm text-[10px] text-[var(--accent-gold)] hover:text-white transition-colors shrink-0">
                  {showAllIdealDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAllIdealDetails ? '詳細を閉じる' : '全銘柄の詳細'}
                </button>
              </div>
              <div className="flex w-full h-10 rounded overflow-hidden">
                {idealData.map((entry) => {
                  const rd = entry.sharesToBuy !== null ? Math.round(entry.sharesToBuy) : null;
                  const hasDelta = rd !== null && Math.abs(rd) >= 1;
                  const deltaText = hasDelta ? `${rd! > 0 ? '+' : ''}${rd}株` : null;
                  const isFocused = focusedId === entry.id;
                  const dimmed = focusedId && !isFocused;
                  return (
                    <div
                      key={entry.id}
                      className="relative flex items-center justify-center overflow-hidden transition-all cursor-pointer"
                      style={{ width: `${entry.pct}%`, backgroundColor: entry.color, minWidth: entry.pct > 0 ? '2px' : '0', opacity: dimmed ? 0.3 : 1, outline: isFocused ? '2px solid white' : 'none', outlineOffset: '-2px' }}
                      title={`${entry.name}: ${entry.pct.toFixed(1)}%${hasDelta ? ` (${deltaText})` : ''}`}
                      onClick={() => setFocusedId(isFocused ? null : entry.id)}
                    >
                      {entry.pct >= 5 && (
                        <span className="font-mono-dm text-[9px] font-bold text-white leading-tight text-center whitespace-nowrap px-0.5 select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                          {entry.name}<br />{entry.pct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {showAllIdealDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 p-3 bg-[var(--bg-secondary)] rounded border border-[var(--border)]">
                  {idealData.map(entry => {
                    const rd = entry.sharesToBuy !== null ? Math.round(entry.sharesToBuy) : null;
                    const hasDelta = rd !== null && Math.abs(rd) >= 1;
                    return (
                      <div key={entry.id} className="flex flex-col text-[11px] px-2 py-1.5 bg-[var(--bg-card)] rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono-dm font-bold text-white">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                            {entry.name}
                          </div>
                          <div className="font-mono-dm text-[var(--accent-gold)] font-bold">{entry.pct.toFixed(1)}%</div>
                        </div>
                        {hasDelta && (
                          <div className={`font-mono-dm text-right text-[9px] mt-0.5 ${rd! > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                            推奨: {rd! > 0 ? '買' : '売'} {Math.abs(rd!)}株
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)]" />
            <div>
              <button
                onClick={() => { setShowSim(v => !v); if (showSim) setShowSimPicker(false); }}
                className="flex items-center gap-2 font-mono-dm text-[11px] tracking-widest text-[var(--accent-purple)] hover:text-white transition-colors"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                シミュレーション
                {simEntries.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] text-[9px] rounded-full">設定中: {simEntries.length}銘柄</span>
                )}
                {showSim ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </button>

              {showSim && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono-dm text-[10px] tracking-widest text-[var(--accent-purple)] uppercase">ポートフォリオ・シミュレーション</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">保有・ウォッチ銘柄の売買（株数または金額の+/-）による構成変化をシミュレート</div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={() => { setShowSimPicker(v => !v); setSimSearch(''); }}
                        className="flex items-center gap-2 px-4 py-2.5 font-mono-dm text-xs border border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/20 transition-colors rounded"
                      >
                        <Plus className="w-4 h-4" /> 銘柄を選ぶ
                      </button>
                      {showSimPicker && (
                        <div className="absolute right-0 top-full mt-1 z-30 w-80 bg-[var(--bg-secondary)] border border-[var(--border)] rounded shadow-xl">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
                            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            <input
                              type="text"
                              placeholder="ティッカー・銘柄名で検索..."
                              value={simSearch}
                              onChange={(ev) => setSimSearch(ev.target.value)}
                              className="flex-1 bg-transparent text-xs text-white placeholder:text-[var(--text-muted)] focus:outline-none"
                              autoFocus
                            />
                            {simSearch && (
                              <button onClick={() => setSimSearch('')} className="text-[var(--text-muted)] hover:text-white">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {filteredSimAvailable.length === 0 ? (
                              <div className="p-3 text-xs text-[var(--text-muted)]">該当なし</div>
                            ) : (
                              filteredSimAvailable.map(({ item: w, source }) => {
                                const { color: gradeColor } = getGradeMeta(w.analysis?.fundamentalGrade);
                                const isHolding = source === 'holding';
                                return (
                                  <button
                                    key={w.id}
                                    onClick={() => {
                                      setSimEntries(prev => [...prev, {
                                        id: w.id, ticker: w.ticker, name: w.name, source,
                                        account: 'tokutei', shares: 0, currentPrice: w.currentPrice!
                                      }]);
                                      setShowSimPicker(false);
                                      setSimSearch('');
                                    }}
                                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border)] last:border-0"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono-dm text-xs font-bold text-white">{w.ticker}</span>
                                        <span className={`font-mono-dm text-[9px] px-1 border rounded ${isHolding ? 'text-[var(--accent-blue)] border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/10' : 'text-[var(--accent-purple)] border-[var(--accent-purple)]/50 bg-[var(--accent-purple)]/10'}`}>
                                          {isHolding ? '保有中' : 'Watch'}
                                        </span>
                                        {w.analysis?.fundamentalGrade && (
                                          <span className="font-mono-dm text-[10px] font-bold px-1 border" style={{ color: gradeColor, borderColor: gradeColor + '60' }}>{w.analysis.fundamentalGrade}</span>
                                        )}
                                      </div>
                                      <div className="font-mono-dm text-[10px] text-[var(--text-muted)] truncate mt-0.5">{w.name}</div>
                                    </div>
                                    <span className="font-mono-dm text-[10px] text-[var(--text-muted)] shrink-0">${(w.currentPrice ?? 0).toFixed(0)}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {simEntries.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)] py-4 text-center border border-dashed border-[var(--border)] rounded">
                      「銘柄を選ぶ」から銘柄を選択してシミュレーションを開始してください。
                    </div>
                  ) : (
                    <div className="border border-[var(--border)] rounded overflow-hidden">
                      {simEntries.map((e) => {
                        const ideal = simIdealData.find(d => d.id === e.id);
                        const isBuy = e.shares >= 0;
                        const amount = e.shares * e.currentPrice;

                        let currentHeld = 0;
                        if (e.source === 'holding') {
                          const h = portfolioHoldings.find(x => x.id === e.id);
                          if (h) currentHeld = (h.shares || 0) + (h.sharesNisa || 0);
                        }

                        return (
                          <div key={e.id} className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 bg-[var(--bg-secondary)] relative">
                            <div className="min-w-[100px]">
                              <div className="font-mono-dm text-sm font-bold text-white flex items-center gap-2">
                                {e.ticker}
                                {e.source === 'holding' && <span className="text-[9px] font-normal px-1 bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] rounded">保有: {currentHeld}株</span>}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {ideal?.grade ? <GradeBadge grade={ideal.grade} /> : <span className="font-mono-dm text-[9px] text-[var(--text-muted)]">No Grade</span>}
                                {ideal?.signal && ideal.signal !== 'None' && <span className={`font-mono-dm text-[9px] px-1 border rounded ${SIGNAL_STYLE[ideal.signal]}`}>{ideal.signal}</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={e.account}
                                onChange={(ev) => setSimEntries(prev => prev.map(s => s.id === e.id ? { ...s, account: ev.target.value as 'tokutei' | 'nisa' } : s))}
                                className="px-2 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded text-xs text-white focus:outline-none"
                              >
                                <option value="tokutei">特定</option>
                                <option value="nisa">NISA</option>
                              </select>
                            </div>

                            <div className="flex flex-1 items-center gap-2">
                              <div className="relative flex-1 max-w-[120px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">株数</span>
                                <input
                                  type="number"
                                  step="1"
                                  inputMode="numeric"
                                  value={e.shares || ''}
                                  placeholder="0"
                                  onChange={(ev) => {
                                    let val = Math.round(Number(ev.target.value));
                                    if (e.source === 'holding') {
                                      val = Math.max(-currentHeld, val);
                                    } else {
                                      val = Math.max(0, val);
                                    }
                                    setSimEntries(prev => prev.map(s => s.id === e.id ? { ...s, shares: val } : s));
                                  }}
                                  className={`w-full font-mono-dm text-sm bg-[var(--bg-card)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent-purple)] text-right pl-8 pr-2 py-1.5 rounded ${isBuy ? 'text-white' : 'text-[var(--accent-red)]'}`}
                                />
                              </div>
                              <span className="text-[var(--text-muted)] text-sm">≈</span>
                              <div className="relative flex-1 max-w-[140px]">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">金額($)</span>
                                <input
                                  type="number"
                                  step="100"
                                  inputMode="numeric"
                                  value={amount !== 0 ? amount.toFixed(0) : ''}
                                  placeholder="0"
                                  onChange={(ev) => {
                                    const amt = Number(ev.target.value);
                                    let calcShares = Math.round(amt / e.currentPrice);
                                    if (e.source === 'holding') {
                                      calcShares = Math.max(-currentHeld, calcShares);
                                    } else {
                                      calcShares = Math.max(0, calcShares);
                                    }
                                    setSimEntries(prev => prev.map(s => s.id === e.id ? { ...s, shares: calcShares } : s));
                                  }}
                                  className={`w-full font-mono-dm text-sm bg-[var(--bg-card)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent-purple)] text-right pl-12 pr-2 py-1.5 rounded ${isBuy ? 'text-white' : 'text-[var(--accent-red)]'}`}
                                />
                              </div>
                            </div>

                            {ideal && (
                              <div className="text-right shrink-0 min-w-[100px] hidden md:block">
                                <div className="font-mono-dm text-[9px] text-[var(--text-muted)] mb-1">目標割合: <span className="text-[var(--accent-gold)] font-bold">{ideal.idealPct.toFixed(1)}%</span></div>
                                {ideal.suggestedDeltaShares !== 0 && (
                                  <button
                                    onClick={() => setSimEntries(prev => prev.map(s => s.id === e.id ? { ...s, shares: ideal.suggestedDeltaShares } : s))}
                                    className="px-2 py-1 font-mono-dm text-[9px] border border-[var(--accent-purple)]/50 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 transition-colors rounded"
                                  >
                                    推奨: {ideal.suggestedDeltaShares > 0 ? '+' : ''}{ideal.suggestedDeltaShares}株
                                  </button>
                                )}
                              </div>
                            )}

                            <button onClick={() => setSimEntries(prev => prev.filter(s => s.id !== e.id))} className="absolute top-2 right-2 md:static text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {simChartData.length > 0 && (
                    <div className="space-y-4">
                      <div className="font-mono-dm text-[10px] text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-y-2">
                        <div className="flex items-center gap-3">
                          <span>ネット投資額: <span className={simAddedValue >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>{simAddedValue >= 0 ? '+' : ''}${simAddedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                          <span>→ 構成後総資産: <span className="text-white">${(totalValue + simAddedValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                        </div>
                        <button
                          onClick={handleReflectSimulation}
                          disabled={simEntries.every(e => e.shares === 0)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent-purple)] text-white text-xs font-bold rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                          <Save className="w-3.5 h-3.5" /> 構成をポートフォリオに反映
                        </button>
                      </div>

                      <div className="flex w-full h-10 rounded overflow-hidden">
                        {simChartData.map((entry) => (
                          <div
                            key={entry.id}
                            className="relative flex items-center justify-center overflow-hidden"
                            style={{
                              width: `${entry.pct}%`,
                              minWidth: entry.pct > 0 ? '2px' : '0',
                              background: entry.simulated
                                ? `repeating-linear-gradient(45deg, ${entry.color}, ${entry.color} 4px, rgba(0,0,0,0.3) 4px, rgba(0,0,0,0.3) 8px)`
                                : entry.color,
                            }}
                            title={`${entry.name}${entry.simulated ? ' (変更有)' : ''}: $${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${entry.pct.toFixed(1)}%)`}
                          >
                            {entry.pct >= 5 && (
                              <span className="font-mono-dm text-[9px] font-bold text-white leading-tight text-center whitespace-nowrap px-0.5 select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                {entry.name}{entry.simulated ? '*' : ''}<br />{entry.pct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="font-mono-dm text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                        <span className="text-[var(--accent-purple)]">*</span>
                        <span>= シミュレーションで変更のあった銘柄（斜線パターン）</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── フォーカス銘柄: バリュエーションゲージ ── */}
          {focusedHolding && focusedHolding.analysis && (
            <div className="relative mb-6">
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => setSelected(computeRow(focusedHolding, 'holding'))}
                  className="font-mono-dm text-[10px] px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)] transition-colors shadow-sm"
                >
                  銘柄詳細を開く
                </button>
                <button className="p-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] hover:text-white transition-colors shadow-sm" onClick={() => setFocusedId(null)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ValuationGauge analysis={focusedHolding.analysis} currentPrice={focusedHolding.currentPrice} ticker={focusedHolding.ticker} />
            </div>
          )}
          {focusedHolding && !focusedHolding.analysis && (
            <div className="mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <span className="font-mono-dm text-white font-bold">{focusedHolding.ticker}</span>
              AI分析データがありません。
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setSelected(computeRow(focusedHolding, 'holding'))}
                  className="font-mono-dm text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)] transition-colors"
                >
                  銘柄詳細を開く
                </button>
                <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" onClick={() => setFocusedId(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
            <div className="min-w-[980px] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
              <div className={`${GRID} px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]`}>
                <div />
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">銘柄</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">Bear/Base/Bull</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">評価額</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">現在%</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--accent-gold)] uppercase text-right">理想%</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">乖離</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">P&amp;L</div>
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">推奨アクション</div>
              </div>

              {rows.map(({ holding: h, value, pnl, pnlPct, currentPct, idealPct, gap, sharesToBuy, color, grade }) => {
                const isUnder = gap > 1;
                const isOver = gap < -1;
                const isFocused = focusedId === h.id;
                const rs = sharesToBuy !== null ? Math.round(sharesToBuy) : null;
                const holdingRow = computeRow(h, 'holding');

                return (
                  <button
                    key={h.id}
                    onClick={() => { setFocusedId(isFocused ? null : h.id); setSelected(holdingRow); }}
                    className={`${GRID} w-full text-left px-5 py-4 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors ${isFocused ? 'bg-[var(--bg-hover)]' : ''}`}
                    style={isFocused ? { borderLeft: `3px solid ${color}` } : {}}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono-dm text-sm font-bold text-white">{h.ticker}</span>
                        {grade && <GradeBadge grade={grade} />}
                      </div>
                      <div className="font-mono-dm text-[10px] text-[var(--text-muted)] truncate">{h.name}</div>
                    </div>
                    <div className="flex items-center" onClick={(ev) => ev.stopPropagation()}>
                      <MiniPriceGauge row={holdingRow} />
                    </div>
                    <div className="font-mono-dm text-sm text-white text-right whitespace-nowrap">
                      ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="font-mono-dm text-sm text-[var(--text-secondary)] text-right whitespace-nowrap">{currentPct.toFixed(1)}%</div>
                    <div className="font-mono-dm text-sm text-[var(--accent-gold)] text-right font-bold whitespace-nowrap">{idealPct.toFixed(1)}%</div>
                    <div className={`font-mono-dm text-sm text-right whitespace-nowrap flex items-center justify-end gap-0.5 ${isUnder ? 'text-[var(--accent-green)]' : isOver ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
                      {isUnder ? <ArrowUp className="w-3 h-3 flex-shrink-0" /> : isOver ? <ArrowDown className="w-3 h-3 flex-shrink-0" /> : <Minus className="w-3 h-3 flex-shrink-0" />}
                      {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                    </div>
                    <div className={`text-right whitespace-nowrap ${pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                      <div className="font-mono-dm text-sm">{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      <div className="font-mono-dm text-[10px] opacity-80">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      {h.analysis?.investmentSignal && h.analysis.investmentSignal !== 'None' ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-mono-dm tracking-wide border rounded ${SIGNAL_STYLE[h.analysis.investmentSignal] ?? SIGNAL_STYLE['None']}`}>
                            {h.analysis.investmentSignal}
                          </span>
                          {rs !== null && Math.abs(rs) >= 1 && (
                            <span className={`font-mono-dm text-[9px] ${rs > 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                              {rs > 0 ? `+${rs}` : rs} 株
                            </span>
                          )}
                        </div>
                      ) : isUnder && rs !== null && rs >= 1 ? (
                        <div className="inline-flex flex-col items-end font-mono-dm text-[10px] font-bold px-2 py-1 border rounded text-[var(--accent-green)] border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10">
                          <span>▲ BUY</span>
                          <span>{rs} 株</span>
                        </div>
                      ) : isOver && rs !== null && rs <= -1 ? (
                        <div className="inline-flex flex-col items-end font-mono-dm text-[10px] font-bold px-2 py-1 border rounded text-[var(--accent-red)] border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10">
                          <span>▼ SELL</span>
                          <span>{Math.abs(rs)} 株</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono-dm text-[10px] font-bold px-2 py-1 border rounded animate-pulse text-[var(--accent-gold)] border-[var(--accent-gold)]/50 bg-[var(--accent-gold)]/10">
                          ◎ IN ZONE
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 px-1">
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Grade凡例:</span>
            {(['S', 'A', 'B', 'C', 'D'] as const).map((g) => (
              <GradeBadge key={g} grade={g} showLabel />
            ))}
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)]">reduce/sell ×0.5 　AI推奨なし→×1.0</span>
          </div>
        </>
      )}

      {selected && (
        <StockDetailModal
          row={selected}
          onClose={() => setSelected(null)}
          onSaveHolding={updateHolding}
          onSaveWatchlist={() => { }}
          onAddHoldingHistory={addHoldingHistory}
          onAddWatchlistHistory={() => { }}
          onDelete={(id) => { removeHolding(id); setSelected(null); }}
        />
      )}
    </div>
  );
}
