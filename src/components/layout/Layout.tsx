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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col lg:flex-row">
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

      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
