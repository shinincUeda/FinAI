-- ============================================================
-- AI Portfolio Dashboard — Supabase セットアップ SQL
-- ============================================================
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行してください。
-- https://supabase.com/dashboard → プロジェクト → SQL Editor
-- ============================================================

-- ポートフォリオ全データを1ユーザー1行で保存するテーブル
create table if not exists portfolio_snapshots (
  user_id    uuid primary key references auth.users on delete cascade,
  holdings   jsonb not null default '[]'::jsonb,
  watchlist  jsonb not null default '[]'::jsonb,
  alerts     jsonb not null default '[]'::jsonb,
  reports    jsonb not null default '[]'::jsonb,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: 自分のデータにのみアクセス可能
alter table portfolio_snapshots enable row level security;

create policy "Users can manage their own snapshot"
  on portfolio_snapshots
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Supabase Auth 設定（ダッシュボードで手動設定）
-- ============================================================
-- Authentication → URL Configuration → Redirect URLs に以下を追加:
--
--   開発環境: http://localhost:5173
--   本番環境: https://your-app.vercel.app
--
-- Authentication → Providers → Email:
--   "Enable Email provider" を ON
--   "Confirm email" は OFF（Magic Link のみで運用する場合）
-- ============================================================
