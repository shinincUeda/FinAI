import type {
  EthCandle, TechnicalIndicators, SignalResult, RiskMetrics,
  TradingSignal, BayesStep, GuardrailCheck, TradingConfig,
} from '../types';

// ─── Helper ───
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ─── EMA / SMA ───
function ema(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    result.push(closes[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function sma(closes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      result.push(mean(closes.slice(i - period + 1, i + 1)));
    }
  }
  return result;
}

// ─── RSI (14) ───
export function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ─── MACD (12, 26, 9) ───
export function calcMACD(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const last = closes.length - 1;
  return {
    macd: macdLine[last],
    signal: signalLine[last],
    histogram: macdLine[last] - signalLine[last],
  };
}

// ─── Bollinger Bands (20, 2σ) ───
export function calcBollingerBands(closes: number[], period = 20, mult = 2) {
  const smaArr = sma(closes, period);
  const last = closes.length - 1;
  const middle = smaArr[last];
  const slice = closes.slice(last - period + 1, last + 1);
  const sd = stdDev(slice);
  return { upper: middle + mult * sd, middle, lower: middle - mult * sd };
}

// ─── 全指標の一括計算 ───
export function calcAllIndicators(candles: EthCandle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const ema20Arr = ema(closes, 20);
  const ema50Arr = ema(closes, 50);
  const last = closes.length - 1;
  return {
    rsi: calcRSI(closes),
    macd: calcMACD(closes),
    bollingerBands: calcBollingerBands(closes),
    ema20: ema20Arr[last],
    ema50: ema50Arr[last],
  };
}

// ═══════════════════════════════════════════════════════════════
// 3.2. ベイズ更新 (Bayes Update)
//   P(H|E) = P(E|H) · P(H) / P(E)
//   各テクニカル指標を「証拠 E」として逐次的に確率を更新
// ═══════════════════════════════════════════════════════════════

interface IndicatorEvidence {
  source: string;
  likelihood: number;   // P(E|H): 上昇仮説が正しい場合にこのシグナルが出る確率
  marginal: number;     // P(E): このシグナルが出る一般的な確率
}

function bayesUpdate(prior: number, evidence: IndicatorEvidence): { posterior: number; step: BayesStep } {
  // P(H|E) = P(E|H) · P(H) / P(E)
  const posterior = (evidence.likelihood * prior) / evidence.marginal;
  const clamped = Math.max(0.05, Math.min(0.95, posterior));
  return {
    posterior: clamped,
    step: {
      source: evidence.source,
      priorP: prior,
      likelihood: evidence.likelihood,
      evidence: evidence.marginal,
      posteriorP: clamped,
    },
  };
}

function buildEvidenceFromIndicators(
  indicators: TechnicalIndicators,
  currentPrice: number,
): IndicatorEvidence[] {
  const evidences: IndicatorEvidence[] = [];
  const rsi = indicators.rsi;

  // RSI → 証拠
  if (rsi < 30) {
    evidences.push({ source: `RSI 過売り (${rsi.toFixed(1)})`, likelihood: 0.75, marginal: 0.50 });
  } else if (rsi < 40) {
    evidences.push({ source: `RSI やや売られ (${rsi.toFixed(1)})`, likelihood: 0.60, marginal: 0.50 });
  } else if (rsi > 70) {
    evidences.push({ source: `RSI 過買い (${rsi.toFixed(1)})`, likelihood: 0.25, marginal: 0.50 });
  } else if (rsi > 60) {
    evidences.push({ source: `RSI やや買われ (${rsi.toFixed(1)})`, likelihood: 0.40, marginal: 0.50 });
  } else {
    evidences.push({ source: `RSI ニュートラル (${rsi.toFixed(1)})`, likelihood: 0.50, marginal: 0.50 });
  }

  // MACD → 証拠
  if (indicators.macd.histogram > 0) {
    evidences.push({ source: 'MACD 買いクロス', likelihood: 0.65, marginal: 0.48 });
  } else {
    evidences.push({ source: 'MACD 売りクロス', likelihood: 0.35, marginal: 0.52 });
  }

  // Bollinger Bands → 証拠
  const bbRange = indicators.bollingerBands.upper - indicators.bollingerBands.lower;
  const bbPos = (currentPrice - indicators.bollingerBands.lower) / bbRange;
  if (bbPos < 0.1) {
    evidences.push({ source: 'BB 下限突破', likelihood: 0.72, marginal: 0.48 });
  } else if (bbPos > 0.9) {
    evidences.push({ source: 'BB 上限突破', likelihood: 0.28, marginal: 0.48 });
  } else if (bbPos < 0.3) {
    evidences.push({ source: `BB 下位ゾーン (${(bbPos * 100).toFixed(0)}%)`, likelihood: 0.60, marginal: 0.50 });
  } else if (bbPos > 0.7) {
    evidences.push({ source: `BB 上位ゾーン (${(bbPos * 100).toFixed(0)}%)`, likelihood: 0.40, marginal: 0.50 });
  } else {
    evidences.push({ source: `BB 中央ゾーン (${(bbPos * 100).toFixed(0)}%)`, likelihood: 0.50, marginal: 0.50 });
  }

  // EMA クロス → 証拠
  if (indicators.ema20 > indicators.ema50) {
    evidences.push({ source: 'EMA20 > EMA50 (上昇トレンド)', likelihood: 0.62, marginal: 0.50 });
  } else {
    evidences.push({ source: 'EMA20 < EMA50 (下降トレンド)', likelihood: 0.38, marginal: 0.50 });
  }

  return evidences;
}

// ═══════════════════════════════════════════════════════════════
// シグナル生成（ベイズ更新ベース）
// ═══════════════════════════════════════════════════════════════

export function generateSignal(candles: EthCandle[], config?: TradingConfig): SignalResult {
  const indicators = calcAllIndicators(candles);
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const alpha = config?.kellyAlpha ?? 0.25;
  const edgeThreshold = config?.edgeThreshold ?? 0.04;

  // --- 3.2. ベイズ更新: 事前確率 P(H) = 0.5 ---
  const evidences = buildEvidenceFromIndicators(indicators, currentPrice);
  let pModel = 0.5;
  const bayesTrace: BayesStep[] = [];

  for (const ev of evidences) {
    const { posterior, step } = bayesUpdate(pModel, ev);
    pModel = posterior;
    bayesTrace.push(step);
  }

  // --- 3.3. Edge = p_model - p_market ---
  const pMarket = 0.5;
  const edge = pModel - pMarket;

  // --- 3.1. EV = p·b - (1-p) ---
  const b = 1;
  const ev = pModel * b - (1 - pModel);

  // --- 3.4. Kelly Criterion: f* = (p·b - q) / b ---
  const q = 1 - pModel;
  const kellyFull = (pModel * b - q) / b;
  const kellyFraction = Math.max(0, kellyFull * alpha) * 100;

  // --- シグナル判定 ---
  const reasons: string[] = bayesTrace.map(
    (s) => `${s.source}: P ${(s.priorP * 100).toFixed(0)}%→${(s.posteriorP * 100).toFixed(0)}%`
  );

  let signal: TradingSignal = 'watch';
  if (edge > edgeThreshold * 2) signal = 'strong_buy';
  else if (edge > edgeThreshold) signal = 'buy';
  else if (edge < -edgeThreshold * 2) signal = 'strong_sell';
  else if (edge < -edgeThreshold) signal = 'sell';

  return {
    signal,
    pModel,
    pMarket,
    edge,
    ev,
    kellyFull,
    kellyFraction,
    confidence: Math.min(1, Math.abs(edge) * 5),
    reasons,
    indicators,
    bayesTrace,
  };
}

// ═══════════════════════════════════════════════════════════════
// 3.5. VaR + Risk Metrics
// ═══════════════════════════════════════════════════════════════

export function calcRiskMetrics(candles: EthCandle[], config?: TradingConfig): RiskMetrics {
  const closes = candles.map((c) => c.close);
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  const mu = mean(returns);
  const sigma = stdDev(returns);
  const var95 = (mu - 1.645 * sigma) * closes[closes.length - 1];

  let peak = closes[0];
  let maxDD = 0;
  for (const price of closes) {
    if (price > peak) peak = price;
    const dd = (peak - price) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const annualReturn = mu * 365;
  const annualVol = sigma * Math.sqrt(365);
  const sharpeRatio = annualVol > 0 ? (annualReturn - 0.04) / annualVol : 0;

  const gains = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const losses = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const profitFactor = losses > 0 ? gains / losses : gains > 0 ? 999 : 0;

  return {
    var95,
    maxDrawdown: maxDD * 100,
    sharpeRatio,
    profitFactor,
    dailyVarLimit: config?.dailyVarLimit ?? 75000,
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. 実行ガードレール（5条件チェック）
// ═══════════════════════════════════════════════════════════════

export function checkGuardrails(
  signal: SignalResult,
  risk: RiskMetrics,
  config: TradingConfig,
  currentExposure: number,
  usdJpyRate = 150,
): GuardrailCheck {
  // config values are in JPY; exposure and var95 are in USD — convert to JPY
  const exposureJpy = currentExposure * usdJpyRate;
  const var95Jpy = risk.var95 * usdJpyRate;
  const kellyLimit = (signal.kellyFraction / 100) * config.bankroll; // already JPY

  const edgeCheck = {
    pass: Math.abs(signal.edge) > config.edgeThreshold,
    value: signal.edge,
    threshold: config.edgeThreshold,
  };

  const sizeCheck = {
    pass: kellyLimit > 0,
    value: kellyLimit,
    limit: kellyLimit,
  };

  const exposureCheck = {
    pass: exposureJpy <= config.maxExposure,
    current: exposureJpy,
    max: config.maxExposure,
  };

  const varCheck = {
    pass: Math.abs(var95Jpy) <= config.dailyVarLimit,
    var95: var95Jpy,
    dailyLimit: config.dailyVarLimit,
  };

  const drawdownCheck = {
    pass: risk.maxDrawdown < config.mddThreshold,
    mdd: risk.maxDrawdown,
    threshold: config.mddThreshold,
  };

  return {
    edgeCheck,
    sizeCheck,
    exposureCheck,
    varCheck,
    drawdownCheck,
    allPassed: edgeCheck.pass && sizeCheck.pass && exposureCheck.pass && varCheck.pass && drawdownCheck.pass,
  };
}

// ═══════════════════════════════════════════════════════════════
// チャート用データ
// ═══════════════════════════════════════════════════════════════

export function calcChartSeries(candles: EthCandle[]) {
  const closes = candles.map((c) => c.close);
  const ema20Arr = ema(closes, 20);
  const ema50Arr = ema(closes, 50);
  const sma20Arr = sma(closes, 20);

  return candles.map((c, i) => {
    const slice = i >= 19 ? closes.slice(i - 19, i + 1) : [];
    const sd = slice.length === 20 ? stdDev(slice) : 0;
    const mid = sma20Arr[i];
    return {
      time: c.time,
      date: new Date(c.time).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      close: c.close,
      open: c.open,
      high: c.high,
      low: c.low,
      volume: c.volume,
      ema20: ema20Arr[i],
      ema50: ema50Arr[i],
      bbUpper: isNaN(mid) ? undefined : mid + 2 * sd,
      bbMiddle: isNaN(mid) ? undefined : mid,
      bbLower: isNaN(mid) ? undefined : mid - 2 * sd,
    };
  });
}
