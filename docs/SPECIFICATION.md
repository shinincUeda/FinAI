# AI Portfolio Dashboard — 詳細仕様書

このドキュメントは、プロジェクト内の各ファイルの役割と、全体の構成・データフローを説明します。

---

## 1. プロジェクト概要

- **目的**: Dario Amodei / Demis Hassabis の AI 未来像に基づいた個人投資ポートフォリオ管理
- **対象**: 個人投資家 1 名（自分用）
- **UI**: 日本語、ティッカー・企業名は英語、ダークモード

---

## 2. ルート・設定ファイル

| ファイル | 役割 |
|----------|------|
| **package.json** | プロジェクト名 `ai-portfolio-dashboard`、依存関係（React 18, Vite 6, Zustand, Recharts, Lucide, react-markdown）、スクリプト（`dev`, `build`, `preview`）を定義。 |
| **vite.config.ts** | Vite のビルド設定。`@vitejs/plugin-react` で React を有効化。 |
| **tsconfig.json** | TypeScript 設定。ES2020、JSX、strict、`baseUrl: "."`、`paths: { "@/*": ["src/*"] }`。`src` のみ include。 |
| **tsconfig.node.json** | Vite 等の Node 向け TS 設定（Vite が参照）。 |
| **tailwind.config.js** | Tailwind の content パス（`index.html`, `src/**/*.{js,ts,jsx,tsx}`）、フォント（Noto Sans JP, JetBrains Mono）を拡張。 |
| **postcss.config.js** | PostCSS で tailwindcss と autoprefixer を有効化。 |
| **index.html** | エントリ HTML。`#root`、`/src/main.tsx` を読み込み。Google Fonts で Noto Sans JP と JetBrains Mono を読み込み。 |
| **.gitignore** | `node_modules`, `dist`, `.env`, `.env.local`, `.env*.local`, `.DS_Store`, `*.log` を除外。 |

---

## 3. エントリポイントとアプリ骨格

| ファイル | 役割 |
|----------|------|
| **src/main.tsx** | React のエントリ。`createRoot` で `#root` にマウントし、`App` を `StrictMode` で描画。`index.css` を import。 |
| **src/App.tsx** | アプリのルート。`currentPage` 状態で表示ページを切り替え。`Layout` に `Sidebar` とメインコンテンツを渡し、`Page` に応じて `DashboardPage` / `ThesisPage` / `WatchlistPage` / `AlertsPage` / `ReportsPage` / `SettingsPage` のいずれかを表示。 |
| **src/index.css** | グローバルスタイル。Tailwind の `@tailwind base/components/utilities`、CSS 変数（`--bg-primary`, `--text-primary`, `--accent-*` 等）、`body` のフォント・サイズ、`#root` の min-height。 |
| **src/vite-env.d.ts** | Vite クライアント用の型参照（`/// <reference types="vite/client" />`）。`import.meta.env` 等の型付けに必要。 |

---

## 4. 型定義

| ファイル | 役割 |
|----------|------|
| **src/types/index.ts** | アプリ全体で使う型を一元定義。**Holding**（保有銘柄）、**WatchlistItem**（ウォッチリスト）、**Alert**（アラート）、**WeeklyReport**（週次レポート）、**Settings**（設定）、**Page**（ナビゲーション用ページ ID）を export。 |

---

## 5. レイアウトコンポーネント

| ファイル | 役割 |
|----------|------|
| **src/components/layout/Layout.tsx** | 全体レイアウト。左に `Sidebar`、右に `children`（メインコンテンツ）を配置。背景は `--bg-primary`。 |
| **src/components/layout/Sidebar.tsx** | 左サイドバー。アプリ名「AI Portfolio」、`NAV_ITEMS`（ダッシュボード・テーゼカード・ウォッチリスト・アラート・週次レポート・設定）をボタンで表示。`currentPage` に応じてハイライト。`onNavigate` で親にページ切り替えを通知。Lucide アイコン使用。 |

※ `Header.tsx` は仕様書に記載ありましたが実装には含まれていません。

