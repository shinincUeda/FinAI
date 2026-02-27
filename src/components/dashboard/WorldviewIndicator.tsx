type WorldviewStatus = 'accelerating' | 'normal' | 'decelerating';

const LABELS: Record<WorldviewStatus, string> = {
  accelerating: '加速',
  normal: '通常',
  decelerating: '減速',
};

const BADGES: Record<WorldviewStatus, string> = {
  accelerating: '🟢',
  normal: '🟡',
  decelerating: '🔴',
};

interface WorldviewIndicatorProps {
  status?: WorldviewStatus;
}

export function WorldviewIndicator({ status = 'normal' }: WorldviewIndicatorProps) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        世界観ステータス
      </h2>
      <p className="text-3xl mb-1" title={LABELS[status]}>
        {BADGES[status]}
      </p>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        Amodei / Hassabis の世界は「{LABELS[status]}」フェーズ
      </p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">
        週次レポートで更新
      </p>
    </div>
  );
}
