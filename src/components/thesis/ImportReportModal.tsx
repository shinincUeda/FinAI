import { useState } from 'react';
import { X, Loader2, FileJson } from 'lucide-react';
import { parseCompounderReport } from '../../lib/claude';
import type { Holding, CompounderAnalysis } from '../../types';

interface ImportReportModalProps {
  holding: Holding;
  onClose: () => void;
  onSave: (id: string, analysis: CompounderAnalysis) => void;
}

export function ImportReportModal({ holding, onClose, onSave }: ImportReportModalProps) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('APIキーが設定されていません。.env.localを確認してください。');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const analysisData = await parseCompounderReport(apiKey, text);
      onSave(holding.id, analysisData);
      onClose(); // 成功したら閉じる
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '解析中にエラーが発生しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--bg-hover)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Claudeから出力された Compounder Hunter の分析レポート（テキスト）をそのまま下の枠に貼り付けてください。AIが自動で数値を抽出し、ダッシュボードに反映します。
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'【AppLovin Corporation (APP)】\nFundamental Score: 79 / 90（グレード: A）\n...'}
            className="w-full h-64 p-3 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm font-mono focus:border-[var(--accent-blue)] outline-none resize-none"
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
            {isAnalyzing ? 'データ抽出中...' : '解析して保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
