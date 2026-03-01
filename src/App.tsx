import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { useAutoStockUpdate } from './lib/useAutoStockUpdate';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ThesisPage } from './components/thesis/ThesisPage';
import { WatchlistPage } from './components/watchlist/WatchlistPage';
import { AlertsPage } from './components/alerts/AlertsPage';
import { ReportsPage } from './components/report/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import type { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  useAutoStockUpdate();

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

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
}

export default App;
