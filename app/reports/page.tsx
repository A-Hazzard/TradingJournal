'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchTrades, selectKpis, selectSetupStats, selectTickerStats, selectScatterSeries, selectTradesStatus } from '@/store/tradesSlice'
import { ScatterPlot } from '@/components/charts/ScatterPlot'
import { formatCurrency } from '@/lib/formatters'
import ReportsSkeleton from '@/components/ui/skeletons/ReportsSkeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const TABS = ['Overview', 'By Setup', 'By Ticker', 'By Time'] as const
type Tab = typeof TABS[number]

export default function ReportsPage() {
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<Tab>('Overview')
  const status = useAppSelector(selectTradesStatus)
  const kpis = useAppSelector(selectKpis)
  const setupStats = useAppSelector(selectSetupStats)
  const tickerStats = useAppSelector(selectTickerStats)
  const scatter = useAppSelector(selectScatterSeries)

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTrades())
  }, [dispatch, status])

  function CustomBarTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface border border-border rounded-lg p-3 text-xs shadow-lg">
        <p className="text-text-secondary mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.fill }}>{p.name}: {typeof p.value === 'number' && p.name?.includes('PnL') ? formatCurrency(p.value) : p.name?.includes('Rate') ? `${p.value.toFixed(1)}%` : p.value}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Reports & Analytics" subtitle="Deep performance breakdown" />
      {status === 'loading' ? (
        <ReportsSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Tabs */}
          <div className="flex gap-1 bg-surface-alt rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-surface text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-primary'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === 'Overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard title="Net P&L" value={formatCurrency(kpis.netPnl)} variant={kpis.netPnl >= 0 ? 'profit' : 'loss'} />
                <KpiCard title="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} variant="accent" />
                <KpiCard title="Profit Factor" value={kpis.profitFactor.toFixed(2)} variant="default" />
                <KpiCard title="Avg R-Multiple" value={`${kpis.avgRMultiple >= 0 ? '+' : ''}${kpis.avgRMultiple.toFixed(2)}R`} variant="default" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard title="Total Trades" value={kpis.totalTrades.toString()} variant="default" />
                <KpiCard title="Wins / Losses" value={`${kpis.totalWins} / ${kpis.totalLosses}`} variant="default" />
                <KpiCard title="Avg Win" value={formatCurrency(kpis.avgWin)} variant="profit" />
                <KpiCard title="Avg Loss" value={formatCurrency(kpis.avgLoss)} variant="loss" />
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Trade Time Performance</h3>
                <ScatterPlot data={scatter} height={260} />
              </div>
            </div>
          )}

          {/* By Setup Tab */}
          {tab === 'By Setup' && (
            <div className="space-y-5">
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Setup', 'Trades', 'Win Rate', 'Total P&L', 'Avg P&L'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {setupStats.map(s => (
                      <tr key={s.setup} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">{s.setup}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.trades}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.winRate.toFixed(1)}%</td>
                        <td className={`px-4 py-3 font-semibold tabular-nums ${s.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(s.totalPnl)}</td>
                        <td className={`px-4 py-3 tabular-nums ${s.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(s.avgPnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">P&L by Setup</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={setupStats} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                    <XAxis dataKey="setup" tick={{ fill: '#64748b', fontSize: 10 }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="totalPnl" name="Total PnL" radius={[4, 4, 0, 0]}>
                      {setupStats.map((s, i) => <Cell key={i} fill={s.totalPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.75} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* By Ticker Tab */}
          {tab === 'By Ticker' && (
            <div className="space-y-5">
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Ticker', 'Trades', 'Win Rate', 'Total P&L', 'Avg P&L'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tickerStats.map(s => (
                      <tr key={s.ticker} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-text-primary">{s.ticker}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.trades}</td>
                        <td className="px-4 py-3 text-text-secondary">{s.winRate.toFixed(1)}%</td>
                        <td className={`px-4 py-3 font-semibold tabular-nums ${s.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(s.totalPnl)}</td>
                        <td className={`px-4 py-3 tabular-nums ${s.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(s.avgPnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">P&L by Ticker</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={tickerStats.slice(0, 12)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                    <XAxis dataKey="ticker" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="totalPnl" name="Total PnL" radius={[4, 4, 0, 0]}>
                      {tickerStats.slice(0, 12).map((s, i) => <Cell key={i} fill={s.totalPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.75} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* By Time Tab */}
          {tab === 'By Time' && (
            <div className="space-y-5">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Trade Performance by Time of Day</h3>
                <p className="text-xs text-text-muted mb-4">Each dot represents one trade. Green = profit, Red = loss.</p>
                <ScatterPlot data={scatter} height={320} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
