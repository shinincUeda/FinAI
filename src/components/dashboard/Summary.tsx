import { useHoldingsStore } from '../../stores/holdingsStore';
import { statusLabels, statusColors } from '../../data/initialData';

export function Summary() {
  const { holdings } = useHoldingsStore();
  const byStatus = holdings.reduce<Record<string, number>>((acc, h) => {
    acc[h.status] = (acc[h.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        ポートフォリオ概要
      </h2>
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {holdings.length}
          </p>
          <p className="text-sm text-[var(--text-secondary)]">銘柄数</p>
        </div>
        {(['core', 'monitor', 'reduce', 'sell'] as const).map((status) => (
          <div key={status}>
            <p
              className="text-xl font-semibold font-mono"
              style={{ color: statusColors[status] }}
            >
              {byStatus[status] ?? 0}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {statusLabels[status]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
