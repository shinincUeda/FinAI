import { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const { signInWithEmail, emailSent, error, loading } = useAuthStore();
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    await signInWithEmail(email.trim());
    setSending(false);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
          認証状態を確認中...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ロゴ / タイトル */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-blue)' }}
        >
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1
            className="text-xl font-bold leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            AI Portfolio
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Dashboard
          </p>
        </div>
      </div>

      {/* ログインカード */}
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
        }}
      >
        {emailSent ? (
          /* 送信完了状態 */
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <CheckCircle className="w-7 h-7" style={{ color: 'var(--accent-green)' }} />
            </div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              メールを送信しました
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>
                {email}
              </span>{' '}
              にログインリンクを送りました。
              <br />
              メールのリンクをクリックするとログインできます。
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted, var(--text-secondary))' }}>
              メールが届かない場合は迷惑メールフォルダを確認してください。
            </p>
            <button
              onClick={() => useAuthStore.setState({ emailSent: false, error: null })}
              className="mt-5 text-sm underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              別のメールアドレスで試す
            </button>
          </div>
        ) : (
          /* ログインフォーム */
          <>
            <h2
              className="text-lg font-bold mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              ログイン
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              メールアドレスにワンタイムリンクを送ります。パスワード不要です。
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'var(--accent-blue)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = 'var(--border)')
                  }
                />
              </div>

              {error && (
                <div
                  className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: 'var(--accent-red)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50"
                style={{ background: 'var(--accent-blue)', color: 'white' }}
              >
                {sending ? (
                  <span>送信中...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ログインリンクを送る</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
        データはクラウドに暗号化して保存されます
      </p>
    </div>
  );
}
