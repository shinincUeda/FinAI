// src/lib/stockApi.ts

export async function fetchCompanyProfile(ticker: string, apiKey: string): Promise<{ name: string } | null> {
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.name) return { name: data.name };
    return null;
  } catch {
    return null;
  }
}

export async function fetchCurrentPrice(ticker: string, apiKey: string): Promise<number | null> {
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.c !== undefined && data.c !== 0) return data.c;
    return null;
  } catch (error) {
    return null;
  }
}

export interface HistoricalPricePoint {
  date: string;
  price: number;
}

function generateMockData(targetPrice: number): HistoricalPricePoint[] {
  const data: HistoricalPricePoint[] = [];
  let price = targetPrice * 0.8;
  for (let i = 180; i > 0; i -= 3) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    price = price * (1 + (Math.random() - 0.45) * 0.04);
    data.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      price: Number(price.toFixed(2)),
    });
  }
  data.push({ date: '現在', price: Number(targetPrice.toFixed(2)) });
  return data;
}

export interface HistoricalPriceResult {
  data: HistoricalPricePoint[];
  isMock: boolean;
}

export async function fetchHistoricalPrices(
  ticker: string,
  apiKey: string,
  currentPriceFallback: number
): Promise<HistoricalPriceResult> {
  if (!apiKey) {
    console.warn('APIキー未設定のため、チャートにダミーデータを表示します。');
    return { data: generateMockData(currentPriceFallback), isMock: true };
  }

  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 180 * 24 * 60 * 60;

    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${apiKey}`
    );
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();

    console.log(`[Finnhub Chart Data - ${ticker}]:`, data);

    if (data.s === 'ok' && data.c && data.t) {
      const chartData: HistoricalPricePoint[] = data.t.map((timestamp: number, index: number) => {
        const d = new Date(timestamp * 1000);
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          price: Number(Number(data.c[index]).toFixed(2)),
        };
      });

      if (chartData.length > 60) {
        const step = Math.ceil(chartData.length / 60);
        const thinned = chartData.filter((_, idx) => idx % step === 0);
        return { data: thinned, isMock: false };
      }
      return { data: chartData, isMock: false };
    }

    if (data.s === 'no_data') {
      console.warn(
        `[⚠️ 警告] ${ticker} の過去データがFinnhubにありません。無料枠で非対応の銘柄（ETFなど）の可能性があります。`
      );
      return { data: generateMockData(currentPriceFallback), isMock: true };
    }

    return { data: generateMockData(currentPriceFallback), isMock: true };
  } catch (error) {
    console.error(`[🚨 エラー] ${ticker} の過去データ取得に失敗しました:`, error);
    return { data: generateMockData(currentPriceFallback), isMock: true };
  }
}
