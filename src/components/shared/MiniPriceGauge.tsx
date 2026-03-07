// Bear / Base / Bull エントリーグラフ（ウォッチリスト・ポートフォリオで共有）

import type { UnifiedRow } from '../../lib/stockRow';

export function MiniPriceGauge({ row }: { row: UnifiedRow }) {
  const { bear, base, bull, entryMin, entryMax, currentPrice } = row;
  const vals = [bear, base, bull, entryMin, entryMax, currentPrice].filter((v): v is number => typeof v === 'number' && v > 0);
  if (vals.length < 2) {
    // targetPrice のみ
    if (row.targetPrice && row.targetPrice > 0) {
      const cp = currentPrice || 0;
      const diff = cp > 0 ? (cp - row.targetPrice) / row.targetPrice * 100 : null;
      return (
        <div className="flex items-center gap-2 min-w-[160px]">
          <div className="text-[10px] font-mono-dm text-[var(--text-muted)]">目標</div>
          <div className="font-mono-dm text-xs text-[var(--accent-gold-light)]">${row.targetPrice}</div>
          {diff !== null && (
            <div className={`font-mono-dm text-[10px] ${diff <= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
              {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
            </div>
          )}
        </div>
      );
    }
    return <div className="font-mono-dm text-[10px] text-[var(--text-muted)]">未設定</div>;
  }

  const minScale = Math.min(...vals) * 0.92;
  const maxScale = Math.max(...vals) * 1.08;
  const range = maxScale - minScale || 1;
  const pctN = (v: number) => Math.max(0, Math.min(100, ((v - minScale) / range) * 100));
  const pctS = (v: number) => `${pctN(v).toFixed(2)}%`;

  const hasEntryZone = entryMax != null && entryMax > 0;
  const drawEntryMin = entryMin && entryMin > 0 ? entryMin : minScale;
  const entryL = hasEntryZone ? pctN(drawEntryMin) : 0;
  const entryR = hasEntryZone ? pctN(Math.min(maxScale, entryMax!)) : 0;
  const inZone = hasEntryZone && currentPrice != null && currentPrice > 0 && currentPrice <= entryMax!;

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  const bearPct = bear != null ? pctN(bear) : null;
  const basePct = base != null ? pctN(base) : null;
  const bullPct = bull != null ? pctN(bull) : null;
  const TOO_CLOSE = 14;
  const baseStagger =
    basePct != null && (
      (bearPct != null && Math.abs(basePct - bearPct) < TOO_CLOSE) ||
      (bullPct != null && Math.abs(basePct - bullPct) < TOO_CLOSE)
    );

  return (
    <div className="min-w-[200px] max-w-[240px]">
      <div
        className="relative h-5 rounded-sm overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {hasEntryZone && (
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `${entryL.toFixed(2)}%`,
              width: `${Math.max(0, entryR - entryL).toFixed(2)}%`,
              backgroundColor: inZone ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.08)',
              borderLeft: `1px solid ${inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.35)'}`,
              borderRight: `1px solid ${inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.35)'}`,
            }}
          />
        )}
        {bear != null && (
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: pctS(bear), backgroundColor: 'var(--accent-red)', opacity: 0.75 }}
          />
        )}
        {base != null && (
          <div
            className="absolute top-0 bottom-0"
            style={{ left: pctS(base), width: '2px', backgroundColor: 'var(--accent-gold)' }}
          />
        )}
        {bull != null && (
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: pctS(bull), backgroundColor: 'var(--accent-green)', opacity: 0.75 }}
          />
        )}
        {currentPrice != null && currentPrice > 0 && (
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{
              left: pctS(currentPrice),
              width: '2px',
              backgroundColor: inZone ? 'var(--accent-green)' : 'rgba(255,255,255,0.85)',
            }}
          />
        )}
      </div>

      <div className="relative h-9 mt-0.5">
        {bear != null && (
          <div className="absolute top-1 text-center" style={{ left: pctS(bear), transform: 'translateX(-50%)' }}>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-red)' }}>Bear</div>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-red)' }}>{fmt(bear)}</div>
          </div>
        )}
        {base != null && (
          <div
            className="absolute text-center"
            style={{ left: pctS(base), transform: 'translateX(-50%)', top: baseStagger ? '16px' : '4px' }}
          >
            <div className="font-mono-dm text-[8px] font-bold leading-snug" style={{ color: 'var(--accent-gold)' }}>Base</div>
            <div className="font-mono-dm text-[8px] font-bold leading-snug" style={{ color: 'var(--accent-gold-light)' }}>{fmt(base)}</div>
          </div>
        )}
        {bull != null && (
          <div className="absolute top-1 text-center" style={{ left: pctS(bull), transform: 'translateX(-50%)' }}>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-green)' }}>Bull</div>
            <div className="font-mono-dm text-[8px] leading-snug" style={{ color: 'var(--accent-green)' }}>{fmt(bull)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
