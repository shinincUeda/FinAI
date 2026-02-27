import { Star } from 'lucide-react';
import type { Holding } from '../../types';
import { sectorLabels, statusLabels } from '../../data/initialData';

const STATUS_DOT: Record<string, string> = {
  core: '🟢',
  monitor: '🟡',
  reduce: '🟡',
  sell: '🔴',
};

interface ThesisCardProps {
  holding: Holding;
  onClick: () => void;
}

export function ThesisCard({ holding, onClick }: ThesisCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-hover)] hover:border-[var(--accent-blue)]/50 transition-all shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {holding.ticker}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {holding.name}
          </span>
        </div>
        <span className="text-lg" title={statusLabels[holding.status]}>
          {STATUS_DOT[holding.status]}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5"
              fill={i <= holding.aiAlignmentScore ? 'var(--accent-purple)' : 'var(--border)'}
              style={{ color: 'var(--accent-purple)' }}
            />
          ))}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {sectorLabels[holding.sector]}
        </span>
      </div>
      <p className="text-sm text-[var(--text-primary)] line-clamp-2">
        {holding.thesis}
      </p>
    </button>
  );
}