---

## 6. ダッシュボード

| ファイル | 役割 |
|----------|------|
| **src/components/dashboard/DashboardPage.tsx** | ダッシュボードページのコンテナ。見出し「ダッシュボード」と、`Summary`・`SectorChart`・`AiScoreCard`・`WorldviewIndicator`・`ActionList` をグリッドで配置。 |
| **src/components/dashboard/Summary.tsx** | ポートフォリオ概要。`useHoldingsStore` から銘柄数を取得し、ステータス別（core / monitor / reduce / sell）の件数を `statusLabels` / `statusColors` で表示。 |
| **src/components/dashboard/SectorChart.tsx** | セクター別配分。保有銘柄をセクターで集計し、Recharts の `PieChart`（ドーナツ）で表示。`sectorLabels`・`sectorColors` でラベル・色を統一。Tooltip・Legend 付き。 |
| **src/components/dashboard/AiScoreCard.tsx** | AI 戦略適合度スコア。全保有銘柄の `aiAlignmentScore` の平均を表示。星 5 つで視覚化。 |
| **src/components/dashboard/WorldviewIndicator.tsx** | 世界観ステータス表示。props で `status`（accelerating / normal / decelerating）を受け、🟢/🟡/🔴 と「Amodei / Hassabis の世界は〇〇フェーズ」を表示。デフォルトは `normal`。※ 週次レポート連携で更新する想定。 |
| **src/components/dashboard/ActionList.tsx** | 今週の推奨アクション（トップ 3）。現状は `SAMPLE_ACTIONS` の固定リストを表示。週次レポート生成で最新の推奨を取得する旨の注釈あり。 |

---

## 7. テーゼカード（保有銘柄）

| ファイル | 役割 |
|----------|------|
| **src/components/thesis/ThesisPage.tsx** | テーゼカード一覧ページ。ステータスフィルター（すべて / core / monitor / reduce / sell）、「銘柄追加」ボタン、フィルタ済み `holdings` のカード一覧。`AddHoldingForm` 表示時はフォームを表示。カードクリックで `ThesisModal` を開き、`updateHolding` で保存。 |
| **src/components/thesis/ThesisCard.tsx** | 保有銘柄カード 1 枚。ティッカー・企業名・ステータス（🟢🟡🔴）、AI 適合度（星）、セクター、テーゼ本文（2 行 clamp）。クリックで `onClick` 発火。 |
| **src/components/thesis/ThesisModal.tsx** | 銘柄詳細・編集モーダル。`holding` の全フィールドをフォームで編集（ティッカー、企業名、セクター、ステータス、AI 適合度、テーゼ、売却トリガー、注目指標、メモ）。保存で `onSave(id, updates)` を呼び、`holdingsStore.updateHolding` に繋がる。オーバーレイクリックで閉じる。 |
| **src/components/thesis/AddHoldingForm.tsx** | 新規銘柄追加フォーム。ティッカー（必須）・企業名・セクター・AI 適合度・テーゼ・売却トリガー・注目指標・ステータス・メモを入力。送信で `onAdd(holding)` を呼び、ID はティッカーから生成。 |

---

## 8. ウォッチリスト

| ファイル | 役割 |
|----------|------|
| **src/components/watchlist/WatchlistPage.tsx** | ウォッチリストページ。`useWatchlistStore` の `items` を Tier 1/2/3 に分類し、3 列のカンバン風で表示。 |
| **src/components/watchlist/WatchlistTier.tsx** | Tier 1/2/3 のいずれか 1 列。見出し（Tier 1 最優先 等）、銘柄数、その Tier の `WatchlistItem` 一覧。 |
| **src/components/watchlist/WatchlistItem.tsx** | ウォッチリスト 1 銘柄のカード。ティッカー・企業名、目標価格・現在価格（ある場合）。`targetPrice > 0` かつ現在価格 ≦ 目標価格なら「買い時」バッジを表示。テーゼを 2 行で表示。 |

---

## 9. アラート

