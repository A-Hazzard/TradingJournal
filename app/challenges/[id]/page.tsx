'use client'

/**
 * @module ChallengeDetailPage
 * Full detail view for a single prop-firm challenge.
 * Shows: constraint rings, P&L equity curve, trade table with R-multiple,
 * edit form for all challenge params, and Mark as Passed/Failed override.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'
import { formatCurrency, formatDateTime, cn } from '@/lib/formatters'
import type { PropChallenge, ChallengeProgress } from '@/lib/propChallenge'
import type { Trade } from '@/types/trade'
import { ArrowLeft, Trash2, Pencil, Save, CheckCircle, XCircle } from 'lucide-react'
import ChallengeDetailSkeleton from '@/components/ui/skeletons/ChallengeDetailSkeleton'
import { buildCumulativePnlSeries } from '@/lib/calculations'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// === Types ===

type DetailResponse = {
  challenge: PropChallenge
  progress: ChallengeProgress
  trades: Trade[]
}

type EditForm = {
  name: string
  profitTarget: string
  maxDailyLoss: string
  maxTotalDrawdown: string
  drawdownType: 'static' | 'trailing'
  phase: 'challenge' | 'verification' | 'funded'
  endDate: string
}

type SortKey = 'date' | 'pnl' | 'r'
type SortDir = 'asc' | 'desc'

// === Constants ===

const PHASE_LABELS: Record<string, string> = {
  challenge: 'Phase 1',
  verification: 'Verification',
  funded: 'Funded',
}

const PHASE_STYLES: Record<string, string> = {
  challenge: 'text-accent bg-accent/10 border-accent/20',
  verification: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  funded: 'text-profit bg-profit/10 border-profit/20',
}

// === Sub-components ===

function Ring({ label, percent, centerTop, centerBottom, danger }: {
  label: string; percent: number; centerTop: string; centerBottom: string; danger?: boolean
}) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const color = danger
    ? clamped >= 100 ? '#ef4444' : clamped > 75 ? '#f59e0b' : '#10b981'
    : clamped >= 100 ? '#10b981' : '#8b5cf6'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#2d2d3a" strokeWidth="8" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.4s' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-text-primary">{centerTop}</span>
          <span className="text-[10px] text-text-muted">{centerBottom}</span>
        </div>
      </div>
      <p className="text-xs text-text-secondary mt-2 font-medium">{label}</p>
    </div>
  )
}

// === Page ===

export default function ChallengeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const id = params.id as string

  const [data, setData] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', profitTarget: '', maxDailyLoss: '', maxTotalDrawdown: '',
    drawdownType: 'static', phase: 'challenge', endDate: '',
  })
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/challenges/${id}`)
      if (res.ok) {
        const json: DetailResponse = await res.json()
        setData(json)
        setEditForm({
          name: json.challenge.name,
          profitTarget: String(json.challenge.profitTarget),
          maxDailyLoss: String(json.challenge.maxDailyLoss),
          maxTotalDrawdown: String(json.challenge.maxTotalDrawdown),
          drawdownType: json.challenge.drawdownType,
          phase: json.challenge.phase,
          endDate: json.challenge.endDate ?? '',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Equity curve from challenge trades ──
  const equityCurve = useMemo(() => {
    if (!data) return []
    return buildCumulativePnlSeries(data.trades)
  }, [data])

  // ── Sorted trades ──
  const sortedTrades = useMemo(() => {
    if (!data) return []
    return [...data.trades].sort((a, b) => {
      let diff = 0
      if (sortKey === 'date') diff = new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime()
      else if (sortKey === 'pnl') diff = a.pnl - b.pnl
      else diff = (a.rMultiple ?? 0) - (b.rMultiple ?? 0)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [data, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function updateEdit(field: keyof EditForm, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          profitTarget: Number(editForm.profitTarget),
          maxDailyLoss: Number(editForm.maxDailyLoss),
          maxTotalDrawdown: Number(editForm.maxTotalDrawdown),
          drawdownType: editForm.drawdownType,
          phase: editForm.phase,
          endDate: editForm.endDate || null,
        }),
      })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Challenge updated', type: 'success' }))
      setEditing(false)
      await load()
    } catch {
      dispatch(addToast({ message: 'Failed to update challenge', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkStatus(status: 'passed' | 'failed') {
    try {
      const res = await fetch(`/api/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: `Challenge marked as ${status}`, type: 'success' }))
      await load()
    } catch {
      dispatch(addToast({ message: 'Failed to update status', type: 'error' }))
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Challenge deleted', type: 'success' }))
      router.push('/challenges')
    } catch {
      dispatch(addToast({ message: 'Failed to delete challenge', type: 'error' }))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Challenge" />
        <ChallengeDetailSkeleton />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Challenge Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <Button onClick={() => router.push('/challenges')}>Back to Challenges</Button>
        </div>
      </div>
    )
  }

  const { challenge, progress, trades } = data
  const statusColor =
    progress.computedStatus === 'failed' ? 'text-loss' :
    progress.computedStatus === 'passed' ? 'text-profit' :
    progress.computedStatus === 'warning' ? 'text-amber-400' : 'text-profit'

  const SortIndicator = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span className="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={challenge.name} subtitle={`${challenge.firm.toUpperCase()} · ${challenge.drawdownType} drawdown`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Back + action bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => router.push('/challenges')} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm">
            <ArrowLeft size={16} /> Back to Challenges
          </button>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" loading={saving} onClick={handleSave} leftIcon={<Save size={14} />}>Save</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)} leftIcon={<Pencil size={14} />}>Edit</Button>
                {challenge.status === 'active' && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => handleMarkStatus('passed')} leftIcon={<CheckCircle size={14} />}>Mark Passed</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleMarkStatus('failed')} leftIcon={<XCircle size={14} />}>Mark Failed</Button>
                  </>
                )}
                <Button variant="danger" size="sm" onClick={handleDelete} leftIcon={<Trash2 size={14} />}>Delete</Button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit form ── */}
        {editing && (
          <div className="card p-5 space-y-4 border-accent/30">
            <h3 className="text-sm font-semibold text-text-primary">Edit Challenge</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs text-text-muted block mb-1.5">Name</label>
                <input value={editForm.name} onChange={(e) => updateEdit('name', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Phase</label>
                <select value={editForm.phase} onChange={(e) => updateEdit('phase', e.target.value)} className="input-base">
                  <option value="challenge">Phase 1 — Challenge</option>
                  <option value="verification">Verification</option>
                  <option value="funded">Funded</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Profit Target ($)</label>
                <input type="number" value={editForm.profitTarget} onChange={(e) => updateEdit('profitTarget', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Max Daily Loss ($)</label>
                <input type="number" value={editForm.maxDailyLoss} onChange={(e) => updateEdit('maxDailyLoss', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Max Total Drawdown ($)</label>
                <input type="number" value={editForm.maxTotalDrawdown} onChange={(e) => updateEdit('maxTotalDrawdown', e.target.value)} className="input-base" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Drawdown Type</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['static', 'trailing'] as const).map((t) => (
                    <button key={t} onClick={() => updateEdit('drawdownType', t)}
                      className={cn('flex-1 py-2 text-xs font-medium transition-colors capitalize', editForm.drawdownType === t ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">End Date (optional)</label>
                <input type="date" value={editForm.endDate} onChange={(e) => updateEdit('endDate', e.target.value)} className="input-base" />
              </div>
            </div>
          </div>
        )}

        {/* ── Breach / success banners ── */}
        {progress.computedStatus === 'failed' && (
          <div className="bg-loss/10 border border-loss/30 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-loss">Challenge failed</p>
            <p className="text-xs text-text-muted">
              {progress.dailyLimitBreached ? 'Daily loss limit breached. ' : ''}
              {progress.totalDrawdownBreached ? 'Maximum drawdown breached.' : ''}
            </p>
          </div>
        )}
        {progress.computedStatus === 'passed' && (
          <div className="bg-profit/10 border border-profit/30 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-profit">🎉 Profit target reached!</p>
            <p className="text-xs text-text-muted">You&apos;ve hit the profit target without breaching any rules.</p>
          </div>
        )}

        {/* ── Balance summary ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <p className="text-xs text-text-muted">Account Balance</p>
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', PHASE_STYLES[challenge.phase])}>
                {PHASE_LABELS[challenge.phase]}
              </span>
              <span className={cn('text-xs font-semibold uppercase', statusColor)}>{progress.computedStatus}</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(progress.currentBalance)}
            <span className={cn('text-sm ml-2', progress.totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
              ({progress.totalPnl >= 0 ? '+' : ''}{formatCurrency(progress.totalPnl)})
            </span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            Started {formatCurrency(challenge.startingBalance)} on {challenge.startDate}
            {challenge.endDate && <span className="ml-2">· Ended {challenge.endDate}</span>}
          </p>
        </div>

        {/* ── Constraint rings ── */}
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Ring
              label="Profit Target"
              percent={progress.profitTargetProgress}
              centerTop={`${Math.max(0, progress.profitTargetProgress).toFixed(0)}%`}
              centerBottom={formatCurrency(challenge.profitTarget)}
            />
            <Ring
              label="Daily Loss Limit"
              percent={progress.dailyLimitUsedPercent}
              centerTop={`${progress.dailyLimitUsedPercent.toFixed(0)}%`}
              centerBottom={formatCurrency(challenge.maxDailyLoss)}
              danger
            />
            <Ring
              label="Total Drawdown"
              percent={progress.totalDrawdownUsedPercent}
              centerTop={`${progress.totalDrawdownUsedPercent.toFixed(0)}%`}
              centerBottom={formatCurrency(challenge.maxTotalDrawdown)}
              danger
            />
          </div>
        </div>

        {/* ── P&L Equity Curve ── */}
        {equityCurve.length > 1 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">P&L Since Challenge Start</h3>
                <p className="text-xs text-text-muted">Cumulative P&L across {trades.length} trades</p>
              </div>
              <span className={`text-sm font-bold ${progress.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {progress.totalPnl >= 0 ? '+' : ''}{formatCurrency(progress.totalPnl)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="challengeEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#16161e', border: '1px solid #2d2d3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), 'Cumulative P&L']}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="cumPnl" stroke="#8b5cf6" strokeWidth={2} fill="url(#challengeEquityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Trade table ── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Trades Since Challenge Start ({trades.length})</h3>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">No trades since {challenge.startDate}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { key: 'date' as SortKey, label: 'Date' },
                      { key: null, label: 'Ticker' },
                      { key: null, label: 'Dir' },
                      { key: 'pnl' as SortKey, label: 'P&L' },
                      { key: 'r' as SortKey, label: 'R' },
                    ].map(({ key, label }) => (
                      <th
                        key={label}
                        className={cn('px-4 py-2.5 text-left text-xs font-medium text-text-muted', key && 'cursor-pointer hover:text-text-primary')}
                        onClick={key ? () => toggleSort(key) : undefined}
                      >
                        {label}
                        {key && <SortIndicator col={key} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-alt/50 cursor-pointer" onClick={() => router.push(`/trades/${t.id}`)}>
                      <td className="px-4 py-2.5 text-text-secondary">{formatDateTime(t.entryDateTime)}</td>
                      <td className="px-4 py-2.5 font-bold text-text-primary">{t.ticker}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.direction === 'LONG' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>{t.direction}</span>
                      </td>
                      <td className={`px-4 py-2.5 font-semibold tabular-nums ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(t.pnl)}</td>
                      <td className={`px-4 py-2.5 tabular-nums font-medium ${t.rMultiple != null && t.rMultiple > 0 ? 'text-profit' : t.rMultiple != null && t.rMultiple < 0 ? 'text-loss' : 'text-text-muted'}`}>
                        {t.rMultiple != null ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple}R` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
