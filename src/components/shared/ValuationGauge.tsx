// バリュエーション & エントリーゾーン ゲージ
// StockDetailModal / ThesisPage で共有

import { Target } from 'lucide-react';
import type { CompounderAnalysis } from '../../types';

interface ValuationGaugeProps {
  analysis: CompounderAnalysis;
  currentPrice?: number;
  ticker?: string;
}

// ──────────────────────────────────────────────────────────────────────
// エントリーゾーン状態判定
// ──────────────────────────────────────────────────────────────────────
interface EntryStatus {
  label: string;
  sublabel: string;
  badgeText: string;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  showFlame: boolean;
  isWarning: boolean;
}

function getEntryStatus(
  currentPrice: number,
  bearCase: number,
  baseCase: number,
  _bullCase: number,
  fundamentalGrade: 'S' | 'A' | 'B' | 'C' | 'D',
): EntryStatus {
  const baseRatio = currentPrice / baseCase;
  const bearRatio = currentPrice / bearCase;
  const isHighGrade = fundamentalGrade === 'S' || fundamentalGrade === 'A';

  // ケース1：株価が Bear Case を下回っている
  if (currentPrice < bearCase) {
    if (isHighGrade) {
      return {
        label: '⚠️ Bear Case前提を再確認',
        sublabel: `株価 $${currentPrice} は Bear Case $${bearCase} を下回っています。\nマルチプル・成長率の前提見直しが必要です。`,
        badgeText: `Bear Case比 ${Math.round(bearRatio * 100)}%`,
        color: 'orange',
        showFlame: false,
        isWarning: true,
      };
    } else {
      return {
        label: '⚠️ バリュートラップ注意',
        sublabel: `Grade ${fundamentalGrade} 企業。Bear Case前提自体が楽観的な可能性があります。`,
        badgeText: `Bear Case比 ${Math.round(bearRatio * 100)}%`,
        color: 'red',
        showFlame: false,
        isWarning: true,
      };
    }
  }

  // ケース2：Bear Case 以上 かつ Base Case × 80% 未満 → 本来の「エントリーチャンス」ゾーン
  if (currentPrice >= bearCase && currentPrice < baseCase * 0.80) {
    if (isHighGrade) {
      return {
        label: '🔥 エントリーチャンス',
        sublabel: `Base Case比 ${Math.round(baseRatio * 100)}%。高品質企業の割安ゾーンです。`,
        badgeText: `Base Case比 ${Math.round(baseRatio * 100)}%`,
        color: 'green',
        showFlame: true,
        isWarning: false,
      };
    } else {
      return {
        label: '△ 割安だが品質に注意',
        sublabel: `Grade ${fundamentalGrade} 企業。コンパウンダーの条件を満たしていません。`,
        badgeText: `Base Case比 ${Math.round(baseRatio * 100)}%`,
        color: 'yellow',
        showFlame: false,
        isWarning: false,
      };
    }
  }

  // ケース3：Base Case × 80% 以上 × 90% 未満 → 割安圏
  if (currentPrice >= baseCase * 0.80 && currentPrice < baseCase * 0.90) {
    return {
      label: '○ 割安圏',
      sublabel: `Base Case比 ${Math.round(baseRatio * 100)}%。`,
      badgeText: `Base Case比 ${Math.round(baseRatio * 100)}%`,
      color: 'green',
      showFlame: false,
      isWarning: false,
    };
  }

  // ケース4：Base Case × 90% 〜 110% → 適正水準
  if (currentPrice >= baseCase * 0.90 && currentPrice <= baseCase * 1.10) {
    return {
      label: '△ 適正水準',
      sublabel: 'Buy on Dip（調整待ち）ゾーン。',
      badgeText: `Base Case比 ${Math.round(baseRatio * 100)}%`,
      color: 'gray',
      showFlame: false,
      isWarning: false,
    };
  }

  // ケース5：Base Case × 110% 〜 130% → 割高
  if (currentPrice > baseCase * 1.10 && currentPrice <= baseCase * 1.30) {
    return {
      label: '▲ 割高',
      sublabel: `Base Case比 ${Math.round(baseRatio * 100)}%。調整を待ってください。`,
      badgeText: `Base Case比 ${Math.round(baseRatio * 100)}%`,
      color: 'yellow',
      showFlame: false,
      isWarning: false,
    };
  }

  // ケース6：Base Case × 130% 超 → 大幅割高
  return {
    label: '× 大幅割高',
    sublabel: `Base Case比 ${Math.round(baseRatio * 100)}%。`,
    badgeText: `Base Case比 ${Math.round(baseRatio * 100)}%`,
    color: 'red',
    showFlame: false,
    isWarning: false,
  };
}

// ──────────────────────────────────────────────────────────────────────
// ★ ENTRYマーカー設定
// ──────────────────────────────────────────────────────────────────────
interface EntryMarker {
  position: number | null;
  label: string | null;
  isWarning: boolean;
  color: string;
}

function getEntryMarker(
  currentPrice: number,
  bearCase: number,
  baseCase: number,
  fundamentalGrade: 'S' | 'A' | 'B' | 'C' | 'D',
): EntryMarker {
  const isHighGrade = fundamentalGrade === 'S' || fundamentalGrade === 'A';

  if (currentPrice < bearCase) {
    return {
      position: bearCase,
      label: '⚠️ Bear Case',
      isWarning: true,
      color: 'orange',
    };
  }

  if (isHighGrade && currentPrice >= bearCase && currentPrice < baseCase * 0.80) {
    return {
      position: bearCase,
      label: '★ ENTRY',
      isWarning: false,
      color: 'green',
    };
  }

  return { position: null, label: null, isWarning: false, color: 'gray' };
}

