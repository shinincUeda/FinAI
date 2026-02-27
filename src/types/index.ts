// --- 追加: Compounder Hunterの分析データ型 ---
export interface ScoreBreakdown {
  quality: number;      // max 30
  aiImpact: number;     // max 20
  compounding: number;  // max 20
  unitEcon: number;     // max 20
}

export interface CompounderAnalysis {
  fundamentalScore: number; // 0-100
  fundamentalGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  aiClassification: 'Sovereign' | 'Fuel' | 'Adopter' | 'Victim' | 'Unclassified';
  valuationStatus: '割安' | '適正' | '割高' | '未評価';
  fairValue: {
    base: number;
    bull: number;
    bear: number;
  };
  investmentSignal: 'Strong Buy' | 'Buy on Dip' | 'Watch' | 'Sell' | 'None';
  scoreBreakdown: ScoreBreakdown;
  lastAnalyzed: string; // YYYY-MM-DD
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
  shares?: number;
  avgCost?: number;
  currentPrice?: number;
  notes: string;
  lastUpdated: string;
  analysis?: CompounderAnalysis; // ← 追加: 解析結果を保存
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
