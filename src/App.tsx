import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { useAutoStockUpdate } from './lib/useAutoStockUpdate';
import { loadFromFile, startAutoSync } from './lib/fileSync';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ThesisPage } from './components/thesis/ThesisPage';
import { WatchlistPage } from './components/watchlist/WatchlistPage';
import { AlertsPage } from './components/alerts/AlertsPage';
import { ReportsPage } from './components/report/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import type { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  // ファイルからの読み込みが完了したら true になる。
  // 完了前に useAutoStockUpdate が走ると initialData で上書きされるリスクがあるため
  // enabled フラグで制御する。
  const [ready, setReady] = useState(false);

  useAutoStockUpdate(ready);

  useEffect(() => {
    // 1. data/portfolio.json からデータを読み込み Zustand に反映
    // 2. 完了後、ストアの変更監視を開始（以降は変更のたびにファイルへ自動保存）
    loadFromFile().then(() => {
      startAutoSync();
      setReady(true);
    });
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'thesis':
        return <ThesisPage />;
      case 'watchlist':
        return <WatchlistPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  // ファイル読み込み中はローディング画面を表示
  // （ローカルファイルなので通常は 50ms 未満で完了する）
  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          Loading portfolio data...
        </p>
      </div>
    );
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}

export default App;
