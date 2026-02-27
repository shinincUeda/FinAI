# AI Portfolio Dashboard 🧠📊

Dario Amodei / Demis Hassabis の AI 未来像に基づいた個人投資ポートフォリオ管理ダッシュボード。

## クイックスタート

```bash
# 1. 依存関係のインストール
npm install

# 2. 開発サーバー起動
npm run dev

# 3. ブラウザで開く
# http://localhost:5173
```

## Claude Code でのセットアップ

Claude Code にこのプロジェクトを渡して以下のように指示してください：

```
このプロジェクトのCLAUDE.mdを読んで、Phase 1（MVP）を実装してください。
既にある src/types/index.ts, src/data/initialData.ts, src/lib/claude.ts を使ってください。
```

## 機能

- 📋 **テーゼカード** — 保有銘柄の投資テーゼを管理・編集
- 👁️ **ウォッチリスト** — Tier 1/2/3 で新規候補を管理
- 🔔 **アラート管理** — 買い/売り/市場/イベントの条件管理
- 📊 **ポートフォリオ可視化** — セクター配分、AI適合度
- 🤖 **週次レポート** — Claude API で自動生成（Web検索付き）
- 🌍 **世界観モニター** — AI進展度のトラッキング

## 技術スタック

- React 18 + TypeScript + Vite
- Tailwind CSS
- Recharts（チャート）
- Zustand（状態管理）
- Anthropic Claude API（レポート生成）
- localStorage（データ永続化）

## ディレクトリ構成

```
src/
├── components/          # UIコンポーネント
│   ├── layout/         # サイドバー、ヘッダー
│   ├── dashboard/      # ダッシュボードウィジェット
│   ├── thesis/         # テーゼカード関連
│   ├── watchlist/      # ウォッチリスト
│   ├── alerts/         # アラート管理
│   ├── report/         # 週次レポート
│   └── settings/       # 設定
├── stores/             # Zustand ストア
├── data/               # 初期データ
├── lib/                # API ラッパー、ユーティリティ
└── types/              # 型定義
```

## API キー設定

ダッシュボードの「設定」ページで以下を入力：
- **Claude API Key**: Anthropic のダッシュボードから取得
  - 週次レポート生成に使用
  - Web検索ツール付きで最新情報を取得

## ライセンス

個人利用のみ。
