import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { Page } from '../../types';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-[var(--bg-secondary)] border-b border-[var(--border)] sticky top-0 z-30">
        <h1 className="font-bold text-lg text-[var(--text-primary)] font-mono tracking-tight">
          AI Portfolio
        </h1>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-[var(--text-secondary)] hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <div className="flex flex-1 relative">
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          isOpen={isSidebarOpen}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onClose={() => setIsSidebarOpen(false)}
        />
        {/* Main Content with dynamic margin on large screens */}
        <main className={`flex-1 overflow-auto transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-56'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
