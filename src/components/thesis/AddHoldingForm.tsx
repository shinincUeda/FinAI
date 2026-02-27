import { useState } from 'react';
import type { Holding } from '../../types';
import { sectorLabels } from '../../data/initialData';

const SECTORS: Holding['sector'][] = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'];

interface AddHoldingFormProps {
  onAdd: (holding: Holding) => void;
  onCancel: () => void;
}

function generateId(ticker: string) {
  return ticker.toLowerCase().replace(/\s+/g, '-');
}

export function AddHoldingForm({ onAdd, onCancel }: AddHoldingFormProps) {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState<Holding['sector']>('other');
  const [aiAlignmentScore, setAiAlignmentScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [thesis, setThesis] = useState('');
  const [sellTriggers, setSellTriggers] = useState('');
  const [watchMetrics, setWatchMetrics] = useState('');
  const [status, setStatus] = useState<Holding['status']>('monitor');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    const id = generateId(ticker.trim());
    const today = new Date().toISOString().slice(0, 10);
    onAdd({
      id,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || ticker.trim(),
      sector,
      aiAlignmentScore,
      thesis: thesis.trim(),
      sellTriggers: sellTriggers.trim(),
      watchMetrics: watchMetrics.trim(),
      status,
      notes: notes.trim(),
      lastUpdated: today,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
      <h3 className="font-semibold text-[var(--text-primary)]">新規銘柄追加</h3>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="block text-xs text-[var(--text-secondary)] mb-1">ティッカー *</span>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="AAPL"
            className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono"
            required
          />
        </label>
        <label>
          <span className="block text-xs text-[var(--text-secondary)] mb-1">企業名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Apple Inc."
            className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="block text-xs text-[var(--text-secondary)] mb-1">セクター</span>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as Holding['sector'])}
            className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>{sectorLabels[s]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-xs text-[var(--text-secondary)] mb-1">AI適合度</span>
          <select
            value={aiAlignmentScore}
            onChange={(e) => setAiAlignmentScore(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">投資テーゼ</span>
        <textarea
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">売却トリガー</span>
        <textarea
          value={sellTriggers}
          onChange={(e) => setSellTriggers(e.target.value)}
          rows={1}
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">注目指標</span>
        <input
          type="text"
          value={watchMetrics}
          onChange={(e) => setWatchMetrics(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">ステータス</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Holding['status'])}
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        >
          <option value="core">コア保有</option>
          <option value="monitor">保有（監視強化）</option>
          <option value="reduce">保有（縮小検討）</option>
          <option value="sell">売却推奨</option>
        </select>
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">メモ</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="px-4 py-2 rounded bg-[var(--accent-blue)] text-white hover:opacity-90">
          追加
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
          キャンセル
        </button>
      </div>
    </form>
  );
}
