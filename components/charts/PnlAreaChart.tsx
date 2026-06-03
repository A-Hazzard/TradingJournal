'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { CumulativePnlPoint } from '@/types/chart'
import { formatCurrency } from '@/lib/formatters'

interface Props { data: CumulativePnlPoint[]; height?: number }

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const cum = payload[0]?.value as number
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="text-text-secondary mb-1">{label}</p>
      <p className={`font-semibold ${cum >= 0 ? 'text-profit' : 'text-loss'}`}>
        {formatCurrency(cum)}
      </p>
    </div>
  )
}

export function PnlAreaChart({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#2d2d3a" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="cumPnl" stroke="#8b5cf6" strokeWidth={2} fill="url(#pnlGrad)" dot={false} activeDot={{ r: 4, fill: '#8b5cf6' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
