import type { EthCandle } from '../types';

const BINANCE_BASE = 'https://api.binance.com/api/v3';

export interface Eth24hrTicker {
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;        // ETH volume
  quoteVolume: number;   // USDT volume
}

/** 日足OHLCVデータ取得（最大120日分） */
export async function fetchEthCandles(days = 120): Promise<EthCandle[]> {
  const res = await fetch(
    `${BINANCE_BASE}/klines?symbol=ETHUSDT&interval=1d&limit=${days}`
  );
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  const data: unknown[][] = await res.json();

  return data.map((k) => ({
    time: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

/** 24時間ティッカー取得 */
export async function fetchEth24hr(): Promise<Eth24hrTicker> {
  const res = await fetch(
    `${BINANCE_BASE}/ticker/24hr?symbol=ETHUSDT`
  );
  if (!res.ok) throw new Error(`Binance 24hr error: ${res.status}`);
  const d = await res.json();

  return {
    lastPrice: parseFloat(d.lastPrice),
    priceChangePercent: parseFloat(d.priceChangePercent),
    highPrice: parseFloat(d.highPrice),
    lowPrice: parseFloat(d.lowPrice),
    volume: parseFloat(d.volume),
    quoteVolume: parseFloat(d.quoteVolume),
  };
}

/** USD/JPY レート取得（Binance USDT/JPY） */
export async function fetchUsdJpyRate(): Promise<number> {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/price?symbol=USDTJPY`);
    if (res.ok) {
      const d = await res.json();
      return parseFloat(d.price);
    }
  } catch { /* fallback */ }
  // Binance に USDTJPY が無い場合のフォールバック
  return 150; // デフォルトレート
}
