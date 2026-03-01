import { useState, useEffect } from 'react';
import {
  X, Save, Sparkles, AlertTriangle, RefreshCw, Target, ChevronDown,
  ChevronUp, Clock, Briefcase, Eye, Trash2, Plus, FileText,
} from 'lucide-react';

import type { Holding, WatchlistItem, AnalysisHistoryEntry, CompounderAnalysis } from '../../types';
import type { UnifiedRow } from './WatchlistPage';
import { parseCompounderReport } from '../../lib/claude';
import { fetchCurrentPrice } from '../../lib/stockApi';

// ─── props ───────────────────────────────────────────────────
interface StockDetailModalProps {
  row: UnifiedRow;
  onClose: () => void;
  onSaveHolding: (id: string, updates: Partial<Holding>) => void;
  onSaveWatchlist: (id: string, updates: Partial<WatchlistItem>) => void;
  onAddHoldingHistory: (id: string, entry: AnalysisHistoryEntry) => void;
  onAddWatchlistHistory: (id: string, entry: AnalysisHistoryEntry) => void;
  onDelete: (id: string, source: 'holding' | 'watchlist') => void;
}

type Tab = 'overview' | 'edit' | 'history';

// ─── ユーティリティ ─────────────────────────────────────────
const SIGNAL_STYLE: Record<string, string> = {
  'Strong Buy': 'bg-[rgba(61,214,140,0.12)] border-[var(--accent-green)] text-[var(--accent-green)]',
  'Buy': 'bg-[rgba(74,158,255,0.12)] border-[var(--accent-blue)] text-[var(--accent-blue-light)]',
  'Buy on Dip': 'bg-[rgba(201,168,76,0.12)] border-[var(--accent-gold)] text-[var(--accent-gold-light)]',
  'Watch': 'bg-[rgba(128,128,128,0.1)] border-[var(--border)] text-[var(--text-secondary)]',
  'Sell': 'bg-[rgba(224,92,92,0.12)] border-[var(--accent-red)] text-[var(--accent-red)]',
  'None': 'bg-[rgba(128,128,128,0.1)] border-[var(--border)] text-[var(--text-muted)]',
};

// ─── バリュエーションゲージ（フル） ─────────────────────────
function ValuationGauge({ analysis, currentPrice }: { analysis: CompounderAnalysis; currentPrice?: number }) {
  const { bear, base, bull } = analysis.fairValue;
  const entry = analysis.entryZone;
  const cp = currentPrice && currentPrice > 0 ? currentPrice : base;

  const vals = [bear, base, bull, cp];
  if (entry?.max) { vals.push(entry.max); if (entry.min) vals.push(entry.min); }

  const minScale = Math.min(...vals) * 0.85;
  const maxScale = Math.max(...vals) * 1.15;
  const range = maxScale - minScale;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - minScale) / range) * 100))}%`;

  const hasEntry = !!entry?.max;
  const drawEntryMin = hasEntry && (entry?.min ?? 0) > 0 ? entry!.min! : minScale;
  const inZone = hasEntry && cp >= (entry?.min ?? 0) && cp <= entry!.max!;
  const baseDiff = base > 0 ? ((cp - base) / base * 100) : null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-lg">
      <div className="font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-8 flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-[var(--accent-blue-light)]" /> バリュエーション & エントリーゾーン
      </div>

      <div className="relative h-10 bg-[var(--bg-secondary)] rounded border border-[var(--border)] mb-10">
        {hasEntry && (
          <div
            className={`absolute top-0 h-full border-x transition-colors ${inZone ? 'bg-[var(--accent-green)]/30 border-[var(--accent-green)]' : 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30'}`}
            style={{ left: pct(drawEntryMin), width: `${Math.max(0, Math.min(100, ((Math.min(maxScale, entry!.max!) - drawEntryMin) / range) * 100))}%` }}
          >
            <div className={`absolute -top-5 w-full text-center font-mono-dm text-[9px] tracking-widest ${inZone ? 'text-[var(--accent-green)] font-bold' : 'text-[var(--accent-green)]/50'}`}>
              BUY ZONE
            </div>
          </div>
        )}
        {/* Bear */}
        <div className="absolute top-0 bottom-0 w-px bg-[var(--accent-red)]/70" style={{ left: pct(bear) }}>
          <div className="absolute top-11 -left-9 w-20 text-center font-mono-dm text-[10px] text-[var(--accent-red)]">Bear<br />${bear}</div>
        </div>
        {/* Base */}
        <div className="absolute top-0 bottom-0 w-px bg-[var(--accent-gold)]" style={{ left: pct(base) }}>
          <div className="absolute top-11 -left-9 w-20 text-center font-mono-dm text-[10px] font-bold text-[var(--accent-gold-light)]">Base<br />${base}</div>
        </div>
        {/* Bull */}
        <div className="absolute top-0 bottom-0 w-px bg-[var(--accent-green-dark)]/70" style={{ left: pct(bull) }}>
          <div className="absolute top-11 -left-9 w-20 text-center font-mono-dm text-[10px] text-[var(--accent-green-dark)]">Bull<br />${bull}</div>
        </div>
        {/* 現在株価 */}
        <div className="absolute -top-4 -translate-x-1/2 z-10" style={{ left: pct(cp) }}>
          <div className={`font-mono-dm text-[10px] font-bold px-2 py-0.5 rounded flex items-center ${inZone ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--accent-blue)] text-white'}`}>
            ${cp.toFixed(2)}
          </div>
          <div className={`w-0 h-0 mx-auto border-l-[5px] border-r-[5px] border-t-[5px] border-transparent ${inZone ? 'border-t-[var(--accent-green)]' : 'border-t-[var(--accent-blue)]'}`} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-sm">
        <div className="font-mono-dm text-[12px] text-[var(--text-secondary)]">
          Base Case比:
          <strong className={`ml-1 ${baseDiff != null && baseDiff > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'}`}>
            {baseDiff != null ? `${baseDiff >= 0 ? '+' : ''}${baseDiff.toFixed(1)}%` : '—'} {analysis.valuationLabel}
          </strong>
        </div>
        {inZone && (
          <div className="font-mono-dm text-[11px] font-bold text-[var(--accent-green)] bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 px-3 py-1 animate-pulse">
            🔥 エントリーチャンス！
          </div>
        )}
      </div>
    </div>
  );
}

