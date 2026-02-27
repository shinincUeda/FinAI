import { useState } from 'react';
import { FileBarChart, Loader2 } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { useReportsStore } from '../../stores/reportsStore';
import { generateWeeklyReport } from '../../lib/claude';
import { ReportViewer } from './ReportViewer';
import type { WeeklyReport } from '../../types';

function parseWorldviewStatus(content: string): WeeklyReport['worldviewStatus'] {
  if (/加速|🟢/.test(content) && !/減速|🔴/.test(content)) return 'accelerating';
  if (/減速|🔴/.test(content)) return 'decelerating';
  return 'normal';
}

export function ReportsPage() {
  const { holdings } = useHoldingsStore();
  const { items: watchlist } = useWatchlistStore();
  const { reports, addReport } = useReportsStore();
  const [selected, setSelected] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  const handleGenerate = async () => {
    if (!apiKey?.trim()) {
      setError('APIキーが未設定です。.env.local に VITE_ANTHROPIC_API_KEY を設定してください。');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const content = await generateWeeklyReport(apiKey, holdings, watchlist);
      const date = new Date().toISOString().slice(0, 10);
      const worldviewStatus = parseWorldviewStatus(content);
      const report: WeeklyReport = {
        id: 'report-' + Date.now(),
        date,
        content,
        worldviewStatus,
        actions: [],
      };
      addReport(report);
      setSelected(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'レポートの生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">週次レポート</h1>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded bg-[var(--accent-blue)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
          {loading ? '生成中...' : '週次レポート生成'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">履歴</h2>
          {reports.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">レポートがまだありません。</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected?.id === r.id ? 'bg-[var(--bg-hover)] text-[var(--accent-blue)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    {r.date}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{selected.date}</p>
              <ReportViewer content={selected.content} />
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-8 text-center text-[var(--text-secondary)]">
              レポートを選択するか、「週次レポート生成」で新規作成してください。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
