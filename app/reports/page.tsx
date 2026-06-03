'use client'

import { useMemo, useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchTrades, selectKpis, selectSetupStats, selectTickerStats, selectScatterSeries,
  selectClosedTrades, selectTradesStatus,
  selectPnlByHour, selectPnlByDayOfWeek, selectPnlByDuration,
  selectRollingExpectancy, selectStreakStats,
} from '@/store/tradesSlice'
import { ScatterPlot } from '@/components/charts/ScatterPlot'
import { formatCurrency } from '@/lib/formatters'
import { detectRevengeTrades } from '@/lib/calculations'
import { generateTimeInsight, generateDayInsight, generateDurationInsight } from '@/lib/insights'
import { EMOTIONS } from '@/components/ui/EmotionPicker'
import ReportsSkeleton from '@/components/ui/skeletons/ReportsSkeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import type { Trade } from '@/types/trade'

const TABS = ['Overview', 'By Setup', 'By Ticker', 'By Time', 'Trends', 'Psychology'] as const
type Tab = typeof TABS[number]

function InsightCallout({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-text-secondary">
      💡 {text}
    </div>
  )
}

const PROCESS_GRADES = ['A', 'B', 'C', 'D', 'F'] as const
const GRADE_COLORS: Record<string, string> = {
  A: '#10b981', B: '#22c55e', C: '#f59e0b', D: '#f97316', F: '#ef4444',
}

