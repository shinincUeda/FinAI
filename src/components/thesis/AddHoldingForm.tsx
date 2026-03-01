import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, FileText } from 'lucide-react';
import type { Holding, CompounderAnalysis, AnalysisHistoryEntry } from '../../types';
import { sectorLabels } from '../../data/initialData';
import { analyzeStockForRegistration, parseCompounderReport } from '../../lib/claude';

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // レポート貼り付け解析用
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isParsingReport, setIsParsingReport] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedAnalysis, setParsedAnalysis] = useState<CompounderAnalysis | null>(null);

  const handleAiAnalyze = async () => {
    if (!ticker.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const result = await analyzeStockForRegistration(ticker.trim().toUpperCase());
      setName(result.name);
      setSector(result.sector);
      setAiAlignmentScore(result.aiAlignmentScore);
      setThesis(result.thesis);
      setSellTriggers(result.sellTriggers);
      setWatchMetrics(result.watchMetrics);
      setNotes(result.notes);
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
      // フォーム各フィールドを自動入力
      if (parsed.name) setName(parsed.name);
      if (parsed.sector) setSector(parsed.sector);
      if (parsed.aiAlignmentScore) setAiAlignmentScore(parsed.aiAlignmentScore);
      if (parsed.thesis) setThesis(parsed.thesis);
      if (parsed.sellTriggers) setSellTriggers(parsed.sellTriggers);
      if (parsed.watchMetrics) setWatchMetrics(parsed.watchMetrics);
      // ティッカーが未入力の場合はレポートから補完
      if (parsed.ticker && !ticker.trim()) setTicker(parsed.ticker);
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
    if (!ticker.trim()) return;
    const id = generateId(ticker.trim());
    const today = new Date().toISOString().slice(0, 10);

    const analysisHistory: AnalysisHistoryEntry[] = parsedAnalysis ? [{
      id: `ah-${Date.now()}`,
      date: today,
      rawText: reportText,
      comment: '',
      parsedAnalysis,
    }] : [];

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
      ...(parsedAnalysis && { analysis: parsedAnalysis }),
      ...(analysisHistory.length > 0 && { analysisHistory }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[var(--text-primary)]">新規銘柄追加</h3>
        <span className="text-xs text-[var(--text-secondary)]">ティッカー入力後「AI分析」で自動入力</span>
      </div>

      {/* ティッカー + AI分析ボタン */}
      <div className="space-y-1.5">
        <div className="flex gap-2 items-end">
          <label className="flex-1">
            <span className="block text-xs text-[var(--text-secondary)] mb-1">ティッカー *</span>
            <input
              type="text"
              value={ticker}
              onChange={(e) => { setTicker(e.target.value); setAnalysisError(''); }}
              placeholder="AAPL"
              className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] font-mono uppercase"
              required
            />
          </label>
          <button
            type="button"
            onClick={handleAiAnalyze}
            disabled={!ticker.trim() || isAnalyzing}
            className="px-4 py-2 rounded bg-[var(--accent-purple)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm whitespace-nowrap transition-opacity"
          >
            {isAnalyzing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isAnalyzing ? '分析中...' : 'AI分析'}
          </button>
        </div>
        {analysisError && (
          <p className="text-xs text-[var(--accent-red)] bg-red-950/20 px-3 py-1.5 rounded border border-red-900/30">
            {analysisError}
          </p>
        )}
      </div>

      {/* レポート貼り付け解析パネル */}
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowReportPanel(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-[var(--accent-blue-light)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileText size={13} />
            分析レポートを貼り付けてAI解析
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
              Compounder Hunter などの分析レポートをそのまま貼り付けてください。Gemini が解析してフォームを自動入力します。
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
                {isParsingReport ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                {isParsingReport ? 'Gemini解析中...' : '解析して自動入力'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 企業名 + セクター */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* AI適合度 + ステータス */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">投資テーゼ</span>
        <textarea
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
        />
      </label>
      <label>
        <span className="block text-xs text-[var(--text-secondary)] mb-1">売却トリガー</span>
        <textarea
          value={sellTriggers}
          onChange={(e) => setSellTriggers(e.target.value)}
          rows={2}
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
