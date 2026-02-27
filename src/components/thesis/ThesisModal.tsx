import { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { Holding } from '../../types';
import { sectorLabels, statusLabels } from '../../data/initialData';
import { ImportReportModal } from './ImportReportModal';

const SECTORS = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'] as const;
const STATUSES = ['core', 'monitor', 'reduce', 'sell'] as const;

interface ThesisModalProps {
  holding: Holding | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Holding>) => void;
}

export function ThesisModal({ holding, onClose, onSave }: ThesisModalProps) {
  const [form, setForm] = useState<Partial<Holding>>({});
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (holding) setForm({ ...holding });
  }, [holding]);

  if (!holding) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(holding.id, form);
    onClose();
  };

  const handleAnalysisSave = (id: string, analysisData: Holding['analysis']) => {
    if (!analysisData) return;
    setForm((prev) => ({ ...prev, analysis: analysisData }));
    onSave(id, { analysis: analysisData });
  };

  // レーダーチャート用に100点満点に正規化
  const radarData = form.analysis
    ? [
        { subject: 'Quality', score: (form.analysis.scoreBreakdown.quality / 30) * 100 },
        { subject: 'AI Impact', score: (form.analysis.scoreBreakdown.aiImpact / 20) * 100 },
        { subject: 'Compounding', score: (form.analysis.scoreBreakdown.compounding / 20) * 100 },
        { subject: 'Unit Econ', score: (form.analysis.scoreBreakdown.unitEcon / 20) * 100 },
      ]
    : [];

  const getSignalColor = (signal: string) => {
    if (signal.includes('Buy')) return 'text-green-400 border-green-400/30 bg-green-400/10';
    if (signal.includes('Sell')) return 'text-red-400 border-red-400/30 bg-red-400/10';
    return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
  };

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case 'Sovereign':
        return '👑 Sovereign (支配者)';
      case 'Fuel':
        return '⚡ Fuel (インフラ)';
      case 'Adopter':
        return '🦾 Adopter (実利者)';
      case 'Victim':
        return '💀 Victim (被食者)';
      default:
        return `📋 ${classification}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側: 基本情報フォーム */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-[var(--border)] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold font-mono">
              {form.ticker} — {form.name}
            </h2>
            <button className="md:hidden p-1 rounded hover:bg-[var(--bg-hover)]" onClick={onClose}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="block text-xs text-[var(--text-secondary)] mb-1">セクター</span>
                <select
                  value={form.sector ?? ''}
                  onChange={(e) => setForm({ ...form, sector: e.target.value as Holding['sector'] })}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm"
                >
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {sectorLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="block text-xs text-[var(--text-secondary)] mb-1">ステータス</span>
                <select
                  value={form.status ?? ''}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Holding['status'] })}
                  className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">投資テーゼ</span>
              <textarea
                value={form.thesis ?? ''}
                onChange={(e) => setForm({ ...form, thesis: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm resize-none"
              />
            </label>
            <label>
              <span className="block text-xs text-[var(--text-secondary)] mb-1">売却トリガー</span>
              <textarea
                value={form.sellTriggers ?? ''}
                onChange={(e) => setForm({ ...form, sellTriggers: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded bg-[var(--bg-card)] border border-[var(--border)] text-sm resize-none"
              />
            </label>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
              >
                <Sparkles className="w-4 h-4" /> AI分析レポート読込
              </button>
              <button type="submit" className="px-5 py-2 rounded text-sm bg-[var(--accent-blue)] text-white hover:opacity-90">
                保存
              </button>
            </div>
          </form>
        </div>

        {/* 右側: AIグラフィカルダッシュボード */}
        <div className="w-full md:w-[400px] bg-[var(--bg-card)] p-6 relative flex flex-col">
          <button
            className="hidden md:block absolute top-4 right-4 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>

          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-6">
            AI Assessment
          </h3>

          {form.analysis ? (
            <div className="space-y-6 flex-1 overflow-y-auto pb-4 pr-2">
              {/* スコア＆シグナル */}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Grade / Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">{form.analysis.fundamentalGrade}</span>
                    <span className="text-lg text-[var(--text-secondary)]">{form.analysis.fundamentalScore}/100</span>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-full border text-xs font-bold ${getSignalColor(form.analysis.investmentSignal)}`}
                >
                  {form.analysis.investmentSignal.toUpperCase()}
                </div>
              </div>

              {/* クラス分類バッジ */}
              <div>
                <p className="text-xs text-[var(--text-secondary)] mb-2">AI Classification</p>
                <div className="inline-flex items-center px-3 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border)] text-sm">
                  {getClassificationLabel(form.analysis.aiClassification)}
                </div>
              </div>

              {/* レーダーチャート */}
              <div className="h-56 w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="var(--accent-purple)"
                      fill="var(--accent-purple)"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* フェアバリュー */}
              <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border)]">
                <p className="text-xs text-[var(--text-secondary)] mb-3 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Fair Value (適正価格) - {form.analysis.valuationStatus}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-red-400">
                    <span>Bull Case</span>
                    <span>${form.analysis.fairValue.bull}</span>
                  </div>
                  <div className="flex justify-between text-green-400 font-bold border-l-2 border-green-400 pl-2">
                    <span>Base Case</span>
                    <span>${form.analysis.fairValue.base}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Bear Case</span>
                    <span>${form.analysis.fairValue.bear}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text-secondary)] p-6">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm mb-2">AI分析データがありません</p>
              <p className="text-xs opacity-70">
                「AI分析レポート読込」ボタンからテキストを貼り付けると、ここにグラフィカルな分析結果が表示されます。
              </p>
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <ImportReportModal
          holding={holding}
          onClose={() => setShowImport(false)}
          onSave={handleAnalysisSave}
        />
      )}
    </div>
  );
}
