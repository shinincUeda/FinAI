// バリュエーション & エントリーゾーン ゲージ
// StockDetailModal / ThesisPage で共有

import { Target } from 'lucide-react';
import type { CompounderAnalysis } from '../../types';

interface ValuationGaugeProps {
  analysis: CompounderAnalysis;
  currentPrice?: number;
  ticker?: string;
}

export function ValuationGauge({ analysis, currentPrice, ticker }: ValuationGaugeProps) {
  const { bear, base, bull } = analysis.fairValue;
  const entry = analysis.entryZone;
  const cp = currentPrice && currentPrice > 0 ? currentPrice : base;

  const hasEntry = !!(entry?.max && entry.max > 0);
  const entryMin = hasEntry ? (entry!.min ?? bear) : 0;
  const entryMax = hasEntry ? entry!.max! : 0;
  const inZone = hasEntry && cp >= entryMin && cp <= entryMax;

  // ── スケール計算 ──────────────────────────────────────────
  const allVals = [bear, base, bull, cp, ...(hasEntry ? [entryMin, entryMax] : [])].filter(v => v > 0);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const pad = Math.max((maxV - minV) * 0.15, 5);
  const minScale = minV - pad;
  const maxScale = maxV + pad;
  const range = maxScale - minScale || 1;

  const toLeftPct = (v: number): number =>
    Math.max(0, Math.min(100, ((v - minScale) / range) * 100));
  const toLeft = (v: number): string => `${toLeftPct(v).toFixed(2)}%`;

  // エントリーゾーン幅
  const entryL = hasEntry ? toLeftPct(Math.max(entryMin, minScale)) : 0;
  const entryR = hasEntry ? toLeftPct(Math.min(entryMax, maxScale)) : 0;
  const entryW = entryR - entryL;

  // ラベル重複判定: Base が Bear/Bull に近い場合は下段にずらす
  const bearPct = toLeftPct(bear);
  const basePct = toLeftPct(base);
  const bullPct = toLeftPct(bull);
  const TOO_CLOSE = 12; // %差がこれ未満なら近いと判定
  const baseStagger =
    Math.abs(basePct - bearPct) < TOO_CLOSE ||
    Math.abs(basePct - bullPct) < TOO_CLOSE;

  const baseDiff = base > 0 ? ((cp - base) / base) * 100 : null;
  const cpBg = inZone ? 'var(--accent-green)' : 'var(--accent-blue)';
  const cpFg = inZone ? '#000' : '#fff';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">

      {/* タイトル */}
      <div className="font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-4 flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-[var(--accent-blue-light)]" />
        バリュエーション & エントリーゾーン
        {ticker && (
          <span className="ml-auto font-mono-dm text-xs font-bold text-[var(--text-secondary)]">
            {ticker}
          </span>
        )}
      </div>

      {/* ── 現在株価ピン（バーの上） ── */}
      <div className="relative h-8">
        <div
          className="absolute bottom-0 flex flex-col items-center"
          style={{ left: toLeft(cp), transform: 'translateX(-50%)' }}
        >
          <span
            className="font-mono-dm text-[10px] font-bold px-2 py-0.5 rounded-sm whitespace-nowrap leading-tight"
            style={{ backgroundColor: cpBg, color: cpFg }}
          >
            ${cp.toFixed(2)}
          </span>
          {/* 下向き三角 */}
          <span
            className="w-0 h-0"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `5px solid ${cpBg}`,
            }}
          />
        </div>
      </div>

      {/* ── メインバー ── */}
      <div
        className="relative h-6 rounded-sm"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {/* エントリーゾーン塗り */}
        {hasEntry && (
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `${entryL.toFixed(2)}%`,
              width: `${entryW.toFixed(2)}%`,
              backgroundColor: inZone ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.08)',
              borderLeft: `1px solid ${inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.35)'}`,
              borderRight: `1px solid ${inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.35)'}`,
            }}
          />
        )}

        {/* Bear ライン */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: toLeft(bear), backgroundColor: 'var(--accent-red)', opacity: 0.75 }}
        />
        {/* Base ライン */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{ left: toLeft(base), backgroundColor: 'var(--accent-gold)' }}
        />
        {/* Bull ライン */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: toLeft(bull), backgroundColor: 'var(--accent-green)', opacity: 0.75 }}
        />
      </div>

      {/* ── バー下ラベル ── */}
      {/* Bear/Bull は上段 (top-1)、Base は近接時に下段 (top-5) にずらして重複回避 */}
      <div className="relative h-14">

        {/* Bear */}
        <div
          className="absolute top-1 text-center"
          style={{ left: toLeft(bear), transform: 'translateX(-50%)' }}
        >
          <div className="font-mono-dm text-[9px] leading-snug" style={{ color: 'var(--accent-red)' }}>Bear</div>
          <div className="font-mono-dm text-[9px] leading-snug" style={{ color: 'var(--accent-red)' }}>${bear.toLocaleString()}</div>
        </div>

        {/* Base（近接時は下段） */}
        <div
          className="absolute text-center"
          style={{
            left: toLeft(base),
            transform: 'translateX(-50%)',
            top: baseStagger ? '20px' : '4px',
          }}
        >
          <div className="font-mono-dm text-[9px] font-bold leading-snug" style={{ color: 'var(--accent-gold)' }}>Base</div>
          <div className="font-mono-dm text-[9px] font-bold leading-snug" style={{ color: 'var(--accent-gold-light)' }}>${base.toLocaleString()}</div>
        </div>

        {/* Bull */}
        <div
          className="absolute top-1 text-center"
          style={{ left: toLeft(bull), transform: 'translateX(-50%)' }}
        >
          <div className="font-mono-dm text-[9px] leading-snug" style={{ color: 'var(--accent-green)' }}>Bull</div>
          <div className="font-mono-dm text-[9px] leading-snug" style={{ color: 'var(--accent-green)' }}>${bull.toLocaleString()}</div>
        </div>

        {/* エントリーゾーンラベル（中央上） */}
        {hasEntry && (
          <div
            className="absolute top-0 text-center"
            style={{
              left: `${((entryL + entryR) / 2).toFixed(2)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="font-mono-dm text-[8px] tracking-widest whitespace-nowrap"
              style={{ color: inZone ? 'var(--accent-green)' : 'rgba(16,185,129,0.45)' }}
            >
              {inZone ? '★ ENTRY' : 'ENTRY'}
            </div>
          </div>
        )}
      </div>

      {/* ── サマリー行 ── */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded flex-wrap"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="font-mono-dm text-[11px] flex items-center gap-1.5 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
          <span>Base Case比:</span>
          <strong
            className="whitespace-nowrap"
            style={{ color: baseDiff != null && baseDiff > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}
          >
            {baseDiff != null ? `${baseDiff >= 0 ? '+' : ''}${baseDiff.toFixed(1)}%` : '—'}
          </strong>
          {analysis.valuationLabel && (
            <span className="whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
              {analysis.valuationLabel}
            </span>
          )}
        </div>
        {inZone && (
          <div
            className="font-mono-dm text-[10px] font-bold animate-pulse ml-auto"
            style={{ color: 'var(--accent-green)' }}
          >
            🔥 エントリーチャンス！
          </div>
        )}
      </div>
    </div>
  );
}
