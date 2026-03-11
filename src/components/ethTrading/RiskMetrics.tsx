import { HelpCircle } from 'lucide-react';
import type { RiskMetrics as RiskMetricsType } from '../../types';

interface RiskMetricsProps {
  metrics: RiskMetricsType | null;
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

const fmtJpy = (usd: number, rate: number) => `¥${Math.round(Math.abs(usd) * rate).toLocaleString('ja-JP')}`;

export function RiskMetrics({ metrics, usdJpyRate }: RiskMetricsProps) {
  if (!metrics) {
    return (
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-2">リスク指標</p>
        <p className="text-xs text-[var(--text-muted)]">計算中...</p>
      </div>
    );
  }

  const mddBlocked = metrics.maxDrawdown > 8;

  const items = [
    {
      label: 'VaR (95%)',
      value: fmtJpy(metrics.var95, usdJpyRate),
      sub: `μ - 1.645·σ | 上限: ${fmtJpy(metrics.dailyVarLimit, usdJpyRate)}`,
      color: Math.abs(metrics.var95) <= metrics.dailyVarLimit ? 'var(--accent-green)' : 'var(--accent-red)',
      tooltip: '95%信頼区間での1日最大想定損失額。VaR = μ - 1.645·σ で算出。この額を超える損失は5%の確率でしか起きないとする。',
    },
    {
      label: '最大ドローダウン',
      value: `${metrics.maxDrawdown.toFixed(1)}%`,
      sub: mddBlocked ? '新規エントリー非推奨' : '< 8% OK',
      color: mddBlocked ? 'var(--accent-red)' : 'var(--accent-green)',
      tooltip: '直近高値からの最大下落率。8%を超えるとリスク管理上、新規ポジションの構築を控えるべきとするガードレール。',
    },
    {
      label: 'シャープレシオ',
      value: metrics.sharpeRatio.toFixed(2),
      sub: metrics.sharpeRatio > 2 ? '目標 SR > 2.0 達成' : '目標 SR > 2.0',
      color: metrics.sharpeRatio > 2 ? 'var(--accent-green)' : metrics.sharpeRatio > 1 ? 'var(--accent-gold)' : 'var(--accent-red)',
      tooltip: 'リスク調整後リターン指標。SR = (平均リターン - 無リスク金利) / 標準偏差。2.0以上が優秀。1.0未満はリスクに見合わないリターン。',
    },
    {
      label: 'プロフィットファクター',
      value: metrics.profitFactor > 100 ? '∞' : metrics.profitFactor.toFixed(2),
      sub: metrics.profitFactor > 1.5 ? 'PF > 1.5 達成' : '目標 PF > 1.5',
      color: metrics.profitFactor > 1.5 ? 'var(--accent-green)' : 'var(--accent-gold)',
      tooltip: '総利益 / 総損失の比率。1.5以上が望ましい。1.0未満は損失超過を意味する。上昇日の合計リターンと下落日の合計リターンから算出。',
    },
  ];

  return (
    <div className="ch-card">
      <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3">リスク指標</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mb-1 flex items-center">
              {item.label}
              <Tip text={item.tooltip} />
            </p>
            <p className="text-xl font-mono font-bold" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
