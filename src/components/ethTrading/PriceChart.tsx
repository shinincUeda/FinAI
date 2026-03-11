import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { EthCandle } from '../../types';
import { calcChartSeries } from '../../lib/technicalIndicators';

interface PriceChartProps {
  candles: EthCandle[];
}

export function PriceChart({ candles }: PriceChartProps) {
  const data = useMemo(() => {
    if (candles.length === 0) return [];
    return calcChartSeries(candles).slice(-90);
  }, [candles]);

  if (data.length === 0) {
    return (
      <div className="ch-card h-[340px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)] font-mono">チャートデータ取得中...</p>
      </div>
    );
  }

  const minPrice = Math.min(...data.map((d) => d.bbLower ?? d.close)) * 0.98;
  const maxPrice = Math.max(...data.map((d) => d.bbUpper ?? d.close)) * 1.02;
  const lastEma20 = data[data.length - 1]?.ema20;
  const lastEma50 = data[data.length - 1]?.ema50;

  return (
    <div className="ch-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)]">PRICE CHART — 90D</p>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-[var(--accent-blue)] inline-block" /> EMA20
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-[var(--accent-orange)] inline-block" /> EMA50
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-[var(--accent-purple)] opacity-40 inline-block" /> BB
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ethBBFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="ethPriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.15} />
              <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            interval={Math.floor(data.length / 6)}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
            }}
            labelStyle={{ color: 'var(--text-muted)' }}
            formatter={(value: number, name: string) => [
              `$${value.toFixed(2)}`,
              name === 'close' ? 'Price' : name === 'bbUpper' ? 'BB Upper' : name === 'bbLower' ? 'BB Lower' : name,
            ]}
          />
          {/* Bollinger Bands */}
          <Area
            type="monotone"
            dataKey="bbUpper"
            stroke="var(--accent-purple)"
            strokeWidth={1}
            strokeOpacity={0.3}
            fill="none"
            dot={false}
            connectNulls={false}
          />
          <Area
            type="monotone"
            dataKey="bbLower"
            stroke="var(--accent-purple)"
            strokeWidth={1}
            strokeOpacity={0.3}
            fill="url(#ethBBFill)"
            dot={false}
            connectNulls={false}
          />
          {/* EMA lines */}
          <Area
            type="monotone"
            dataKey="ema20"
            stroke="var(--accent-blue)"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="ema50"
            stroke="var(--accent-orange)"
            strokeWidth={1.5}
            fill="none"
            dot={false}
          />
          {/* Price */}
          <Area
            type="monotone"
            dataKey="close"
            stroke="var(--accent-green)"
            strokeWidth={2}
            fill="url(#ethPriceFill)"
            dot={false}
          />
          {lastEma20 && (
            <ReferenceLine y={lastEma20} stroke="var(--accent-blue)" strokeDasharray="3 3" strokeOpacity={0.4} />
          )}
          {lastEma50 && (
            <ReferenceLine y={lastEma50} stroke="var(--accent-orange)" strokeDasharray="3 3" strokeOpacity={0.4} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
