import { useState } from 'react';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import type { EthTrade, TradingSignal } from '../../types';
import { useEthTradingStore } from '../../stores/ethTradingStore';

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-flex">
      <HelpCircle className="w-3 h-3 text-[var(--text-muted)] cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] rounded shadow-lg w-48 whitespace-normal opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {text}
      </span>
    </span>
  );
}

const SIGNAL_LABELS: Record<TradingSignal, { label: string; color: string }> = {
  strong_buy:  { label: '強買', color: 'var(--accent-green)' },
  buy:         { label: '買い', color: 'var(--accent-blue)' },
  watch:       { label: '様子見', color: 'var(--accent-gold)' },
  sell:        { label: '売り', color: 'var(--accent-orange)' },
  strong_sell: { label: '強売', color: 'var(--accent-red)' },
};

export function TradeLog() {
  const { trades, addTrade, removeTrade, currentSignal, usdJpyRate } = useEthTradingStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    price: '',
    amount: '',
    notes: '',
  });

  const handleSubmit = () => {
    if (!form.price || !form.amount) return;
    const trade: EthTrade = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10),
      type: form.type,
      price: parseFloat(form.price),
      amount: parseFloat(form.amount),
      signalAtTime: currentSignal?.signal ?? 'watch',
      notes: form.notes,
    };

    if (trade.type === 'sell') {
      const buyTrades = trades.filter((t) => t.type === 'buy');
      if (buyTrades.length > 0) {
        const avgBuy = buyTrades.reduce((s, t) => s + t.price * t.amount, 0)
          / buyTrades.reduce((s, t) => s + t.amount, 0);
        trade.pnl = (trade.price - avgBuy) * trade.amount;
      }
    }

    addTrade(trade);
    setForm({ type: 'buy', price: '', amount: '', notes: '' });
    setShowForm(false);
  };

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalPnlJpy = totalPnl * usdJpyRate;

  const fmtJpy = (usd: number) => `¥${Math.round(usd * usdJpyRate).toLocaleString('ja-JP')}`;

  return (
    <div className="ch-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] flex items-center">
          取引記録
          <Tip text="手動で記録したETH取引の履歴。売却時にはP&L（損益）が自動計算されます。" />
        </p>
        <div className="flex items-center gap-3">
          {trades.length > 0 && (
            <span className={`text-xs font-mono font-semibold ${totalPnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
              損益: {totalPnlJpy >= 0 ? '+' : ''}{fmtJpy(totalPnl)}
            </span>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-[10px] font-mono text-[var(--accent-blue)] hover:text-[var(--accent-blue-light)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            記録追加
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4 p-3 border border-[var(--border)] rounded bg-[var(--bg-secondary)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'buy' | 'sell' })}
              className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono rounded px-2 py-1.5"
            >
              <option value="buy">買い</option>
              <option value="sell">売り</option>
            </select>
            <input
              type="number"
              placeholder="価格 (USD)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono rounded px-2 py-1.5"
            />
            <input
              type="number"
              placeholder="数量 (ETH)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono rounded px-2 py-1.5"
            />
            <input
              type="text"
              placeholder="メモ"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono rounded px-2 py-1.5"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="text-[10px] font-mono px-3 py-1 bg-[var(--accent-blue)] text-white rounded hover:opacity-80 transition-opacity"
          >
            保存
          </button>
        </div>
      )}

      {trades.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] font-mono">取引記録なし</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="text-left py-1.5 pr-3">日付</th>
                <th className="text-left py-1.5 pr-3">売買</th>
                <th className="text-right py-1.5 pr-3">価格</th>
                <th className="text-right py-1.5 pr-3">数量</th>
                <th className="text-left py-1.5 pr-3">シグナル</th>
                <th className="text-right py-1.5 pr-3">損益</th>
                <th className="text-left py-1.5 pr-3">メモ</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const sl = SIGNAL_LABELS[t.signalAtTime];
                return (
                  <tr key={t.id} className="border-b border-[var(--border)] border-opacity-30 hover:bg-[var(--bg-hover)]">
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{t.date}</td>
                    <td className="py-1.5 pr-3">
                      <span className={t.type === 'buy' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
                        {t.type === 'buy' ? '買い' : '売り'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-right text-[var(--text-primary)]">{fmtJpy(t.price)}</td>
                    <td className="py-1.5 pr-3 text-right text-[var(--text-secondary)]">{t.amount} ETH</td>
                    <td className="py-1.5 pr-3">
                      <span style={{ color: sl.color }}>{sl.label}</span>
                    </td>
                    <td className={`py-1.5 pr-3 text-right ${(t.pnl ?? 0) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                      {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}${fmtJpy(t.pnl)}` : '-'}
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--text-muted)] max-w-[120px] truncate">{t.notes}</td>
                    <td className="py-1.5">
                      <button
                        onClick={() => removeTrade(t.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
