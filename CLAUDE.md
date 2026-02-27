# AI Portfolio Dashboard — プロジェクト仕様書

## 概要

Dario Amodei / Demis Hassabis の AI 未来像に基づいた個人投資ポートフォリオ管理ダッシュボード。
保有銘柄のテーゼ管理、ウォッチリスト、アラート条件、ポートフォリオ配分の可視化、Claude API を使った週次レポート自動生成を行う。

- **対象ユーザー**: 個人投資家 1 名（自分用）
- **言語**: UI は日本語、ティッカー・企業名は英語
- **テーマ**: ダークモード、金融プロフェッショナル風

## 技術スタック

- **フレームワーク**: React 18+ (Vite)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **チャート**: Recharts
- **状態管理**: Zustand
- **データ永続化**: localStorage（JSON、将来的に Supabase 等に移行可能な設計）
- **Claude API**: Anthropic Messages API（`claude-sonnet-4-20250514`）
- **株価 API**: Yahoo Finance API（yfinance proxy）または Alpha Vantage（無料枠）
- **アイコン**: Lucide React
- **フォント**: Noto Sans JP + JetBrains Mono（ティッカー表示）

## ページ構成

### 1. ダッシュボード（トップ）
- ポートフォリオ全体のサマリー
- セクター別配分（円グラフ / ドーナツチャート）
- AI戦略適合度スコア（全体の加重平均）
- 今週の推奨アクション（トップ3）
- 世界観ステータスインジケーター（🟢加速 / 🟡通常 / 🔴減速）

### 2. テーゼカード
- 保有銘柄一覧（カード型 UI）
- 各カードに: ティッカー、企業名、AI適合度（星）、テーゼ本文、売却トリガー、ステータス（🟢🟡🔴）
- カードクリックで詳細モーダル（編集可能）
- フィルター: ステータス別、適合度別、セクター別
- 新規銘柄追加フォーム

### 3. ウォッチリスト
- Tier 1/2/3 のカンバン風レイアウト
- 目標エントリー価格と現在価格の比較
- Tier 間ドラッグ＆ドロップ（nice-to-have）
- 「買い時判定」インジケーター（目標価格以下なら光る）

### 4. アラート管理
- アラート条件の CRUD
- カテゴリ: 買いアラート / 売却アラート / 市場全体 / 決算イベント
- 各アラートに: 条件式、トリガー価格、アクション指示
- 発動履歴ログ
- （将来的に）Webhook / LINE / Discord 通知連携

### 5. 週次レポート
- Claude API を呼び出してレポート生成
- 入力: 保有銘柄データ + ウォッチリスト + 市場状況
- 出力: マークダウン形式のレポート
- レポート履歴の保存と閲覧
- 「週次レポート生成」ボタン1クリックで実行

### 6. 設定
- Claude API キー入力（localStorage に保存）
- 株価 API キー入力
- ポートフォリオの基本設定（通貨、基準日等）
- データのエクスポート / インポート（JSON）

## データモデル

```typescript
// 保有銘柄
interface Holding {
  id: string;
  ticker: string;
  name: string;
  sector: 'ai-infra' | 'hyperscaler' | 'ai-drug' | 'energy' | 'fintech' | 'robotics' | 'other';
  aiAlignmentScore: 1 | 2 | 3 | 4 | 5;  // AI戦略適合度
  thesis: string;         // 投資テーゼ
  sellTriggers: string;   // 売却トリガー
  watchMetrics: string;   // 注目指標
  status: 'core' | 'monitor' | 'reduce' | 'sell';
  shares?: number;
  avgCost?: number;
  currentPrice?: number;
  notes: string;
  lastUpdated: string;    // ISO date
}

// ウォッチリスト
interface WatchlistItem {
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

// アラート
interface Alert {
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

// 週次レポート
interface WeeklyReport {
  id: string;
  date: string;
  content: string;   // マークダウン
  worldviewStatus: 'accelerating' | 'normal' | 'decelerating';
  actions: string[];
}
```

## デザイン仕様

### カラーパレット
```css
--bg-primary: #0a0e1a;        /* 深い紺 */
--bg-secondary: #111827;      /* ダークグレー */
--bg-card: #1a2035;           /* カード背景 */
--bg-hover: #243050;          /* ホバー */
--text-primary: #e5e7eb;      /* 明るいグレー */
--text-secondary: #9ca3af;    /* 薄いグレー */
--accent-blue: #3b82f6;       /* メインアクセント */
--accent-green: #10b981;      /* ポジティブ */
--accent-yellow: #f59e0b;     /* 注意 */
--accent-red: #ef4444;        /* 危険 */
--accent-purple: #8b5cf6;     /* AI関連ハイライト */
--border: #1f2937;
```

### タイポグラフィ
- 見出し: Noto Sans JP Bold
- 本文: Noto Sans JP Regular
- ティッカー / 数値: JetBrains Mono
- フォントサイズ: 基本 14px、見出し 20-28px

### レイアウト
- サイドバーナビゲーション（左固定、折りたたみ可）
- メインコンテンツ領域
- レスポンシブ（タブレット対応まで。モバイルは nice-to-have）

### アニメーション
- カードのホバーで微かな浮き上がり（transform + shadow）
- ページ遷移はフェードイン
- ステータス変更時にパルスアニメーション
- チャートの初期描画アニメーション

## Claude API 連携仕様

### 週次レポート生成

```typescript
const generateWeeklyReport = async (apiKey: string, holdings: Holding[], watchlist: WatchlistItem[]) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
      }],
      system: WEEKLY_REPORT_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildReportPrompt(holdings, watchlist),
      }],
    }),
  });
  // レスポンスからテキストブロックを結合して返す
};
```

