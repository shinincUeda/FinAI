import { useState, useMemo } from 'react';
import { Plus, Briefcase, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { ThesisModal } from './ThesisModal';
import { AddStockModal } from '../shared/AddStockModal';
import type { Holding } from '../../types';

const GRADE_WEIGHT: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6',
  '#a78bfa', '#fbbf24', '#34d399', '#fb7185', '#60a5fa',
  '#e879f9', '#4ade80', '#fb923c', '#38bdf8', '#a3e635',
];

function getGradeMeta(grade?: string): { color: string; bg: string } {
  if (grade === 'S') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (grade === 'A') return { color: '#10b981', bg: 'rgba(16,185,129,0.12)' };
  if (grade === 'B') return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
  if (grade === 'C') return { color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (grade === 'D') return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
  return { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
}

function getIdealWeight(h: Holding): number {
  const base = h.analysis
    ? (GRADE_WEIGHT[h.analysis.fundamentalGrade] ?? 1)
    : h.aiAlignmentScore;
  if (h.status === 'sell' || h.status === 'reduce') return base * 0.5;
  return base;
}

const GRID = 'grid grid-cols-[16px_1fr_110px_72px_72px_72px_108px_110px] gap-x-4 items-center';

export function ThesisPage() {
  const { holdings, updateHolding, removeHolding } = useHoldingsStore();
  const [selected, setSelected] = useState<Holding | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // 保有済み銘柄（特定口座 or 成長投資枠 いずれかで保有があるもの）
  const portfolioHoldings = useMemo(() => {
    return holdings.filter(h => (h.shares || 0) + (h.sharesNisa || 0) > 0);
  }, [holdings]);

  // ポートフォリオ全体の評価額（両口座合算）
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
    return portfolioHoldings.map((h, i) => ({
      id: h.id,
      name: h.ticker,
      pct: (getIdealWeight(h) / totalWeight) * 100,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [portfolioHoldings]);

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
      return {
        holding: h, value, pnl, pnlPct, currentPct, idealPct, gap, sharesToBuy,
        color: CHART_COLORS[i % CHART_COLORS.length],
        grade: h.analysis?.fundamentalGrade,
      };
    });
  }, [portfolioHoldings, totalValue]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif-display text-white mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-[var(--accent-gold)]" /> ポートフォリオ管理
          </h1>
          <p className="font-mono-dm text-xs text-[var(--text-muted)] tracking-widest uppercase">
            現在の配分 vs 理想の配分（Gradeベース）
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 font-mono-dm text-[11px] tracking-widest bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold-light)] transition-colors"
        >
          <Plus className="w-4 h-4" /> 銘柄を追加
        </button>
      </div>

      {/* ── Summary ── */}
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
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2 flex items-center gap-1.5">
            Unrealized P&L
          </div>
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

      {showAddForm && (
        <AddStockModal onClose={() => setShowAddForm(false)} />
      )}

      {portfolioHoldings.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[var(--border-light)] rounded-lg">
          <Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)] tracking-wider">保有銘柄がありません</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">銘柄を追加して保有数を入力するとここに表示されます</p>
        </div>
      ) : (
        <>
          {/* ── Charts: 横100%スタック比較 ── */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 mb-6 space-y-6">

            {/* 現在の配分 */}
            <div>
              <div className="mb-3">
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">現在の配分</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">時価ベース</div>
              </div>
              <div className="flex w-full h-10 rounded overflow-hidden">
                {currentData.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative flex items-center justify-center overflow-hidden transition-opacity hover:opacity-80"
                    style={{ width: `${entry.pct}%`, backgroundColor: entry.color, minWidth: entry.pct > 0 ? '2px' : '0' }}
                    title={`${entry.name}: $${entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${entry.pct.toFixed(1)}%)`}
                  >
                    {entry.pct >= 5 && (
                      <span className="font-mono-dm text-[9px] font-bold text-white leading-tight text-center whitespace-nowrap px-0.5 select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                        {entry.name}<br />{entry.pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {currentData.filter(d => d.pct < 5).length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {currentData.filter(d => d.pct < 5).map(entry => (
                    <span key={entry.id} className="font-mono-dm text-[10px] flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-[var(--text-secondary)]">{entry.name}</span>
                      <span className="text-[var(--text-muted)]">{entry.pct.toFixed(1)}%</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)]" />

            {/* 理想の配分 */}
            <div>
              <div className="mb-3">
                <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">理想の配分</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-[var(--text-muted)]">Grade重み：</span>
                  {(['S', 'A', 'B', 'C', 'D'] as const).map((g) => {
                    const { color } = getGradeMeta(g);
                    return (
                      <span key={g} className="font-mono-dm text-[10px] font-bold" style={{ color }}>
                        {g}={GRADE_WEIGHT[g]}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="flex w-full h-10 rounded overflow-hidden">
                {idealData.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative flex items-center justify-center overflow-hidden transition-opacity hover:opacity-80"
                    style={{ width: `${entry.pct}%`, backgroundColor: entry.color, minWidth: entry.pct > 0 ? '2px' : '0' }}
                    title={`${entry.name}: ${entry.pct.toFixed(1)}%`}
                  >
                    {entry.pct >= 5 && (
                      <span className="font-mono-dm text-[9px] font-bold text-white leading-tight text-center whitespace-nowrap px-0.5 select-none" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                        {entry.name}<br />{entry.pct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {idealData.filter(d => d.pct < 5).length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {idealData.filter(d => d.pct < 5).map(entry => (
                    <span key={entry.id} className="font-mono-dm text-[10px] flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-[var(--text-secondary)]">{entry.name}</span>
                      <span className="text-[var(--text-muted)]">{entry.pct.toFixed(1)}%</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Holdings Table ── */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">

            {/* Header row */}
            <div className={`${GRID} px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]`}>
              <div />
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase">銘柄</div>
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">評価額</div>
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">現在%</div>
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--accent-gold)] uppercase text-right">理想%</div>
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">乖離</div>
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">P&amp;L</div>
              <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase text-right">推奨アクション</div>
            </div>

            {/* Data rows */}
            {rows.map(({ holding: h, value, pnl, pnlPct, currentPct, idealPct, gap, sharesToBuy, color, grade }) => {
              const { color: gradeColor, bg: gradeBg } = getGradeMeta(grade);
              const isUnder = gap > 1;
              const isOver = gap < -1;

              return (
                <button
                  key={h.id}
                  onClick={() => setSelected(h)}
                  className={`${GRID} w-full text-left px-5 py-4 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors`}
                >
                  {/* Color dot */}
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />

                  {/* Ticker + Name */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono-dm text-sm font-bold text-white">{h.ticker}</span>
                      {grade && (
                        <span
                          className="font-mono-dm text-[10px] font-bold px-1.5 py-0.5 border"
                          style={{ color: gradeColor, borderColor: gradeColor, backgroundColor: gradeBg }}
                        >
                          {grade}
                        </span>
                      )}
                    </div>
                    <div className="font-mono-dm text-[10px] text-[var(--text-muted)] truncate">{h.name}</div>
                  </div>

                  {/* 評価額 */}
                  <div className="font-mono-dm text-sm text-white text-right whitespace-nowrap">
                    ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>

                  {/* 現在% */}
                  <div className="font-mono-dm text-sm text-[var(--text-secondary)] text-right whitespace-nowrap">
                    {currentPct.toFixed(1)}%
                  </div>

                  {/* 理想% */}
                  <div className="font-mono-dm text-sm text-[var(--accent-gold)] text-right font-bold whitespace-nowrap">
                    {idealPct.toFixed(1)}%
                  </div>

                  {/* 乖離 */}
                  <div className={`font-mono-dm text-sm text-right whitespace-nowrap flex items-center justify-end gap-0.5 ${isUnder ? 'text-[var(--accent-green)]' : isOver ? 'text-[var(--accent-red)]' : 'text-[var(--text-muted)]'}`}>
                    {isUnder
                      ? <ArrowUp className="w-3 h-3 flex-shrink-0" />
                      : isOver
                        ? <ArrowDown className="w-3 h-3 flex-shrink-0" />
                        : <Minus className="w-3 h-3 flex-shrink-0" />
                    }
                    {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
                  </div>

                  {/* P&L */}
                  <div className={`text-right whitespace-nowrap ${pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                    <div className="font-mono-dm text-sm">
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="font-mono-dm text-[10px] opacity-80">
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                    </div>
                  </div>

                  {/* 推奨アクション */}
                  <div className="text-right whitespace-nowrap">
                    {isUnder && sharesToBuy !== null && sharesToBuy >= 0.05 ? (
                      <div className="inline-flex flex-col items-end font-mono-dm text-[10px] font-bold px-2 py-1 border rounded text-[var(--accent-green)] border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10">
                        <span>▲ BUY</span>
                        <span>{sharesToBuy.toFixed(2)} 株</span>
                      </div>
                    ) : isOver && sharesToBuy !== null && sharesToBuy <= -0.05 ? (
                      <div className="inline-flex flex-col items-end font-mono-dm text-[10px] font-bold px-2 py-1 border rounded text-[var(--accent-red)] border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10">
                        <span>▼ SELL</span>
                        <span>{Math.abs(sharesToBuy).toFixed(2)} 株</span>
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

          {/* ── Grade Legend ── */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 px-1">
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Grade凡例:</span>
            {(['S', 'A', 'B', 'C', 'D'] as const).map((g) => {
              const { color, bg } = getGradeMeta(g);
              return (
                <span
                  key={g}
                  className="font-mono-dm text-[10px] font-bold px-2 py-0.5 border rounded"
                  style={{ color, borderColor: color, backgroundColor: bg }}
                >
                  {g} = {GRADE_WEIGHT[g]}
                </span>
              );
            })}
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)]">reduce/sell ×0.5（50%売却前提）</span>
          </div>
        </>
      )}

      {selected && (
        <ThesisModal
          holding={selected}
          onClose={() => setSelected(null)}
          onSave={updateHolding}
          onDelete={(id) => { removeHolding(id); setSelected(null); }}
        />
      )}
    </div>
  );
}
