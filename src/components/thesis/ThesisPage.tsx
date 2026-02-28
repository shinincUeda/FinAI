import { useState, useMemo } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { ThesisCard } from './ThesisCard';
import { ThesisModal } from './ThesisModal';
import { AddHoldingForm } from './AddHoldingForm';
import type { Holding } from '../../types';
import { statusLabels } from '../../data/initialData';

type StatusFilter = Holding['status'] | 'all';

export function ThesisPage() {
  const { holdings, addHolding, updateHolding } = useHoldingsStore();
  const [selected, setSelected] = useState<Holding | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // 保有済み銘柄（特定口座 or 成長投資枠 いずれかで保有があるもの）
  const portfolioHoldings = useMemo(() => {
    return holdings.filter(h => (h.shares || 0) + (h.sharesNisa || 0) > 0);
  }, [holdings]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return portfolioHoldings;
    return portfolioHoldings.filter((h) => h.status === statusFilter);
  }, [portfolioHoldings, statusFilter]);

  // ポートフォリオ全体の評価額（両口座合算）
  const totalValue = portfolioHoldings.reduce((sum, h) => {
    const totalShares = (h.shares || 0) + (h.sharesNisa || 0);
    return sum + totalShares * (h.currentPrice || 0);
  }, 0);
  const totalCost = portfolioHoldings.reduce((sum, h) => {
    return sum + (h.shares || 0) * (h.avgCost || 0) + (h.sharesNisa || 0) * (h.avgCostNisa || 0);
  }, 0);
  const totalPnl = totalValue - totalCost;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif-display text-white mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-[var(--accent-gold)]" /> ポートフォリオ
          </h1>
          <p className="font-mono-dm text-xs text-[var(--text-muted)] tracking-widest uppercase">
            保有株数が1以上の銘柄
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono-dm tracking-widest text-[var(--text-secondary)] outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="all">ALL STATUS</option>
            {(Object.entries(statusLabels) as [Holding['status'], string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 font-mono-dm text-[11px] tracking-widest bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold-light)] transition-colors"
          >
            <Plus className="w-4 h-4" /> NEW HOLDING
          </button>
        </div>
      </div>

      {/* 全体サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 border-t-2 border-t-[var(--accent-blue)]">
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">Total Market Value</div>
          <div className="font-mono-dm text-3xl text-white">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 border-t-2 border-t-[var(--accent-gold)]">
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">Total Cost</div>
          <div className="font-mono-dm text-3xl text-white">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 border-t-2 border-t-[var(--accent-green)]">
          <div className="font-mono-dm text-[10px] tracking-widest text-[var(--text-muted)] uppercase mb-2">Unrealized P&L</div>
          <div className={`font-mono-dm text-3xl ${totalPnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="mb-8">
          <AddHoldingForm onAdd={(h) => { addHolding(h); setShowAddForm(false); }} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[var(--border-light)] rounded-lg">
          <Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
          <p className="text-sm text-[var(--text-secondary)] tracking-wider">保有銘柄がありません</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">エントリー・レーダーから銘柄を購入（保有数を入力）するとここに表示されます。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((holding) => (
            <ThesisCard key={holding.id} holding={holding} onClick={() => setSelected(holding)} />
          ))}
        </div>
      )}

      {selected && (
        <ThesisModal holding={selected} onClose={() => setSelected(null)} onSave={updateHolding} />
      )}
    </div>
  );
}
