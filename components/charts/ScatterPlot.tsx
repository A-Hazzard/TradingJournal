'use client'

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { ScatterPoint } from '@/types/chart'
import { formatCurrency } from '@/lib/formatters'

interface Props { data: ScatterPoint[]; height?: number }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ScatterPoint
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-text-primary">{d.ticker}</p>
      <p className="text-text-secondary text-xs">{d.timeLabel}</p>
      <p className={`font-semibold mt-1 ${d.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(d.pnl)}</p>
    </div>
  )
}

const MARKET_HOURS = [{ h: 9, label: '9 AM' }, { h: 10, label: '10 AM' }, { h: 11, label: '11 AM' }, { h: 12, label: '12 PM' }, { h: 13, label: '1 PM' }, { h: 14, label: '2 PM' }, { h: 15, label: '3 PM' }, { h: 16, label: '4 PM' }]

export function ScatterPlot({ data, height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" />
        <XAxis
          type="number" dataKey="hour" domain={[9, 16]} name="Hour"
          ticks={MARKET_HOURS.map(h => h.h)}
          tickFormatter={(v) => MARKET_HOURS.find(h => h.h === v)?.label ?? ''}
          tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
        />
        <YAxis
          type="number" dataKey="pnl" name="P&L"
          tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `$${v}`} width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#2d2d3a' }} />
        <ReferenceLine y={0} stroke="#2d2d3a" strokeDasharray="4 4" />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
