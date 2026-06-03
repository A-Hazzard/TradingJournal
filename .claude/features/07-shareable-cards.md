# Feature 07: Shareable Performance Cards

**Priority:** Medium  
**Effort:** Small (half a day) — EASIEST FEATURE  
**Depends on:** Existing Redux selectors (selectKpis, selectSetupStats)  
**Why traders love it:** Traders post their stats on Twitter/Discord constantly

---

## Problem

Traders want to share their performance milestones. Right now there's no way to export a beautiful summary without taking a messy screenshot of the dashboard.

---

## User Story

> As a trader, I want to generate a beautiful performance card with my stats that I can download as a PNG and share on Twitter/Discord to show off my results.

---

## Feature Description

A **"Share"** button on the Dashboard (and Reports) opens a modal with a beautiful, branded performance card. The user picks the time period, previews the card, then downloads it as a PNG.

---

## UI Flow

```
Dashboard → "Share Performance" button (top-right, near the header)
  ↓
Modal opens with:
  [Weekly] [Monthly] [All Time]  ← period selector

  ┌─────────────────────────────────────────┐
  │  ◆ TradeJournal                   @user │
  │                                         │
  │    Performance · March 2025             │
  │                                         │
  │  Net P&L          Win Rate    Profit Factor│
  │  +$4,234         67.2%        2.41     │
  │                                         │
  │  Total Trades     Avg Win     Avg Loss  │
  │     47            +$234       -$128     │
  │                                         │
  │  Best Trade:  NVDA LONG  +$892          │
  │  Best Setup:  Bull Flag  68% win rate   │
  │                                         │
  │  ──────────── Zella Score ────────────  │
  │             ████████░░  78/100          │
  │                                         │
  │            made with TradeJournal       │
  └─────────────────────────────────────────┘

  [Download PNG]   [Copy to Clipboard]
```

---

## Implementation

### Install `html-to-image`
```bash
npm install html-to-image
```

This library converts a DOM node to PNG without needing a canvas. Better than `html2canvas` — handles CSS gradients, fonts, shadows correctly.

### New Components

```typescript
// components/ui/ShareModal.tsx
// The modal wrapper with period selector and download buttons

// components/ui/PerformanceCard.tsx
// The card itself — a pure presentational component, no hooks
// All data passed as props

type PerformanceCardProps = {
  username: string
  period: string              // "March 2025" | "This Week" | "All Time"
  netPnl: number
  winRate: number
  profitFactor: number
  totalTrades: number
  avgWin: number
  avgLoss: number
  zellaScore: number
  bestTrade: { ticker: string; direction: string; pnl: number } | null
  bestSetup: { name: string; winRate: number } | null
}
```

### `ShareModal.tsx`

```typescript
'use client'

import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useAppSelector } from '@/store'
import { selectKpis, selectFilteredTrades, selectSetupStats } from '@/store/tradesSlice'
import { PerformanceCard } from './PerformanceCard'
import { Modal } from './Modal'

type Period = 'week' | 'month' | 'alltime'

export function ShareModal({ isOpen, onClose, username }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [downloading, setDownloading] = useState(false)

  // Filter trades based on period
  const allTrades = useAppSelector(selectFilteredTrades)
  const periodTrades = useMemo(() => filterByPeriod(allTrades, period), [allTrades, period])
  const kpis = useMemo(() => computeKpis(periodTrades.filter(t => t.status === 'CLOSED')), [periodTrades])
  const setupStats = useMemo(() => buildSetupStats(periodTrades.filter(t => t.status === 'CLOSED')), [periodTrades])

  const bestTrade = useMemo(() => 
    [...periodTrades].sort((a, b) => b.pnl - a.pnl)[0] ?? null,
    [periodTrades]
  )
  const bestSetup = setupStats[0] ?? null

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,      // 2x for retina quality
        backgroundColor: '#0f0f14',
      })
      const link = document.createElement('a')
      link.download = `performance-${period}-${new Date().toISOString().slice(0,10)}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    if (!cardRef.current) return
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
    const blob = await (await fetch(dataUrl)).blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    // show toast: "Copied to clipboard!"
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Performance">
      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {(['week', 'month', 'alltime'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              period === p
                ? 'bg-accent text-white'
                : 'bg-surface-alt text-text-secondary hover:text-text-primary'
            )}
          >
            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Card preview */}
      <div className="flex justify-center mb-4">
        <PerformanceCard
          ref={cardRef}
          username={username}
          period={getPeriodLabel(period)}
          netPnl={kpis.netPnl}
          winRate={kpis.winRate}
          profitFactor={kpis.profitFactor}
          totalTrades={kpis.totalTrades}
          avgWin={kpis.avgWin}
          avgLoss={kpis.avgLoss}
          zellaScore={kpis.zellaScore}
          bestTrade={bestTrade ? { ticker: bestTrade.ticker, direction: bestTrade.direction, pnl: bestTrade.pnl } : null}
          bestSetup={bestSetup ? { name: bestSetup.setup, winRate: bestSetup.winRate } : null}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={handleCopy}>
          <Copy size={14} /> Copy to Clipboard
        </Button>
        <Button loading={downloading} onClick={handleDownload}>
          <Download size={14} /> Download PNG
        </Button>
      </div>
    </Modal>
  )
}
```

### `PerformanceCard.tsx`

```typescript
// components/ui/PerformanceCard.tsx
// forwardRef to expose DOM node for html-to-image

