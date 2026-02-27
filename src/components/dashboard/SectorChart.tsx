import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useHoldingsStore } from '../../stores/holdingsStore';
import { sectorLabels, sectorColors } from '../../data/initialData';
import type { Holding } from '../../types';

function aggregateBySector(holdings: Holding[]) {
  const map = new Map<string, number>();
  holdings.forEach((h) => {
    map.set(h.sector, (map.get(h.sector) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value]) => ({
    name: sectorLabels[name] ?? name,
    value,
    color: sectorColors[name] ?? '#6b7280',
  }));
}

export function SectorChart() {
  const { holdings } = useHoldingsStore();
  const data = aggregateBySector(holdings);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
        セクター別配分
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [`${value} 銘柄`, '']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
