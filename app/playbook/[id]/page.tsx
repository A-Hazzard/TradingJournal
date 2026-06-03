'use client'

/**
 * @module SetupDetailPage
 * Full detail view for a single trading setup.
 * Shows performance stats, equity curve, per-trade P&L bars,
 * entry/exit rules, ideal conditions, metadata (timeframes, asset classes, tags),
 * and a full trade history table.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { GradeBadge } from '@/components/ui/GradeBadge'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { ArrowLeft, Archive, Save, Pencil, X, Plus } from 'lucide-react'
import type { Setup, SetupPerformance } from '@/types/setup'
import type { Trade } from '@/types/trade'
import PlaybookDetailSkeleton from '@/components/ui/skeletons/PlaybookDetailSkeleton'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts'

// === Types ===

type SetupResponse = {
  setup: Setup
  stats: SetupPerformance
  trades: Trade[]
}

// === Constants ===

const PRESET_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '1D', 'Weekly']
const PRESET_ASSET_CLASSES = ['Stocks', 'Futures', 'Forex', 'Crypto', 'Options', 'ETFs']

// === Sub-components ===

function TagInput({
  label, values, onChange, presets,
}: { label: string; values: string[]; onChange: (v: string[]) => void; presets?: string[] }) {
  const [input, setInput] = useState('')

  function add(val: string) {
    const clean = val.trim()
    if (!clean || values.includes(clean)) return
    onChange([...values, clean])
    setInput('')
  }

  function remove(val: string) {
    onChange(values.filter((v) => v !== val))
  }

  return (
    <div>
      <label className="text-xs text-text-muted block mb-2">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs border border-accent/25">
            {v}
            <button type="button" onClick={() => remove(v)} className="hover:text-white transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      {presets && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {presets.filter((p) => !values.includes(p)).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => add(p)}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-border text-text-muted text-xs hover:border-accent/40 hover:text-accent transition-colors"
            >
              <Plus size={9} /> {p}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) } }}
          placeholder="Type and press Enter…"
          className="input-base flex-1 text-sm"
        />
        <Button variant="secondary" size="sm" onClick={() => add(input)}>Add</Button>
      </div>
    </div>
  )
}

// === Page ===

export default function SetupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const id = params.id as string

  const [data, setData] = useState<SetupResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editEntry, setEditEntry] = useState('')
  const [editExit, setEditExit] = useState('')
  const [editIdeal, setEditIdeal] = useState('')
  const [editTimeframes, setEditTimeframes] = useState<string[]>([])
  const [editAssetClasses, setEditAssetClasses] = useState<string[]>([])
  const [editTags, setEditTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/setups/${id}`)
      if (res.ok) {
        const json: SetupResponse = await res.json()
        setData(json)
        setEditDesc(json.setup.description)
        setEditEntry(json.setup.entryRules)
        setEditExit(json.setup.exitRules)
        setEditIdeal(json.setup.idealConditions ?? '')
        setEditTimeframes(json.setup.timeframes ?? [])
        setEditAssetClasses(json.setup.assetClasses ?? [])
        setEditTags(json.setup.tags ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/setups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDesc,
          entryRules: editEntry,
          exitRules: editExit,
          idealConditions: editIdeal,
          timeframes: editTimeframes,
          assetClasses: editAssetClasses,
          tags: editTags,
        }),
      })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Setup updated', type: 'success' }))
      setEditing(false)
      await load()
    } catch {
      dispatch(addToast({ message: 'Failed to update setup', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    try {
      const res = await fetch(`/api/setups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Setup archived', type: 'success' }))
      router.push('/playbook')
    } catch {
      dispatch(addToast({ message: 'Failed to archive setup', type: 'error' }))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Setup Detail" />
        <PlaybookDetailSkeleton />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Setup Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <Button onClick={() => router.push('/playbook')}>Back to Playbook</Button>
        </div>
      </div>
    )
  }

  const { setup, stats, trades } = data

  // ── Equity curve (cumulative P&L) ──
  let cum = 0
  const equityCurve = trades.map((t) => {
    cum += t.pnl
    return { date: t.entryDateTime.slice(0, 10), cumPnl: parseFloat(cum.toFixed(2)) }
  })

  // ── Per-trade P&L bar chart ──
  const pnlBars = trades.map((t, i) => ({
    index: i + 1,
    pnl: parseFloat(t.pnl.toFixed(2)),
    ticker: t.ticker,
  }))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={setup.name} subtitle="Setup performance" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Back + actions ── */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/playbook')} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm">
            <ArrowLeft size={16} /> Back to Playbook
          </button>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" loading={saving} onClick={handleSave} leftIcon={<Save size={14} />}>Save</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)} leftIcon={<Pencil size={14} />}>Edit Rules</Button>
                <Button variant="danger" size="sm" onClick={handleArchive} leftIcon={<Archive size={14} />}>Archive</Button>
              </>
            )}
          </div>
        </div>

        {/* ── Performance header ── */}
        <div className="card p-5">
          <div className="flex items-center gap-4 mb-4">
            <GradeBadge grade={stats.grade} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-text-primary">{setup.name}</h2>
              <p className="text-xs text-text-muted">
                {stats.grade === 'N/A' ? 'Need 10+ trades to grade' : `Grade ${stats.grade} setup`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-muted">Expectancy</p>
              <p className={`text-lg font-bold ${stats.expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(stats.expectancy)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Total P&L</p>
              <p className={`text-lg font-bold ${stats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(stats.totalPnl)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Win Rate</p>
              <p className="text-lg font-bold text-text-primary">{stats.totalTrades ? `${stats.winRate.toFixed(0)}%` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Profit Factor</p>
              <p className="text-lg font-bold text-text-primary">{stats.profitFactor.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <div><p className="text-xs text-text-muted">Trades</p><p className="text-sm font-semibold text-text-primary">{stats.totalTrades}</p></div>
            <div><p className="text-xs text-text-muted">Wins / Losses</p><p className="text-sm font-semibold text-text-primary">{stats.wins} / {stats.losses}</p></div>
            <div><p className="text-xs text-text-muted">Avg R-Multiple</p><p className="text-sm font-semibold text-text-primary">{stats.avgRMultiple != null ? `${stats.avgRMultiple}R` : '—'}</p></div>
            <div><p className="text-xs text-text-muted">Avg P&L</p><p className={`text-sm font-semibold ${stats.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(stats.avgPnl)}</p></div>
          </div>
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Equity curve */}
          {equityCurve.length > 1 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Equity Curve</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={equityCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="setupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#16161e', border: '1px solid #2d2d3a', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumPnl" stroke="#8b5cf6" strokeWidth={2} fill="url(#setupGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-trade P&L bars */}
          {pnlBars.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">P&L Per Trade</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pnlBars} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                  <XAxis dataKey="index" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Trade #', position: 'insideBottom', fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#16161e', border: '1px solid #2d2d3a', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, _: string, item: { payload?: { ticker?: string } }) => [formatCurrency(v), item.payload?.ticker ?? '']}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                    {pnlBars.map((d, i) => (
                      <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Rules ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Entry Rules</h3>
            {editing ? (
              <RichTextEditor content={editEntry} onChange={setEditEntry} placeholder="Define your entry criteria…" />
            ) : setup.entryRules ? (
              <RichTextEditor content={setup.entryRules} readOnly />
            ) : (
              <p className="text-xs text-text-muted italic">No entry rules defined. Click Edit Rules to add them.</p>
            )}
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Exit Rules</h3>
            {editing ? (
              <RichTextEditor content={editExit} onChange={setEditExit} placeholder="Define your exit & stop rules…" />
            ) : setup.exitRules ? (
              <RichTextEditor content={setup.exitRules} readOnly />
            ) : (
              <p className="text-xs text-text-muted italic">No exit rules defined. Click Edit Rules to add them.</p>
            )}
          </div>
        </div>

        {/* ── Ideal Conditions ── */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Ideal Conditions</h3>
          {editing ? (
            <RichTextEditor content={editIdeal} onChange={setEditIdeal} placeholder="When does this setup work best? (e.g. trending market, pre-market range, high volume…)" />
          ) : setup.idealConditions ? (
            <RichTextEditor content={setup.idealConditions} readOnly />
          ) : (
            <p className="text-xs text-text-muted italic">No ideal conditions defined. {editing ? '' : 'Click Edit Rules to add them.'}</p>
          )}
        </div>

        {/* ── Setup Metadata ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Setup Metadata</h3>
            {!editing && <span className="text-xs text-text-muted">Click Edit Rules to modify</span>}
          </div>

          {editing ? (
            <div className="space-y-5">
              <TagInput
                label="Timeframes"
                values={editTimeframes}
                onChange={setEditTimeframes}
                presets={PRESET_TIMEFRAMES}
              />
              <TagInput
                label="Asset Classes"
                values={editAssetClasses}
                onChange={setEditAssetClasses}
                presets={PRESET_ASSET_CLASSES}
              />
              <TagInput
                label="Tags"
                values={editTags}
                onChange={setEditTags}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeframes */}
              <div>
                <p className="text-xs text-text-muted mb-2">Timeframes</p>
                {setup.timeframes?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {setup.timeframes.map((tf) => (
                      <span key={tf} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs border border-accent/20">{tf}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-text-muted italic">None specified</p>}
              </div>

              {/* Asset Classes */}
              <div>
                <p className="text-xs text-text-muted mb-2">Asset Classes</p>
                {setup.assetClasses?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {setup.assetClasses.map((ac) => (
                      <span key={ac} className="px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary text-xs border border-border">{ac}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-text-muted italic">None specified</p>}
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs text-text-muted mb-2">Tags</p>
                {setup.tags?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {setup.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary text-xs border border-border">#{tag}</span>
                    ))}
                  </div>
                ) : <p className="text-xs text-text-muted italic">No tags</p>}
              </div>
            </div>
          )}
        </div>

        {/* ── Description (editing only) ── */}
        {editing && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Description</h3>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="input-base resize-none" placeholder="Short description…" />
          </div>
        )}

        {/* ── Trade history ── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Trade History ({trades.length})</h3>
          </div>
          {trades.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">No trades logged with this setup yet. Tag trades with &quot;{setup.name}&quot; to populate.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Ticker', 'Direction', 'P&L', 'R'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-alt/50 cursor-pointer" onClick={() => router.push(`/trades/${t.id}`)}>
                      <td className="px-4 py-2.5 text-text-secondary">{formatDateTime(t.entryDateTime)}</td>
                      <td className="px-4 py-2.5 font-bold text-text-primary">{t.ticker}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.direction === 'LONG' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>{t.direction}</span>
                      </td>
                      <td className={`px-4 py-2.5 font-semibold tabular-nums ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(t.pnl)}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{t.rMultiple != null ? `${t.rMultiple > 0 ? '+' : ''}${t.rMultiple}R` : '—'}</td>
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
