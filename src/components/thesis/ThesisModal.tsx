import { useState, useEffect } from 'react';
import { X, Save, Sparkles, AlertTriangle, RefreshCw, Target } from 'lucide-react';
import type { Holding } from '../../types';
import { ImportReportModal } from './ImportReportModal';
import { fetchCurrentPrice } from '../../lib/stockApi';

const SECTORS = ['ai-infra', 'hyperscaler', 'ai-drug', 'energy', 'fintech', 'robotics', 'other'] as const;
const STATUSES = ['core', 'monitor', 'reduce', 'sell'] as const;
const sectorLabels: Record<string, string> = { 'ai-infra': 'AIインフラ', 'hyperscaler': 'ハイパースケーラー', 'ai-drug': 'AI創薬', 'energy': 'エネルギー', 'fintech': 'フィンテック', 'robotics': 'ロボティクス', 'other': 'その他' };
const statusLabels: Record<string, string> = { 'core': 'コア保有', 'monitor': '監視強化', 'reduce': '縮小検討', 'sell': '売却推奨' };

interface ThesisModalProps {
  holding: Holding | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Holding>) => void;
}

const DotBar = ({ score, max, color = 'gold' }: { score: number; max: number; color?: string }) => (
  <div className="flex gap-1 mt-1.5 flex-wrap">
    {Array.from({ length: max }).map((_, i) => (
      <div key={i} className={`ch-dot ${i < score ? `filled ${color}` : 'empty'}`} />
    ))}
  </div>
);

