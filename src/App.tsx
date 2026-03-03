import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './components/auth/LoginPage';
import { useAutoStockUpdate } from './lib/useAutoStockUpdate';
import { loadFromFile, startAutoSync } from './lib/fileSync';
import { loadFromCloud, startCloudSync } from './lib/cloudSync';
import { isSupabaseEnabled } from './lib/supabase';
import { initAuth, useAuthStore } from './stores/authStore';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ThesisPage } from './components/thesis/ThesisPage';
import { WatchlistPage } from './components/watchlist/WatchlistPage';
import { AlertsPage } from './components/alerts/AlertsPage';
import { ReportsPage } from './components/report/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import type { Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  // データ読み込みが完了したら true になる。
  // 完了前に useAutoStockUpdate が走ると initialData で上書きされるリスクがあるため
  // enabled フラグで制御する。
  const [ready, setReady] = useState(false);

  const { user, loading: authLoading } = useAuthStore();

  useAutoStockUpdate(ready);

  useEffect(() => {
    if (isSupabaseEnabled) {
      // Supabase 有効: ログイン後にクラウドからデータを取得して起動
      initAuth(async () => {
        await loadFromCloud();
        startCloudSync();
        setReady(true);
      });
    } else {
      // Supabase 未設定: ローカルファイル同期で動作（開発環境）
      loadFromFile().then(() => {
        startAutoSync();
        setReady(true);
      });
    }
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

  // Supabase 有効時: 初期セッション確認中
  if (isSupabaseEnabled && authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          Loading...
        </p>
      </div>
    );
  }

  // Supabase 有効かつ未ログイン → ログインページを表示
  if (isSupabaseEnabled && !user) {
    return <LoginPage />;
  }

  // データ読み込み中
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