export const PerformanceCard = forwardRef<HTMLDivElement, PerformanceCardProps>(
  ({ username, period, netPnl, winRate, profitFactor, totalTrades, avgWin, avgLoss, zellaScore, bestTrade, bestSetup }, ref) => {
    const isProfit = netPnl >= 0

    return (
      <div
        ref={ref}
        className="w-[480px] bg-[#0f0f14] border border-[#2d2d3a] rounded-2xl p-6 font-sans"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#8b5cf6] rounded-lg flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <span className="text-[#f1f5f9] font-bold text-sm">TradeJournal</span>
          </div>
          <span className="text-[#64748b] text-xs">@{username}</span>
        </div>

        {/* Period */}
        <p className="text-[#94a3b8] text-xs mb-1">Performance</p>
        <p className="text-[#f1f5f9] font-semibold text-sm mb-5">{period}</p>

        {/* Net P&L — hero stat */}
        <div className="mb-5">
          <p className={cn('text-4xl font-bold', isProfit ? 'text-[#10b981]' : 'text-[#ef4444]')}>
            {formatCurrency(netPnl)}
          </p>
          <p className="text-[#64748b] text-xs mt-0.5">Net P&L</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Win Rate', value: formatWinRate(winRate) },
            { label: 'Profit Factor', value: profitFactor.toFixed(2) },
            { label: 'Total Trades', value: totalTrades.toString() },
            { label: 'Avg Win', value: formatCurrency(avgWin), color: '#10b981' },
            { label: 'Avg Loss', value: formatCurrency(avgLoss), color: '#ef4444' },
            { label: 'Zella Score', value: `${zellaScore}/100` },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#16161e] rounded-xl p-3 border border-[#2d2d3a]">
              <p className="text-[#64748b] text-[10px] mb-0.5">{label}</p>
              <p className="font-semibold text-sm" style={{ color: color ?? '#f1f5f9' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        {(bestTrade || bestSetup) && (
          <div className="space-y-2 mb-5">
            {bestTrade && (
              <div className="flex items-center justify-between bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl px-3 py-2">
                <span className="text-[#94a3b8] text-xs">Best Trade</span>
                <span className="text-[#10b981] font-semibold text-xs">
                  {bestTrade.ticker} {bestTrade.direction} {formatCurrency(bestTrade.pnl)}
                </span>
              </div>
            )}
            {bestSetup && (
              <div className="flex items-center justify-between bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 rounded-xl px-3 py-2">
                <span className="text-[#94a3b8] text-xs">Best Setup</span>
                <span className="text-[#8b5cf6] font-semibold text-xs">
                  {bestSetup.name} · {bestSetup.winRate.toFixed(0)}% win
                </span>
              </div>
            )}
          </div>
        )}

        {/* Zella score bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <span className="text-[#64748b] text-[10px]">Zella Score</span>
            <span className="text-[#f1f5f9] text-[10px] font-medium">{zellaScore}/100</span>
          </div>
          <div className="h-1.5 bg-[#2d2d3a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8b5cf6] rounded-full transition-all"
              style={{ width: `${zellaScore}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <p className="text-[#2d2d3a] text-[10px] text-center">made with TradeJournal</p>
      </div>
    )
  }
)
```

---

## Period Filter Utility

```typescript
// lib/utils/periodFilter.ts
export function filterByPeriod(trades: Trade[], period: 'week' | 'month' | 'alltime'): Trade[] {
  if (period === 'alltime') return trades
  const now = new Date()
  const start = period === 'week'
    ? startOfWeek(now)
    : startOfMonth(now)
  return trades.filter(t => new Date(t.entryDateTime) >= start)
}

export function getPeriodLabel(period: 'week' | 'month' | 'alltime'): string {
  if (period === 'alltime') return 'All Time'
  if (period === 'week') return `Week of ${format(startOfWeek(new Date()), 'MMM d, yyyy')}`
  return format(new Date(), 'MMMM yyyy')
}
```

Uses `date-fns` (already installed) `startOfWeek`, `startOfMonth`, `format`.

---

## Dashboard Integration

In `app/dashboard/page.tsx`, add a "Share" button in the header area:

```typescript
const [shareOpen, setShareOpen] = useState(false)

// In JSX header:
<Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
  <Share2 size={14} /> Share
</Button>

<ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} username={currentUser?.username ?? 'trader'} />
```

---

## Packages Needed

```bash
npm install html-to-image
```

---

## Verification

1. Dashboard shows "Share Performance" button
2. Click → modal opens with monthly card
3. Switch to "This Week" → card updates with filtered data
4. "Download PNG" → PNG file saves with correct stats
5. "Copy to Clipboard" → paste into Discord → card appears correctly
6. Card is 480px wide, retina quality (2x pixel ratio)
7. All time periods show correct filtered data
