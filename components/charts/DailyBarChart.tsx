'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import type { TooltipProps } from 'recharts'
import type { DailyBarPoint } from '@/types/chart'
import { formatCurrency } from '@/lib/formatters'

interface Props { data: DailyBarPoint[]; height?: number }

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const pnl = payload[0]?.value as number
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="text-text-secondary mb-1">{label}</p>
      <p className={`font-semibold ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(pnl)}</p>
    </div>
  )
}

export function DailyBarChart({ data, height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={50} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine y={0} stroke="#2d2d3a" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={20}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
