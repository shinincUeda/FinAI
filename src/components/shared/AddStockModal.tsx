import { useState } from 'react';
import {
  X, Sparkles, Loader2, RefreshCw, CheckCircle2, FileText,
  Briefcase, Eye, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Holding, CompounderAnalysis, AnalysisHistoryEntry } from '../../types';
import { sectorLabels } from '../../data/initialData';
import { analyzeStockForRegistration, parseCompounderReport } from '../../lib/claude';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';

const SECTORS: Holding['sector'][] = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'];

interface AddStockModalProps {
  defaultType?: 'holding' | 'watchlist';
  onClose: () => void;
}

export function AddStockModal({ defaultType = 'holding', onClose }: AddStockModalProps) {
  const { addHolding } = useHoldingsStore();
  const { addItem } = useWatchlistStore();

  const [type, setType] = useState<'holding' | 'watchlist'>(defaultType);

  // 共通フィールド
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');

  // 保有銘柄フィールド
  const [sector, setSector] = useState<Holding['sector']>('other');
  const [aiAlignmentScore, setAiAlignmentScore] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [status, setStatus] = useState<Holding['status']>('monitor');
  const [thesis, setThesis] = useState('');
  const [sellTriggers, setSellTriggers] = useState('');
  const [watchMetrics, setWatchMetrics] = useState('');
  const [notes, setNotes] = useState('');

  // ウォッチリストフィールド
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [category, setCategory] = useState('');

  // クイック AI分析（Gemini - フィールド自動入力）
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // AI分析レポート貼り付け（Gemini - Compounder解析）
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
      if (type === 'holding') {
        setSector(result.sector);
        setAiAlignmentScore(result.aiAlignmentScore);
        setSellTriggers(result.sellTriggers);
        setWatchMetrics(result.watchMetrics);
      }
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
      if (type === 'holding') {
        if (parsed.sector) setSector(parsed.sector);
        if (parsed.aiAlignmentScore) setAiAlignmentScore(parsed.aiAlignmentScore);
        if (parsed.sellTriggers) setSellTriggers(parsed.sellTriggers);
        if (parsed.watchMetrics) setWatchMetrics(parsed.watchMetrics);
      } else {
        if (parsed.currentPrice) setTargetPrice(String(parsed.currentPrice));
      }
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

    if (type === 'holding') {
      const analysisHistory: AnalysisHistoryEntry[] = parsedAnalysis ? [{
        id: `ah-${Date.now()}`,
        date: today,
        rawText: reportText,
        comment: '',
        parsedAnalysis,
      }] : [];

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
        lastUpdated: today,
        ...(parsedAnalysis && { analysis: parsedAnalysis }),
        ...(analysisHistory.length > 0 && { analysisHistory }),
      });
    } else {
      const analysisHistory: AnalysisHistoryEntry[] = parsedAnalysis ? [{
        id: `ah-${Date.now()}`,
        date: today,
        rawText: reportText,
        comment: '',
        parsedAnalysis,
      }] : [];

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

    onClose();
  };

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
          <h3 className="font-bold text-white text-sm tracking-wide">銘柄を追加</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 種別トグル */}
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setType('holding')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-mono-dm tracking-widest transition-colors ${
                type === 'holding'
                  ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold-light)] border-b-2 border-[var(--accent-gold)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> 保有銘柄
            </button>
            <button
              type="button"
              onClick={() => setType('watchlist')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-mono-dm tracking-widest transition-colors ${
                type === 'watchlist'
                  ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border-b-2 border-[var(--accent-purple)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> ウォッチリスト
            </button>
          </div>

          {/* ティッカー + クイックAI分析 */}
          <div className="space-y-1.5">
            <div className="flex gap-2 items-end">
              <label className="flex-1">
                <span className="block text-xs text-[var(--text-secondary)] mb-1">ティッカー *</span>
                <input
                  type="text"
                  value={ticker}
                  onChange={e => { setTicker(e.target.value); setAnalysisError(''); }}
                  placeholder="AAPL"
                  className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono-dm uppercase"
                  required
                />
              </label>
              <button
                type="button"
                onClick={handleQuickAnalyze}
                disabled={!ticker.trim() || isAnalyzing}
                className="px-4 py-2 rounded bg-[var(--accent-purple)] text-white hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5 text-xs whitespace-nowrap transition-opacity"
              >
                {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {isAnalyzing ? '分析中...' : 'AI分析'}
              </button>
            </div>
            {analysisError && (
              <p className="text-xs text-[var(--accent-red)] bg-red-950/20 px-3 py-1.5 rounded border border-red-900/30">
                {analysisError}
              </p>
            )}
          </div>

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

          {/* 種別別フィールド */}
          {type === 'holding' ? (
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
                <span className="block text-xs text-[var(--text-secondary)] mb-1">投資テーゼ</span>
                <textarea
                  value={thesis}
                  onChange={e => setThesis(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white resize-none"
                />
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
              <label>
                <span className="block text-xs text-[var(--text-secondary)] mb-1">メモ</span>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white"
                />
              </label>
            </>
          ) : (
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
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-white resize-none"
                />
              </label>
            </>
          )}

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
              disabled={!ticker.trim() || !name.trim()}
              className={`px-6 py-2 text-sm font-bold rounded hover:opacity-90 disabled:opacity-50 transition-opacity ${
                type === 'holding'
                  ? 'bg-[var(--accent-gold)] text-black'
                  : 'bg-[var(--accent-purple)] text-white'
              }`}
            >
              {type === 'holding' ? '保有銘柄として追加' : 'ウォッチリストに追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
