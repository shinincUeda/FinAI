import { useMemo } from 'react';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { WatchlistTier } from './WatchlistTier';

export function WatchlistPage() {
  const { items } = useWatchlistStore();

  const byTier = useMemo(() => {
    const t1: typeof items = [];
    const t2: typeof items = [];
    const t3: typeof items = [];
    items.forEach((i) => {
      if (i.tier === 1) t1.push(i);
      else if (i.tier === 2) t2.push(i);
      else t3.push(i);
    });
    return { 1: t1, 2: t2, 3: t3 } as const;
  }, [items]);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">ウォッチリスト</h1>
      <div className="flex flex-wrap gap-4 overflow-x-auto pb-4">
        <WatchlistTier tier={1} items={byTier[1]} />
        <WatchlistTier tier={2} items={byTier[2]} />
        <WatchlistTier tier={3} items={byTier[3]} />
      </div>
    </div>
  );
}
