import { Pencil, Trash2 } from 'lucide-react';
import type { Alert } from '../../types';

const TYPE_LABELS: Record<Alert['type'], string> = {
  buy: '買いアラート',
  sell: '売却アラート',
  market: '市場全体',
  event: '決算イベント',
};

interface AlertListProps {
  alerts: Alert[];
  onEdit: (alert: Alert) => void;
  onRemove: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function AlertList({ alerts, onEdit, onRemove, onToggleActive }: AlertListProps) {
  return (
    <ul className="space-y-3">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className={`bg-[var(--bg-card)] rounded-xl border p-4 ${alert.isActive ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-70'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                  {TYPE_LABELS[alert.type]}
                </span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{alert.ticker}</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium">{alert.condition}</p>
              {alert.triggerValue && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">トリガー: {alert.triggerValue}</p>
              )}
              <p className="text-sm text-[var(--text-primary)] mt-2">{alert.action}</p>
              {alert.notes && (
                <p className="text-xs text-[var(--text-secondary)] mt-1">{alert.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={alert.isActive}
                  onChange={(e) => onToggleActive(alert.id, e.target.checked)}
                  className="rounded"
                />
                有効
              </label>
              <button
                type="button"
                onClick={() => onEdit(alert)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                aria-label="編集"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(alert.id)}
                className="p-1.5 rounded hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                aria-label="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
