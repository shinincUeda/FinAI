import { LayoutDashboard, FileText, List, Bell, FileBarChart, Settings, RefreshCw } from 'lucide-react';
import type { Page } from '../../types';
import { useAutoUpdateStore } from '../../stores/autoUpdateStore';

const NAV_ITEMS: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { page: 'thesis', label: 'ポートフォリオ管理', icon: FileText },
  { page: 'watchlist', label: 'ウォッチリスト', icon: List },
  { page: 'alerts', label: 'アラート', icon: Bell },
  { page: 'reports', label: '週次レポート', icon: FileBarChart },
  { page: 'settings', label: '設定', icon: Settings },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { isUpdating, lastUpdatedAt, isMarketOpen, triggerManualUpdate } = useAutoUpdateStore();

  return (
    <aside className="w-56 min-h-screen bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="font-bold text-lg text-[var(--text-primary)] font-mono tracking-tight">
          AI Portfolio
        </h1>
      </div>
      <nav className="flex-1 p-2">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-colors ${currentPage === page
                ? 'bg-[var(--bg-hover)] text-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* 株価更新ステータス */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs mb-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isMarketOpen ? 'bg-[var(--accent-green)]' : 'bg-gray-600'
              }`}
          />
          <span className="text-[var(--text-secondary)]">
            {isMarketOpen ? 'ザラ場中' : '市場外'}
          </span>
          {isUpdating && (
            <RefreshCw className="w-3 h-3 text-[var(--accent-blue)] ml-auto animate-spin" />
          )}
        </div>

        {/* 手動更新ボタン */}
        <button
          type="button"
          onClick={triggerManualUpdate}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-mono tracking-widest border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? '更新中...' : '株価を今すぐ更新'}
        </button>

        {lastUpdatedAt && (
          <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 font-mono text-center">
            最終{' '}
            {new Date(lastUpdatedAt).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
        {!lastUpdatedAt && (
          <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 text-center">
            {isMarketOpen ? '取得中...' : 'ザラ場中に自動更新'}
          </p>
        )}
      </div>
    </aside>
  );
}
