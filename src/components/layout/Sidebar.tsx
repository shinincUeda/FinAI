import { LayoutDashboard, FileText, List, Bell, FileBarChart, Settings } from 'lucide-react';
import type { Page } from '../../types';

const NAV_ITEMS: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { page: 'thesis', label: 'テーゼカード', icon: FileText },
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
              currentPage === page
                ? 'bg-[var(--bg-hover)] text-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
