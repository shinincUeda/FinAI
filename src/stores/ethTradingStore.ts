import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EthCandle, EthTrade, SignalResult, SignalHistoryEntry,
  RiskMetrics, TradingConfig, GuardrailCheck,
} from '../types';

const STORAGE_KEY = 'ai-portfolio-eth-trading-v2';

const DEFAULT_CONFIG: TradingConfig = {
  bankroll: 1500000,      // 運用資金 ¥1,500,000
  maxExposure: 750000,    // 最大エクスポージャー ¥750,000
  dailyVarLimit: 75000,   // 1日VaR許容額 ¥75,000
  kellyAlpha: 0.25,       // 部分Kelly係数
  edgeThreshold: 0.04,    // 最小Edge閾値 4%
  mddThreshold: 8,        // MDD閾値 8%
};

interface EthTradingState {
  candles: EthCandle[];
  currentPrice: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  usdJpyRate: number;
  lastFetched: number | null;

  currentSignal: SignalResult | null;
  riskMetrics: RiskMetrics | null;
  guardrails: GuardrailCheck | null;

  // 永続化データ
  trades: EthTrade[];
  signalHistory: SignalHistoryEntry[];
  config: TradingConfig;

  // Actions
  setCandles: (candles: EthCandle[]) => void;
  setTickerData: (price: number, change: number, volume: number) => void;
  setUsdJpyRate: (rate: number) => void;
  setCurrentSignal: (signal: SignalResult) => void;
  setRiskMetrics: (metrics: RiskMetrics) => void;
  setGuardrails: (guardrails: GuardrailCheck) => void;
  addTrade: (trade: EthTrade) => void;
  removeTrade: (id: string) => void;
  addSignalHistory: (entry: SignalHistoryEntry) => void;
  updateConfig: (updates: Partial<TradingConfig>) => void;
  getCurrentExposure: () => number;
}

export const useEthTradingStore = create<EthTradingState>()(
  persist(
    (set, get) => ({
      candles: [],
      currentPrice: null,
      priceChange24h: null,
      volume24h: null,
      usdJpyRate: 150,
      lastFetched: null,
      currentSignal: null,
      riskMetrics: null,
      guardrails: null,
      trades: [],
      signalHistory: [],
      config: DEFAULT_CONFIG,

      setCandles: (candles) => set({ candles, lastFetched: Date.now() }),
      setTickerData: (price, change, volume) =>
        set({ currentPrice: price, priceChange24h: change, volume24h: volume }),
      setUsdJpyRate: (rate) => set({ usdJpyRate: rate }),
      setCurrentSignal: (signal) => set({ currentSignal: signal }),
      setRiskMetrics: (metrics) => set({ riskMetrics: metrics }),
      setGuardrails: (guardrails) => set({ guardrails }),
      addTrade: (trade) =>
        set((s) => ({ trades: [trade, ...s.trades] })),
      removeTrade: (id) =>
        set((s) => ({ trades: s.trades.filter((t) => t.id !== id) })),
      addSignalHistory: (entry) =>
        set((s) => ({
          signalHistory: [entry, ...s.signalHistory].slice(0, 365),
        })),
      updateConfig: (updates) =>
        set((s) => ({ config: { ...s.config, ...updates } })),
      getCurrentExposure: () => {
        const { trades, currentPrice } = get();
        if (!currentPrice) return 0;
        // 未決済の買いポジションの合計額
        const totalBought = trades.filter((t) => t.type === 'buy').reduce((s, t) => s + t.amount, 0);
        const totalSold = trades.filter((t) => t.type === 'sell').reduce((s, t) => s + t.amount, 0);
        return Math.max(0, totalBought - totalSold) * currentPrice;
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        trades: state.trades,
        signalHistory: state.signalHistory,
        config: state.config,
      }),
    }
  )
);