### システムプロンプト（週次レポート用）

```
あなたはDario Amodei / Demis Hassabisの描くAI未来像に基づいた投資戦略の参謀です。
以下のポートフォリオに対して週次レポートを生成してください。

## レポート構成
1. テーゼ変動アラート — 各銘柄のテーゼが生きているかの判定（🟢🟡🔴）
2. エントリーチャンス — ウォッチリスト銘柄で買い時が来ているもの
3. 売却検討 — バリュエーション過熱 or テーゼ弱体化の銘柄
4. 新規発掘 — AIバリューチェーンで見落としている有望銘柄
5. 世界観チェック — 「Amodei/Hassabisの世界は来ているか？」の判定
6. 推奨アクション — 今週やるべきことのトップ3

## 原則
- Web検索を使って最新情報を取得してください
- 忖度なし。悪いニュースも正直に
- Terry Smith / Chuck Akre的なコンパウンディング視点
- 価格ではなくテーゼで売買判断
```

## 初期データ

プロジェクト初期化時に以下のデータをデフォルトとしてlocalStorageに投入:

### 保有銘柄
NVDA, TSM, GOOG, AMZN, ASML, ANET, LLY, NVO, TSLA, MELI, NU, SPOT, OXY, CVX
（+ VOO をインデックス枠として）

### ウォッチリスト
Tier 1: AVGO, CEG, Anthropic(未上場)
Tier 2: VST, RXRX, ISRG, AMAT
Tier 3: PLTR

### アラート
- VIX > 30 → パニック買いモード
- CEG < 270 → エントリー
- AVGO < 200 → エントリー
- TSM < 330 → 追加買い
- TSLA PER > 400 → 部分利確
- NVDA 2/25決算 → テーゼ検証

## ディレクトリ構成

```
ai-portfolio-dashboard/
├── CLAUDE.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── index.html
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css               # Tailwind + カスタム CSS 変数
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   ├── dashboard/
│   │   │   ├── Summary.tsx
│   │   │   ├── SectorChart.tsx
│   │   │   ├── WorldviewIndicator.tsx
│   │   │   └── ActionList.tsx
│   │   ├── thesis/
│   │   │   ├── ThesisCard.tsx
│   │   │   ├── ThesisCardList.tsx
│   │   │   ├── ThesisModal.tsx
│   │   │   └── AddHoldingForm.tsx
│   │   ├── watchlist/
│   │   │   ├── WatchlistBoard.tsx
│   │   │   ├── WatchlistTier.tsx
│   │   │   └── WatchlistItem.tsx
│   │   ├── alerts/
│   │   │   ├── AlertList.tsx
│   │   │   ├── AlertForm.tsx
│   │   │   └── AlertHistory.tsx
│   │   ├── report/
│   │   │   ├── ReportGenerator.tsx
│   │   │   ├── ReportViewer.tsx
│   │   │   └── ReportHistory.tsx
│   │   └── settings/
│   │       └── Settings.tsx
│   ├── stores/
│   │   ├── holdingsStore.ts
│   │   ├── watchlistStore.ts
│   │   ├── alertsStore.ts
│   │   ├── reportsStore.ts
│   │   └── settingsStore.ts
│   ├── data/
│   │   └── initialData.ts      # デフォルトの保有銘柄・ウォッチリスト・アラート
│   ├── lib/
│   │   ├── claude.ts           # Claude API ラッパー
│   │   ├── stockApi.ts         # 株価取得
│   │   └── utils.ts
│   └── types/
│       └── index.ts            # 全型定義
```

## 実装の優先順位

### Phase 1（MVP — まずこれを作る）
1. プロジェクトセットアップ（Vite + React + TS + Tailwind）
2. サイドバー + レイアウト
3. テーゼカード一覧 + 詳細モーダル + 編集
4. ポートフォリオ配分の円グラフ
5. 初期データの投入
6. localStorage 永続化

### Phase 2（Claude 連携）
7. 設定ページ（API キー入力）
8. Claude API 連携（週次レポート生成）
9. レポート履歴保存・閲覧

### Phase 3（アラート + ウォッチリスト）
10. ウォッチリスト（Tier別カンバン）
11. アラート条件 CRUD
12. アラート発動チェック（手動 or ポーリング）

### Phase 4（強化）
13. 株価 API 連携
14. パフォーマンス追跡
15. データエクスポート/インポート
16. LINE / Discord Webhook 通知

## APIキー管理（セキュリティ）

### .env方式（必須）
APIキーは `.env.local` ファイルで管理する。UIからの入力・localStorageへの保存は**しない**。

```
# .env.local（Gitにコミットしない）
VITE_ANTHROPIC_API_KEY=sk-ant-xxxx
VITE_STOCK_API_KEY=xxxx
```

コードからの参照:
```typescript
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
```

### .gitignore必須項目
```
.env.local
.env*.local
```

### Vercelへのデプロイ時
Vercelダッシュボードの「Environment Variables」に同じキーを登録する。
コードの変更は不要。

### Claude API連携の修正
`src/lib/claude.ts` では apiKey を引数で受け取らず、
`import.meta.env.VITE_ANTHROPIC_API_KEY` を直接参照する。
設定ページのAPIキー入力UIは不要。

## 注意事項

- 株価 API は無料枠の制限に注意（Alpha Vantage: 25 req/day）
- データバックアップは JSON エクスポートで手動対応
- APIキーは絶対にGitHubにpushしない（.gitignoreで必ず除外）
