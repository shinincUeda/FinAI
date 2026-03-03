import { useState } from 'react';
import { Summary } from './Summary';
import { SectorChart } from './SectorChart';
import { AiScoreCard } from './AiScoreCard';
import { WorldviewIndicator } from './WorldviewIndicator';
import { ActionList } from './ActionList';
import { AnalysisFeed } from './AnalysisFeed';
import { StockDetailModal } from '../watchlist/StockDetailModal';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { computeRow } from '../../lib/stockRow';
import type { Holding } from '../../types';

export function DashboardPage() {
  const { updateHolding, removeHolding, addAnalysisEntry: addHoldingHistory } = useHoldingsStore();
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        ダッシュボード
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <Summary />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectorChart />
            <div className="space-y-6">
              <AiScoreCard />
              <WorldviewIndicator />
            </div>
          </div>
        </div>
        <div>
          <ActionList />
        </div>
      </div>
      <AnalysisFeed onSelect={setSelectedHolding} />

      {selectedHolding && (
        <StockDetailModal
          row={computeRow(selectedHolding, 'holding')}
          onClose={() => setSelectedHolding(null)}
          onSaveHolding={updateHolding}
          onSaveWatchlist={() => {}}
          onAddHoldingHistory={addHoldingHistory}
          onAddWatchlistHistory={() => {}}
          onDelete={(id) => { removeHolding(id); setSelectedHolding(null); }}
        />
      )}
    </div>
  );
}