| ファイル | 役割 |
|----------|------|
| **src/components/alerts/AlertsPage.tsx** | アラート管理ページ。「アラート追加」ボタン、追加/編集時は `AlertForm` を表示。`AlertList` に一覧を渡し、編集・削除・有効/無効トグルを `alertsStore` と連携。 |
| **src/components/alerts/AlertList.tsx** | アラート一覧。各アラートにタイプ（買い/売却/市場/決算）、ティッカー、条件、トリガー値、アクション、メモを表示。有効チェックボックス、編集・削除ボタン。 |
| **src/components/alerts/AlertForm.tsx** | アラートの新規作成・編集フォーム。銘柄/指標、カテゴリ、条件、トリガー値、発動時のアクション、メモ、有効フラグ。`initial` があれば編集モード。 |

---

## 10. 週次レポート

| ファイル | 役割 |
|----------|------|
| **src/components/report/ReportsPage.tsx** | 週次レポートページ。「週次レポート生成」ボタンで `generateWeeklyReport(apiKey, holdings, watchlist)` を呼び出し、API キーは `import.meta.env.VITE_ANTHROPIC_API_KEY` から取得。未設定時はエラーメッセージ表示。生成したレポートを `reportsStore.addReport` で保存し、選択状態にする。左に履歴一覧、右に選択中レポートの `ReportViewer`。`parseWorldviewStatus` でレポート本文から worldviewStatus を推定。 |
| **src/components/report/ReportViewer.tsx** | マークダウン表示。`react-markdown` で `content` をレンダリング。見出し・リスト・コード等をダークテーマ用にスタイル。 |

---

## 11. 設定

| ファイル | 役割 |
|----------|------|
| **src/components/settings/SettingsPage.tsx** | 設定ページ。表示通貨（USD/JPY）の変更、データのエクスポート（全ストアのデータを JSON でダウンロード）、インポート（JSON から holdings / watchlist / alerts / settings.currency を復元）。API キーは `.env.local` の `VITE_ANTHROPIC_API_KEY` で設定する旨の説明のみ（入力 UI なし）。 |

---

## 12. ストア（Zustand + persist）

| ファイル | 役割 |
|----------|------|
| **src/stores/holdingsStore.ts** | 保有銘柄。`holdings` と `setHoldings` / `addHolding` / `updateHolding` / `removeHolding` / `resetToInitial`。localStorage キー `ai-portfolio-holdings`。初期値は `initialHoldings`。 |
| **src/stores/watchlistStore.ts** | ウォッチリスト。`items` と `setItems` / `addItem` / `updateItem` / `removeItem` / `resetToInitial`。キー `ai-portfolio-watchlist`。初期値は `initialWatchlist`。 |
| **src/stores/alertsStore.ts** | アラート。`alerts` と `setAlerts` / `addAlert` / `updateAlert` / `removeAlert` / `resetToInitial`。キー `ai-portfolio-alerts`。初期値は `initialAlerts`。 |
| **src/stores/reportsStore.ts** | 週次レポート履歴。`reports` と `addReport` / `removeReport` / `clearReports`。最大 50 件保持。キー `ai-portfolio-reports`。 |
| **src/stores/settingsStore.ts** | 設定。`claudeApiKey`（未使用）, `stockApiKey`, `currency` と `setCurrency` / `setStockApiKey` / `resetToDefault`。キー `ai-portfolio-settings`。 |

※ Claude API は `import.meta.env.VITE_ANTHROPIC_API_KEY` を参照するため、ストアの `claudeApiKey` は現在未使用です。

---

## 13. データ・初期値

| ファイル | 役割 |
|----------|------|
| **src/data/initialData.ts** | 初期データとラベル・色の定義。**initialHoldings**: NVDA, TSM, GOOG, AMZN, ASML, ANET, LLY, NVO, TSLA, MELI, NU, SPOT, OXY, CVX, VOO の 15 銘柄（テーゼ・売却トリガー・ステータス等込み）。**initialWatchlist**: Tier 1（AVGO, CEG, Anthropic 等）、Tier 2（VST, RXRX, ISRG, AMAT）、Tier 3（PLTR）。**initialAlerts**: VIX、CEG、AVGO、TSM、TSLA、NVDA 決算などのアラート。**sectorLabels** / **sectorColors**、**statusLabels** / **statusColors** を export（UI の表示用）。 |

