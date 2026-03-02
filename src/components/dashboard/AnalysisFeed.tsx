import { Sparkles, Clock } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { SignalBadge } from '../shared/SignalBadge';

const SIGNAL_BORDER: Record<string, string> = {
  'Strong Buy': 'var(--accent-green)',
  'Buy':        'var(--accent-blue)',
  'Buy on Dip': 'var(--accent-gold)',
  'Watch':      'var(--border)',
  'Sell':       'var(--accent-red)',
  'None':       'var(--border)',
};

const GRADE_COLOR: Record<string, string> = {
  S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#ef4444',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

export function AnalysisFeed() {
  const { holdings } = useHoldingsStore();

  const analyzed = holdings
    .filter(h => h.analysis)
    .sort((a, b) => {
      const aDate = a.analysis?.lastAnalyzed ?? a.lastUpdated ?? '';
      const bDate = b.analysis?.lastAnalyzed ?? b.lastUpdated ?? '';
      return bDate.localeCompare(aDate);
    });

  if (analyzed.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        <Sparkles className="w-4 h-4 text-[var(--accent-purple)]" />
        AI分析テーゼ一覧
        <span className="ml-auto font-mono-dm text-[10px] font-normal normal-case text-[var(--text-muted)]">
          {analyzed.length}銘柄
        </span>
      </h2>

      <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {analyzed.map(h => {
          const signal = h.analysis?.investmentSignal ?? 'None';
          const borderColor = SIGNAL_BORDER[signal] ?? 'var(--border)';
          const grade = h.analysis?.fundamentalGrade;
          const gradeColor = grade ? (GRADE_COLOR[grade] ?? '#6b7280') : '#6b7280';

          return (
            <li
              key={h.id}
              className="pl-3 py-1"
              style={{ borderLeft: `2px solid ${borderColor}` }}
            >
              {/* ヘッダー行: ティッカー / Grade / Signal / 日付 */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-mono-dm text-xs font-bold text-white">{h.ticker}</span>
                {grade && (
                  <span
                    className="font-mono-dm text-[9px] font-bold px-1.5 py-0.5 border rounded"
                    style={{ color: gradeColor, borderColor: gradeColor, backgroundColor: `${gradeColor}20` }}
                  >
                    {grade}
                  </span>
                )}
                {signal !== 'None' && <SignalBadge signal={signal} />}
                <span className="ml-auto font-mono-dm text-[9px] text-[var(--text-muted)] flex items-center gap-0.5 whitespace-nowrap">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDate(h.analysis?.lastAnalyzed)}
                </span>
              </div>

              {/* テーゼ本文（2行クランプ） */}
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                {h.thesis}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
