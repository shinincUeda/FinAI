import { Summary } from './Summary';
import { SectorChart } from './SectorChart';
import { AiScoreCard } from './AiScoreCard';
import { WorldviewIndicator } from './WorldviewIndicator';
import { ActionList } from './ActionList';
import { AnalysisFeed } from './AnalysisFeed';

export function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        ダッシュボード
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        <div className="space-y-6">
          <ActionList />
          <AnalysisFeed />
        </div>
      </div>
    </div>
  );
}
