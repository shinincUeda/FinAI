import { HelpCircle } from 'lucide-react';
import type { TechnicalIndicators } from '../../types';

interface IndicatorCardsProps {
  indicators: TechnicalIndicators | null;
  currentPrice: number | null;
  usdJpyRate: number;
}

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-flex">
      <HelpCircle className="w-3 h-3 text-[var(--text-muted)] cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] rounded shadow-lg w-52 whitespace-normal opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {text}
      </span>
    </span>
  );
}

function RsiGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = value < 30 ? 'var(--accent-green)' : value > 70 ? 'var(--accent-red)' : 'var(--accent-gold)';
  const label = value < 30 ? '売られすぎ' : value > 70 ? '買われすぎ' : '中立';

  return (
    <div>
      <div className="flex justify-between items-end mb-1">
        <span className="text-2xl font-mono font-bold" style={{ color }}>{pct.toFixed(1)}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
      </div>
      <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] mt-0.5">
        <span>0</span>
        <span>30</span>
        <span>70</span>
        <span>100</span>
      </div>
    </div>
  );
}

const fmtJpy = (usd: number, rate: number) => `¥${Math.round(usd * rate).toLocaleString('ja-JP')}`;

export function IndicatorCards({ indicators, currentPrice, usdJpyRate }: IndicatorCardsProps) {
  if (!indicators || currentPrice == null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="ch-card h-32 flex items-center justify-center">
            <p className="text-xs text-[var(--text-muted)] font-mono">計算中...</p>
          </div>
        ))}
      </div>
    );
  }

  const macdSignal = indicators.macd.histogram > 0 ? '買い優勢' : '売り優勢';
  const macdColor = indicators.macd.histogram > 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  const bbRange = indicators.bollingerBands.upper - indicators.bollingerBands.lower;
  const bbPosition = ((currentPrice - indicators.bollingerBands.lower) / bbRange * 100).toFixed(0);
  const bbLabel = currentPrice < indicators.bollingerBands.lower ? 'バンド下抜け'
    : currentPrice > indicators.bollingerBands.upper ? 'バンド上抜け'
    : 'バンド内';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* RSI */}
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3 flex items-center">
          RSI (14日)
          <Tip text="相対力指数。過去14日の上昇・下落の割合から算出。30以下=売られすぎ（買いシグナル）、70以上=買われすぎ（売りシグナル）。" />
        </p>
        <RsiGauge value={indicators.rsi} />
      </div>

      {/* MACD */}
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3 flex items-center">
          MACD (12/26/9)
          <Tip text="移動平均収束拡散法。短期(12)と長期(26)のEMA差。ヒストグラムが正→買い優勢、負→売り優勢。ゴールデンクロス/デッドクロスで転換判定。" />
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-mono font-bold" style={{ color: macdColor }}>
            {macdSignal}
          </span>
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">MACD線</span>
            <span className="text-[var(--text-secondary)]">{indicators.macd.macd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">シグナル線</span>
            <span className="text-[var(--text-secondary)]">{indicators.macd.signal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">ヒストグラム</span>
            <span style={{ color: macdColor }}>{indicators.macd.histogram.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bollinger Bands */}
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3 flex items-center">
          ボリンジャーバンド (20日, 2σ)
          <Tip text="20日移動平均±2標準偏差のバンド。価格がバンド下限付近→反発期待（買い）、上限付近→反落警戒（売り）。バンド幅はボラティリティを反映。" />
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{bbLabel}</span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">位置: {bbPosition}%</span>
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">上限</span>
            <span className="text-[var(--accent-red)]">{fmtJpy(indicators.bollingerBands.upper, usdJpyRate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">中央</span>
            <span className="text-[var(--text-secondary)]">{fmtJpy(indicators.bollingerBands.middle, usdJpyRate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">下限</span>
            <span className="text-[var(--accent-green)]">{fmtJpy(indicators.bollingerBands.lower, usdJpyRate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
