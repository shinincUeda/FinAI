-- ============================================================
-- AI Portfolio Dashboard — ログインメールアドレス制限 SQL
-- ============================================================
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行してください。
-- ============================================================

-- 1. 許可されたメールアドレスを保存するテーブル
create table if not exists public.allowed_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- RLS: 管理者のみ操作可能（今回はシンプルにするため、参照のみ公開せず）
alter table public.allowed_emails enable row level security;

-- 2. 認証トリガー関数の作成
-- 新規ユーザー作成（サインイン/サインアップ）時にメールアドレスをチェックする
create or replace function public.check_allowed_email()
returns trigger
language plpgsql
security definer -- auth スキーマから public テーブルを読み込めるように設定
as $$
begin
  if exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    return new;
  else
    raise exception 'このメールアドレスは許可されていません。: %', new.email;
  end if;
end;
$$;

-- 3. トリガーの登録
-- auth.users への INSERT 前に実行する
drop trigger if exists on_auth_user_created_check_email on auth.users;
create trigger on_auth_user_created_check_email
  before insert on auth.users
  for each row execute function public.check_allowed_email();

-- ============================================================
-- 使い方: 自分のメールアドレスを追加する例
-- ============================================================
-- insert into public.allowed_emails (email) values ('your@email.com');
-- ============================================================
