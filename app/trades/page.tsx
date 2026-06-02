'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, X, ArrowUpDown, ChevronUp, ChevronDown, PlusCircle, FileText, Trash2, Pencil } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import TradesSkeleton from '@/components/ui/skeletons/TradesSkeleton'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchTrades,
  selectFilteredTrades, selectOpenTrades, selectKpis, selectFilters, selectTradesStatus,
  toggleTicker, toggleDirection, toggleTag, setSetup, resetFilters, deleteTradeAsync,
} from '@/store/tradesSlice'
import { formatCurrency, formatDateTime, formatPercent, getPnlColorClass } from '@/lib/formatters'
import { ALL_TICKERS, ALL_SETUPS, ALL_TAGS } from '@/lib/constants'
import { addToast } from '@/store/uiSlice'

type SortKey = 'entryDateTime' | 'ticker' | 'pnl' | 'pnlPercent' | 'setup'
type SortDir = 'asc' | 'desc'

export default function TradesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const trades = useAppSelector(selectFilteredTrades)
  const openTrades = useAppSelector(selectOpenTrades)
  const kpis = useAppSelector(selectKpis)
  const filters = useAppSelector(selectFilters)
  const status = useAppSelector(selectTradesStatus)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTrades())
    }
  }, [dispatch, status])
  const [sortKey, setSortKey] = useState<SortKey>('entryDateTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const closed = useMemo(() => trades.filter(t => t.status === 'CLOSED'), [trades])

  const sorted = useMemo(() => {
    return [...closed].sort((a, b) => {
      let diff = 0
      if (sortKey === 'entryDateTime') diff = new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime()
      else if (sortKey === 'pnl') diff = a.pnl - b.pnl
      else if (sortKey === 'pnlPercent') diff = a.pnlPercent - b.pnlPercent
      else if (sortKey === 'ticker') diff = a.ticker.localeCompare(b.ticker)
      else if (sortKey === 'setup') diff = a.setup.localeCompare(b.setup)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [closed, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown size={12} className="text-text-muted" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-accent" /> : <ChevronDown size={12} className="text-accent" />
  }

  const hasFilters = filters.tickers.length > 0 || filters.directions.length > 0 || filters.tags.length > 0 || filters.setup

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Trade Log" subtitle={`${closed.length} closed trades`} />
      {status === 'loading' ? (
        <TradesSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Net P&L" value={formatCurrency(kpis.netPnl)} variant={kpis.netPnl >= 0 ? 'profit' : 'loss'} />
            <KpiCard title="Win Rate" value={`${kpis.winRate.toFixed(1)}%`} variant="accent" />
            <KpiCard title="Profit Factor" value={kpis.profitFactor.toFixed(2)} variant="default" />
            <KpiCard title="Avg Win / Loss" value={`${formatCurrency(kpis.avgWin, 0)} / ${formatCurrency(Math.abs(kpis.avgLoss), 0)}`} variant="default" />
          </div>

          {/* Open Positions */}
          {openTrades.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Open Positions ({openTrades.length})</h3>
              <div className="space-y-2">
                {openTrades.map(t => (
                  <div key={t.id} onClick={() => router.push(`/trades/${t.id}`)} className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border hover:border-accent/30 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge label={t.direction} variant={t.direction === 'LONG' ? 'long' : 'short'} />
                      <span className="font-semibold text-text-primary">{t.ticker}</span>
                      <span className="text-xs text-text-muted">{t.setup}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-text-secondary">Entry: <span className="text-text-primary font-medium">${t.entryPrice}</span></span>
                      <span className="text-text-secondary">{t.quantity} shares</span>
                      <Badge label="OPEN" variant="accent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters + Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">Closed Trades</h3>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <button onClick={() => dispatch(resetFilters())} className="flex items-center gap-1 text-xs text-text-muted hover:text-loss transition-colors">
                    <X size={12} /> Clear filters
                  </button>
                )}
                <Button variant="secondary" size="sm" leftIcon={<Filter size={14} />} onClick={() => setShowFilters(v => !v)}>
                  {showFilters ? 'Hide' : 'Filter'}
                </Button>
                <Button size="sm" leftIcon={<PlusCircle size={14} />} onClick={() => router.push('/add-trade')}>
                  Add Trade
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="p-4 bg-surface-alt border-b border-border space-y-3">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-2">Tickers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TICKERS.map(ticker => (
                      <button key={ticker} onClick={() => dispatch(toggleTicker(ticker))}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${filters.tickers.includes(ticker) ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent/50'}`}>
                        {ticker}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Direction</p>
                    <div className="flex gap-1.5">
                      {(['LONG', 'SHORT'] as const).map(d => (
                        <button key={d} onClick={() => dispatch(toggleDirection(d))}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors ${filters.directions.includes(d) ? (d === 'LONG' ? 'bg-profit/20 text-profit border-profit/30' : 'bg-loss/20 text-loss border-loss/30') : 'border-border text-text-muted hover:border-accent/50'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Setup</p>
                    <select value={filters.setup ?? ''} onChange={e => dispatch(setSetup(e.target.value || null))}
                      className="input-base text-xs w-auto">
                      <option value="">All setups</option>
                      {ALL_SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-muted mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_TAGS.map(tag => (
                        <button key={tag} onClick={() => dispatch(toggleTag(tag))}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${filters.tags.includes(tag) ? 'bg-accent/20 text-accent border-accent/30' : 'border-border text-text-muted hover:border-accent/50'}`}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { key: 'entryDateTime' as SortKey, label: 'Date / Time' },
                      { key: 'ticker' as SortKey, label: 'Symbol' },
                      { key: null, label: 'Direction' },
                      { key: null, label: 'Entry' },
                      { key: null, label: 'Exit' },
                      { key: null, label: 'Qty' },
                      { key: 'pnl' as SortKey, label: 'P&L' },
                      { key: 'setup' as SortKey, label: 'Setup' },
                      { key: null, label: '' },
                    ].map(({ key, label }, i) => (
                      <th key={i} className="px-4 py-3 text-left text-[11px] font-medium text-text-muted">
                        {key ? (
                          <button onClick={() => handleSort(key)} className="flex items-center gap-1 hover:text-text-primary transition-colors">
                            {label} <SortIcon k={key} />
                          </button>
                        ) : label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map(trade => (
                    <tr key={trade.id}
                      onClick={() => router.push(`/trades/${trade.id}`)}
                      className="hover:bg-surface-alt/50 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 text-text-secondary text-xs">{formatDateTime(trade.entryDateTime)}</td>
                      <td className="px-4 py-3 font-semibold text-text-primary">{trade.ticker}</td>
                      <td className="px-4 py-3">
                        <Badge label={trade.direction} variant={trade.direction === 'LONG' ? 'long' : 'short'} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-text-secondary tabular-nums">${trade.entryPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-text-secondary tabular-nums">{trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3 text-text-secondary tabular-nums">{trade.quantity}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className={`font-semibold tabular-nums ${getPnlColorClass(trade.pnl)}`}>{formatCurrency(trade.pnl)}</span>
                          <span className={`text-xs tabular-nums ${getPnlColorClass(trade.pnl)}`}>{formatPercent(trade.pnlPercent)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-muted">{trade.setup}</span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => router.push(`/trades/${trade.id}`)} className="p-1.5 text-text-muted hover:text-accent rounded transition-colors" title="View details">
                            <FileText size={14} />
                          </button>
                          <button onClick={() => router.push(`/add-trade?edit=${trade.id}`)} className="p-1.5 text-text-muted hover:text-accent rounded transition-colors" title="Edit trade">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => { dispatch(deleteTradeAsync(trade.id)); dispatch(addToast({ message: 'Trade deleted', type: 'error' })) }}
                            className="p-1.5 text-text-muted hover:text-loss rounded transition-colors" title="Delete trade">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sorted.length === 0 && (
                <div className="py-16 text-center text-text-muted text-sm">No trades match the current filters.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
