import { HelpCircle } from 'lucide-react';
import { useEthTradingStore } from '../../stores/ethTradingStore';

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

export function TradingConfigPanel() {
  const { config, updateConfig } = useEthTradingStore();

  const fields = [
    {
      key: 'bankroll' as const,
      label: '運用資金 (¥)',
      step: 100000,
      tooltip: 'ETHトレーディングに割り当てる総資金。ケリー基準のポジションサイズ計算のベースとなります。',
    },
    {
      key: 'maxExposure' as const,
      label: '最大エクスポージャー (¥)',
      step: 50000,
      tooltip: '未決済ポジションの合計上限額。これを超える新規ポジションはガードレールでブロックされます。',
    },
    {
      key: 'dailyVarLimit' as const,
      label: '1日VaR許容額 (¥)',
      step: 10000,
      tooltip: '1日の最大許容損失額。VaR(95%)がこの値を超えるとエントリーがブロックされます。',
    },
    {
      key: 'kellyAlpha' as const,
      label: 'Kelly係数 α (0〜1)',
      step: 0.05,
      tooltip: '部分ケリー係数。f = α·f* で実際のポジションサイズを決定。0.25が推奨値（フルケリーの25%）。',
    },
    {
      key: 'edgeThreshold' as const,
      label: 'エッジ閾値 (%)',
      step: 0.01,
      tooltip: 'エントリーに必要な最低Edge（モデル確率 - 市場確率）。0.04 = 4%以上のEdgeがないと取引しない。',
    },
    {
      key: 'mddThreshold' as const,
      label: '最大ドローダウン閾値 (%)',
      step: 1,
      tooltip: '新規エントリーを禁止するドローダウン水準。この値を超えると「5. ドローダウン制限」が不合格に。',
    },
  ];

  return (
    <div className="ch-card">
      <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3">取引設定</p>
      <div className="space-y-2.5">
        {fields.map(({ key, label, step, tooltip }) => (
          <div key={key}>
            <label className="text-[10px] font-mono text-[var(--text-muted)] mb-0.5 flex items-center">
              {label}
              <Tip text={tooltip} />
            </label>
            <input
              type="number"
              value={config[key]}
              step={step}
              onChange={(e) => updateConfig({ [key]: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono rounded px-2 py-1.5 focus:border-[var(--accent-blue)] focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