export default function ReportsPage() {
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState<Tab>('Overview')
  const status = useAppSelector(selectTradesStatus)
  const kpis = useAppSelector(selectKpis)
  const setupStats = useAppSelector(selectSetupStats)
  const tickerStats = useAppSelector(selectTickerStats)
  const scatter = useAppSelector(selectScatterSeries)
  const closedTrades = useAppSelector(selectClosedTrades)
  const pnlByHour = useAppSelector(selectPnlByHour)
  const pnlByDay = useAppSelector(selectPnlByDayOfWeek)
  const pnlByDuration = useAppSelector(selectPnlByDuration)
  const rollingExpectancy = useAppSelector(selectRollingExpectancy)
  const streaks = useAppSelector(selectStreakStats)

  const timeInsight = useMemo(() => generateTimeInsight(pnlByHour), [pnlByHour])
  const dayInsight = useMemo(() => generateDayInsight(pnlByDay), [pnlByDay])
  const durationInsight = useMemo(() => generateDurationInsight(pnlByDuration), [pnlByDuration])

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTrades())
  }, [dispatch, status])

  // ── Psychology calculations ────────────────────────────────────────────────
  const emotionStats = useMemo(() => {
    const tagged = closedTrades.filter((t) => t.emotionTag)
    const map = new Map<string, Trade[]>()
    tagged.forEach((t) => {
      const key = t.emotionTag!
      map.set(key, [...(map.get(key) ?? []), t])
    })
    return Array.from(map.entries())
      .map(([emotion, trades]) => ({
        emotion,
        count: trades.length,
        avgPnl: trades.reduce((s, t) => s + t.pnl, 0) / trades.length,
        totalPnl: trades.reduce((s, t) => s + t.pnl, 0),
        winRate: (trades.filter((t) => t.pnl > 0).length / trades.length) * 100,
        emoji: EMOTIONS.find((e) => e.value === emotion)?.emoji ?? '❓',
        label: EMOTIONS.find((e) => e.value === emotion)?.label ?? emotion,
      }))
      .sort((a, b) => b.avgPnl - a.avgPnl)
  }, [closedTrades])

  const gradeStats = useMemo(() =>
    PROCESS_GRADES.map((grade) => {
      const graded = closedTrades.filter((t) => t.processGrade === grade)
      return {
        grade,
        count: graded.length,
        avgPnl: graded.length ? graded.reduce((s, t) => s + t.pnl, 0) / graded.length : 0,
        totalPnl: graded.reduce((s, t) => s + t.pnl, 0),
      }
    })
  , [closedTrades])

  const mistakeStats = useMemo(() => {
    const mistakeTrades = closedTrades.filter((t) => t.mistakeType)
    const map = new Map<string, { count: number; totalPnl: number }>()
    mistakeTrades.forEach((t) => {
      const key = t.mistakeType!
      const prev = map.get(key) ?? { count: 0, totalPnl: 0 }
      map.set(key, { count: prev.count + 1, totalPnl: prev.totalPnl + t.pnl })
    })
    return Array.from(map.entries())
      .map(([mistake, data]) => ({ mistake: mistake.replace(/_/g, ' '), ...data }))
      .sort((a, b) => a.totalPnl - b.totalPnl)
  }, [closedTrades])

  const revengeTrades = useMemo(() => detectRevengeTrades(closedTrades), [closedTrades])
  const revengeTotal = revengeTrades.reduce((s, t) => s + t.pnl, 0)

  const taggedCount = closedTrades.filter((t) => t.emotionTag).length
  const gradedCount = closedTrades.filter((t) => t.processGrade).length

  // ── Shared tooltip ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomBarTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-surface border border-border rounded-lg p-3 text-xs shadow-lg">
        <p className="text-text-secondary mb-1">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.fill }}>
            {p.name}:{' '}
            {typeof p.value === 'number' && p.name?.includes('PnL')
              ? formatCurrency(p.value)
              : p.name?.includes('Rate')
              ? `${p.value.toFixed(1)}%`
              : p.value}
          </p>
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
          <div className="flex gap-1 bg-surface-alt rounded-xl p-1 w-fit flex-wrap">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-surface text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-primary'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
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

          {/* ── By Setup Tab ── */}
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

          {/* ── By Ticker Tab ── */}
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

          {/* ── By Time Tab ── */}
          {tab === 'By Time' && (
            <div className="space-y-5">
              {/* Scatter */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Trade Performance by Time of Day</h3>
                <p className="text-xs text-text-muted mb-4">Each dot represents one trade. Green = profit, Red = loss.</p>
                <ScatterPlot data={scatter} height={260} />
              </div>

              <InsightCallout text={timeInsight} />

              {/* P&L by Hour */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Average P&L by Hour</h3>
                {pnlByHour.length === 0 ? (
                  <p className="text-xs text-text-muted py-8 text-center">No closed trades yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={pnlByHour} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                      <XAxis dataKey="hourLabel" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="avgPnl" name="Avg PnL" radius={[4, 4, 0, 0]}>
                        {pnlByHour.map((h, i) => <Cell key={i} fill={h.avgPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* P&L by Day of Week */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Performance by Day of Week</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Day', 'Trades', 'Win Rate', 'Avg P&L', 'Net P&L'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pnlByDay.map((d) => {
                        const best = pnlByDay.reduce((a, b) => (a.totalPnl > b.totalPnl ? a : b))
                        const worst = pnlByDay.reduce((a, b) => (a.totalPnl < b.totalPnl ? a : b))
                        const highlight = d.count > 0 && d.day === best.day ? 'bg-profit/5' : d.count > 0 && d.day === worst.day && worst.totalPnl < 0 ? 'bg-loss/5' : ''
                        return (
                          <tr key={d.day} className={`hover:bg-surface-alt/50 transition-colors ${highlight}`}>
                            <td className="px-4 py-2.5 font-medium text-text-primary">{d.day}</td>
                            <td className="px-4 py-2.5 text-text-secondary">{d.count}</td>
                            <td className="px-4 py-2.5 text-text-secondary">{d.count ? `${d.winRate.toFixed(0)}%` : '—'}</td>
                            <td className={`px-4 py-2.5 tabular-nums ${d.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{d.count ? formatCurrency(d.avgPnl) : '—'}</td>
                            <td className={`px-4 py-2.5 font-semibold tabular-nums ${d.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{d.count ? formatCurrency(d.totalPnl) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <InsightCallout text={dayInsight} />

              {/* Holding Duration */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-1">P&L by Holding Duration</h3>
                <p className="text-xs text-text-muted mb-4">Are you cutting winners early or holding losers too long?</p>
                {pnlByDuration.every((d) => d.count === 0) ? (
                  <p className="text-xs text-text-muted py-8 text-center">No closed trades with duration data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pnlByDuration} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="avgPnl" name="Avg PnL" radius={[4, 4, 0, 0]}>
                        {pnlByDuration.map((d, i) => <Cell key={i} fill={d.avgPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <InsightCallout text={durationInsight} />
            </div>
          )}

          {/* ── Trends Tab ── */}
          {tab === 'Trends' && (
            <div className="space-y-5">
              {/* Streak stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="card p-4">
                  <p className="text-xs text-text-muted">Current Streak</p>
                  <p className={`text-2xl font-bold mt-1 ${streaks.currentStreakType === 'win' ? 'text-profit' : streaks.currentStreakType === 'loss' ? 'text-loss' : 'text-text-primary'}`}>
                    {streaks.currentStreak > 0
                      ? `${streaks.currentStreak} ${streaks.currentStreakType === 'win' ? 'Wins' : 'Losses'}`
                      : '—'}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-text-muted">Best Win Streak</p>
                  <p className="text-2xl font-bold text-profit mt-1">{streaks.bestWinStreak}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs text-text-muted">Worst Loss Streak</p>
                  <p className="text-2xl font-bold text-loss mt-1">{streaks.worstLossStreak}</p>
                </div>
              </div>

              {/* Rolling expectancy */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-1">Rolling Expectancy (20-trade window)</h3>
                <p className="text-xs text-text-muted mb-4">Average P&L per trade over a moving window. Rising = your edge is improving.</p>
                {rollingExpectancy.length === 0 ? (
                  <p className="text-xs text-text-muted py-8 text-center">Need at least 20 closed trades to compute rolling expectancy.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={rollingExpectancy} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ stroke: '#2d2d3a' }} />
                      <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="expectancy" name="Expectancy" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* ── Psychology Tab ── */}
          {tab === 'Psychology' && (
            <div className="space-y-6">

              {taggedCount === 0 && gradedCount === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-2xl mb-2">🧠</p>
                  <p className="text-sm font-medium text-text-primary mb-1">No psychology data yet</p>
                  <p className="text-xs text-text-muted">Add emotion tags and process grades when logging trades to unlock these insights.</p>
                </div>
              )}

              {/* ── Emotion vs P&L ── */}
              {emotionStats.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Emotion vs P&L</h3>
                    <p className="text-xs text-text-muted mt-0.5">Average P&L per trade when you felt each emotion</p>
                  </div>

                  <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Emotion', 'Trades', 'Win Rate', 'Avg P&L', 'Total P&L'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {emotionStats.map(s => (
                          <tr key={s.emotion} className="hover:bg-surface-alt/50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-base mr-2">{s.emoji}</span>
                              <span className="font-medium text-text-primary">{s.label}</span>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">{s.count}</td>
                            <td className="px-4 py-3 text-text-secondary">{s.winRate.toFixed(0)}%</td>
                            <td className={`px-4 py-3 font-semibold tabular-nums ${s.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {formatCurrency(s.avgPnl)}
                            </td>
                            <td className={`px-4 py-3 tabular-nums ${s.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {formatCurrency(s.totalPnl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Avg P&L by Emotion</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={emotionStats} margin={{ top: 5, right: 10, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#64748b', fontSize: 11 }}
                          axisLine={false} tickLine={false}
                          angle={-20} textAnchor="end"
                        />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Bar dataKey="avgPnl" name="Avg PnL" radius={[4, 4, 0, 0]}>
                          {emotionStats.map((s, i) => (
                            <Cell key={i} fill={s.avgPnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Process Grade vs Outcome ── */}
              {gradedCount > 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Process Grade vs Outcome</h3>
                    <p className="text-xs text-text-muted mt-0.5">Does following your rules actually improve results?</p>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    {gradeStats.map(({ grade, count, avgPnl, totalPnl }) => (
                      <div key={grade} className="card p-3 text-center space-y-1">
                        <p className="text-2xl font-black" style={{ color: GRADE_COLORS[grade] }}>{grade}</p>
                        <p className="text-xs text-text-muted">{count} trades</p>
                        <p className={`text-sm font-bold tabular-nums ${avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(avgPnl)}
                        </p>
                        <p className="text-[10px] text-text-muted">avg</p>
                        <p className={`text-xs tabular-nums ${totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatCurrency(totalPnl)}
                        </p>
                        <p className="text-[10px] text-text-muted">total</p>
                      </div>
                    ))}
                  </div>

                  {/* Insight callout */}
                  {(() => {
                    const aGrade = gradeStats.find(g => g.grade === 'A')
                    const fGrade = gradeStats.find(g => g.grade === 'F')
                    if (aGrade && fGrade && aGrade.count > 0 && fGrade.count > 0) {
                      const diff = aGrade.avgPnl - fGrade.avgPnl
                      return (
                        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-3 text-sm text-text-secondary">
                          💡 Your A-grade trades average <span className="text-profit font-semibold">{formatCurrency(aGrade.avgPnl)}</span> vs F-grade trades at{' '}
                          <span className="text-loss font-semibold">{formatCurrency(fGrade.avgPnl)}</span>.{' '}
                          Following your rules is worth <span className="text-accent font-semibold">{formatCurrency(diff)}</span> per trade.
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}

              {/* ── Mistake Analysis ── */}
              {mistakeStats.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Mistake Analysis</h3>
                    <p className="text-xs text-text-muted mt-0.5">How much each mistake type is costing you</p>
                  </div>
                  <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Mistake', 'Count', 'Total P&L Lost'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {mistakeStats.map(s => (
                          <tr key={s.mistake} className="hover:bg-surface-alt/50">
                            <td className="px-4 py-3 font-medium text-text-primary capitalize">{s.mistake}</td>
                            <td className="px-4 py-3 text-text-secondary">{s.count}</td>
                            <td className={`px-4 py-3 font-semibold tabular-nums ${s.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {formatCurrency(s.totalPnl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Revenge Trade Detection ── */}
              {revengeTrades.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">⚠ Potential Revenge Trades</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Trades entered within 10 minutes of a loss · Total cost:{' '}
                      <span className="text-loss font-semibold">{formatCurrency(revengeTotal)}</span>
                    </p>
                  </div>
                  <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Date', 'Ticker', 'Direction', 'P&L', 'Gap After Loss'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {revengeTrades.map((t) => {
                          const date = new Date(t.entryDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          const time = new Date(t.entryDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <tr key={t.id} className="hover:bg-surface-alt/50">
                              <td className="px-4 py-3 text-text-secondary">{date} {time}</td>
                              <td className="px-4 py-3 font-bold text-text-primary">{t.ticker}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.direction === 'LONG' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
                                  {t.direction}
                                </span>
                              </td>
                              <td className={`px-4 py-3 font-semibold tabular-nums ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {formatCurrency(t.pnl)}
                              </td>
                              <td className="px-4 py-3 text-amber-400 text-xs">
                                {t.emotionTag === 'revenge' ? '💀 tagged revenge' : '⚡ rapid re-entry'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
