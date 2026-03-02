// シグナルバッジ共通スタイル・コンポーネント
// ThesisPage / WatchlistPage / StockDetailModal で共有

export const SIGNAL_STYLE: Record<string, string> = {
  'Strong Buy': 'bg-[rgba(61,214,140,0.12)] border-[var(--accent-green)] text-[var(--accent-green)]',
  'Buy':        'bg-[rgba(74,158,255,0.12)] border-[var(--accent-blue)] text-[var(--accent-blue-light)]',
  'Buy on Dip': 'bg-[rgba(201,168,76,0.12)] border-[var(--accent-gold)] text-[var(--accent-gold-light)]',
  'Watch':      'bg-[rgba(128,128,128,0.10)] border-[var(--border)] text-[var(--text-secondary)]',
  'Sell':       'bg-[rgba(224,92,92,0.12)] border-[var(--accent-red)] text-[var(--accent-red)]',
  'None':       'bg-[rgba(128,128,128,0.10)] border-[var(--border)] text-[var(--text-muted)]',
};

export function SignalBadge({ signal, className }: { signal: string; className?: string }) {
  const cls = SIGNAL_STYLE[signal] ?? SIGNAL_STYLE['None'];
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-mono-dm tracking-wide border rounded ${cls}${className ? ` ${className}` : ''}`}>
      {signal}
    </span>
  );
}
