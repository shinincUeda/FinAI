import type { WatchlistItem as WatchlistItemType } from '../../types';

interface WatchlistItemProps {
  item: WatchlistItemType;
}

export function WatchlistItem({ item }: WatchlistItemProps) {
  const hasTarget = item.targetPrice > 0;
  const isBuyZone = hasTarget && (item.currentPrice ?? 0) <= item.targetPrice && item.currentPrice != null;

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-3 hover:border-[var(--bg-hover)] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-mono font-bold text-[var(--text-primary)]">{item.ticker}</span>
        {isBuyZone && (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
            買い時
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-2">{item.name}</p>
      {hasTarget && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[var(--text-secondary)]">目標</span>
          <span className="text-[var(--accent-blue)]">${item.targetPrice}</span>
          {item.currentPrice != null && (
            <>
              <span className="text-[var(--text-secondary)]">/ 現在</span>
              <span className={isBuyZone ? 'text-[var(--accent-green)]' : 'text-[var(--text-primary)]'}>
                ${item.currentPrice}
              </span>
            </>
          )}
        </div>
      )}
      <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{item.thesis}</p>
    </div>
  );
}
