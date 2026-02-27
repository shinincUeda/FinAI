import { WatchlistItem } from './WatchlistItem';
import type { WatchlistItem as WatchlistItemType } from '../../types';

interface WatchlistTierProps {
  tier: 1 | 2 | 3;
  items: WatchlistItemType[];
}

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Tier 1（最優先）',
  2: 'Tier 2（検討）',
  3: 'Tier 3（ウォッチ）',
};

export function WatchlistTier({ tier, items }: WatchlistTierProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="font-semibold text-[var(--text-primary)]">{TIER_LABELS[tier]}</h3>
        <p className="text-xs text-[var(--text-secondary)]">{items.length} 銘柄</p>
      </div>
      <div className="p-3 flex-1 overflow-y-auto space-y-2">
        {items.map((item) => (
          <WatchlistItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
