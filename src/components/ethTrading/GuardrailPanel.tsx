import { ShieldCheck, ShieldX, HelpCircle } from 'lucide-react';
import type { GuardrailCheck } from '../../types';

interface GuardrailPanelProps {
  guardrails: GuardrailCheck | null;
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

interface CheckRowProps {
  label: string;
  formula: string;
  pass: boolean;
  detail: string;
  tooltip: string;
}

function CheckRow({ label, formula, pass, detail, tooltip }: CheckRowProps) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded border ${pass ? 'border-[var(--accent-green)]/20 bg-[var(--accent-green)]/5' : 'border-[var(--accent-red)]/20 bg-[var(--accent-red)]/5'}`}>
      <span className={`text-sm font-mono font-bold ${pass ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
        {pass ? '合格' : '不可'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center">
          {label}
          <Tip text={tooltip} />
        </p>
        <p className="text-[10px] font-mono text-[var(--text-muted)]">{formula}</p>
      </div>
      <span className="text-xs font-mono text-[var(--text-secondary)] shrink-0">{detail}</span>
    </div>
  );
}

const fmtJpy = (v: number) => `¥${Math.round(Math.abs(v)).toLocaleString('ja-JP')}`;

export function GuardrailPanel({ guardrails }: GuardrailPanelProps) {
  if (!guardrails) {
    return (
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-2">実行ガードレール</p>
        <p className="text-xs text-[var(--text-muted)]">データ取得中...</p>
      </div>
    );
  }

  const { edgeCheck, sizeCheck, exposureCheck, varCheck, drawdownCheck, allPassed } = guardrails;

  return (
    <div className="ch-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">実行ガードレール</p>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-bold ${allPassed ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'}`}>
          {allPassed ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldX className="w-3.5 h-3.5" />}
          {allPassed ? '全条件クリア — 取引可能' : 'ブロック — 条件未達'}
        </div>
      </div>

      <div className="space-y-2">
        <CheckRow
          label="1. エッジ条件"
          formula={`Edge > ${(edgeCheck.threshold * 100).toFixed(0)}%`}
          pass={edgeCheck.pass}
          detail={`${(edgeCheck.value * 100).toFixed(1)}%`}
          tooltip="モデル確率と市場確率の差（Edge）が閾値を超えていること。Edge = P(model) - P(market)。"
        />
        <CheckRow
          label="2. ポジションサイズ制限"
          formula="注文サイズ ≤ f = α·f*"
          pass={sizeCheck.pass}
          detail={`Kelly許容: ${fmtJpy(sizeCheck.limit)}`}
          tooltip="部分ケリー基準（f = α·f*）を超えるポジションを取らない。過大リスクの防止。"
        />
        <CheckRow
          label="3. エクスポージャー制限"
          formula={`建玉合計 ≤ ${fmtJpy(exposureCheck.max)}`}
          pass={exposureCheck.pass}
          detail={`現在: ${fmtJpy(exposureCheck.current)}`}
          tooltip="未決済ポジションの合計額が最大エクスポージャー上限を超えないこと。"
        />
        <CheckRow
          label="4. VaR制限"
          formula={`VaR(95%) ≤ ${fmtJpy(varCheck.dailyLimit)}/日`}
          pass={varCheck.pass}
          detail={`VaR: ${fmtJpy(varCheck.var95)}`}
          tooltip="95%信頼区間の1日最大損失額（VaR = μ - 1.645·σ）が許容範囲内であること。"
        />
        <CheckRow
          label="5. 最大ドローダウン制限"
          formula={`MDD < ${drawdownCheck.threshold}%`}
          pass={drawdownCheck.pass}
          detail={`MDD: ${drawdownCheck.mdd.toFixed(1)}%`}
          tooltip="高値からの最大下落率（MDD）が閾値未満であること。MDD超過時は新規エントリー禁止。"
        />
      </div>
    </div>
  );
}