// ──────────────────────────────────────────────────────────────────────
// Base Case 比サマリーテキスト
// ──────────────────────────────────────────────────────────────────────
function getValuationSummaryText(
  currentPrice: number,
  bearCase: number,
  baseCase: number,
): string {
  const ratio = currentPrice / baseCase;
  const pct = Math.round((ratio - 1) * 100);
  const sign = pct >= 0 ? '+' : '';
  const label =
    pct >= 10 ? '大幅割高'
    : pct >= 0 ? '割高'
    : pct >= -10 ? '適正'
    : pct >= -20 ? '割安'
    : '大幅割安';
  const warning =
    currentPrice < bearCase
      ? `  ／  ⚠️ Bear Case $${bearCase} も下回り中 → 前提要見直し`
      : '';
  return `Base Case比: ${sign}${pct}% ${label}${warning}`;
}

// ──────────────────────────────────────────────────────────────────────
// カラーマップ
// ──────────────────────────────────────────────────────────────────────
const ENTRY_COLOR_MAP = {
  green:  { badge: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)'  },
  yellow: { badge: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)'  },
  orange: { badge: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)'  },
  red:    { badge: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)'   },
  gray:   { badge: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.25)' },
};

// ──────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────
export function ValuationGauge({ analysis, currentPrice, ticker }: ValuationGaugeProps) {
  const { bear, base, bull } = analysis.fairValue;
  const cp = currentPrice && currentPrice > 0 ? currentPrice : base;
  const grade = analysis.fundamentalGrade;

  const entryStatus = getEntryStatus(cp, bear, base, bull, grade);
  const entryMarker = getEntryMarker(cp, bear, base, grade);
  const summaryText = getValuationSummaryText(cp, bear, base);

  const colors = ENTRY_COLOR_MAP[entryStatus.color];

  // ── スケール計算 ──────────────────────────────────────────
  const allVals = [bear, base, bull, cp].filter(v => v > 0);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const pad = Math.max((maxV - minV) * 0.15, 5);
  const minScale = minV - pad;
  const maxScale = maxV + pad;
  const range = maxScale - minScale || 1;

  const toLeftPct = (v: number): number =>
    Math.max(0, Math.min(100, ((v - minScale) / range) * 100));
  const toLeft = (v: number): string => `${toLeftPct(v).toFixed(2)}%`;

  // ラベル重複判定
  const bearPct = toLeftPct(bear);
  const basePct = toLeftPct(base);
  const bullPct = toLeftPct(bull);
  const TOO_CLOSE = 12;
  const baseStagger =
    Math.abs(basePct - bearPct) < TOO_CLOSE ||
    Math.abs(basePct - bullPct) < TOO_CLOSE;

  const baseDiff = base > 0 ? ((cp - base) / base) * 100 : null;
  const cpBg = entryStatus.showFlame ? 'var(--accent-green)' : entryStatus.isWarning ? '#fb923c' : 'var(--accent-blue)';
  const cpFg = entryStatus.showFlame ? '#000' : '#fff';

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

        {/* ★ ENTRY / ⚠️ Bear Case マーカー */}
        {entryMarker.position != null && entryMarker.label != null && (
          <div
            className={`absolute top-0 text-center entry-marker${entryMarker.isWarning ? ' is-warning' : ''}`}
            style={{
              left: toLeft(entryMarker.position),
              transform: 'translateX(-50%)',
              marginTop: '28px',
            }}
          >
            <div
              className="font-mono-dm text-[8px] tracking-widest whitespace-nowrap px-1 rounded"
              style={{
                color: entryMarker.isWarning ? '#fb923c' : 'var(--accent-green)',
                border: `1px solid ${entryMarker.isWarning ? 'rgba(251,146,60,0.4)' : 'rgba(16,185,129,0.4)'}`,
                backgroundColor: entryMarker.isWarning ? 'rgba(251,146,60,0.1)' : 'rgba(16,185,129,0.1)',
              }}
            >
              {entryMarker.label}
            </div>
          </div>
        )}
      </div>

      {/* ── エントリーステータスバッジ ── */}
      <div
        className="rounded px-3 py-2 mb-2"
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          className="font-mono-dm text-[11px] font-bold flex items-center gap-2"
          style={{ color: colors.badge }}
        >
          {entryStatus.showFlame && (
            <span className="animate-pulse">🔥</span>
          )}
          {entryStatus.label}
          <span
            className="ml-auto text-[10px] font-normal px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.badge,
            }}
          >
            {entryStatus.badgeText}
          </span>
        </div>
        {entryStatus.sublabel && (
          <div
            className="font-mono-dm mt-1 entry-sublabel"
            style={{ color: 'var(--text-muted)' }}
          >
            {entryStatus.sublabel}
          </div>
        )}
      </div>

      {/* ── サマリー行 ── */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded flex-wrap"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="font-mono-dm text-[11px] flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
          <span className="whitespace-nowrap">{summaryText}</span>
          {analysis.valuationLabel && (
            <span className="whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
              {analysis.valuationLabel}
            </span>
          )}
        </div>
        {baseDiff != null && (
          <strong
            className="ml-auto whitespace-nowrap font-mono-dm text-[11px]"
            style={{ color: baseDiff > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}
          >
            {baseDiff >= 0 ? '+' : ''}{baseDiff.toFixed(1)}%
          </strong>
        )}
      </div>
    </div>
  );
}
