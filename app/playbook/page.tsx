'use client'

/**
 * @module PlaybookPage
 * Trading setup playbook — list view with search, grade filter,
 * archive toggle, and performance-sorted cards.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { GradeBadge } from '@/components/ui/GradeBadge'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchTrades, selectClosedTrades } from '@/store/tradesSlice'
import { addToast } from '@/store/uiSlice'
import { computeSetupPerformance } from '@/lib/playbook'
import { formatCurrency } from '@/lib/formatters'
import { BookMarked, Plus, AlertTriangle, Search, Archive } from 'lucide-react'
import type { Setup } from '@/types/setup'
import type { Trade } from '@/types/trade'
import type { SetupGrade } from '@/types/setup'
import PlaybookSkeleton from '@/components/ui/skeletons/PlaybookSkeleton'

const ALL_GRADES: Array<SetupGrade | 'All'> = ['All', 'A', 'B', 'C', 'D', 'F', 'N/A']

export default function PlaybookPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const closedTrades = useAppSelector(selectClosedTrades)

  const [setups, setSetups] = useState<Setup[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [sortBy, setSortBy] = useState<'expectancy' | 'totalPnl' | 'trades'>('expectancy')
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<SetupGrade | 'All'>('All')
  const [showArchived, setShowArchived] = useState(false)

  const loadSetups = useCallback(async () => {
    setLoading(true)
    try {
      const url = showArchived ? '/api/setups' : '/api/setups?activeOnly=true'
      const res = await fetch(url)
      if (res.ok) setSetups(await res.json())
    } finally {
      setLoading(false)
    }
  }, [showArchived])

  useEffect(() => {
    dispatch(fetchTrades())
    loadSetups()
  }, [dispatch, loadSetups])

  // Map setup name → performance
  const perfByName = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeSetupPerformance>>()
    setups.forEach((s) => {
      const setupTrades = closedTrades.filter((t: Trade) => t.setup === s.name)
      map.set(s.name, computeSetupPerformance(setupTrades))
    })
    return map
  }, [setups, closedTrades])

  // Filter → sort
  const displayedSetups = useMemo(() => {
    let result = [...setups]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
    }

    // Grade filter
    if (gradeFilter !== 'All') {
      result = result.filter((s) => perfByName.get(s.name)?.grade === gradeFilter)
    }

    // Sort
    result.sort((a, b) => {
      const pa = perfByName.get(a.name)
      const pb = perfByName.get(b.name)
      if (!pa || !pb) return 0
      if (sortBy === 'expectancy') return pb.expectancy - pa.expectancy
      if (sortBy === 'totalPnl') return pb.totalPnl - pa.totalPnl
      return pb.totalTrades - pa.totalTrades
    })

    return result
  }, [setups, perfByName, searchQuery, gradeFilter, sortBy])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/setups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Setup created', type: 'success' }))
      setNewName('')
      setNewDesc('')
      setCreateOpen(false)
      await loadSetups()
    } catch {
      dispatch(addToast({ message: 'Failed to create setup', type: 'error' }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Playbook"
        subtitle="Your trading setups & their performance"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus size={14} />}>
            New Setup
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── Create form ── */}
        {createOpen && (
          <div className="card p-5 space-y-3 border-accent/30">
            <h3 className="text-sm font-semibold text-text-primary">New Setup</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Setup name (e.g. Bull Flag Breakout)"
              className="input-base"
              autoFocus
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              placeholder="Short description…"
              className="input-base resize-none"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button size="sm" loading={creating} onClick={handleCreate}>Create</Button>
            </div>
          </div>
        )}

        {/* ── Search + Filter row ── */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search setups…"
              className="input-base pl-8"
            />
          </div>

          {/* Grade filter + Sort + Archive */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">Grade:</span>
            {ALL_GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g === gradeFilter ? 'All' : g as SetupGrade | 'All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${gradeFilter === g ? 'bg-accent/20 text-accent border border-accent/30' : 'border border-border text-text-muted hover:text-text-primary'}`}
              >
                {g}
              </button>
            ))}

            <div className="w-px h-4 bg-border mx-1" />

            <span className="text-xs text-text-muted">Sort:</span>
            {([['expectancy', 'Expectancy'], ['totalPnl', 'Total P&L'], ['trades', 'Trade Count']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${sortBy === val ? 'bg-accent/20 text-accent border border-accent/30' : 'border border-border text-text-muted hover:text-text-primary'}`}
              >
                {label}
              </button>
            ))}

            <div className="w-px h-4 bg-border mx-1" />

            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${showArchived ? 'bg-accent/20 text-accent border border-accent/30' : 'border border-border text-text-muted hover:text-text-primary'}`}
            >
              <Archive size={11} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
          </div>
        </div>

        {/* ── Cards ── */}
        {loading ? (
          <PlaybookSkeleton />
        ) : setups.length === 0 ? (
          <div className="card p-12 text-center">
            <BookMarked size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">No setups yet</p>
            <p className="text-xs text-text-muted mb-4">Define your trading setups to track which ones actually make money.</p>
            <Button size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Plus size={14} />}>Create your first setup</Button>
          </div>
        ) : displayedSetups.length === 0 ? (
          <div className="card p-8 text-center">
            <Search size={24} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">No setups match your search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedSetups.map((setup) => {
              const perf = perfByName.get(setup.name)!
              const killAlert = perf.totalTrades >= 20 && perf.expectancy < 0
              const archived = !setup.isActive
              return (
                <button
                  key={setup.id}
                  onClick={() => router.push(`/playbook/${setup.id}`)}
                  className={`card p-5 text-left hover:border-accent/40 transition-colors group ${archived ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">{setup.name}</h3>
                        {killAlert && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                            <AlertTriangle size={9} /> Review
                          </span>
                        )}
                        {archived && (
                          <span className="text-[10px] text-text-muted bg-surface-alt border border-border px-1.5 py-0.5 rounded-full shrink-0">
                            Archived
                          </span>
                        )}
                      </div>
                      {setup.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{setup.description}</p>}
                    </div>
                    <GradeBadge grade={perf.grade} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Trades</p>
                      <p className="text-sm font-bold text-text-primary">{perf.totalTrades}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Win Rate</p>
                      <p className="text-sm font-bold text-text-primary">{perf.totalTrades ? `${perf.winRate.toFixed(0)}%` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Avg R</p>
                      <p className="text-sm font-bold text-text-primary">{perf.avgRMultiple != null ? `${perf.avgRMultiple > 0 ? '+' : ''}${perf.avgRMultiple}R` : '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">Expectancy</span>
                    <span className={`text-sm font-bold ${perf.expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(perf.expectancy)} / trade
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
