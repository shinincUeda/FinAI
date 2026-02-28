// --- 分析履歴エントリ ---
export interface AnalysisHistoryEntry {
  id: string;
  date: string;           // ISO date string
  rawText: string;        // 貼り付けたAI分析テキスト（元文）
  comment: string;        // ユーザーのメモ・コメント
  parsedAnalysis?: CompounderAnalysis; // Geminiが解析した構造データ（任意）
}

// --- 追加: Compounder Hunterの分析データ型 ---
export interface ScoreBreakdown {
  quality: number;      // max 30
  aiImpact: number;     // max 20
  compounding: number;  // max 20
  unitEcon: number;     // max 20
}

export interface CompounderAnalysis {
  fundamentalScore: number; // 0-90
  fundamentalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  aiClassification: 'Sovereign' | 'Fuel & Infra' | 'Adopter' | 'At Risk' | 'Unclassified';
  valuationStatus: '◎' | '○' | '△' | '▲' | '×' | '未評価';
  valuationLabel: string; // 例: "適正"、"割安" など
  fairValue: {
    base: number;
    bull: number;
    bear: number;
  };
  entryZone?: { min: number; max: number; }; // エントリーレンジ（AIがレポートから抽出）
  investmentSignal: 'Strong Buy' | 'Buy' | 'Buy on Dip' | 'Watch' | 'Sell' | 'None';
  scoreBreakdown: ScoreBreakdown;
  lastAnalyzed: string;
  rawReport?: string; // レポート全文を保存
}
// ------------------------------------------

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  sector: 'ai-infra' | 'hyperscaler' | 'ai-drug' | 'energy' | 'fintech' | 'robotics' | 'other';
  aiAlignmentScore: 1 | 2 | 3 | 4 | 5;
  thesis: string;
  sellTriggers: string;
  watchMetrics: string;
  status: 'core' | 'monitor' | 'reduce' | 'sell';
  shares?: number;      // 特定口座 保有株数
  avgCost?: number;     // 特定口座 平均取得単価
  sharesNisa?: number;  // 成長投資枠 保有株数
  avgCostNisa?: number; // 成長投資枠 平均取得単価
  currentPrice?: number;
  notes: string;
  lastUpdated: string;
  analysis?: CompounderAnalysis; // ← 追加: 解析結果を保存
  analysisHistory?: AnalysisHistoryEntry[]; // ← 分析履歴
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  tier: 1 | 2 | 3;
  category: string;
  thesis: string;
  targetPrice: number;
  currentPrice?: number;
  priority: 1 | 2 | 3 | 4 | 5;
  notes: string;
  analysis?: CompounderAnalysis; // ← 追加: 解析結果を保存
  analysisHistory?: AnalysisHistoryEntry[]; // ← 分析履歴
}

export interface Alert {
  id: string;
  type: 'buy' | 'sell' | 'market' | 'event';
  ticker: string;
  condition: string;
  triggerValue: string;
  action: string;
  isActive: boolean;
  triggeredAt?: string;
  notes: string;
}

export interface WeeklyReport {
  id: string;
  date: string;
  content: string;
  worldviewStatus: 'accelerating' | 'normal' | 'decelerating';
  actions: string[];
}

export interface Settings {
  claudeApiKey: string;
  stockApiKey: string;
  currency: 'USD' | 'JPY';
}

export type Page = 'dashboard' | 'thesis' | 'watchlist' | 'alerts' | 'reports' | 'settings';
