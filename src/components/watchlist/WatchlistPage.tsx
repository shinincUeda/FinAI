import { useState, useMemo } from 'react';
import { Target, RefreshCw, AlertTriangle, Briefcase } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { ThesisModal } from '../thesis/ThesisModal';
import { fetchCurrentPrice } from '../../lib/stockApi';
import type { Holding } from '../../types';

export function WatchlistPage() {
  const { holdings, updateHolding } = useHoldingsStore();
  const [selected, setSelected] = useState<Holding | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  const sortedHoldings = useMemo(() => {
    return [...holdings].map(holding => {
      const cp = holding.currentPrice || 0;
      const entryMax = holding.analysis?.entryZone?.max || 0;
      const entryMin = holding.analysis?.entryZone?.min || 0;
      let distancePercent = 999;
      let status: 'reached' | 'near' | 'far' | 'none' = 'none';
      if (entryMax > 0 && cp > 0) {
        if (cp <= entryMax) {
          distancePercent = (cp - entryMax) / entryMax * 100;
          status = 'reached';
        } else {
          distancePercent = (cp - entryMax) / entryMax * 100;
          status = distancePercent <= 10 ? 'near' : 'far';
        }
      }
      return { ...holding, distancePercent, status, entryMax, entryMin };
    }).sort((a, b) => a.distancePercent - b.distancePercent);
  }, [holdings]);

  const handleBatchUpdate = async () => {
    if (isUpdating || holdings.length === 0) return;
    const apiKey = import.meta.env.VITE_STOCK_API_KEY || '';
    if (!apiKey) {
      alert('APIキーが設定されていません。');
      return;
    }
    setIsUpdating(true);
    setUpdateProgress(0);
    for (let i = 0; i < holdings.length; i++) {
      const holding = holdings[i];
      try {
        const livePrice = await fetchCurrentPrice(holding.ticker, apiKey);
        if (livePrice !== null) {
          updateHolding(holding.id, { currentPrice: livePrice });
        }
      } catch (err) {
        console.error(`Failed to fetch ${holding.ticker}`, err);
      }
      setUpdateProgress(i + 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setIsUpdating(false);
    setUpdateProgress(0);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif-display text-white mb-2 flex items-center gap-3">
            <Target className="w-8 h-8 text-[var(--accent-blue-light)]" /> エントリー・レーダー
          </h1>
          <p className="font-mono-dm text-xs text-[var(--text-muted)] tracking-widest uppercase">
            全登録銘柄 — 買いゾーンへの近さ順
          </p>
        </div>
        <button
          onClick={handleBatchUpdate}
          disabled={isUpdating}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono-dm tracking-widest text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? `更新中... (${updateProgress}/${holdings.length})` : '最新株価をゆっくり一括更新'}
        </button>
      </div>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                <th className="p-4 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal">ステータス</th>
                <th className="p-4 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal">銘柄</th>
                <th className="p-4 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal text-right">現在株価</th>
                <th className="p-4 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal text-center">買いゾーン (Buy Zone)</th>
                <th className="p-4 font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-normal text-right">ゾーンまで</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedHoldings.map((h) => {
                const isOwned = (h.shares || 0) > 0;
                return (
                  <tr key={h.id} onClick={() => setSelected(h)} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group">
                    <td className="p-4 align-middle">
                      {h.status === 'reached' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/30 rounded shadow-[0_0_10px_rgba(61,214,140,0.2)] animate-pulse">🔥 到達</span>}
                      {h.status === 'near' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest bg-[var(--accent-gold)]/20 text-[var(--accent-gold-light)] border border-[var(--accent-gold)]/30 rounded">🟡 接近</span>}
                      {h.status === 'far' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-widest bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] rounded">🔴 遠い</span>}
                      {h.status === 'none' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] tracking-widest text-[var(--text-muted)] border border-transparent">-</span>}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-mono-dm font-bold text-white text-sm group-hover:text-[var(--accent-blue-light)] transition-colors">{h.ticker}</div>
                          <div className="font-sans text-[11px] text-[var(--text-secondary)] truncate max-w-[150px]">{h.name}</div>
                        </div>
                        {isOwned && (
                          <div className="flex items-center gap-1 text-[9px] font-mono-dm tracking-widest text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 px-1.5 py-0.5 border border-[var(--accent-gold)]/20" title="保有中">
                            <Briefcase className="w-3 h-3" /> P
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="font-mono-dm text-sm font-medium text-white">${h.currentPrice?.toFixed(2) || '---'}</div>
                    </td>
                    <td className="p-4 align-middle text-center">
                      {h.entryMax > 0 ? (
                        <div className={`font-mono-dm text-xs ${h.status === 'reached' ? 'text-[var(--accent-green)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                          ${h.entryMin > 0 ? h.entryMin : '0'} <span className="text-[var(--text-muted)]">〜</span> ${h.entryMax}
                        </div>
                      ) : (
                        <div className="font-mono-dm text-[10px] text-[var(--text-muted)]">未設定 / 抽出不可</div>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right">
                      {h.status !== 'none' ? (
                        <div className={`font-mono-dm text-sm font-bold ${h.status === 'reached' ? 'text-[var(--accent-green)]' : 'text-[var(--accent-gold-light)]'}`}>
                          {h.status === 'reached' ? 'IN ZONE' : `あと ${h.distancePercent.toFixed(1)}%`}
                        </div>
                      ) : (
                        <div className="font-mono-dm text-xs text-[var(--text-muted)]">---</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedHoldings.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <AlertTriangle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--text-secondary)]">監視対象の銘柄がありません</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <ThesisModal holding={selected} onClose={() => setSelected(null)} onSave={updateHolding} />
      )}
    </div>
  );
}