// ─── スコアバー ─────────────────────────────────────────────
function ScoreRow({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = (score / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] text-[var(--text-muted)] shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="font-mono-dm text-xs text-[var(--text-secondary)] w-12 text-right">{score}/{max}</div>
    </div>
  );
}

// ─── 分析インポートパネル（インライン） ─────────────────────
function AnalysisImportPanel({
  id,
  ticker,
  source,
  onSaved,
}: {
  id: string;
  ticker: string;
  source: 'holding' | 'watchlist';
  onSaved: (analysis: CompounderAnalysis, rawText: string, price?: number) => void;
}) {
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setError('VITE_GEMINI_API_KEY が設定されていません。'); return; }
    setIsAnalyzing(true);
    setError('');
    try {
      const parsed = await parseCompounderReport(apiKey, text);
      onSaved(parsed.analysis, text, parsed.currentPrice ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析エラー');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5 rounded-lg p-4 space-y-3">
      <div className="font-mono-dm text-[10px] text-[var(--accent-blue-light)] tracking-widest uppercase flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" /> AI分析レポートを貼り付け ({ticker})
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Compounder Hunter の分析レポートをそのまま貼り付けてください...\n\n例:\n【${ticker}】\nFundamental Score: 79 / 90\n...`}
        className="w-full h-48 p-3 bg-[var(--bg-card)] border border-[var(--border)] text-sm font-mono text-white outline-none focus:border-[var(--accent-blue)] resize-none rounded"
      />
      <input
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="メモ（任意）: この分析のポイント、気になる点など..."
        className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-sm text-white outline-none focus:border-[var(--accent-blue)] rounded"
      />
      {error && <p className="text-xs text-[var(--accent-red)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[var(--accent-blue)] text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isAnalyzing ? 'Gemini解析中...' : '解析して履歴に保存'}
        </button>
      </div>
    </div>
  );
}

// ─── 履歴エントリーカード ────────────────────────────────────
function HistoryEntryCard({ entry, onDelete }: { entry: AnalysisHistoryEntry; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const p = entry.parsedAnalysis;

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-mono-dm text-xs text-[var(--text-secondary)]">{entry.date}</span>
          {p?.investmentSignal && (
            <span className={`px-2 py-0.5 text-[10px] font-mono-dm border rounded ${SIGNAL_STYLE[p.investmentSignal] ?? SIGNAL_STYLE['None']}`}>
              {p.investmentSignal}
            </span>
          )}
          {p?.fundamentalScore != null && (
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)]">
              {p.fundamentalGrade} {p.fundamentalScore}/90
            </span>
          )}
          {p?.fairValue && (
            <span className="font-mono-dm text-[10px] text-[var(--text-muted)]">
              Bear ${p.fairValue.bear} / Base ${p.fairValue.base} / Bull ${p.fairValue.bull}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(e => !e)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {entry.comment && (
        <div className="px-4 pb-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border)]/50 pt-2">
          {entry.comment}
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]/50">
          {p && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-[var(--bg-card)] rounded p-3 text-center">
                <div className="font-mono-dm text-lg text-[var(--accent-gold-light)]">{p.fundamentalScore}<span className="text-xs text-[var(--text-muted)]">/90</span></div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">スコア</div>
              </div>
              {p.fairValue && (
                <>
                  <div className="bg-[var(--bg-card)] rounded p-3 text-center">
                    <div className="font-mono-dm text-lg text-[var(--accent-red)]">${p.fairValue.bear}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">Bear</div>
                  </div>
                  <div className="bg-[var(--bg-card)] rounded p-3 text-center">
                    <div className="font-mono-dm text-lg text-[var(--accent-gold-light)]">${p.fairValue.base}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">Base</div>
                  </div>
                  <div className="bg-[var(--bg-card)] rounded p-3 text-center">
                    <div className="font-mono-dm text-lg text-[var(--accent-green)]">${p.fairValue.bull}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">Bull</div>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-3 font-mono text-[11px] text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {entry.rawText}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── メインモーダル ─────────────────────────────────────────
export function StockDetailModal({
  row,
  onClose,
  onSaveHolding,
  onSaveWatchlist,
  onAddHoldingHistory,
  onAddWatchlistHistory,
  onDelete,
}: StockDetailModalProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 編集フォーム
  const [holdingForm, setHoldingForm] = useState<Partial<Holding>>({});
  const [watchlistForm, setWatchlistForm] = useState<Partial<WatchlistItem>>({});
  // 現地の履歴（削除用）
  const [localHistory, setLocalHistory] = useState<AnalysisHistoryEntry[]>([]);

  useEffect(() => {
    if (row.source === 'holding' && row.rawHolding) {
      setHoldingForm({ ...row.rawHolding });
      setLocalHistory(row.rawHolding.analysisHistory || []);
    } else if (row.source === 'watchlist' && row.rawWatchlistItem) {
      setWatchlistForm({ ...row.rawWatchlistItem });
      setLocalHistory(row.rawWatchlistItem.analysisHistory || []);
    }
  }, [row]);

  const analysis = row.source === 'holding'
    ? (holdingForm as Holding).analysis
    : (watchlistForm as WatchlistItem).analysis;

  const currentPrice = row.source === 'holding'
    ? (holdingForm as Holding).currentPrice
    : (watchlistForm as WatchlistItem).currentPrice;

  // 株価取得
  const fetchPrice = async () => {
    const apiKey = import.meta.env.VITE_STOCK_API_KEY || '';
    setIsFetchingPrice(true);
    try {
      const price = await fetchCurrentPrice(row.ticker, apiKey);
      if (price !== null) {
        if (row.source === 'holding') setHoldingForm(f => ({ ...f, currentPrice: price }));
        else setWatchlistForm(f => ({ ...f, currentPrice: price }));
      }
    } catch (_) {}
    setIsFetchingPrice(false);
  };

  useEffect(() => {
    fetchPrice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存（analysisHistory は addAnalysisEntry で個別管理するため除外）
  const handleSave = () => {
    if (row.source === 'holding') {
      const { analysisHistory: _ah, ...updates } = holdingForm as Holding;
      onSaveHolding(row.id, updates);
    } else {
      const { analysisHistory: _ah, ...updates } = watchlistForm as WatchlistItem;
      onSaveWatchlist(row.id, updates);
    }
    onClose();
  };

  // 分析履歴追加コールバック
  const handleAnalysisSaved = (analysis: CompounderAnalysis, rawText: string, price?: number) => {
    const entry: AnalysisHistoryEntry = {
      id: `ah-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      rawText,
      comment: '',
      parsedAnalysis: analysis,
    };

    // ストアに追加
    if (row.source === 'holding') {
      onSaveHolding(row.id, { analysis, currentPrice: price ?? currentPrice });
      onAddHoldingHistory(row.id, entry);
      setHoldingForm(f => ({ ...f, analysis, currentPrice: price ?? f.currentPrice }));
    } else {
      onSaveWatchlist(row.id, { analysis, currentPrice: price ?? currentPrice });
      onAddWatchlistHistory(row.id, entry);
      setWatchlistForm(f => ({ ...f, analysis, currentPrice: price ?? f.currentPrice }));
    }
    setLocalHistory(prev => [entry, ...prev]);
    setShowImportPanel(false);
    setTab('overview'); // 解析後に概要タブへ
  };

  // 履歴削除（ローカルのみ、保存時にストアへ反映）
  const handleDeleteHistory = (entryId: string) => {
    const updated = localHistory.filter(e => e.id !== entryId);
    setLocalHistory(updated);
    if (row.source === 'holding') {
      onSaveHolding(row.id, { analysisHistory: updated });
      setHoldingForm(f => ({ ...f, analysisHistory: updated }));
    } else {
      onSaveWatchlist(row.id, { analysisHistory: updated });
      setWatchlistForm(f => ({ ...f, analysisHistory: updated }));
    }
  };

  const holding = holdingForm as Holding;
  const watchlist = watchlistForm as WatchlistItem;

  const sharesTokutei  = Number(holding.shares) || 0;
  const costTokutei    = Number(holding.avgCost) || 0;
  const sharesNisaVal  = Number(holding.sharesNisa) || 0;
  const costNisaVal    = Number(holding.avgCostNisa) || 0;
  const totalShares    = sharesTokutei + sharesNisaVal;
  const totalCostBasis = sharesTokutei * costTokutei + sharesNisaVal * costNisaVal;
  const cp = Number(currentPrice) || 0;
  const marketValue = totalShares * cp;
  const pnl = marketValue - totalCostBasis;
  const pnlPct = totalCostBasis > 0 ? ((marketValue - totalCostBasis) / totalCostBasis * 100) : 0;
  const isProfit = pnl >= 0;

  const signal = analysis?.investmentSignal;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="min-h-screen px-4 py-8 flex justify-center">
        <div
          className="w-full max-w-4xl bg-[var(--bg-primary)] border border-[var(--border)] shadow-2xl relative self-start"
          onClick={e => e.stopPropagation()}
        >
          {/* ─── ヘッダー ─── */}
          <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border)] px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono-dm text-lg font-bold text-white">{row.ticker}</span>
                  {/* ソースバッジ */}
                  {row.source === 'holding' ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono-dm px-2 py-0.5 text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 rounded">
                      <Briefcase className="w-3 h-3" /> 保有銘柄
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-mono-dm px-2 py-0.5 text-[var(--accent-purple)] bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 rounded">
                      <Eye className="w-3 h-3" /> Tier {row.tier} ウォッチ
                    </span>
                  )}
                  {signal && (
                    <span className={`px-2 py-0.5 text-[10px] font-mono-dm border rounded ${SIGNAL_STYLE[signal] ?? SIGNAL_STYLE['None']}`}>
                      {signal}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--text-secondary)] truncate">{row.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowImportPanel(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono-dm tracking-widest text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 transition-colors rounded"
              >
                <Sparkles className="w-3 h-3" /> AI分析
              </button>
              {confirmDelete ? (
                <>
                  <span className="text-xs text-[var(--accent-red)] font-mono-dm whitespace-nowrap">本当に削除？</span>
                  <button
                    onClick={() => { onDelete(row.id, row.source); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--accent-red)] text-white hover:opacity-90 transition-opacity rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 削除する
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--accent-red)]/60 border border-[var(--accent-red)]/20 hover:border-[var(--accent-red)]/60 hover:text-[var(--accent-red)] transition-colors rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 削除
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[var(--accent-gold)] text-black hover:opacity-90 transition-opacity rounded"
                  >
                    <Save className="w-3.5 h-3.5" /> 保存
                  </button>
                  <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── インポートパネル（折りたたみ） ─── */}
          {showImportPanel && (
            <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <AnalysisImportPanel
                id={row.id}
                ticker={row.ticker}
                source={row.source}
                onSaved={handleAnalysisSaved}
              />
            </div>
          )}

          {/* ─── タブ ─── */}
          <div className="flex border-b border-[var(--border)] bg-[var(--bg-secondary)]">
            {([['overview', '概要'], ['edit', '編集'], ['history', `分析履歴 (${localHistory.length})`]] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-6 py-3 text-xs font-mono-dm tracking-widest transition-colors ${
                  tab === key
                    ? 'text-[var(--accent-blue-light)] border-b-2 border-[var(--accent-blue)] bg-[var(--accent-blue)]/5'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-6">
            {/* ─── 概要タブ ─── */}
            {tab === 'overview' && (
              <>
                {/* 株価バー */}
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex flex-wrap items-center gap-6">
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] mb-1">現在株価</div>
                    <div className={`font-mono-dm text-3xl font-bold ${cp > 0 ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                      {cp > 0 ? `$${cp.toFixed(2)}` : '---'}
                      {isFetchingPrice && <RefreshCw className="inline w-4 h-4 ml-2 animate-spin text-[var(--accent-blue)]" />}
                    </div>
                  </div>
                  {row.source === 'holding' && totalShares > 0 && (
                    <>
                      <div className="border-l border-[var(--border)] pl-6">
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">評価額</div>
                        <div className="font-mono-dm text-xl text-white">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="border-l border-[var(--border)] pl-6">
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">含み損益</div>
                        <div className={`font-mono-dm text-xl font-bold ${isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                          {isProfit ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className="text-sm ml-1">({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                        </div>
                      </div>
                    </>
                  )}
                  {row.source === 'watchlist' && watchlist.targetPrice > 0 && (
                    <div className="border-l border-[var(--border)] pl-6">
                      <div className="text-[10px] text-[var(--text-muted)] mb-1">目標株価</div>
                      <div className="font-mono-dm text-xl text-[var(--accent-gold-light)]">${watchlist.targetPrice}</div>
                      {cp > 0 && (
                        <div className={`font-mono-dm text-xs ${cp <= watchlist.targetPrice ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'}`}>
                          {((cp - watchlist.targetPrice) / watchlist.targetPrice * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={fetchPrice} disabled={isFetchingPrice} className="ml-auto flex items-center gap-1.5 text-[10px] font-mono-dm text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 px-3 py-1.5 rounded hover:bg-[var(--accent-blue)]/10 transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${isFetchingPrice ? 'animate-spin' : ''}`} /> 株価更新
                  </button>
                </div>

                {/* バリュエーションゲージ */}
                {analysis ? (
                  <>
                    <ValuationGauge analysis={analysis} currentPrice={cp} />

                    {/* スコア */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="text-center">
                          <div className="font-mono-dm text-4xl font-light text-[var(--accent-gold-light)]">
                            {analysis.fundamentalScore}<span className="text-base text-[var(--text-muted)]">/90</span>
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] mt-1">ファンダメンタル</div>
                        </div>
                        <div className="w-12 h-12 flex items-center justify-center font-serif-display text-2xl bg-[var(--accent-green-dark)]/10 border-2 border-[var(--accent-green-dark)] text-[var(--accent-green)] rounded">
                          {analysis.fundamentalGrade}
                        </div>
                        <div className="text-[var(--text-secondary)] text-sm border-l border-[var(--border)] pl-4">
                          <div className="text-[10px] text-[var(--text-muted)] mb-1">AI分類</div>
                          <div className="font-medium">{analysis.aiClassification}</div>
                        </div>
                        <div className="text-[var(--text-secondary)] text-sm border-l border-[var(--border)] pl-4">
                          <div className="text-[10px] text-[var(--text-muted)] mb-1">バリュエーション</div>
                          <div className="font-mono-dm">{analysis.valuationStatus} {analysis.valuationLabel}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <ScoreRow label="クオリティ" score={analysis.scoreBreakdown.quality} max={30} color="var(--accent-gold)" />
                        <ScoreRow label="AI影響度" score={analysis.scoreBreakdown.aiImpact} max={20} color="var(--accent-blue-light)" />
                        <ScoreRow label="複利効果" score={analysis.scoreBreakdown.compounding} max={20} color="var(--accent-green)" />
                        <ScoreRow label="ユニットエコノミクス" score={analysis.scoreBreakdown.unitEcon} max={20} color="var(--accent-purple)" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)] mb-3">分析データがありません</p>
                    <button
                      onClick={() => setShowImportPanel(true)}
                      className="flex items-center gap-2 mx-auto px-4 py-2 text-xs font-mono-dm text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 rounded hover:bg-[var(--accent-blue)]/10 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI分析レポートを追加
                    </button>
                  </div>
                )}

                {/* テーゼ（概要表示） */}
                {(row.source === 'holding' ? holding.thesis : watchlist.thesis) && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> 投資テーゼ
                    </div>
                    <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      {row.source === 'holding' ? holding.thesis : watchlist.thesis}
                    </div>
                  </div>
                )}

                {/* 売却トリガー（保有のみ） */}
                {row.source === 'holding' && holding.sellTriggers && (
                  <div className="bg-[var(--bg-card)] border border-t-2 border-[var(--accent-red)] rounded-lg p-5">
                    <div className="text-[10px] font-bold text-[var(--accent-red)] mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> 売却トリガー
                    </div>
                    <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      {holding.sellTriggers}
                    </div>
                  </div>
                )}

                {/* 最新分析日 */}
                {analysis?.lastAnalyzed && (
                  <div className="text-[10px] text-[var(--text-muted)] text-right font-mono-dm">
                    最終分析: {analysis.lastAnalyzed}
                  </div>
                )}
              </>
            )}

            {/* ─── 編集タブ ─── */}
            {tab === 'edit' && (
              <div className="space-y-5">
                {row.source === 'holding' ? (
                  <>
                    {/* 保有情報 */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-5">
                      <div className="text-xs font-bold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[var(--accent-gold)]" /> 保有状況
                      </div>

                      {/* 特定口座 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono-dm text-[10px] tracking-widest text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/25 px-2 py-0.5 rounded">特定口座</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <label>
                            <span className="block text-[11px] text-[var(--text-secondary)] mb-1">保有株数</span>
                            <input type="number" value={holding.shares ?? ''} onChange={e => setHoldingForm(f => ({ ...f, shares: Number(e.target.value) }))} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm text-lg px-3 py-2 rounded outline-none focus:border-[var(--accent-gold)]" placeholder="0" />
                          </label>
                          <label>
                            <span className="block text-[11px] text-[var(--text-secondary)] mb-1">平均取得単価 ($)</span>
                            <input type="number" value={holding.avgCost ?? ''} onChange={e => setHoldingForm(f => ({ ...f, avgCost: Number(e.target.value) }))} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm text-lg px-3 py-2 rounded outline-none focus:border-[var(--accent-gold)]" placeholder="0.00" />
                          </label>
                        </div>
                      </div>

                      {/* 成長投資枠 */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono-dm text-[10px] tracking-widest text-[var(--accent-green)] bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/25 px-2 py-0.5 rounded">成長投資枠（NISA）</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <label>
                            <span className="block text-[11px] text-[var(--text-secondary)] mb-1">保有株数</span>
                            <input type="number" value={holding.sharesNisa ?? ''} onChange={e => setHoldingForm(f => ({ ...f, sharesNisa: Number(e.target.value) }))} className="w-full bg-[var(--bg-card)] border border-[var(--accent-green)]/30 text-white font-mono-dm text-lg px-3 py-2 rounded outline-none focus:border-[var(--accent-green)]" placeholder="0" />
                          </label>
                          <label>
                            <span className="block text-[11px] text-[var(--text-secondary)] mb-1">平均取得単価 ($)</span>
                            <input type="number" value={holding.avgCostNisa ?? ''} onChange={e => setHoldingForm(f => ({ ...f, avgCostNisa: Number(e.target.value) }))} className="w-full bg-[var(--bg-card)] border border-[var(--accent-green)]/30 text-white font-mono-dm text-lg px-3 py-2 rounded outline-none focus:border-[var(--accent-green)]" placeholder="0.00" />
                          </label>
                        </div>
                      </div>

                      {/* 合計サマリー */}
                      {totalShares > 0 && cp > 0 && (
                        <div className="border-t border-[var(--border)] pt-3 flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">合計株数</span>
                            <span className="font-mono-dm text-white">{totalShares.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">評価額</span>
                            <span className="font-mono-dm text-white">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">含み損益</span>
                            <span className={`font-mono-dm font-bold ${isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                              {isProfit ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-xs ml-1">({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ステータス */}
                      <div className="border-t border-[var(--border)] pt-3 mt-3">
                        <label>
                          <span className="block text-[11px] text-[var(--text-secondary)] mb-1">ステータス</span>
                          <select value={holding.status} onChange={e => setHoldingForm(f => ({ ...f, status: e.target.value as Holding['status'] }))} className="w-full md:w-48 bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded outline-none">
                            <option value="core">コア保有</option>
                            <option value="monitor">監視強化</option>
                            <option value="reduce">縮小検討</option>
                            <option value="sell">売却推奨</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    {/* テーゼ・メモ */}
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">投資テーゼ</span>
                      <textarea value={holding.thesis} onChange={e => setHoldingForm(f => ({ ...f, thesis: e.target.value }))} rows={4} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)] resize-none" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">売却トリガー</span>
                      <textarea value={holding.sellTriggers} onChange={e => setHoldingForm(f => ({ ...f, sellTriggers: e.target.value }))} rows={3} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-red)] resize-none" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">注目指標 / メモ</span>
                      <textarea value={holding.watchMetrics || ''} onChange={e => setHoldingForm(f => ({ ...f, watchMetrics: e.target.value }))} rows={2} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)] resize-none" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">その他メモ</span>
                      <textarea value={holding.notes} onChange={e => setHoldingForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)] resize-none" />
                    </label>
                  </>
                ) : (
                  <>
                    {/* ウォッチリスト基本情報 */}
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-5">
                      <div className="text-xs font-bold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[var(--accent-purple)]" /> ウォッチリスト設定
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <label>
                          <span className="block text-[11px] text-[var(--text-secondary)] mb-1">Tier</span>
                          <select value={watchlist.tier} onChange={e => setWatchlistForm(f => ({ ...f, tier: Number(e.target.value) as 1|2|3 }))} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded outline-none">
                            <option value={1}>Tier 1（最優先）</option>
                            <option value={2}>Tier 2（検討）</option>
                            <option value={3}>Tier 3（ウォッチ）</option>
                          </select>
                        </label>
                        <label>
                          <span className="block text-[11px] text-[var(--text-secondary)] mb-1">目標株価 ($)</span>
                          <input type="number" value={watchlist.targetPrice ?? ''} onChange={e => setWatchlistForm(f => ({ ...f, targetPrice: Number(e.target.value) }))} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm text-lg px-3 py-2 rounded outline-none focus:border-[var(--accent-gold)]" placeholder="0.00" />
                        </label>
                        <label>
                          <span className="block text-[11px] text-[var(--text-secondary)] mb-1">優先度 (1-5)</span>
                          <select value={watchlist.priority} onChange={e => setWatchlistForm(f => ({ ...f, priority: Number(e.target.value) as 1|2|3|4|5 }))} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded outline-none">
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">カテゴリー</span>
                      <input value={watchlist.category} onChange={e => setWatchlistForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)]" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">投資テーゼ</span>
                      <textarea value={watchlist.thesis} onChange={e => setWatchlistForm(f => ({ ...f, thesis: e.target.value }))} rows={4} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)] resize-none" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-[var(--text-secondary)] block mb-1">メモ</span>
                      <textarea value={watchlist.notes} onChange={e => setWatchlistForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded text-sm outline-none focus:border-[var(--accent-blue)] resize-none" />
                    </label>
                  </>
                )}
                <div className="flex justify-end">
                  <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-[var(--accent-gold)] text-black rounded hover:opacity-90 transition-opacity">
                    <Save className="w-4 h-4" /> 保存する
                  </button>
                </div>
              </div>
            )}

            {/* ─── 分析履歴タブ ─── */}
            {tab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[var(--text-secondary)]">
                    分析レポートの変遷を追跡できます。古いエントリほど下に表示されます。
                  </div>
                  <button
                    onClick={() => { setShowImportPanel(true); setTab('overview'); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono-dm text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 rounded hover:bg-[var(--accent-blue)]/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> 新しい分析を追加
                  </button>
                </div>

                {localHistory.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-lg">
                    <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)] mb-3">分析履歴がありません</p>
                    <p className="text-xs text-[var(--text-muted)]">「AI分析」ボタンからレポートを貼り付けると、ここに履歴が積み上がります</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {localHistory.map(entry => (
                      <HistoryEntryCard
                        key={entry.id}
                        entry={entry}
                        onDelete={() => handleDeleteHistory(entry.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
