import { HelpCircle } from 'lucide-react';
import type { SignalResult, TradingSignal } from '../../types';

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-flex">
      <HelpCircle className="w-3 h-3 text-[var(--text-muted)] cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] rounded shadow-lg w-48 whitespace-normal opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {text}
      </span>
    </span>
  );
}

const SIGNAL_CONFIG: Record<TradingSignal, { label: string; color: string; bgClass: string }> = {
  strong_buy:  { label: '強い買い',  color: 'var(--accent-green)', bgClass: 'bg-[var(--accent-green)]/15' },
  buy:         { label: '買い',      color: 'var(--accent-blue)',  bgClass: 'bg-[var(--accent-blue)]/15' },
  watch:       { label: '様子見',    color: 'var(--accent-gold)',  bgClass: 'bg-[var(--accent-gold)]/15' },
  sell:        { label: '売り',      color: 'var(--accent-orange)', bgClass: 'bg-[var(--accent-orange)]/15' },
  strong_sell: { label: '強い売り',  color: 'var(--accent-red)',   bgClass: 'bg-[var(--accent-red)]/15' },
};

interface SignalPanelProps {
  signal: SignalResult | null;
}

export function SignalPanel({ signal }: SignalPanelProps) {
  if (!signal) {
    return (
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-2">シグナル</p>
        <p className="text-sm text-[var(--text-secondary)]">データ取得中...</p>
      </div>
    );
  }

  const cfg = SIGNAL_CONFIG[signal.signal];

  return (
    <div className="ch-card">
      <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3">シグナル</p>

      {/* シグナルバッジ */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`px-3 py-1.5 rounded text-sm font-mono font-bold ${cfg.bgClass}`}
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* コアメトリクス */}
      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-[var(--border)]">
        <div>
          <p className="text-[9px] font-mono text-[var(--text-muted)] flex items-center">
            モデル確率
            <Tip text="ベイズ更新により算出されたモデルの推定上昇確率。各テクニカル指標をエビデンスとして順次更新します。" />
          </p>
          <p className="text-base font-mono font-bold text-[var(--text-primary)]">
            {(signal.pModel * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--text-muted)] flex items-center">
            市場確率
            <Tip text="効率的市場仮説に基づく市場の暗示確率（ベースライン50%）。P(model) > P(market) なら優位性あり。" />
          </p>
          <p className="text-base font-mono text-[var(--text-secondary)]">
            {(signal.pMarket * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--text-muted)] flex items-center">
            期待値(EV)
            <Tip text="期待値 = p·b - (1-p)。正の値は統計的に有利な取引であることを示します。" />
          </p>
          <p className={`text-base font-mono font-bold ${signal.ev > 0 ? 'text-[var(--accent-green)]' : signal.ev < 0 ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)]'}`}>
            {signal.ev > 0 ? '+' : ''}{signal.ev.toFixed(3)}
          </p>
        </div>
      </div>

      {/* Edge / Kelly */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <p className="text-[9px] font-mono text-[var(--text-muted)] flex items-center">
            エッジ
            <Tip text="Edge = P(model) - P(market)。モデルと市場の確率差。4%以上でエントリー条件成立。" />
          </p>
          <p className={`text-base font-mono font-bold ${signal.edge > 0 ? 'text-[var(--accent-green)]' : signal.edge < 0 ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)]'}`}>
            {signal.edge > 0 ? '+' : ''}{(signal.edge * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--text-muted)] flex items-center">
            Kelly f*
            <Tip text="ケリー基準 f* = (p·b-q)/b。資金の何%を賭けるべきかの理論最適値。" />
          </p>
          <p className="text-base font-mono text-[var(--text-secondary)]">
            {(signal.kellyFull * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono text-[var(--text-muted)] flex items-center">
            部分Kelly
            <Tip text="f = α·f*（α=0.25）。フルケリーの25%に抑えた実用サイズ。過大リスクを回避します。" />
          </p>
          <p className="text-base font-mono font-bold text-[var(--text-primary)]">
            {signal.kellyFraction.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ベイズ更新トレース */}
      <div>
        <p className="text-[9px] font-mono text-[var(--text-muted)] mb-1.5 flex items-center">
          ベイズ更新トレース
          <Tip text="各テクニカル指標によるベイズ事後確率の更新過程。P(H|E) = P(E|H)·P(H)/P(E)" />
        </p>
        <div className="space-y-0.5">
          {signal.bayesTrace.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[var(--text-muted)] w-3 text-right">{i + 1}.</span>
              <span className="text-[var(--text-secondary)] flex-1 truncate">{step.source}</span>
              <span className="text-[var(--text-muted)]">{(step.priorP * 100).toFixed(0)}%</span>
              <span className="text-[var(--text-muted)]">{'\u2192'}</span>
              <span className={step.posteriorP > step.priorP ? 'text-[var(--accent-green)]' : step.posteriorP < step.priorP ? 'text-[var(--accent-red)]' : 'text-[var(--text-secondary)]'}>
                {(step.posteriorP * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
