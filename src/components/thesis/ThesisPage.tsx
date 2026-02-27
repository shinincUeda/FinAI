import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
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

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return holdings;
    return holdings.filter((h) => h.status === statusFilter);
  }, [holdings, statusFilter]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">テーゼカード</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm"
          >
            <option value="all">すべて</option>
            {(Object.entries(statusLabels) as [Holding['status'], string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--accent-blue)] text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> 銘柄追加
          </button>
        </div>
      </div>

      {showAddForm ? (
        <div className="mb-6 max-w-xl">
          <AddHoldingForm
            onAdd={(h) => { addHolding(h); setShowAddForm(false); }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((holding) => (
          <ThesisCard
            key={holding.id}
            holding={holding}
            onClick={() => setSelected(holding)}
          />
        ))}
      </div>

      {selected && (
        <ThesisModal
          holding={selected}
          onClose={() => setSelected(null)}
          onSave={updateHolding}
        />
      )}
    </div>
  );
}
