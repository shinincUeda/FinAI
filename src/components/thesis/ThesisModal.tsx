import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Holding } from '../../types';
import { sectorLabels, statusLabels } from '../../data/initialData';

const SECTORS = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'] as const;
const STATUSES = ['core', 'monitor', 'reduce', 'sell'] as const;

interface ThesisModalProps {
  holding: Holding | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Holding>) => void;
}

export function ThesisModal({ holding, onClose, onSave }: ThesisModalProps) {
  const [form, setForm] = useState<Partial<Holding>>({});

  useEffect(() => {
    if (holding) setForm({ ...holding });
  }, [holding]);

  if (!holding) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(holding.id, form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-bold font-mono">{holding.ticker} — {holding.name}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 sm:col-span-1">
              <span className="block text-xs text-[var(--text-secondary)] mb-1">ティッカー</span>
              <input
                type="text"
                value={form.ticker ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value }))}
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] font-mono"
              />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="block text-xs text-[var(--text-secondary)] mb-1">企業名</span>
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">セクター</span>
              <select
                value={form.sector ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value as Holding['sector'] }))}
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{sectorLabels[s]}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">ステータス</span>
              <select
                value={form.status ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Holding['status'] }))}
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">AI適合度 (1–5)</span>
            <select
              value={form.aiAlignmentScore ?? 3}
              onChange={(e) => setForm((f) => ({ ...f, aiAlignmentScore: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))}
              className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">投資テーゼ</span>
            <textarea
              value={form.thesis ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </label>
          <label>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">売却トリガー</span>
            <textarea
              value={form.sellTriggers ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, sellTriggers: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </label>
          <label>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">注目指標</span>
            <input
              type="text"
              value={form.watchMetrics ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, watchMetrics: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </label>
          <label>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">メモ</span>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
              キャンセル
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-[var(--accent-blue)] text-white hover:opacity-90">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
