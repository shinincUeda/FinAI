import { useState } from 'react';
import {
  X, Sparkles, Loader2, RefreshCw, CheckCircle2, FileText,
  Briefcase, Eye, ChevronDown, ChevronUp, Search, ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import type { Holding, CompounderAnalysis, AnalysisHistoryEntry } from '../../types';
import { sectorLabels } from '../../data/initialData';
import { analyzeStockForRegistration, parseCompounderReport } from '../../lib/claude';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';

const SECTORS: Holding['sector'][] = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'];
const STATUS_LABELS: Record<Holding['status'], string> = {
  core: 'コア保有', monitor: '保有（監視強化）', reduce: '縮小検討', sell: '売却推奨',
};

interface AddStockModalProps {
  onClose: () => void;
  /** 追加完了後に呼ばれる（ティッカーと種別を返す） */
  onSuccess?: (ticker: string, type: 'holding' | 'watchlist') => void;
}

type Phase = 'search' | 'duplicate' | 'form';

interface DuplicateInfo {
  source: 'holding' | 'watchlist';
  name: string;
  detail: string; // status label or "Tier X"
}

export function AddStockModal({ onClose, onSuccess }: AddStockModalProps) {
  const { holdings, addHolding } = useHoldingsStore();
  const { items: watchlistItems, addItem, removeItem } = useWatchlistStore();

  // ── フェーズ管理 ──────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('search');
  const [searchInput, setSearchInput] = useState('');
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);

  const handleSearch = () => {
    const upper = searchInput.trim().toUpperCase();
    if (!upper) return;

    const existingHolding = holdings.find(h => h.ticker === upper);
    if (existingHolding) {
      setDuplicateInfo({
        source: 'holding',
        name: existingHolding.name,
        detail: STATUS_LABELS[existingHolding.status],
      });
      setPhase('duplicate');
      return;
    }

    const existingWatch = watchlistItems.find(i => i.ticker === upper);
    if (existingWatch) {
      // ウォッチリストにあった場合はフォームに進み、保有銘柄への昇格を促す
      setTicker(existingWatch.ticker);
      setName(existingWatch.name);
      setThesis(existingWatch.thesis || '');
      setNotes(existingWatch.notes || '');
      setTargetPrice(existingWatch.targetPrice?.toString() || '');
      if (existingWatch.analysis) {
        setParsedAnalysis(existingWatch.analysis);
      }
      setPhase('form');
      return;
    }

    // 未登録 → フォームへ進む
    setTicker(upper);
    setPhase('form');
  };

  const resetToSearch = () => {
    setPhase('search');
    setDuplicateInfo(null);
  };

  // ── フォームフィールド ──────────────────────────────────────
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [thesis, setThesis] = useState('');
  const [notes, setNotes] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [sharesNisa, setSharesNisa] = useState('');
  const [avgCostNisa, setAvgCostNisa] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [sector, setSector] = useState<Holding['sector']>('other');
  const [aiAlignmentScore, setAiAlignmentScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [status, setStatus] = useState<Holding['status']>('monitor');
  const [sellTriggers, setSellTriggers] = useState('');
  const [watchMetrics, setWatchMetrics] = useState('');
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [category, setCategory] = useState('');

  const isHolding = Number(shares) > 0 || Number(sharesNisa) > 0;

  // ── AI 分析 ────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isParsingReport, setIsParsingReport] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedAnalysis, setParsedAnalysis] = useState<CompounderAnalysis | null>(null);

  const handleQuickAnalyze = async () => {
    if (!ticker.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const result = await analyzeStockForRegistration(ticker.trim().toUpperCase());
      setName(result.name);
      setThesis(result.thesis);
      setNotes(result.notes);
      setSector(result.sector);
      setAiAlignmentScore(result.aiAlignmentScore);
      setSellTriggers(result.sellTriggers);
      setWatchMetrics(result.watchMetrics);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '分析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReportAnalyze = async () => {
    if (!reportText.trim()) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setParseError('VITE_GEMINI_API_KEY が設定されていません。'); return; }
    setIsParsingReport(true);
    setParseError('');
    try {
      const parsed = await parseCompounderReport(apiKey, reportText);
      if (parsed.name) setName(parsed.name);
      if (parsed.ticker && !ticker.trim()) setTicker(parsed.ticker);
      if (parsed.thesis) setThesis(parsed.thesis);
      if (parsed.sector) setSector(parsed.sector);
      if (parsed.aiAlignmentScore) setAiAlignmentScore(parsed.aiAlignmentScore);
      if (parsed.sellTriggers) setSellTriggers(parsed.sellTriggers);
      if (parsed.watchMetrics) setWatchMetrics(parsed.watchMetrics);
      if (parsed.currentPrice && !targetPrice) setTargetPrice(String(parsed.currentPrice));
      setParsedAnalysis(parsed.analysis);
      setShowReportPanel(false);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '解析エラー');
    } finally {
      setIsParsingReport(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !name.trim()) return;

    const today = new Date().toISOString().slice(0, 10);
    const analysisHistory: AnalysisHistoryEntry[] = parsedAnalysis ? [{
      id: `ah-${Date.now()}`,
      date: today,
      rawText: reportText,
      comment: '',
      parsedAnalysis,
    }] : [];

    if (isHolding) {
      addHolding({
        id: ticker.trim().toLowerCase().replace(/\s+/g, '-'),
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        sector,
        aiAlignmentScore,
        thesis,
        sellTriggers,
        watchMetrics,
        status,
        notes,
        shares: Number(shares) || undefined,
        avgCost: Number(avgCost) || undefined,
        sharesNisa: Number(sharesNisa) || undefined,
        avgCostNisa: Number(avgCostNisa) || undefined,
        currentPrice: Number(currentPrice) || undefined,
        lastUpdated: today,
        ...(parsedAnalysis && { analysis: parsedAnalysis }),
        ...(analysisHistory.length > 0 && { analysisHistory }),
      });
      
      // ウォッチリストからの昇格の場合は、ウォッチリストから削除する
      const existingWatch = watchlistItems.find(i => i.ticker === ticker.trim().toUpperCase());
      if (existingWatch) {
        removeItem(existingWatch.id);
      }
    } else {
      addItem({
        id: `w-${Date.now()}`,
        ticker: ticker.trim().toUpperCase(),
        name: name.trim(),
        tier,
        category,
        thesis,
        targetPrice: parseFloat(targetPrice) || 0,
        priority,
        notes,
        ...(parsedAnalysis && { analysis: parsedAnalysis }),
        ...(analysisHistory.length > 0 && { analysisHistory }),
      });
    }

    const finalTicker = ticker.trim().toUpperCase();
    const finalType: 'holding' | 'watchlist' = isHolding ? 'holding' : 'watchlist';
    onClose();
    onSuccess?.(finalTicker, finalType);
  };

  // ── レンダリング ───────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-xl shadow-2xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {phase === 'form' && (
              <button
                onClick={resetToSearch}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                変更
              </button>
            )}
            <h3 className="font-bold text-white text-sm tracking-wide">
              {phase === 'search' ? '銘柄を追加' : phase === 'duplicate' ? '銘柄を追加' : (
                <span className="flex items-center gap-2">
                  銘柄を追加
                  <span className="font-mono-dm text-[var(--accent-blue-light)] bg-[var(--accent-blue)]/10 px-2 py-0.5 rounded border border-[var(--accent-blue)]/20 text-xs">
                    {ticker}
                  </span>
                </span>
              )}
            </h3>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── フェーズ 1: ティッカー検索 ── */}
        {phase === 'search' && (
          <div className="p-8 space-y-6">
            <div className="text-center space-y-1">
              <p className="text-sm text-[var(--text-secondary)]">追加したい銘柄のティッカーを入力してください</p>
              <p className="text-xs text-[var(--text-muted)]">既に登録済みかどうかを確認してから詳細を入力できます</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="例: NVDA, AAPL, TSM"
                autoFocus
                className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] focus:border-[var(--accent-blue)] text-[var(--text-primary)] font-mono-dm uppercase text-lg tracking-wider outline-none transition-colors placeholder:normal-case placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={!searchInput.trim()}
                className="px-5 py-3 rounded-lg bg-[var(--accent-blue)] text-white hover:opacity-90 disabled:opacity-40 flex items-center gap-2 text-sm font-bold transition-opacity"
              >
                <Search className="w-4 h-4" />
                検索
              </button>
            </div>
          </div>
        )}

        {/* ── フェーズ 2: 重複検出 ── */}
        {phase === 'duplicate' && duplicateInfo && (
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-[var(--accent-yellow)]" />
              </div>
              <div className="text-center space-y-1">
                <div className="font-mono-dm text-2xl font-bold text-white">{searchInput.trim().toUpperCase()}</div>
                <p className="text-sm text-[var(--accent-yellow)]">既に登録されています</p>
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-bold">{duplicateInfo.name}</span>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold ${
                  duplicateInfo.source === 'holding'
                    ? 'bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/30 text-[var(--accent-gold-light)]'
                    : 'bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 text-[var(--accent-purple)]'
                }`}>
                  {duplicateInfo.source === 'holding'
                    ? <><Briefcase className="w-3 h-3" /> 保有銘柄</>
                    : <><Eye className="w-3 h-3" /> ウォッチリスト</>
                  }
                </span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{duplicateInfo.detail}</div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={resetToSearch}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                別の銘柄を検索する
              </button>
            </div>
          </div>
        )}

        {/* ── フェーズ 3: 登録フォーム ── */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* AI 分析ボタン（ティッカーはヘッダーに表示済み） */}
            <div className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)]" />
                <span className="text-xs text-[var(--text-secondary)]">
                  <span className="font-mono-dm text-white font-bold">{ticker}</span> 
                  {watchlistItems.some(i => i.ticker === ticker) ? ' はウォッチリストから保有銘柄へ登録可能です' : ' は未登録です'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--accent-purple)] text-white hover:opacity-90 disabled:opacity-40 text-xs font-bold transition-opacity"
              >
                {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {isAnalyzing ? 'AI分析中...' : 'AI分析で自動入力'}
              </button>
            </div>
            {analysisError && (
              <p className="text-xs text-[var(--accent-red)] bg-red-950/20 px-3 py-1.5 rounded border border-red-900/30">
                {analysisError}
              </p>
            )}

            {/* 企業名 */}
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">企業名 *</span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Apple Inc."
                className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
                required
              />
            </label>

            {/* 保有株数（口座別 + 現在株価） */}
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 space-y-3">
              <p className="text-[11px] text-[var(--text-muted)]">
                いずれかの口座に保有株数を入力すると <span className="text-[var(--accent-gold-light)] font-bold">保有銘柄</span>、
                空欄のままだと <span className="text-[var(--accent-purple)] font-bold">ウォッチリスト</span> に登録されます。
              </p>

              {/* 特定口座 */}
              <div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-[var(--accent-gold)] inline-block" />
                  特定口座
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">保有株数</span>
                    <input
                      type="number"
                      min="0"
                      value={shares}
                      onChange={e => setShares(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm"
                    />
                  </label>
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">平均取得単価 ($)</span>
                    <input
                      type="number"
                      min="0"
                      value={avgCost}
                      onChange={e => setAvgCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-white font-mono-dm"
                    />
                  </label>
                </div>
              </div>

              {/* NISA口座 */}
              <div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-[var(--accent-green)] inline-block" />
                  NISA口座（成長投資枠）
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">保有株数</span>
                    <input
                      type="number"
                      min="0"
                      value={sharesNisa}
                      onChange={e => setSharesNisa(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--accent-green)]/30 text-white font-mono-dm focus:border-[var(--accent-green)] outline-none"
                    />
                  </label>
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">平均取得単価 ($)</span>
                    <input
                      type="number"
                      min="0"
                      value={avgCostNisa}
                      onChange={e => setAvgCostNisa(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--accent-green)]/30 text-white font-mono-dm focus:border-[var(--accent-green)] outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* 現在株価 */}
              <div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-[var(--accent-blue)] inline-block" />
                  現在株価
                </div>
                <label>
                  <span className="block text-xs text-[var(--text-secondary)] mb-1">現在株価 ($)</span>
                  <input
                    type="number"
                    min="0"
                    value={currentPrice}
                    onChange={e => setCurrentPrice(e.target.value)}
                    placeholder="0.00（後でウォッチリストから更新可）"
                    className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--accent-blue)]/30 text-[var(--accent-blue-light)] font-mono-dm focus:border-[var(--accent-blue)] outline-none"
                  />
                </label>
              </div>
            </div>

            {/* 登録先インジケーター */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono-dm ${
              isHolding
                ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/30 text-[var(--accent-gold-light)]'
                : 'bg-[var(--accent-purple)]/10 border-[var(--accent-purple)]/30 text-[var(--accent-purple)]'
            }`}>
              {isHolding
                ? <><Briefcase size={13} /> 保有銘柄として登録</>
                : <><Eye size={13} /> ウォッチリストとして登録</>
              }
            </div>

            {/* AI分析レポート貼り付けパネル */}
            <div className="border border-[var(--border)] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowReportPanel(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-[var(--accent-blue-light)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  AI分析レポートを貼り付けて解析
                  {parsedAnalysis && (
                    <span className="flex items-center gap-1 ml-2 text-[var(--accent-green)]">
                      <CheckCircle2 size={12} />
                      解析済み ({parsedAnalysis.fundamentalGrade} {parsedAnalysis.fundamentalScore}/90 · {parsedAnalysis.investmentSignal})
                    </span>
                  )}
                </span>
                {showReportPanel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showReportPanel && (
                <div className="border-t border-[var(--border)] bg-[var(--accent-blue)]/5 p-3 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Compounder Hunter などの分析レポートをそのまま貼り付けてください。Gemini が解析してフォームと分析データを自動入力します。
                  </p>
                  <textarea
                    value={reportText}
                    onChange={e => { setReportText(e.target.value); setParseError(''); }}
                    placeholder={`分析レポートをここに貼り付け...\n\n例:\n【NVDA】\nFundamental Score: 85 / 90\nGrade: S\n...`}
                    rows={6}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono resize-none focus:border-[var(--accent-blue)] outline-none"
                  />
                  {parseError && (
                    <p className="text-xs text-[var(--accent-red)] bg-red-950/20 px-3 py-1.5 rounded border border-red-900/30">
                      {parseError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleReportAnalyze}
                      disabled={!reportText.trim() || isParsingReport}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[var(--accent-blue)] text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isParsingReport ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {isParsingReport ? 'Gemini解析中...' : '解析して自動入力'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 保有銘柄フィールド */}
            {isHolding && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">セクター</span>
                    <select
                      value={sector}
                      onChange={e => setSector(e.target.value as Holding['sector'])}
                      className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                    >
                      {SECTORS.map(s => <option key={s} value={s}>{sectorLabels[s]}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">AI適合度</span>
                    <select
                      value={aiAlignmentScore}
                      onChange={e => setAiAlignmentScore(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                      className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                    >
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <span className="block text-xs text-[var(--text-secondary)] mb-1">ステータス</span>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Holding['status'])}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                  >
                    <option value="core">コア保有</option>
                    <option value="monitor">保有（監視強化）</option>
                    <option value="reduce">保有（縮小検討）</option>
                    <option value="sell">売却推奨</option>
                  </select>
                </label>
                <label>
                  <span className="block text-xs text-[var(--text-secondary)] mb-1">売却トリガー</span>
                  <textarea
                    value={sellTriggers}
                    onChange={e => setSellTriggers(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white resize-none"
                  />
                </label>
                <label>
                  <span className="block text-xs text-[var(--text-secondary)] mb-1">注目指標</span>
                  <input
                    type="text"
                    value={watchMetrics}
                    onChange={e => setWatchMetrics(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                  />
                </label>
              </>
            )}

            {/* ウォッチリストフィールド */}
            {!isHolding && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">Tier</span>
                    <select
                      value={tier}
                      onChange={e => setTier(Number(e.target.value) as 1 | 2 | 3)}
                      className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                    >
                      <option value={1}>Tier 1（最優先）</option>
                      <option value={2}>Tier 2（検討）</option>
                      <option value={3}>Tier 3（ウォッチ）</option>
                    </select>
                  </label>
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">目標株価 ($)</span>
                    <input
                      type="number"
                      value={targetPrice}
                      onChange={e => setTargetPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white font-mono-dm"
                    />
                  </label>
                  <label>
                    <span className="block text-xs text-[var(--text-secondary)] mb-1">優先度</span>
                    <select
                      value={priority}
                      onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                      className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                    >
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  <span className="block text-xs text-[var(--text-secondary)] mb-1">カテゴリー</span>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                  />
                </label>
              </>
            )}

            {/* 共通：投資テーゼ・メモ */}
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">投資テーゼ</span>
              <textarea
                value={thesis}
                onChange={e => setThesis(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white resize-none"
              />
            </label>
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">メモ</span>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
              />
            </label>

            {/* 送信ボタン */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className={`px-6 py-2 text-sm font-bold rounded hover:opacity-90 disabled:opacity-50 transition-opacity ${
                  isHolding
                    ? 'bg-[var(--accent-gold)] text-black'
                    : 'bg-[var(--accent-purple)] text-white'
                }`}
              >
                {isHolding ? '保有銘柄として追加' : 'ウォッチリストに追加'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
