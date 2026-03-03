import { useRef } from 'react';
import { Cloud, CloudOff, LogOut, User } from 'lucide-react';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { useAlertsStore } from '../../stores/alertsStore';
import { useReportsStore } from '../../stores/reportsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { isSupabaseEnabled } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

export function SettingsPage() {
  const { currency, setCurrency } = useSettingsStore();
  const { holdings, setHoldings } = useHoldingsStore();
  const { items, setItems } = useWatchlistStore();
  const { alerts, setAlerts } = useAlertsStore();
  const { reports } = useReportsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, signOut } = useAuthStore();

  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      holdings,
      watchlist: items,
      alerts,
      reports,
      settings: { currency },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-portfolio-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (Array.isArray(data.holdings)) setHoldings(data.holdings);
        if (Array.isArray(data.watchlist)) setItems(data.watchlist);
        if (Array.isArray(data.alerts)) setAlerts(data.alerts);
        if (data.settings?.currency) setCurrency(data.settings.currency);
        alert('インポートしました。');
      } catch {
        alert('インポートに失敗しました。JSON形式を確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">設定</h1>

      <div className="max-w-xl space-y-6">
        <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            ポートフォリオ基本設定
          </h2>
          <label>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">表示通貨</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as 'USD' | 'JPY')}
              className="w-full max-w-xs px-3 py-2 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)]"
            >
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
            </select>
          </label>
        </section>

        <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            データのエクスポート / インポート
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            保有銘柄・ウォッチリスト・アラート・設定をJSONで保存・復元できます。
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 rounded bg-[var(--accent-blue)] text-white hover:opacity-90"
            >
              エクスポート
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              インポート
            </button>
          </div>
        </section>

        <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            APIキー
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Claude APIキーは <code className="px-1 rounded bg-[var(--bg-hover)]">.env.local</code> の{' '}
            <code className="px-1 rounded bg-[var(--bg-hover)]">VITE_ANTHROPIC_API_KEY</code> で設定してください。UIでは入力・保存しません。
          </p>
        </section>

        {/* クラウド同期ステータス */}
        <section className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
            クラウド同期
          </h2>
          {isSupabaseEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-green)' }}>
                <Cloud className="w-4 h-4" />
                <span>Supabase クラウド同期 有効</span>
              </div>
              {user && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <User className="w-3.5 h-3.5" />
                  <span className="font-mono text-xs">{user.email}</span>
                </div>
              )}
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                データは変更のたびに自動的にクラウドへ保存されます。スマホ・タブレット・PCどこからでも同じデータにアクセスできます。
              </p>
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:border-[var(--accent-red)] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                ログアウト
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CloudOff className="w-4 h-4" />
                <span>クラウド同期 無効（ローカルのみ）</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                有効にするには <code className="px-1 rounded bg-[var(--bg-hover)]">.env.local</code> に{' '}
                <code className="px-1 rounded bg-[var(--bg-hover)]">VITE_SUPABASE_URL</code> と{' '}
                <code className="px-1 rounded bg-[var(--bg-hover)]">VITE_SUPABASE_ANON_KEY</code> を設定してください。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
