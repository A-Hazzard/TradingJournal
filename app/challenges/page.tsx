'use client'

/**
 * @module ChallengesPage
 * Lists all prop-firm challenges. Supports template-based and custom creation.
 * Shows phase badges, start dates, and computed constraint progress bars.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/formatters'
import { CHALLENGE_TEMPLATES, type PropChallenge, type ChallengeProgress } from '@/lib/propChallenge'
import { Trophy, Plus, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import ChallengesSkeleton from '@/components/ui/skeletons/ChallengesSkeleton'

// === Types ===

type ChallengeWithProgress = PropChallenge & { progress: ChallengeProgress }

type CustomForm = {
  name: string
  firm: string
  accountSize: string
  startingBalance: string
  profitTarget: string
  maxDailyLoss: string
  maxTotalDrawdown: string
  drawdownType: 'static' | 'trailing'
  phase: 'challenge' | 'verification' | 'funded'
}

// === Constants ===

const STATUS_STYLES: Record<string, string> = {
  safe: 'text-profit bg-profit/10 border-profit/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  danger: 'text-loss bg-loss/10 border-loss/20',
  passed: 'text-profit bg-profit/10 border-profit/20',
  failed: 'text-loss bg-loss/10 border-loss/20',
}

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

function ConstraintBar({ label, used, limit, percent, invert }: { label: string; used: string; limit: string; percent: number; invert?: boolean }) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const color = invert
    ? clamped >= 100 ? 'bg-loss' : clamped > 75 ? 'bg-amber-500' : 'bg-profit'
    : clamped >= 100 ? 'bg-profit' : 'bg-accent'
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-secondary">{used} / {limit}</span>
      </div>
      <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

// === Page ===

export default function ChallengesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'template' | 'custom'>('template')
  const [creating, setCreating] = useState(false)
  const [customForm, setCustomForm] = useState<CustomForm>({
    name: '', firm: '', accountSize: '', startingBalance: '',
    profitTarget: '', maxDailyLoss: '', maxTotalDrawdown: '',
    drawdownType: 'static', phase: 'challenge',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/challenges')
      if (res.ok) setChallenges(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createFromTemplate(key: string) {
    setCreating(true)
    try {
      const template = CHALLENGE_TEMPLATES[key]
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, startDate: new Date().toISOString().slice(0, 10) }),
      })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Challenge created', type: 'success' }))
      setCreateOpen(false)
      await load()
    } catch {
      dispatch(addToast({ message: 'Failed to create challenge', type: 'error' }))
    } finally {
      setCreating(false)
    }
  }

  async function createCustom() {
    const { name, firm, accountSize, startingBalance, profitTarget, maxDailyLoss, maxTotalDrawdown, drawdownType, phase } = customForm
    if (!name.trim() || !accountSize || !profitTarget || !maxDailyLoss || !maxTotalDrawdown) {
      dispatch(addToast({ message: 'Please fill in all required fields', type: 'error' }))
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          firm: firm.trim() || 'custom',
          accountSize: Number(accountSize),
          startingBalance: Number(startingBalance || accountSize),
          profitTarget: Number(profitTarget),
          maxDailyLoss: Number(maxDailyLoss),
          maxTotalDrawdown: Number(maxTotalDrawdown),
          drawdownType,
          phase,
          startDate: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Challenge created', type: 'success' }))
      setCreateOpen(false)
      setCustomForm({ name: '', firm: '', accountSize: '', startingBalance: '', profitTarget: '', maxDailyLoss: '', maxTotalDrawdown: '', drawdownType: 'static', phase: 'challenge' })
      await load()
    } catch {
      dispatch(addToast({ message: 'Failed to create challenge', type: 'error' }))
    } finally {
      setCreating(false)
    }
  }

  function updateCustom(field: keyof CustomForm, value: string) {
    setCustomForm((prev) => ({ ...prev, [field]: value }))
  }

  const active = challenges.filter((c) => c.status === 'active' && c.progress.computedStatus !== 'passed' && c.progress.computedStatus !== 'failed')
  const completed = challenges.filter((c) => !active.includes(c))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Prop Challenges"
        subtitle="Track your funded account challenges"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus size={14} />}>New Challenge</Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── Create panel ── */}
        {createOpen && (
          <div className="card p-5 space-y-4 border-accent/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">New Challenge</h3>
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(['template', 'custom'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCreateMode(m)}
                    className={cn('px-3 py-1.5 text-xs font-medium transition-colors', createMode === m ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}
                  >
                    {m === 'template' ? 'Templates' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Template grid */}
            {createMode === 'template' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(CHALLENGE_TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    disabled={creating}
                    onClick={() => createFromTemplate(key)}
                    className="text-left p-3 rounded-xl border border-border hover:border-accent/40 transition-colors disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-muted mt-1">
                      Target {formatCurrency(t.profitTarget)} · Daily {formatCurrency(t.maxDailyLoss)} · DD {formatCurrency(t.maxTotalDrawdown)}
                    </p>
                    <span className="text-[10px] text-accent uppercase tracking-wider mt-1 inline-block">{t.drawdownType} drawdown</span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom form */}
            {createMode === 'custom' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Challenge Name *</label>
                    <input value={customForm.name} onChange={(e) => updateCustom('name', e.target.value)} className="input-base" placeholder="e.g. My FTMO $50k" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Firm</label>
                    <input value={customForm.firm} onChange={(e) => updateCustom('firm', e.target.value)} className="input-base" placeholder="e.g. FTMO, Apex…" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Account Size ($) *</label>
                    <input type="number" value={customForm.accountSize} onChange={(e) => updateCustom('accountSize', e.target.value)} className="input-base" placeholder="50000" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Starting Balance ($)</label>
                    <input type="number" value={customForm.startingBalance} onChange={(e) => updateCustom('startingBalance', e.target.value)} className="input-base" placeholder="Same as account size" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Profit Target ($) *</label>
                    <input type="number" value={customForm.profitTarget} onChange={(e) => updateCustom('profitTarget', e.target.value)} className="input-base" placeholder="3000" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Max Daily Loss ($) *</label>
                    <input type="number" value={customForm.maxDailyLoss} onChange={(e) => updateCustom('maxDailyLoss', e.target.value)} className="input-base" placeholder="1000" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Max Total Drawdown ($) *</label>
                    <input type="number" value={customForm.maxTotalDrawdown} onChange={(e) => updateCustom('maxTotalDrawdown', e.target.value)} className="input-base" placeholder="2500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Drawdown Type</label>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      {(['static', 'trailing'] as const).map((t) => (
                        <button key={t} onClick={() => updateCustom('drawdownType', t)}
                          className={cn('flex-1 py-2 text-xs font-medium transition-colors capitalize', customForm.drawdownType === t ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1.5">Phase</label>
                    <select
                      value={customForm.phase}
                      onChange={(e) => updateCustom('phase', e.target.value)}
                      className="input-base"
                    >
                      <option value="challenge">Phase 1 — Challenge</option>
                      <option value="verification">Verification</option>
                      <option value="funded">Funded</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button size="sm" loading={creating} onClick={createCustom}>Create Challenge</Button>
                </div>
              </div>
            )}

            {createMode === 'template' && (
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <ChallengesSkeleton />
        ) : challenges.length === 0 ? (
          <div className="card p-12 text-center">
            <Trophy size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">No challenges yet</p>
            <p className="text-xs text-text-muted mb-4">Track an FTMO, Apex, or Topstep challenge with real-time constraint monitoring.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus size={14} />}>Start a challenge</Button>
          </div>
        ) : (
          <>
            {/* ── Active challenges ── */}
            {active.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Active</h2>
                {active.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/challenges/${c.id}`)}
                    className="card p-5 w-full text-left hover:border-accent/40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">{c.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-text-muted">{formatCurrency(c.startingBalance)} → {formatCurrency(c.progress.currentBalance)} ({c.progress.totalPnl >= 0 ? '+' : ''}{formatCurrency(c.progress.totalPnl)})</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', PHASE_STYLES[c.phase])}>
                            {PHASE_LABELS[c.phase]}
                          </span>
                          <span className="text-[10px] text-text-muted">· Started {c.startDate}</span>
                        </div>
                      </div>
                      <span className={cn('text-[11px] px-2.5 py-1 rounded-full border font-medium uppercase shrink-0', STATUS_STYLES[c.progress.computedStatus])}>
                        {c.progress.computedStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <ConstraintBar label="Profit Target" used={formatCurrency(Math.max(0, c.progress.totalPnl))} limit={formatCurrency(c.profitTarget)} percent={c.progress.profitTargetProgress} />
                      <ConstraintBar label="Daily Loss" used={formatCurrency(Math.abs(c.progress.todayLoss))} limit={formatCurrency(c.maxDailyLoss)} percent={c.progress.dailyLimitUsedPercent} invert />
                      <ConstraintBar label="Total Drawdown" used={formatCurrency(c.progress.currentDrawdown)} limit={formatCurrency(c.maxTotalDrawdown)} percent={c.progress.totalDrawdownUsedPercent} invert />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Completed ── */}
            {completed.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Completed</h2>
                {completed.map((c) => {
                  const passed = c.progress.computedStatus === 'passed' || c.status === 'passed'
                  return (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/challenges/${c.id}`)}
                      className="card p-4 w-full text-left hover:border-accent/40 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {passed ? <CheckCircle2 size={18} className="text-profit" /> : <XCircle size={18} className="text-loss" />}
                        <div>
                          <p className="text-sm font-medium text-text-primary">{c.name}</p>
                          <p className="text-xs text-text-muted">
                            {passed ? 'Passed' : 'Failed'} · {formatCurrency(c.progress.totalPnl)} P&L
                            {c.endDate && <span> · Ended {c.endDate}</span>}
                            <span className={cn('ml-2 text-[10px] px-1.5 py-0.5 rounded border font-medium', PHASE_STYLES[c.phase])}>
                              {PHASE_LABELS[c.phase]}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className={cn('text-[11px] px-2.5 py-1 rounded-full border font-medium uppercase', passed ? STATUS_STYLES.passed : STATUS_STYLES.failed)}>
                        {passed ? 'Passed' : 'Failed'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
