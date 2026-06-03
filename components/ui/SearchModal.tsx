'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { Search, Calendar, ArrowRight } from 'lucide-react'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'

type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
}

type FoundTrade = {
  id: string
  ticker: string
  direction: 'LONG' | 'SHORT'
  pnl: number
  pnlPercent: number
  entryDateTime: string
  status: 'OPEN' | 'CLOSED'
}

type FoundJournal = {
  id: string
  date: string
  content: string
  mood: string
}

type SearchResults = {
  trades: FoundTrade[]
  journals: FoundJournal[]
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  // === State & Hooks ===
  const router = useRouter()
  const dispatch = useAppDispatch()
  
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ trades: [], journals: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Computed flat results for keyboard navigation
  const flatResults = [
    ...results.trades.map((t) => ({ type: 'trade', id: t.id, url: `/trades/${t.id}`, label: `${t.direction} ${t.ticker} Trade` })),
    ...results.journals.map((j) => ({ type: 'journal', id: j.id, url: `/journal?date=${j.date}`, label: `Journal Entry - ${j.date}` })),
  ]

  // === Effects ===
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults({ trades: [], journals: [] })
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Debounced search fetching
  useEffect(() => {
    if (!query.trim()) {
      setResults({ trades: [], journals: [] })
      return
    }

    setLoading(true)
    const timeoutId = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => {
          if (!res.ok) throw new Error()
          return res.json()
        })
        .then((data: SearchResults) => {
          setResults(data)
          setSelectedIndex(0)
        })
        .catch(() => {
          dispatch(addToast({ message: 'Search query failed', type: 'error' }))
        })
        .finally(() => {
          setLoading(false)
        })
    }, 250)

    return () => clearTimeout(timeoutId)
  }, [query, dispatch])

  // Global hotkeys to open search (Cmd/Ctrl + K)
  useEffect(() => {
    // Escape or other handlers are managed by Modal and component levels
  }, [])

  // === Handlers ===
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatResults.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % Math.max(1, flatResults.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = flatResults[selectedIndex]
      if (selected) {
        handleNavigate(selected.url)
      }
    }
  }

  function handleNavigate(url: string) {
    router.push(url)
    onClose()
  }

  // === Render ===
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col -m-6 divide-y divide-border">
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-5 py-4 bg-surface rounded-t-2xl">
          <Search size={20} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search trades (ticker, notes, tags) or journals..."
            className="w-full bg-transparent border-0 text-text-primary placeholder-text-muted focus:outline-none focus:ring-0 text-base"
          />
          {loading && (
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          )}
        </div>

        {/* Results Container */}
        {query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-text-muted gap-2">
            <div className="p-3 bg-surface-alt rounded-2xl border border-border">
              <Search size={22} className="text-text-secondary" />
            </div>
            <p className="text-sm font-semibold text-text-secondary mt-2">Search TradeJournal</p>
            <p className="text-xs max-w-xs">Type a ticker (e.g. SPX500), directional bias, trade setup tag, or keyword from daily journals.</p>
          </div>
        ) : flatResults.length === 0 && !loading ? (
          <div className="py-12 px-6 text-center text-text-muted text-sm">
            No matches found for <span className="font-semibold text-text-primary">&quot;{query}&quot;</span>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
            {/* Trades Section */}
            {results.trades.length > 0 && (
              <div className="space-y-1">
                <h3 className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">Trades</h3>
                {results.trades.map((trade, idx) => {
                  const flatIdx = idx
                  const isActive = selectedIndex === flatIdx
                  return (
                    <div
                      key={trade.id}
                      onClick={() => handleNavigate(`/trades/${trade.id}`)}
                      onMouseEnter={() => setSelectedIndex(flatIdx)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isActive ? 'bg-surface-alt border border-accent/20' : 'border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          trade.direction === 'LONG' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                        }`}>
                          {trade.direction}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">{trade.ticker}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {new Date(trade.entryDateTime).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        {trade.status === 'CLOSED' ? (
                          <div>
                            <p className={`text-sm font-semibold ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {trade.pnl >= 0 ? '+' : ''}
                              {trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              {trade.pnlPercent >= 0 ? '+' : ''}
                              {trade.pnlPercent.toFixed(2)}%
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs font-medium px-2 py-0.5 bg-amber-400/10 text-amber-400 rounded-md">
                            Open
                          </div>
                        )}
                        <ArrowRight size={14} className={`text-text-muted transition-transform ${isActive ? 'translate-x-0.5 text-text-primary' : ''}`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Journals Section */}
            {results.journals.length > 0 && (
              <div className="space-y-1">
                <h3 className="px-3 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">Journals</h3>
                {results.journals.map((journal, idx) => {
                  const flatIdx = results.trades.length + idx
                  const isActive = selectedIndex === flatIdx
                  
                  // Extract raw text from HTML content to make snippet clean
                  const rawText = journal.content ? journal.content.replace(/<[^>]*>/g, ' ') : ''
                  const queryIdx = rawText.toLowerCase().indexOf(query.toLowerCase())
                  const start = Math.max(0, queryIdx - 25)
                  const end = Math.min(rawText.length, queryIdx + query.length + 30)
                  const snippet = rawText.slice(start, end).trim()
                  
                  return (
                    <div
                      key={journal.id}
                      onClick={() => handleNavigate(`/journal?date=${journal.date}`)}
                      onMouseEnter={() => setSelectedIndex(flatIdx)}
                      className={`flex items-start justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isActive ? 'bg-surface-alt border border-accent/20' : 'border border-transparent'
                      }`}
                    >
                      <div className="flex gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-base">
                          {journal.mood === 'great' ? '🚀' : journal.mood === 'good' ? '😊' : journal.mood === 'neutral' ? '😐' : journal.mood === 'bad' ? '😔' : '😤'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                            <Calendar size={12} className="text-text-muted" />
                            {new Date(journal.date + 'T12:00:00').toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-text-muted mt-1 truncate">
                            {snippet ? `...${snippet}...` : 'View journal entry'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center align-middle self-center shrink-0 ml-4">
                        <ArrowRight size={14} className={`text-text-muted transition-transform ${isActive ? 'translate-x-0.5 text-text-primary' : ''}`} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-5 py-3 bg-surface-alt rounded-b-2xl text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">↑↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">Enter</kbd> select</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 bg-background border border-border rounded">ESC</kbd> close</span>
        </div>
      </div>
    </Modal>
  )
}
