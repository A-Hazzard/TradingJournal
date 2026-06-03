'use client'

/**
 * @module RiskPage
 * Risk management dashboard — position sizing, loss limit monitoring,
 * account equity curve, drawdown tracking, and streak display.
 */

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { KpiCard } from '@/components/ui/KpiCard'
import { Button } from '@/components/ui/Button'
import RiskSkeleton from '@/components/ui/skeletons/RiskSkeleton'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchTrades, selectKpis, selectRMultipleDistribution, selectExpectancy,
  selectStreakStats, selectTradesStatus, selectClosedTrades,
} from '@/store/tradesSlice'
import { addToast } from '@/store/uiSlice'
import { formatCurrency } from '@/lib/formatters'
import { ShieldAlert, Calculator, TrendingDown, Settings2, Flame, Snowflake } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
} from 'recharts'
import { buildCumulativePnlSeries } from '@/lib/calculations'

// === Types ===

type RiskSettings = {
  accountBalance: number
  startingBalance: number
  dailyLossLimit: number
  maxRiskPerTrade: number
  maxDailyRiskPercent: number
}

type RiskToday = {
  todayPnl: number
  todayTrades: number
  dailyLimitUsedPercent: number
  isLimitBreached: boolean
  currentBalance: number
  peakBalance: number
  currentDrawdown: number
  currentDrawdownPercent: number
  startingBalance: number
  dailyLossLimit: number
}

// === Page ===

