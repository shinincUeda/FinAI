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
  entryNote?: string;                         // エントリーポイント根拠・メモ（ユーザー記入）
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

export type Page = 'dashboard' | 'thesis' | 'watchlist' | 'alerts' | 'reports' | 'settings' | 'eth-trading';

// --- ETH トレーディング ---

export interface EthCandle {
  time: number;       // Unix timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  ema20: number;
  ema50: number;
}

export type TradingSignal = 'strong_buy' | 'buy' | 'watch' | 'sell' | 'strong_sell';

export interface SignalResult {
  signal: TradingSignal;
  pModel: number;          // システム予測確率
  pMarket: number;         // 市場示唆確率
  edge: number;            // p_model - p_market
  ev: number;              // 期待値 EV = p·b - (1-p)
  kellyFull: number;       // フルKelly f*
  kellyFraction: number;   // 部分Kelly f = α·f* (%)
  confidence: number;
  reasons: string[];
  indicators: TechnicalIndicators;
  bayesTrace: BayesStep[]; // ベイズ更新の履歴
}

// ベイズ更新の各ステップ
export interface BayesStep {
  source: string;          // 証拠ソース名 (RSI, MACD, etc.)
  priorP: number;          // 事前確率 P(H)
  likelihood: number;      // 尤度 P(E|H)
  evidence: number;        // 証拠確率 P(E)
  posteriorP: number;      // 事後確率 P(H|E)
}

export interface RiskMetrics {
  var95: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  dailyVarLimit: number;   // 1日VaR許容額
}

// 実行ガードレール5条件
export interface GuardrailCheck {
  edgeCheck: { pass: boolean; value: number; threshold: number };
  sizeCheck: { pass: boolean; value: number; limit: number };
  exposureCheck: { pass: boolean; current: number; max: number };
  varCheck: { pass: boolean; var95: number; dailyLimit: number };
  drawdownCheck: { pass: boolean; mdd: number; threshold: number };
  allPassed: boolean;
}

// トレーディング設定
export interface TradingConfig {
  bankroll: number;           // 運用資金 (USD)
  maxExposure: number;        // 最大エクスポージャー (USD)
  dailyVarLimit: number;      // 1日VaR許容額 (USD)
  kellyAlpha: number;         // 部分Kelly係数 (0-1)
  edgeThreshold: number;      // 最小Edge閾値
  mddThreshold: number;       // MDD閾値 (%)
}

export interface EthTrade {
  id: string;
  date: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  signalAtTime: TradingSignal;
  notes: string;
  pnl?: number;
}

export interface SignalHistoryEntry {
  date: string;
  signal: TradingSignal;
  price: number;
  edge: number;
}
