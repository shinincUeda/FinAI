import { CheckCircle, XCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import type { SignalResult, RiskMetrics, GuardrailCheck } from '../../types';

interface VerdictPanelProps {
  signal: SignalResult | null;
  risk: RiskMetrics | null;
  guardrails: GuardrailCheck | null;
  bankroll: number;
}

type Verdict = 'buy' | 'sell' | 'wait' | 'blocked';

interface VerdictInfo {
  verdict: Verdict;
  title: string;
  subtitle: string;
  color: string;
  bgClass: string;
  borderClass: string;
  icon: typeof CheckCircle;
  reasons: string[];
}

function deriveVerdict(
  signal: SignalResult,
  risk: RiskMetrics,
  guardrails: GuardrailCheck,
  bankroll: number,
): VerdictInfo {
  const reasons: string[] = [];

  // --- ガードレール ---
  if (!guardrails.allPassed) {
    const fails: string[] = [];
    if (!guardrails.edgeCheck.pass)
      fails.push('エッジ不足');
    if (!guardrails.sizeCheck.pass)
      fails.push('Kelly算出不可');
    if (!guardrails.exposureCheck.pass)
      fails.push('エクスポージャー超過');
    if (!guardrails.varCheck.pass)
      fails.push('VaR超過');
    if (!guardrails.drawdownCheck.pass)
      fails.push(`MDD ${guardrails.drawdownCheck.mdd.toFixed(1)}%超過`);
    reasons.push(
      `ガードレール5条件のうち「${fails.join('」「')}」が不通過です。つまり、リスク管理上の安全条件を満たしておらず、現在は取引すべきではありません。`
    );
  } else {
    reasons.push(
      'ガードレール5条件すべてクリアしています。つまり、リスク管理上の安全条件を満たしており、エントリー可能な状態です。'
    );
  }

  // --- EV ---
  if (signal.ev > 0) {
    reasons.push(
      `期待値がプラスです (EV: +${signal.ev.toFixed(3)})。つまり、統計的に有利な取引機会であり、繰り返せば利益が見込めます。`
    );
  } else {
    reasons.push(
      `期待値がマイナスです (EV: ${signal.ev.toFixed(3)})。つまり、このタイミングで買っても統計的に損失が見込まれるため、エントリーすべきではありません。`
    );
  }

  // --- Edge ---
  const edgePct = (signal.edge * 100).toFixed(1);
  if (signal.edge > 0.04) {
    reasons.push(
      `モデルが市場より強気です (Edge: +${edgePct}%)。つまり、テクニカル指標がモデルの買い確率を市場の想定より${edgePct}%押し上げており、買いの優位性があります。`
    );
  } else if (signal.edge < -0.04) {
    reasons.push(
      `モデルが市場より弱気です (Edge: ${edgePct}%)。つまり、テクニカル指標が下落方向を示唆しており、買いの優位性はありません。`
    );
  } else {
    reasons.push(
      `エッジが不十分です (Edge: ${edgePct}%)。つまり、モデルと市場の見立てに大差がなく、明確な優位性がないため見送りが妥当です。`
    );
  }

  // --- MDD ---
  if (risk.maxDrawdown > 8) {
    reasons.push(
      `最大ドローダウンが ${risk.maxDrawdown.toFixed(1)}% に達しています。つまり、直近高値から大きく下落しており、さらなる下落リスクを考慮して新規買いは控えるべきです。`
    );
  }

  // --- Sharpe ---
  if (risk.sharpeRatio < 1) {
    reasons.push(
      `シャープレシオが ${risk.sharpeRatio.toFixed(2)} と低水準です。つまり、取っているリスクに対してリターンが見合っておらず、効率の良い投資環境ではありません。`
    );
  } else if (risk.sharpeRatio >= 2) {
    reasons.push(
      `シャープレシオが ${risk.sharpeRatio.toFixed(2)} と良好です。つまり、リスクに対して十分なリターンが期待でき、効率の良い投資環境です。`
    );
  }

  // --- Kelly推奨額 ---
  if (signal.kellyFraction > 0) {
    const kellyJpy = (signal.kellyFraction / 100) * bankroll;
    reasons.push(
      `部分ケリー基準による推奨投資額は ¥${Math.round(kellyJpy).toLocaleString('ja-JP')} です (資金の${signal.kellyFraction.toFixed(1)}%)。つまり、この金額を上限にポジションを取るのが数学的に最適なサイズです。`
    );
  } else {
    reasons.push(
      'ケリー基準による推奨投資額は ¥0 です。つまり、現在の期待値では資金を投入すべきではないとモデルが判断しています。'
    );
  }

  // --- 最終判定 ---
  if (!guardrails.allPassed) {
    return {
      verdict: 'blocked',
      title: '取引見送り',
      subtitle: 'ガードレール条件を満たしていません。現在はエントリーすべきではありません。',
      color: 'var(--accent-red)',
      bgClass: 'bg-[var(--accent-red)]/8',
      borderClass: 'border-[var(--accent-red)]/30',
      icon: XCircle,
      reasons,
    };
  }

  if (signal.signal === 'strong_buy' || signal.signal === 'buy') {
    return {
      verdict: 'buy',
      title: '買いエントリー推奨',
      subtitle: 'ガードレール全通過・正のEV・十分なエッジを確認。部分Kellyサイズでのエントリーを検討してください。',
      color: 'var(--accent-green)',
      bgClass: 'bg-[var(--accent-green)]/8',
      borderClass: 'border-[var(--accent-green)]/30',
      icon: CheckCircle,
      reasons,
    };
  }

  if (signal.signal === 'strong_sell' || signal.signal === 'sell') {
    return {
      verdict: 'sell',
      title: '売りシグナル — ポジション縮小検討',
      subtitle: '下落圧力を検出。保有ポジションがある場合は利確・損切りを検討してください。',
      color: 'var(--accent-orange)',
      bgClass: 'bg-[var(--accent-orange)]/8',
      borderClass: 'border-[var(--accent-orange)]/30',
      icon: AlertTriangle,
      reasons,
    };
  }

  return {
    verdict: 'wait',
    title: '様子見',
    subtitle: 'シグナルが明確ではありません。明確なエッジが出るまで待機を推奨します。',
    color: 'var(--accent-gold)',
    bgClass: 'bg-[var(--accent-gold)]/8',
    borderClass: 'border-[var(--accent-gold)]/30',
    icon: MinusCircle,
    reasons,
  };
}

export function VerdictPanel({ signal, risk, guardrails, bankroll }: VerdictPanelProps) {
  if (!signal || !risk || !guardrails) {
    return (
      <div className="ch-card">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-2">総合判定</p>
        <p className="text-xs text-[var(--text-muted)]">データ取得中...</p>
      </div>
    );
  }

  const info = deriveVerdict(signal, risk, guardrails, bankroll);
  const Icon = info.icon;

  return (
    <div className={`ch-card border ${info.borderClass} ${info.bgClass}`}>
      <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-3">総合判定</p>

      <div className="flex items-start gap-3 mb-3">
        <Icon className="w-7 h-7 shrink-0 mt-0.5" style={{ color: info.color }} />
        <div>
          <p className="text-lg font-bold" style={{ color: info.color }}>
            {info.title}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {info.subtitle}
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-3">
        <p className="text-[9px] font-mono text-[var(--text-muted)] mb-2">判定根拠</p>
        <ul className="space-y-2.5">
          {info.reasons.map((r, i) => (
            <li key={i} className="text-[11px] text-[var(--text-secondary)] leading-relaxed flex items-start gap-2">
              <span className="text-[var(--text-muted)] font-mono shrink-0 mt-px">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
