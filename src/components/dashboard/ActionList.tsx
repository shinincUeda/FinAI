import { CheckSquare } from 'lucide-react';

const SAMPLE_ACTIONS = [
  'OXY / CVX を売却し、CEG へ転換を検討',
  'CEG $270 以下でエントリー、AVGO $200 以下で買い検討',
  'NVDA 2/25 決算でテーゼ検証し、ガイダンス次第で追加買い',
];

export function ActionList() {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        今週の推奨アクション（トップ3）
      </h2>
      <ul className="space-y-3">
        {SAMPLE_ACTIONS.map((action, i) => (
          <li
            key={i}
            className="flex items-start gap-3 text-sm text-[var(--text-primary)]"
          >
            <CheckSquare className="w-4 h-4 mt-0.5 shrink-0 text-[var(--accent-blue)]" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--text-secondary)] mt-4">
        週次レポート生成で最新の推奨を取得
      </p>
    </div>
  );
}
