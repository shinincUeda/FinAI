import { useState, useEffect } from 'react';
import type { Alert } from '../../types';

const TYPES: Alert['type'][] = ['buy', 'sell', 'market', 'event'];

interface AlertFormProps {
  initial?: Alert | null;
  onSubmit: (alert: Alert) => void;
  onCancel: () => void;
}

function generateId() {
  return 'alert-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

export function AlertForm({ initial, onSubmit, onCancel }: AlertFormProps) {
  const [ticker, setTicker] = useState('');
  const [type, setType] = useState<Alert['type']>('buy');
  const [condition, setCondition] = useState('');
  const [triggerValue, setTriggerValue] = useState('');
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setTicker(initial.ticker);
      setType(initial.type);
      setCondition(initial.condition);
      setTriggerValue(initial.triggerValue);
      setAction(initial.action);
      setNotes(initial.notes);
      setIsActive(initial.isActive);
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!condition.trim() || !action.trim()) return;
    onSubmit({
      id: initial?.id ?? generateId(),
      type,
      ticker: ticker.trim() || '—',
      condition: condition.trim(),
      triggerValue: triggerValue.trim(),
      action: action.trim(),
      isActive,
      notes: notes.trim(),
    });
  };

  const typeLabels: Record<Alert['type'], string> = {
    buy: '買いアラート',
    sell: '売却アラート',
    market: '市場全体',
    event: '決算イベント',
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
      <h3 className="font-semibold text-[var(--text-primary)]">{initial ? 'アラートを編集' : '新規アラート'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="block text-xs text-[var(--text-secondary)] mb-1">銘柄 / 指標</span>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="NVDA, VIX..."
            className="w-full px-3 py-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono"
          />
        </label>
        <label>
          <span className="block text-xs text-[var(--text-secondary)] mb-1">カテゴリ</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Alert['type'])}
            className="w-full px-3 py-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">条件 *</span>
        <input
          type="text"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="例: CEG < $270"
          className="w-full px-3 py-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          required
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">トリガー値</span>
        <input
          type="text"
          inputMode="decimal"
          value={triggerValue}
          onChange={(e) => setTriggerValue(e.target.value)}
          placeholder="例: 270"
          className="w-full px-3 py-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">発動時のアクション *</span>
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          rows={2}
          className="w-full px-3 py-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          required
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">メモ</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-3 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
        有効
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="px-6 py-3 rounded bg-[var(--accent-blue)] text-white hover:opacity-90 font-bold">
          {initial ? '保存' : '追加'}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-3 rounded text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-hover)]">
          キャンセル
        </button>
      </div>
    </form>
  );
}
