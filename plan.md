# $ETH トレーディング機能 — 実装計画

## 概要

添付資料の Prediction Market Trading Bot の手法（Edge Detection, Kelly Criterion, Risk Management）を応用し、
ETH/USDT のエントリー・売却タイミングを自動判定する機能を追加する。

## API選定

### 価格データ: **Binance Public API**（無料・APIキー不要）
- `GET https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1d&limit=120` — 日足OHLCV（120日分）
- `GET https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT` — 24時間統計
- レート制限: 1200 req/min（十分余裕）
- CORSあり、ブラウザから直接呼び出し可能
- 仮想通貨なので24/365稼働、市場時間の制約なし

※ CoinGeckoは最近無料枠の制限が厳しくなったためBinanceを選択

## シグナル生成ロジック（添付資料ベース）

### テクニカル指標（クライアント側で計算）
1. **RSI (14日)** — 過売（<30）= 買い / 過買（>70）= 売り
2. **MACD (12/26/9)** — クロスオーバーで売買シグナル
3. **ボリンジャーバンド (20日, 2σ)** — バンド下抜け=買い / 上抜け=売り
4. **EMA クロス (20/50)** — ゴールデンクロス=買い / デッドクロス=売り

### Edge Detection（添付資料の手法を適用）
```
各指標が「上昇」を示す確率 → p_model（加重平均）
p_market = 0.5（ランダムウォーク仮定）
edge = p_model − p_market
→ edge > 0.04 の場合のみシグナル発信
```

### Position Sizing（Kelly Criterion）
```
f* = (p · b − q) / b    （フルKelly）
f  = α · f*              （Fractional Kelly, α = 0.25）
→ 推奨ポジションサイズ（%）を表示
```

### Risk Management
```
VaR (95%) = μ − 1.645 · σ     （1日の最大損失推定）
MDD = (Peak − Trough) / Peak   （最大ドローダウン）
→ MDD > 8% なら新規エントリー非推奨フラグ
```

### 最終シグナル
- **Strong Buy** 🟢: edge > 0.08 & RSI < 35 & ボリンジャー下限以下
- **Buy** 🔵: edge > 0.04 & 2つ以上の指標が買い
- **Watch** 🟡: edge 0〜0.04 or シグナル混在
- **Sell** 🔴: edge < -0.04 & 2つ以上の指標が売り
- **Strong Sell** ⚫: edge < -0.08 & RSI > 65 & ボリンジャー上限以上

## UI設計

### ページレイアウト（3カラム構成）

