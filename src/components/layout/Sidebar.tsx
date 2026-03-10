import { LayoutDashboard, FileText, List, Bell, FileBarChart, Settings, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  onClose?: () => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPage, onNavigate, onClose, isOpen, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { isUpdating, lastUpdatedAt, isMarketOpen, triggerManualUpdate } = useAutoUpdateStore();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col transition-all duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isCollapsed ? 'w-16' : 'w-56'}`}
      >
        <div className={`p-4 border-b border-[var(--border)] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2 min-w-0">
              <img src="/assets/logo.svg" alt="" className="w-8 h-8 shrink-0" aria-hidden />
              <h1 className="font-bold text-lg text-[var(--text-primary)] font-mono tracking-tight truncate">
                AI Portfolio
              </h1>
            </div>
          ) : (
            <img src="/assets/logo.svg" alt="AI Portfolio" className="w-8 h-8 shrink-0" />
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 text-[var(--text-secondary)] hover:text-white rounded hover:bg-[var(--bg-hover)]"
              title={isCollapsed ? "展開" : "折りたたむ"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1 text-[var(--text-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <nav className="flex-1 p-2">
          {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              type="button"
              onClick={() => {
                onNavigate(page);
                if (onClose) onClose();
              }}
              title={isCollapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm transition-all ${isCollapsed ? 'justify-center px-2' : ''} ${currentPage === page
                ? 'bg-[var(--bg-hover)] text-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* 株価更新ステータス */}
        <div className={`p-3 border-t border-[var(--border)] ${isCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
          <div className={`flex items-center gap-1.5 text-xs ${isCollapsed ? 'justify-center' : 'mb-2'}`}>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isMarketOpen ? 'bg-[var(--accent-green)]' : 'bg-gray-600'
                }`}
              title={isCollapsed ? (isMarketOpen ? 'ザラ場中' : '市場外') : undefined}
            />
            {!isCollapsed && (
              <span className="text-[var(--text-secondary)]">
                {isMarketOpen ? 'ザラ場中' : '市場外'}
              </span>
            )}
            {isUpdating && (
              <RefreshCw className={`w-3 h-3 text-[var(--accent-blue)] animate-spin ${!isCollapsed ? 'ml-auto' : ''}`} />
            )}
          </div>

          {/* 手動更新ボタン */}
          <button
            type="button"
            onClick={triggerManualUpdate}
            disabled={isUpdating}
            title={isCollapsed ? "株価を今すぐ更新" : undefined}
            className={`flex items-center justify-center gap-1.5 text-[10px] font-mono tracking-widest border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isCollapsed ? 'w-10 h-10 rounded-full' : 'w-full px-2 py-1.5 rounded'
              }`}
          >
            <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
            {!isCollapsed && (isUpdating ? '更新中...' : '株価を今すぐ更新')}
          </button>

          {!isCollapsed && (
            <>
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
            </>
          )}
        </div>
      </aside>
    </>
  );
}
