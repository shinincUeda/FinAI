import { useEffect, useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useEthTradingStore } from '../../stores/ethTradingStore';
import { fetchEthCandles, fetchEth24hr, fetchUsdJpyRate } from '../../lib/ethApi';
import { generateSignal, calcRiskMetrics, checkGuardrails } from '../../lib/technicalIndicators';
import { PriceHeader } from './PriceHeader';
import { SignalPanel } from './SignalPanel';
import { PriceChart } from './PriceChart';
import { IndicatorCards } from './IndicatorCards';
import { RiskMetrics } from './RiskMetrics';
import { GuardrailPanel } from './GuardrailPanel';
import { TradeLog } from './TradeLog';
import { TradingConfigPanel } from './TradingConfigPanel';
import { VerdictPanel } from './VerdictPanel';

export function EthTradingPage() {
  const store = useEthTradingStore();
  const {
    candles, currentPrice, priceChange24h, volume24h, lastFetched,
    currentSignal, riskMetrics, guardrails, config, usdJpyRate,
    setCandles, setTickerData, setUsdJpyRate, setCurrentSignal, setRiskMetrics,
    setGuardrails, addSignalHistory, getCurrentExposure,
  } = store;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeSignalsAndGuardrails = useCallback((candleData: typeof candles) => {
    if (candleData.length < 50) return;

    const signal = generateSignal(candleData, config);
    setCurrentSignal(signal);

    const risk = calcRiskMetrics(candleData, config);
    setRiskMetrics(risk);

    const exposure = getCurrentExposure();
    const { usdJpyRate: rate } = useEthTradingStore.getState();
    const checks = checkGuardrails(signal, risk, config, exposure, rate);
    setGuardrails(checks);

    return { signal, risk };
  }, [config, setCurrentSignal, setRiskMetrics, setGuardrails, getCurrentExposure]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [candleData, ticker, jpyRate] = await Promise.all([
        fetchEthCandles(120),
        fetchEth24hr(),
        fetchUsdJpyRate(),
      ]);

      setCandles(candleData);
      setTickerData(ticker.lastPrice, ticker.priceChangePercent, ticker.quoteVolume);
      setUsdJpyRate(jpyRate);

      const result = computeSignalsAndGuardrails(candleData);

      // シグナル履歴（1日1回）
      if (result) {
        const today = new Date().toISOString().slice(0, 10);
        const { signalHistory } = useEthTradingStore.getState();
        if (!signalHistory.some((h) => h.date === today)) {
          addSignalHistory({
            date: today,
            signal: result.signal.signal,
            price: ticker.lastPrice,
            edge: result.signal.edge,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [setCandles, setTickerData, setUsdJpyRate, computeSignalsAndGuardrails, addSignalHistory]);

  // 初回ロード
  useEffect(() => {
    const now = Date.now();
    if (lastFetched && now - lastFetched < 5 * 60 * 1000 && candles.length > 0) {
      if (!currentSignal && candles.length >= 50) {
        computeSignalsAndGuardrails(candles);
      }
      return;
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // config変更時にガードレール再計算
  useEffect(() => {
    if (candles.length >= 50 && currentSignal) {
      computeSignalsAndGuardrails(candles);
    }
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5分間隔更新
  useEffect(() => {
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">$ETH トレーディング</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            ベイズ更新 + エッジ検出 + ケリー基準
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors px-3 py-1.5 rounded disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '更新中...' : 'データ更新'}
        </button>
      </div>

      {error && (
        <div className="ch-card red">
          <p className="text-xs text-[var(--accent-red)] font-mono">{error}</p>
        </div>
      )}

      {/* Price + Signal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <PriceHeader
            price={currentPrice}
            change24h={priceChange24h}
            volume24h={volume24h}
            lastFetched={lastFetched}
            usdJpyRate={usdJpyRate}
          />
        </div>
        <SignalPanel signal={currentSignal} />
      </div>

      {/* Guardrails */}
      <GuardrailPanel guardrails={guardrails} />

      {/* Chart */}
      <PriceChart candles={candles} />

      {/* Indicators */}
      <IndicatorCards
        indicators={currentSignal?.indicators ?? null}
        currentPrice={currentPrice}
        usdJpyRate={usdJpyRate}
      />

      {/* Risk */}
      <RiskMetrics metrics={riskMetrics} usdJpyRate={usdJpyRate} />

      {/* Config + Trade Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <TradingConfigPanel />
        <div className="lg:col-span-2">
          <TradeLog />
        </div>
      </div>

      {/* Verdict */}
      <VerdictPanel
        signal={currentSignal}
        risk={riskMetrics}
        guardrails={guardrails}
        bankroll={config.bankroll}
      />
    </div>
  );
}