```
┌─────────────────────────────────────────────────────┐
│  $ETH トレーディング                                    │
├─────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌─────────────────────────────┐   │
│ │ 現在価格       │ │ シグナルパネル               │   │
│ │ $2,450.30     │ │ 🟢 Strong Buy               │   │
│ │ +3.2% (24h)   │ │ edge: +0.12 | Kelly: 8.5%  │   │
│ │ Vol: 12.5B    │ │ "RSI過売+BB下限突破"          │   │
│ └───────────────┘ └─────────────────────────────┘   │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 価格チャート（Recharts AreaChart, 90日）          │ │
│ │ + ボリンジャーバンド + EMA20/50 オーバーレイ       │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌────────────────┐  │
│ │ RSI (14)    │ │ MACD        │ │ リスク指標      │  │
│ │ 28.5 🟢     │ │ Signal: 買い │ │ VaR: -$120    │  │
│ │ [ゲージ]    │ │ [チャート]   │ │ MDD: 5.2%     │  │
│ │             │ │              │ │ Sharpe: 1.8   │  │
│ └─────────────┘ └─────────────┘ └────────────────┘  │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ トレードログ（手動記録）                            │ │
│ │ 日付 | 売買 | 価格 | 数量 | シグナル | 損益        │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## ファイル構成

### 新規作成
```
src/
├─ components/ethTrading/
│  ├─ EthTradingPage.tsx       # メインページ
│  ├─ PriceHeader.tsx          # 現在価格 + 24h変動
│  ├─ SignalPanel.tsx          # 売買シグナル表示
│  ├─ PriceChart.tsx           # 価格チャート（BB+EMA付き）
│  ├─ IndicatorCards.tsx       # RSI / MACD / ボリンジャー表示
│  ├─ RiskMetrics.tsx          # VaR / MDD / Sharpe / Kelly
│  └─ TradeLog.tsx             # 手動トレード記録
├─ stores/
│  └─ ethTradingStore.ts       # ETHデータ + トレード履歴
├─ lib/
│  ├─ ethApi.ts                # Binance API呼び出し
│  └─ technicalIndicators.ts   # RSI/MACD/BB/EMA計算 + シグナル生成
```

### 変更するファイル
```
src/types/index.ts             # Page型にeth-tradingを追加 + ETH関連型定義
src/components/layout/Sidebar.tsx  # $ETHトレーディング メニュー追加
src/App.tsx                    # EthTradingPage のルーティング追加
```

## データモデル

```typescript
// ETH OHLCV データ
interface EthCandle {
  time: number;       // Unix timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// テクニカル指標の計算結果
interface TechnicalIndicators {
  rsi: number;                    // 0-100
  macd: { macd: number; signal: number; histogram: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  ema20: number;
  ema50: number;
  sma20: number;
}

// トレーディングシグナル
type TradingSignal = 'strong_buy' | 'buy' | 'watch' | 'sell' | 'strong_sell';

interface SignalResult {
  signal: TradingSignal;
  edge: number;                   // p_model - p_market
  confidence: number;             // 0-1
  kellyFraction: number;          // 推奨ポジションサイズ (%)
  reasons: string[];              // シグナル根拠
  indicators: TechnicalIndicators;
}

// リスク指標
interface RiskMetrics {
  var95: number;                  // Value at Risk (95%)
  maxDrawdown: number;            // 最大ドローダウン (%)
  sharpeRatio: number;
  profitFactor: number;
  brierScore: number;             // シグナル精度
}

// トレード記録（手動入力）
interface EthTrade {
  id: string;
  date: string;                   // ISO date
  type: 'buy' | 'sell';
  price: number;                  // USD
  amount: number;                 // ETH
  signalAtTime: TradingSignal;    // 取引時のシグナル
  notes: string;
  pnl?: number;                   // 確定損益（売却時に計算）
}

// シグナル履歴（自動記録）
interface SignalHistory {
  date: string;
  signal: TradingSignal;
  price: number;
  edge: number;
  actualOutcome?: 'up' | 'down';  // 翌日の結果（Brier Score算出用）
}
```

## 実装ステップ

### Step 1: 基盤（型定義 + API + 指標計算）
1. `types/index.ts` に ETH関連の型を追加、Page型に `'eth-trading'` を追加
2. `lib/ethApi.ts` — Binance API からOHLCVデータ取得
3. `lib/technicalIndicators.ts` — RSI/MACD/BB/EMA 計算ロジック + シグナル生成

### Step 2: ストア + ルーティング
4. `stores/ethTradingStore.ts` — キャンドルデータ、シグナル履歴、トレード記録を管理
5. `Sidebar.tsx` — メニューに「$ETH トレーディング」追加（TrendingUp アイコン）
6. `App.tsx` — ルーティングに EthTradingPage を追加

### Step 3: UIコンポーネント
7. `EthTradingPage.tsx` — メインページ（データ取得 + 子コンポーネント配置）
8. `PriceHeader.tsx` — 現在価格 / 24h変動 / 出来高
9. `SignalPanel.tsx` — 売買シグナル（色付きバッジ + edge + Kelly表示）
10. `PriceChart.tsx` — Recharts で価格チャート + BB + EMA オーバーレイ
11. `IndicatorCards.tsx` — RSI ゲージ + MACD チャート + BB状態
12. `RiskMetrics.tsx` — VaR / MDD / Sharpe / Profit Factor / Brier Score
13. `TradeLog.tsx` — トレード記録の一覧 + 新規追加フォーム

## 検討事項・確認事項

### APIに関して
- **Binance API** は日本からもアクセス可能（公開エンドポイントはAPIキー不要）
- 新規APIキーの設定は **不要**
- 1日1回の確認であれば無料枠で十分すぎる

### 将来の拡張性
- `technicalIndicators.ts` は純粋関数で設計 → 他のティッカーにも再利用可能
- `ethApi.ts` のインターフェースを抽象化 → 将来的に株式APIにも同じシグナルロジックを適用可能
- トレードログの損益計算 → 自動売買移行時のパフォーマンス評価基盤になる
- シグナル履歴 → Brier Scoreでモデル精度を追跡し、改善可能
