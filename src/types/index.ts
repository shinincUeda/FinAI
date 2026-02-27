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
