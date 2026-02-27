import { useHoldingsStore } from '../../stores/holdingsStore';
import { Star } from 'lucide-react';

export function AiScoreCard() {
  const { holdings } = useHoldingsStore();
  const total = holdings.length;
  const sum = holdings.reduce((acc, h) => acc + h.aiAlignmentScore, 0);
  const avg = total > 0 ? sum / total : 0;
  const display = avg.toFixed(1);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        AI戦略適合度スコア
      </h2>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold font-mono text-[var(--accent-purple)]">
          {display}
        </span>
        <span className="text-[var(--text-secondary)]">/ 5</span>
      </div>
      <div className="flex gap-0.5 mt-2" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className="w-5 h-5"
            fill={i <= Math.round(avg) ? 'var(--accent-purple)' : 'var(--border)'}
            style={{ color: 'var(--accent-purple)' }}
          />
        ))}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2">
        保有銘柄の加重平均（均等加重）
      </p>
    </div>
  );
}
