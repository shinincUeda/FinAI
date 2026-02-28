import { useState } from 'react';
import { X, Loader2, FileJson, Clock } from 'lucide-react';
import { parseCompounderReport } from '../../lib/claude';
import type { Holding, AnalysisHistoryEntry } from '../../types';
import { useHoldingsStore } from '../../stores/holdingsStore';

interface ImportReportModalProps {
  holding: Holding;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Holding>) => void;
}

export function ImportReportModal({ holding, onClose, onSave }: ImportReportModalProps) {
  const [text, setText] = useState('');
  const [comment, setComment] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const { addAnalysisEntry } = useHoldingsStore();

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError('VITE_GEMINI_API_KEY が設定されていません。');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const parsedData = await parseCompounderReport(apiKey, text);

      // 分析フィールドを更新
      onSave(holding.id, {
        analysis: parsedData.analysis,
        currentPrice: parsedData.currentPrice ?? holding.currentPrice,
      });

      // 分析履歴に追加
      const entry: AnalysisHistoryEntry = {
        id: `ah-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        rawText: text,
        comment: comment.trim(),
        parsedAnalysis: parsedData.analysis,
      };
      addAnalysisEntry(holding.id, entry);

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '解析中にエラーが発生しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const historyCount = holding.analysisHistory?.length ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] w-full max-w-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-bold flex items-center gap-2">
            <FileJson className="w-5 h-5 text-[var(--accent-blue)]" />
            AIレポート解析 ({holding.ticker})
          </h3>
          <div className="flex items-center gap-3">
            {historyCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono-dm text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">
                <Clock className="w-3 h-3" /> 履歴 {historyCount}件
              </span>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Claudeから出力された Compounder Hunter の分析レポート（テキスト）をそのまま下の枠に貼り付けてください。AIが自動で数値を抽出し、ダッシュボードに反映します。
            解析結果は<strong className="text-[var(--accent-blue-light)]">分析履歴</strong>にも自動保存されます。
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'【AppLovin Corporation (APP)】\nFundamental Score: 79 / 90（グレード: A）\n...'}
            className="w-full h-56 p-3 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm font-mono focus:border-[var(--accent-blue)] outline-none resize-none"
          />
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="メモ（任意）: この分析のポイント、変化した点など..."
            className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm text-white outline-none focus:border-[var(--accent-blue)]"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50">
            キャンセル
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm bg-[var(--accent-blue)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isAnalyzing ? 'データ抽出中...' : '解析して保存 + 履歴記録'}
          </button>
        </div>
      </div>
    </div>
  );
}