export function ThesisModal({ holding, onClose, onSave }: ThesisModalProps) {
  const [form, setForm] = useState<Partial<Holding>>({});
  const [showImport, setShowImport] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);

  useEffect(() => {
    if (holding) {
      setForm({ ...holding });
      updatePrice(holding.ticker, holding.currentPrice);
    }
  }, [holding]);

  const updatePrice = async (ticker: string, fallbackPrice: number = 0) => {
    const apiKey = import.meta.env.VITE_STOCK_API_KEY || '';
    setIsFetchingPrice(true);
    const livePrice = await fetchCurrentPrice(ticker, apiKey);
    if (livePrice !== null) {
      setForm((prev) => ({ ...prev, currentPrice: livePrice }));
    }
    setIsFetchingPrice(false);
  };

  if (!holding) return null;
  const analysis = form.analysis;

  const shares = Number(form.shares) || 0;
  const avgCost = Number(form.avgCost) || 0;
  const currentPrice = Number(form.currentPrice) || 0;
  const marketValue = shares * currentPrice;
  const pnl = marketValue - shares * avgCost;
  const pnlPercent = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0;
  const isProfit = pnl >= 0;

  const handleSave = () => {
    onSave(holding.id, form);
    onClose();
  };
  const handleAnalysisSave = (id: string, updates: Partial<Holding>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    onSave(id, updates);
  };

  const getSignalStyle = (signal: string = '') => {
    if (signal.includes('Strong Buy')) return 'bg-[rgba(61,214,140,0.12)] border-[var(--accent-green)] text-[var(--accent-green)]';
    if (signal.includes('Buy on Dip')) return 'bg-[rgba(201,168,76,0.12)] border-[var(--accent-gold)] text-[var(--accent-gold-light)]';
    if (signal.includes('Buy')) return 'bg-[rgba(74,158,255,0.12)] border-[var(--accent-blue)] text-[var(--accent-blue-light)]';
    if (signal.includes('Sell')) return 'bg-[rgba(224,92,92,0.12)] border-[var(--accent-red)] text-[var(--accent-red)]';
    return 'bg-[rgba(240,128,64,0.12)] border-[var(--accent-orange)] text-[var(--accent-orange)]';
  };

  // ====== バリュエーション・ゲージ（BUY ZONE 表示つき） ======
  const renderValuationGauge = () => {
    if (!analysis) return null;
    const { bear, base, bull } = analysis.fairValue;
    const entry = analysis.entryZone;
    const cp = currentPrice > 0 ? currentPrice : base;

    const values = [bear, base, bull, cp];
    if (entry && entry.max > 0) values.push(entry.min, entry.max);

    const minScale = Math.min(...values) * 0.85;
    const maxScale = Math.max(...values) * 1.15;
    const range = maxScale - minScale;

    const getPos = (val: number) => `${Math.max(0, Math.min(100, ((val - minScale) / range) * 100))}%`;

    const hasEntryZone = entry && entry.max > 0;
    const entryMinDraw = hasEntryZone && entry.min === 0 ? minScale : (entry?.min ?? 0);
    const entryMaxDraw = entry?.max ?? 0;
    const isInEntryZone = hasEntryZone && cp >= (entry?.min ?? 0) && cp <= entryMaxDraw;

    const baseDiffPercent = base > 0 ? ((cp - base) / base) * 100 : null;

    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 mb-3 rounded-lg relative overflow-hidden">
        <div className="flex justify-between items-end mb-10">
          <div className="font-mono-dm text-[10px] text-[var(--text-muted)] tracking-widest uppercase flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--accent-blue-light)]" /> バリュエーションとエントリーゾーン
          </div>
          {isFetchingPrice && <div className="text-[10px] text-[var(--accent-blue-light)] animate-pulse flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> 株価更新中</div>}
        </div>

        <div className="relative h-12 bg-[var(--bg-secondary)] rounded-lg w-full mb-10 border border-[var(--border)]">

          {hasEntryZone && (
            <div
              className={`absolute top-0 h-full border-x transition-all duration-300 ${isInEntryZone ? 'bg-[var(--accent-green)]/30 border-[var(--accent-green)]' : 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30'}`}
              style={{
                left: getPos(entryMinDraw),
                width: `${Math.max(0, Math.min(100, ((Math.min(maxScale, entryMaxDraw) - entryMinDraw) / range) * 100))}%`,
              }}
            >
              <div className={`absolute -top-6 w-full text-center font-mono-dm text-[10px] tracking-widest ${isInEntryZone ? 'text-[var(--accent-green)] font-bold' : 'text-[var(--accent-green)]/50'}`}>
                BUY ZONE
              </div>
            </div>
          )}

          <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-red)]/70" style={{ left: getPos(bear) }}>
            <div className="absolute top-14 -left-10 w-20 text-center font-mono-dm text-[10px] text-[var(--accent-red)]">Bear<br />${bear}</div>
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-gold)]" style={{ left: getPos(base) }}>
            <div className="absolute top-14 -left-10 w-20 text-center font-mono-dm text-[11px] font-bold text-[var(--accent-gold-light)]">Base<br />${base}</div>
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-green-dark)]/70" style={{ left: getPos(bull) }}>
            <div className="absolute top-14 -left-10 w-20 text-center font-mono-dm text-[10px] text-[var(--accent-green-dark)]">Bull<br />${bull}</div>
          </div>

          <div className="absolute top-[-10px] transform -translate-x-1/2 z-10 transition-all duration-700 ease-out" style={{ left: getPos(cp) }}>
            <div className={`font-mono-dm text-[11px] font-bold px-2 py-1 rounded shadow-lg flex flex-col items-center ${isInEntryZone ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--accent-blue)] text-white'}`}>
              <span>現在 ${cp.toFixed(2)}</span>
            </div>
            <div className={`w-0 h-0 mx-auto border-l-[6px] border-r-[6px] border-t-[6px] border-transparent mt-0.5 ${isInEntryZone ? 'border-t-[var(--accent-green)]' : 'border-t-[var(--accent-blue)]'}`} />
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 flex-shrink-0 ${isInEntryZone ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-gold)]'}`} />
            <div className="font-mono-dm text-[12px] text-[var(--text-secondary)]">
              現在株価はBase Case比
              <strong className={cp > base ? 'text-[var(--accent-red)] ml-1' : 'text-[var(--accent-green)] ml-1'}>
                {baseDiffPercent !== null ? `${baseDiffPercent >= 0 ? '+' : ''}${baseDiffPercent.toFixed(1)}%` : '—'} {analysis.valuationLabel}
              </strong>
            </div>
          </div>
          {isInEntryZone && (
            <div className="font-mono-dm text-[11px] font-bold tracking-widest text-[var(--accent-green)] bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 px-3 py-1 animate-pulse">
              🔥 エントリーチャンス！
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="min-h-screen px-4 py-10 flex justify-center">
        <div className="w-full max-w-[1100px] bg-[var(--bg-primary)] border border-[var(--border)] shadow-2xl relative" onClick={(e) => e.stopPropagation()}>

          <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur border-b border-[var(--border)] p-4 flex justify-between items-center">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 text-[11px] font-mono-dm tracking-widest text-[var(--accent-blue-light)] border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 hover:bg-[var(--accent-blue)]/20 transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> AI分析データを更新
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-white transition-colors">キャンセル</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 text-xs font-bold bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold-light)] transition-colors">
                <Save className="w-4 h-4" /> 保存する
              </button>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 mb-8 pb-8 border-b border-[var(--border)]">
              <div>
                <div className="inline-block font-mono-dm text-[11px] font-medium tracking-[0.15em] text-[var(--accent-gold)] bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/25 px-2.5 py-1 mb-3">
                  {form.ticker} · COMPOUNDER HUNTER
                </div>
                <h1 className="font-serif-display text-4xl text-white tracking-tight leading-tight mb-2">{form.name}</h1>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {form.sector} · 分析日: {analysis?.lastAnalyzed || '未分析'}
                </div>
              </div>
              {analysis && (
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-muted)] mb-2 uppercase">投資シグナル</div>
                  <div className={`font-mono-dm text-[15px] font-medium tracking-wide px-4 py-2 border-[1.5px] inline-block ${getSignalStyle(analysis.investmentSignal)}`}>
                    {analysis.investmentSignal}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-6 mb-10 rounded-lg">
              <div className="text-xs font-bold text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                <span className="w-4 h-4 flex items-center justify-center border border-[var(--accent-gold)] text-[var(--accent-gold)] text-[8px]">P</span>保有状況
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-4 md:col-span-2 flex gap-4">
                  <label className="flex-1">
                    <span className="block text-[11px] text-[var(--text-secondary)] mb-1">保有株数</span>
                    <input type="number" value={form.shares ?? ''} onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-white font-mono-dm text-lg px-3 py-2 outline-none focus:border-[var(--accent-gold)]" placeholder="0" />
                  </label>
                  <label className="flex-1">
                    <span className="block text-[11px] text-[var(--text-secondary)] mb-1">平均取得単価 ($)</span>
                    <input type="number" value={form.avgCost ?? ''} onChange={(e) => setForm({ ...form, avgCost: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] border border-[var(--border)] text-white font-mono-dm text-lg px-3 py-2 outline-none focus:border-[var(--accent-gold)]" placeholder="0.00" />
                  </label>
                  <label className="flex-1 relative">
                    <span className="block text-[11px] text-[var(--text-secondary)] mb-1">現在株価 ($)</span>
                    <input type="number" value={form.currentPrice ?? ''} readOnly className="w-full bg-[var(--bg-primary)] border border-[var(--accent-blue)]/30 text-[var(--accent-blue-light)] font-mono-dm text-lg px-3 py-2 outline-none opacity-80 cursor-not-allowed" placeholder="0.00" />
                    {isFetchingPrice && <RefreshCw className="absolute right-3 top-8 w-4 h-4 text-[var(--accent-blue)] animate-spin" />}
                  </label>
                </div>
                {shares > 0 && (
                  <div className="md:col-span-2 flex justify-between items-center bg-[var(--bg-primary)] border border-[var(--border)] px-6 py-2 rounded">
                    <div>
                      <div className="text-[11px] text-[var(--text-muted)]">評価額</div>
                      <div className="font-mono-dm text-xl text-white">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[var(--text-muted)]">含み損益</div>
                      <div className={`font-mono-dm text-xl ${isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                        {isProfit ? '+' : ''}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-sm ml-2">({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!analysis ? (
              <div className="py-20 text-center border border-dashed border-[var(--border-light)] rounded-lg">
                <AlertTriangle className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
                <p className="text-sm text-[var(--text-secondary)] tracking-wider">分析データがありません</p>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in duration-500">

                <div className="bg-[var(--bg-card)] border border-[var(--border)] p-6 md:p-8 flex flex-wrap items-center gap-8 rounded-lg">
                  <div className="text-center">
                    <div className="font-mono-dm text-5xl font-light text-[var(--accent-gold-light)] leading-none">{analysis.fundamentalScore}<span className="text-lg text-[var(--text-muted)]">/90</span></div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-2 tracking-widest">ファンダメンタル・スコア</div>
                  </div>
                  <div className="w-14 h-14 flex items-center justify-center font-serif-display text-3xl bg-[var(--accent-green-dark)]/10 border-2 border-[var(--accent-green-dark)] text-[var(--accent-green)]">
                    {analysis.fundamentalGrade}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-[11px] text-[var(--text-muted)] tracking-widest mb-2">評価進行度</div>
                    <div className="h-1.5 bg-[var(--bg-hover)] rounded-sm overflow-hidden mb-1.5">
                      <div className="h-full bg-gradient-to-r from-[var(--accent-green-dark)] to-[var(--accent-gold)]" style={{ width: `${(analysis.fundamentalScore / 90) * 100}%` }} />
                    </div>
                    <div className="flex justify-between font-mono-dm text-[10px] text-[var(--text-muted)]">
                      <span>D</span><span>C</span><span>B</span><span className="text-[var(--accent-gold)]">A</span><span>S</span>
                    </div>
                  </div>
                  <div className="text-center border-l border-[var(--border)] pl-8">
                    <div className="font-mono-dm text-lg font-medium text-[var(--text-primary)] mb-1">{analysis.aiClassification}</div>
                    <div className="text-[11px] text-[var(--text-muted)] tracking-widest">AI クラス分類</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono-dm text-[10px] text-[var(--accent-gold)] tracking-widest border border-[var(--accent-gold)]/30 px-2 py-0.5">PHASE 1</span>
                      <span className="text-xs text-[var(--text-secondary)] font-bold">クオリティ</span>
                      <span className="ml-auto font-mono-dm text-xs text-[var(--text-muted)]">{analysis.scoreBreakdown.quality} / 30点</span>
                    </div>
                    <div className="ch-card gold">
                      <div className="font-mono-dm text-3xl text-white mb-1">{analysis.scoreBreakdown.quality}</div>
                      <DotBar score={Math.floor((analysis.scoreBreakdown.quality / 30) * 10)} max={10} color="gold" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono-dm text-[10px] text-[var(--accent-gold)] tracking-widest border border-[var(--accent-gold)]/30 px-2 py-0.5">PHASE 2</span>
                      <span className="text-xs text-[var(--text-secondary)] font-bold">AI 影響度</span>
                      <span className="ml-auto font-mono-dm text-xs text-[var(--text-muted)]">{analysis.scoreBreakdown.aiImpact} / 20点</span>
                    </div>
                    <div className="ch-card blue">
                      <div className="font-mono-dm text-3xl text-[var(--accent-blue-light)] mb-1">{analysis.scoreBreakdown.aiImpact}</div>
                      <DotBar score={Math.floor((analysis.scoreBreakdown.aiImpact / 20) * 10)} max={10} color="blue" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono-dm text-[10px] text-[var(--accent-gold)] tracking-widest border border-[var(--accent-gold)]/30 px-2 py-0.5">PHASE 3</span>
                      <span className="text-xs text-[var(--text-secondary)] font-bold">複利効果・再投資</span>
                      <span className="ml-auto font-mono-dm text-xs text-[var(--text-muted)]">{analysis.scoreBreakdown.compounding} / 20点</span>
                    </div>
                    <div className="ch-card green">
                      <div className="font-mono-dm text-3xl text-[var(--accent-green)] mb-1">{analysis.scoreBreakdown.compounding}</div>
                      <DotBar score={Math.floor((analysis.scoreBreakdown.compounding / 20) * 10)} max={10} color="green" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono-dm text-[10px] text-[var(--accent-gold)] tracking-widest border border-[var(--accent-gold)]/30 px-2 py-0.5">PHASE 4</span>
                      <span className="text-xs text-[var(--text-secondary)] font-bold">ユニット・エコノミクス</span>
                      <span className="ml-auto font-mono-dm text-xs text-[var(--text-muted)]">{analysis.scoreBreakdown.unitEcon} / 20点</span>
                    </div>
                    <div className="ch-card purple">
                      <div className="font-mono-dm text-3xl text-[var(--accent-purple)] mb-1">{analysis.scoreBreakdown.unitEcon}</div>
                      <DotBar score={Math.floor((analysis.scoreBreakdown.unitEcon / 20) * 10)} max={10} color="purple" />
                    </div>
                  </div>
                </div>

                {renderValuationGauge()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="ch-card gold">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] mb-3">投資テーゼ</div>
                    <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{form.thesis}</div>
                  </div>
                  <div className="ch-card red" style={{ borderTop: '2px solid var(--accent-red)' }}>
                    <div className="text-[11px] font-bold text-[var(--accent-red)] mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> 最大のリスク / 売却トリガー</div>
                    <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{form.sellTriggers}</div>
                  </div>
                </div>

                {analysis.rawReport && (
                  <div className="mt-8 pt-8 border-t border-[var(--border)]">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] mb-4">抽出元の生レポート (RAW REPORT)</div>
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-6 font-mono-dm text-[12px] text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto rounded-lg">
                      {analysis.rawReport}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showImport && <ImportReportModal holding={holding} onClose={() => setShowImport(false)} onSave={handleAnalysisSave} />}
    </div>
  );
}