---

## 14. ライブラリ・API

| ファイル | 役割 |
|----------|------|
| **src/lib/claude.ts** | Claude API 連携。**generateWeeklyReport(apiKey, holdings, watchlist)**: 週次レポート用システムプロンプトとユーザープロンプトを組み立て、Anthropic Messages API を呼び出し、テキストブロックを結合して返す。**analyzeEarnings(apiKey, ticker, holding)**: 決算分析用の別プロンプトで API を呼び、テキストを返す（現状 UI からは未使用）。モデルは `claude-sonnet-4-20250514`、`web_search_20250305` ツール使用。 |

※ **src/lib/stockApi.ts**（株価取得）と **src/lib/utils.ts** は CLAUDE.md で言及されていますが、現時点では未実装です。

---

## 15. コンポーネント・データの依存関係（簡易）

```
App (currentPage state)
├── Layout
│   ├── Sidebar (onNavigate)
│   └── children
│       ├── DashboardPage
│       │   ├── Summary          → holdingsStore
│       │   ├── SectorChart      → holdingsStore, initialData
│       │   ├── AiScoreCard      → holdingsStore
│       │   ├── WorldviewIndicator (props)
│       │   └── ActionList       (静的)
│       ├── ThesisPage
│       │   ├── AddHoldingForm    → addHolding
│       │   ├── ThesisCard[]     → holding, onClick
│       │   └── ThesisModal      → holding, updateHolding
│       ├── WatchlistPage
│       │   └── WatchlistTier[]  → watchlistStore
│       │       └── WatchlistItem[]
│       ├── AlertsPage
│       │   ├── AlertForm        → addAlert, updateAlert
│       │   └── AlertList        → alertsStore
│       ├── ReportsPage
│       │   ├── generateWeeklyReport (env + holdings + watchlist)
│       │   ├── reportsStore
│       │   └── ReportViewer    (content)
│       └── SettingsPage
│           └── 全ストア（export/import）、settingsStore（currency）
```

---

## 16. localStorage キー一覧

| キー | ストア | 内容 |
|------|--------|------|
| ai-portfolio-holdings | holdingsStore | 保有銘柄配列 |
| ai-portfolio-watchlist | watchlistStore | ウォッチリスト配列 |
| ai-portfolio-alerts | alertsStore | アラート配列 |
| ai-portfolio-reports | reportsStore | 週次レポート配列（最大 50） |
| ai-portfolio-settings | settingsStore | 設定（currency, stockApiKey 等） |

---

## 17. 未実装・今後の拡張（CLAUDE.md より）

- **株価 API**: stockApi.ts による株価取得（Yahoo Finance / Alpha Vantage）
- **世界観・推奨アクションの動的更新**: 週次レポート結果で WorldviewIndicator / ActionList を更新
- **決算分析 UI**: `analyzeEarnings` を呼ぶ画面
- **アラート発動チェック**: ポーリングまたは手動チェックと発動履歴
- **ウォッチリスト**: Tier 間ドラッグ＆ドロップ
- **AlertHistory**: アラート発動履歴の専用コンポーネント
- **Header**: レイアウト用ヘッダー（必要に応じて）

---

## 18. 環境変数

| 変数名 | 用途 | 設定場所 |
|--------|------|----------|
| VITE_ANTHROPIC_API_KEY | Claude API（週次レポート・決算分析） | `.env.local`（Git に含めない） |
| VITE_STOCK_API_KEY | 株価 API（未使用） | `.env.local`（将来用） |

本番デプロイ（例: Vercel）では、環境変数をダッシュボードで設定する想定です。

---

以上が、このリポジトリのファイル役割と仕様の詳細です。実装の細部は各ファイルのコメントと CLAUDE.md の方針を合わせて参照してください。
