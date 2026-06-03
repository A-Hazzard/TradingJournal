'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Activity, TrendingUp, Target, Calendar as CalendarIcon, Share2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { ShareModal } from '@/components/ui/ShareModal'
import { PnlAreaChart } from '@/components/charts/PnlAreaChart'
import { DailyBarChart } from '@/components/charts/DailyBarChart'
import { RadarScoreChart } from '@/components/charts/RadarScoreChart'
import { ScatterPlot } from '@/components/charts/ScatterPlot'
import { Calendar } from '@/components/ui/Calendar'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchTrades,
  selectKpis, selectCumulativePnlSeries, selectDailyBarSeries,
  selectScatterSeries, selectRadarData, selectClosedTrades, selectTradesStatus,
} from '@/store/tradesSlice'
import { formatCurrency, formatWinRate } from '@/lib/formatters'
import { getMonthlyCalendarData } from '@/lib/calculations'
import DashboardSkeleton from '@/components/ui/skeletons/DashboardSkeleton'

// ── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectTradesStatus)
  const kpis = useAppSelector(selectKpis)
  const cumSeries = useAppSelector(selectCumulativePnlSeries)
  const dailySeries = useAppSelector(selectDailyBarSeries)
  const scatter = useAppSelector(selectScatterSeries)
  const radar = useAppSelector(selectRadarData)
  const trades = useAppSelector(selectClosedTrades)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [shareOpen, setShareOpen] = useState(false)
  const [username, setUsername] = useState('trader')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => { if (user?.username) setUsername(user.username) })
      .catch(() => {})
  }, [])

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthStats = getMonthlyCalendarData(trades, calYear, calMonth)

  // ============================================================================
  // Fetch trades on mount if not yet loaded
  // ============================================================================
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTrades())
    }
  }, [dispatch, status])

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(year => year - 1) } else setCalMonth(month => month - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(year => year + 1) } else setCalMonth(month => month + 1) }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Performance overview"
        actions={
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
          >
            <Share2 size={13} />
            Share
          </button>
        }
      />

      {status === 'loading' ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ============================================================================
              KPI Cards
          ============================================================================ */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <KpiCard
              title="Net P&L"
              value={formatCurrency(kpis.netPnl)}
              variant={kpis.netPnl >= 0 ? 'profit' : 'loss'}
              icon={<TrendingUp size={16} />}
            />
            <KpiCard
              title="Trade Win %"
              value={formatWinRate(kpis.winRate)}
              subValue={`${kpis.totalWins}W / ${kpis.totalLosses}L`}
              variant="accent"
              icon={<Target size={16} />}
            />
            <KpiCard
              title="Profit Factor"
              value={kpis.profitFactor.toFixed(2)}
              variant={kpis.profitFactor >= 1.5 ? 'profit' : 'default'}
              icon={<Activity size={16} />}
            />
            <KpiCard
              title="Day Win %"
              value={formatWinRate(kpis.dayWinRate)}
              variant="default"
              icon={<CalendarIcon size={16} />}
            />
            <KpiCard
              title="Avg Win / Loss"
              value={`${formatCurrency(kpis.avgWin, 0)} / ${formatCurrency(Math.abs(kpis.avgLoss), 0)}`}
              subValue={`Largest: ${formatCurrency(kpis.largestWin, 0)}`}
              variant="default"
            />
          </div>

          {/* ============================================================================
              Radar Score + Cumulative P&L
          ============================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Performance Score</h3>
              <p className="text-xs text-text-muted mb-3">6-dimension skill analysis</p>
              <RadarScoreChart data={radar} score={kpis.zellaScore} height={240} />
            </div>
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Daily Net Cumulative P&L</h3>
              <p className="text-xs text-text-muted mb-3">{formatCurrency(kpis.netPnl)} total • {kpis.totalTrades} trades</p>
              <PnlAreaChart data={cumSeries} height={240} />
            </div>
          </div>

          {/* ============================================================================
              Daily P&L Bars + Time Scatter
          ============================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Net Daily P&L</h3>
              <p className="text-xs text-text-muted mb-3">Day-by-day breakdown</p>
              <DailyBarChart data={dailySeries} height={200} />
            </div>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Trade Time Performance</h3>
              <p className="text-xs text-text-muted mb-3">P&L by time of entry</p>
              <ScatterPlot data={scatter} height={200} />
            </div>
          </div>

          {/* ============================================================================
              Monthly Calendar Heatmap
          ============================================================================ */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Monthly Calendar Stats</h3>
                <p className="text-xs text-text-muted">Daily P&L overview</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-text-primary min-w-[120px] text-center">
                  {MONTHS[calMonth]} {calYear}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <Calendar
              year={calYear}
              month={calMonth}
              stats={monthStats}
              onDayClick={(date) => router.push(`/journal?date=${date}`)}
            />
            <div className="flex items-center gap-4 mt-4 text-xs text-text-muted justify-end">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-profit/80 inline-block" /> Big win (&gt;$500)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-profit/30 inline-block" /> Win</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-loss/25 inline-block" /> Loss</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-loss/70 inline-block" /> Big loss</span>
            </div>
          </div>

          {/* ============================================================================
              Additional KPI Stat Cards
          ============================================================================ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs text-text-muted">Total Trades</p>
              <p className="text-xl font-bold text-text-primary mt-1">{kpis.totalTrades}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted">Largest Win</p>
              <p className="text-xl font-bold text-profit mt-1">{formatCurrency(kpis.largestWin)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted">Largest Loss</p>
              <p className="text-xl font-bold text-loss mt-1">{formatCurrency(kpis.largestLoss)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted">Total Commissions</p>
              <p className="text-xl font-bold text-text-primary mt-1">{formatCurrency(kpis.totalCommissions)}</p>
            </div>
          </div>

        </div>
      )}

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        username={username}
      />
    </div>
  )
}
