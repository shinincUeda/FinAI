import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { Holding } from '../../types';
import { sectorLabels } from '../../data/initialData';
import { fetchCompanyProfile, fetchCurrentPrice } from '../../lib/stockApi';

const SECTORS: Holding['sector'][] = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'];

interface AddHoldingFormProps {
  onAdd: (holding: Holding) => void;
  onCancel: () => void;
}

function generateId(ticker: string) {
  return `${ticker.toLowerCase()}-${Date.now()}`;
}

export function AddHoldingForm({ onAdd, onCancel }: AddHoldingFormProps) {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState<Holding['sector']>('other');
  const [status, setStatus] = useState<Holding['status']>('monitor');
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const handleAutoFetch = async () => {
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    const apiKey = import.meta.env.VITE_STOCK_API_KEY || '';
    setIsFetching(true);
    setFetchError('');
    try {
      const [profile, price] = await Promise.all([
        fetchCompanyProfile(sym, apiKey),
        fetchCurrentPrice(sym, apiKey),
      ]);
      if (profile?.name) setName(profile.name);
      if (price !== null) setCurrentPrice(price);
      if (!profile && price === null) setFetchError('銘柄情報を取得できませんでした（APIキー確認）');
    } finally {
      setIsFetching(false);
    }
  };

  const handleTickerBlur = () => {
    if (ticker.trim() && !name) handleAutoFetch();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = ticker.trim().toUpperCase();
    if (!sym) return;
    const today = new Date().toISOString().slice(0, 10);
    onAdd({
      id: generateId(sym),
      ticker: sym,
      name: name.trim() || sym,
      sector,
      aiAlignmentScore: 3,
      thesis: '',
      sellTriggers: '',
      watchMetrics: '',
      status,
      currentPrice,
      notes: '',
      lastUpdated: today,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
      <h3 className="font-semibold text-[var(--text-primary)]">銘柄を追加</h3>

      {/* Ticker + auto-fetch */}
      <div>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">ティッカー <span className="text-[var(--accent-red)]">*</span></span>
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onBlur={handleTickerBlur}
            placeholder="AAPL"
            className="flex-1 px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono uppercase"
            required
          />
          <button
            type="button"
            onClick={handleAutoFetch}
            disabled={isFetching || !ticker.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
          >
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            自動入力
          </button>
        </div>
        {fetchError && <p className="text-xs text-[var(--accent-red)] mt-1">{fetchError}</p>}
      </div>

      {/* Name (auto-filled) */}
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">企業名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Apple Inc.（自動入力 or 手入力）"
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>

      {/* Current price (auto-filled) */}
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">現在株価（USD）</span>
        <input
          type="number"
          value={currentPrice ?? ''}
          onChange={(e) => setCurrentPrice(e.target.value ? Number(e.target.value) : undefined)}
          placeholder="自動取得 or 手入力"
          min={0}
          step="0.01"
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono"
        />
      </label>

      {/* Sector + Status */}
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
          <span className="block text-xs text-[var(--text-secondary)] mb-1">ステータス</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Holding['status'])}
            className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
          >
            <option value="core">コア保有</option>
            <option value="monitor">監視中</option>
            <option value="reduce">縮小検討</option>
            <option value="sell">売却推奨</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="px-4 py-2 rounded bg-[var(--accent-blue)] text-white text-sm hover:opacity-90">
          追加
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-sm">
          キャンセル
        </button>
      </div>
    </form>
  );
}