export default function RiskPage() {
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectTradesStatus)
  const kpis = useAppSelector(selectKpis)
  const rDist = useAppSelector(selectRMultipleDistribution)
  const expectancy = useAppSelector(selectExpectancy)
  const streaks = useAppSelector(selectStreakStats)
  const closedTrades = useAppSelector(selectClosedTrades)

  const [settings, setSettings] = useState<RiskSettings | null>(null)
  const [today, setToday] = useState<RiskToday | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Position size calculator inputs
  const [calcRiskPercent, setCalcRiskPercent] = useState(1)
  const [calcEntry, setCalcEntry] = useState<number | ''>('')
  const [calcStop, setCalcStop] = useState<number | ''>('')

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTrades())
    loadRisk()
  }, [dispatch, status])

  async function loadRisk() {
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/risk/settings'),
        fetch('/api/risk/today'),
      ])
      if (sRes.ok) setSettings(await sRes.json())
      if (tRes.ok) setToday(await tRes.json())
    } catch {
      // silent — UI shows fallbacks
    }
  }

  async function saveSettings(updated: Partial<RiskSettings>) {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/risk/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSettings(data)
      await loadRisk()
      dispatch(addToast({ message: 'Risk settings saved', type: 'success' }))
      setEditOpen(false)
    } catch {
      dispatch(addToast({ message: 'Failed to save settings', type: 'error' }))
    } finally {
      setSavingSettings(false)
    }
  }

  // ── Position size calc ──
  const positionCalc = useMemo(() => {
    if (!settings || calcEntry === '' || calcStop === '' || calcEntry === calcStop) return null
    const accountSize = settings.accountBalance
    const riskAmount = accountSize * (calcRiskPercent / 100)
    const stopDistance = Math.abs(Number(calcEntry) - Number(calcStop))
    if (stopDistance <= 0) return null
    const shares = Math.floor(riskAmount / stopDistance)
    const positionValue = shares * Number(calcEntry)
    return { riskAmount, stopDistance, shares, positionValue }
  }, [settings, calcRiskPercent, calcEntry, calcStop])

  // ── Equity curve (cumulative P&L over time) ──
  const equityCurve = useMemo(() => buildCumulativePnlSeries(closedTrades), [closedTrades])

  const limitStatus = today
    ? today.isLimitBreached
      ? 'danger'
      : today.dailyLimitUsedPercent > 75
      ? 'warning'
      : 'safe'
    : 'safe'

  // ── Drawdown bar (% of peak balance lost) ──
  const drawdownPct = today ? Math.min(today.currentDrawdownPercent, 100) : 0
  const drawdownColor = drawdownPct >= 20 ? 'bg-loss' : drawdownPct >= 10 ? 'bg-amber-500' : 'bg-profit'

  // ── Current streak display ──
  const streakIsWin = streaks.currentStreakType === 'win'
  const streakValue = streaks.currentStreak ?? 0

  const profitFactor = kpis.profitFactor

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Risk Management"
        subtitle="Position sizing & loss limits"
        actions={
          <button
            onClick={() => setEditOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
          >
            <Settings2 size={13} /> Settings
          </button>
        }
      />

      {status === 'loading' ? (
        <RiskSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Settings editor ── */}
          {editOpen && settings && (
            <SettingsEditor settings={settings} saving={savingSettings} onSave={saveSettings} onCancel={() => setEditOpen(false)} />
          )}

          {/* ── Daily limit breach banner ── */}
          {today?.isLimitBreached && (
            <div className="bg-loss/10 border border-loss/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <ShieldAlert size={18} className="text-loss" />
              <div>
                <p className="text-sm font-semibold text-loss">Daily loss limit reached</p>
                <p className="text-xs text-text-muted">You&apos;ve hit your {formatCurrency(today.dailyLossLimit)} daily limit. Consider stopping for the day.</p>
              </div>
            </div>
          )}

          {/* ── Account Overview — 5 KPI cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KpiCard
              title="Current Balance"
              value={formatCurrency(today?.currentBalance ?? settings?.accountBalance ?? 0)}
              subValue={`Started ${formatCurrency(today?.startingBalance ?? settings?.startingBalance ?? 0)}`}
              variant="accent"
            />
            <KpiCard
              title="Peak Balance"
              value={formatCurrency(today?.peakBalance ?? 0)}
              variant="profit"
            />
            <KpiCard
              title="Today's P&L"
              value={formatCurrency(today?.todayPnl ?? 0)}
              subValue={`${today?.todayTrades ?? 0} trades today`}
              variant={today && today.todayPnl >= 0 ? 'profit' : 'loss'}
            />
            <KpiCard title="Profit Factor" value={profitFactor.toFixed(2)} variant={profitFactor >= 1.5 ? 'profit' : 'default'} />
            <KpiCard
              title="Current Streak"
              value={streakValue > 0 ? `${streakIsWin ? '🔥' : '🥶'} ${streakValue}${streakIsWin ? 'W' : 'L'}` : '—'}
              subValue={streakValue > 0 ? (streakIsWin ? 'Win streak' : 'Loss streak') : 'No active streak'}
              variant={streakValue > 0 ? (streakIsWin ? 'profit' : 'loss') : 'default'}
            />
          </div>

          {/* ── Drawdown card ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-loss" />
                <h3 className="text-sm font-semibold text-text-primary">Account Drawdown</h3>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${today && today.currentDrawdown > 0 ? 'text-loss' : 'text-profit'}`}>
                  {formatCurrency(today?.currentDrawdown ?? 0)}
                </span>
                <span className="text-xs text-text-muted ml-2">off peak ({drawdownPct.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="h-3 bg-surface-alt rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${drawdownColor}`}
                style={{ width: `${drawdownPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>$0</span>
              <span>Peak: {formatCurrency(today?.peakBalance ?? 0)}</span>
            </div>
          </div>

          {/* ── Account Equity Curve ── */}
          {equityCurve.length > 1 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Account Equity</h3>
                  <p className="text-xs text-text-muted">Cumulative P&L across all closed trades</p>
                </div>
                <span className={`text-sm font-bold ${(equityCurve[equityCurve.length - 1]?.cumPnl ?? 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(equityCurve[equityCurve.length - 1]?.cumPnl ?? 0)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="riskEquityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#16161e', border: '1px solid #2d2d3a', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v), 'Cumulative P&L']}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumPnl" stroke="#8b5cf6" strokeWidth={2} fill="url(#riskEquityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Daily Loss Limit + Position Calc ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Daily Loss Limit */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert size={16} className="text-loss" />
                <h3 className="text-sm font-semibold text-text-primary">Daily Loss Limit</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Limit</span>
                  <span className="text-text-primary font-medium">{formatCurrency(today?.dailyLossLimit ?? settings?.dailyLossLimit ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Used today</span>
                  <span className={`font-medium ${limitStatus === 'danger' ? 'text-loss' : limitStatus === 'warning' ? 'text-amber-400' : 'text-text-primary'}`}>
                    {(today?.dailyLimitUsedPercent ?? 0).toFixed(0)}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-3 bg-surface-alt rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      limitStatus === 'danger' ? 'bg-loss' : limitStatus === 'warning' ? 'bg-amber-500' : 'bg-profit'
                    }`}
                    style={{ width: `${Math.min(today?.dailyLimitUsedPercent ?? 0, 100)}%` }}
                  />
                </div>
                <div className={`text-xs font-medium ${
                  limitStatus === 'danger' ? 'text-loss' : limitStatus === 'warning' ? 'text-amber-400' : 'text-profit'
                }`}>
                  {limitStatus === 'danger' ? '🛑 Limit breached — STOP TRADING' : limitStatus === 'warning' ? '⚠ Approaching daily limit' : '✓ Safe'}
                </div>
              </div>
            </div>

            {/* Position Size Calculator */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={16} className="text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">Position Size Calculator</h3>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Account Size</label>
                    <div className="input-base bg-surface-alt cursor-not-allowed text-text-secondary">
                      {formatCurrency(settings?.accountBalance ?? 0)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Risk % ({calcRiskPercent}%)</label>
                    <input
                      type="range" min={0.25} max={5} step={0.25}
                      value={calcRiskPercent}
                      onChange={(e) => setCalcRiskPercent(Number(e.target.value))}
                      className="w-full accent-accent mt-2.5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Entry Price</label>
                    <input type="number" step="any" value={calcEntry} onChange={(e) => setCalcEntry(e.target.value === '' ? '' : Number(e.target.value))} className="input-base" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Stop Loss</label>
                    <input type="number" step="any" value={calcStop} onChange={(e) => setCalcStop(e.target.value === '' ? '' : Number(e.target.value))} className="input-base" placeholder="0.00" />
                  </div>
                </div>

                {positionCalc ? (
                  <div className="bg-surface-alt rounded-xl p-4 grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Position Size</p>
                      <p className="text-lg font-bold text-accent">{positionCalc.shares.toLocaleString()} units</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Position Value</p>
                      <p className="text-lg font-bold text-text-primary">{formatCurrency(positionCalc.positionValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Risk Amount</p>
                      <p className="text-sm font-semibold text-loss">{formatCurrency(positionCalc.riskAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Stop Distance</p>
                      <p className="text-sm font-semibold text-text-secondary">{positionCalc.stopDistance.toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted text-center py-3">Enter an entry price and stop loss to calculate.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── R-Multiple Distribution ── */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-1">R-Multiple Distribution</h3>
            <p className="text-xs text-text-muted mb-4">How often you hit each risk/reward outcome. -1R = stopped out at plan.</p>
            {rDist.every((d) => d.count === 0) ? (
              <p className="text-xs text-text-muted py-8 text-center">No trades with stop loss data yet. Add a stop loss to trades to see R-multiple analysis.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rDist} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#16161e', border: '1px solid #2d2d3a', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" name="Trades" radius={[4, 4, 0, 0]}>
                    {rDist.map((d, i) => (
                      <Cell key={i} fill={d.bucket.startsWith('-') || d.bucket.startsWith('≤') ? '#ef4444' : d.bucket === '0R' ? '#64748b' : '#10b981'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Risk Metrics ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Expectancy / Trade" value={formatCurrency(expectancy)} variant={expectancy >= 0 ? 'profit' : 'loss'} />
            <KpiCard title="Avg Win / Loss" value={`${formatCurrency(kpis.avgWin, 0)} / ${formatCurrency(Math.abs(kpis.avgLoss), 0)}`} variant="default" />
            <KpiCard title="Best Win Streak" value={`${streaks.bestWinStreak} trades`} variant={streaks.bestWinStreak >= 3 ? 'profit' : 'default'} />
            <KpiCard title="Worst Loss Streak" value={`${streaks.worstLossStreak} trades`} variant={streaks.worstLossStreak >= 4 ? 'loss' : 'default'} />
          </div>

        </div>
      )}
    </div>
  )
}

// === SettingsEditor sub-component ===

function SettingsEditor({
  settings, saving, onSave, onCancel,
}: {
  settings: RiskSettings
  saving: boolean
  onSave: (s: Partial<RiskSettings>) => void
  onCancel: () => void
}) {
  const [accountBalance, setAccountBalance] = useState(settings.accountBalance)
  const [startingBalance, setStartingBalance] = useState(settings.startingBalance)
  const [dailyLossLimit, setDailyLossLimit] = useState(settings.dailyLossLimit)
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState(settings.maxRiskPerTrade)
  const [maxDailyRiskPercent, setMaxDailyRiskPercent] = useState(settings.maxDailyRiskPercent ?? 2)

  return (
    <div className="card p-5 space-y-4 border-accent/30">
      <h3 className="text-sm font-semibold text-text-primary">Risk Settings</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Account Balance ($)</label>
          <input type="number" value={accountBalance} onChange={(e) => setAccountBalance(Number(e.target.value))} className="input-base" />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Starting Balance ($)</label>
          <input type="number" value={startingBalance} onChange={(e) => setStartingBalance(Number(e.target.value))} className="input-base" />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Daily Loss Limit ($)</label>
          <input type="number" value={dailyLossLimit} onChange={(e) => setDailyLossLimit(Number(e.target.value))} className="input-base" />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Max Risk / Trade (%)</label>
          <input type="number" step="0.25" value={maxRiskPerTrade} onChange={(e) => setMaxRiskPerTrade(Number(e.target.value))} className="input-base" />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Max Daily Risk (%)</label>
          <input type="number" step="0.25" value={maxDailyRiskPercent} onChange={(e) => setMaxDailyRiskPercent(Number(e.target.value))} className="input-base" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" loading={saving} onClick={() => onSave({ accountBalance, startingBalance, dailyLossLimit, maxRiskPerTrade, maxDailyRiskPercent })}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}
