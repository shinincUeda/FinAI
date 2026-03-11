import { HelpCircle } from 'lucide-react';

interface PriceHeaderProps {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  lastFetched: number | null;
  usdJpyRate: number;
}

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-flex">
      <HelpCircle className="w-3 h-3 text-[var(--text-muted)] cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {text}
      </span>
    </span>
  );
}

export function PriceHeader({ price, change24h, volume24h, lastFetched, usdJpyRate }: PriceHeaderProps) {
  const isUp = (change24h ?? 0) >= 0;
  const jpyPrice = price != null ? price * usdJpyRate : null;

  return (
    <div className="ch-card flex items-center gap-6 flex-wrap">
      <div>
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] mb-1 flex items-center">
          ETH / USDT
          <Tip text="Binance ETH/USDT 現物ペアのリアルタイム価格" />
        </p>
        <p className="text-3xl font-mono font-bold text-[var(--text-primary)]">
          {jpyPrice != null ? `¥${jpyPrice.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}` : '---'}
        </p>
        <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
          {price != null ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
          {price != null ? ` (¥${usdJpyRate.toFixed(1)}/$)` : ''}
        </p>
      </div>

      <div className={`px-3 py-1.5 rounded font-mono text-sm font-semibold ${isUp ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'}`}>
        {change24h != null ? `${isUp ? '+' : ''}${change24h.toFixed(2)}%` : '---'}
        <span className="text-[10px] ml-1 opacity-60">24時間</span>
      </div>

      <div className="ml-auto text-right">
        <p className="text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-end">
          24時間出来高
          <Tip text="過去24時間のUSDT建て取引量" />
        </p>
        <p className="text-sm font-mono text-[var(--text-secondary)]">
          {volume24h != null ? `¥${(volume24h * usdJpyRate / 1e8).toFixed(1)}億` : '---'}
        </p>
        <p className="text-[10px] font-mono text-[var(--text-muted)]">
          {volume24h != null ? `($${(volume24h / 1e9).toFixed(2)}B)` : ''}
        </p>
      </div>

      {lastFetched && (
        <p className="text-[10px] font-mono text-[var(--text-muted)]">
          更新 {new Date(lastFetched).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
