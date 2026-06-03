# Feature 03: Trade Replay

**Priority:** High  
**Effort:** Medium (1–2 days)  
**Depends on:** TradeChart (already built), candle data  
**Differentiator:** No competitor does this well — unique selling point

---

## Problem

Traders watch videos of their trades to learn but the current chart just shows the full picture with entry/exit already visible. Real learning comes from replaying the chart bar by bar — watching the setup form, asking "would I have taken this trade?", and seeing the outcome unfold.

---

## User Story

> As a trader, I want to replay my trade bar by bar — watching the setup form before my entry — so I can honestly evaluate my decision making and identify what I missed.

---

## Feature Description

On the trade detail page (`/trades/[id]`), add a **Replay Mode** button next to the timeframe selector. When activated:

1. Chart rewinds to **N bars before entry** (configurable: 10, 20, 50 bars)
2. Entry/exit arrows and price lines are **hidden** (can't see the outcome yet)
3. A **play bar** appears at the bottom of the chart with controls
4. User clicks **Play** — bars animate in one at a time
5. When replay reaches the entry bar → entry arrow appears
6. When replay reaches the exit bar → exit arrow appears + P&L revealed
7. User can **pause** at any point, **scrub** backward/forward
8. **Speed control**: 0.5x, 1x, 2x, 5x

---

## UI Layout

```
┌──────────────────────────────────────────────────────┐
│  [OHLC Legend overlay]          [Replay Mode: ON] ✕  │
│                                                       │
│  [Candlestick chart — only shows up to replay cursor] │
│                                                       │
│  (entry arrow appears when replay reaches entry bar)  │
│                                                       │
├───────────────────────────────────────────────────────┤
│  ◀◀  ◀  ▶  ▶▶    ━━━━━━━━━●━━━━━━━━━  Speed: [1x ▾] │
│  Bar 47 / 120    Replay cursor                        │
│                                                       │
│  Pre-entry: [10 ▾] bars    [↩ Restart]               │
└───────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### 1. Extend `TradeChart.tsx`

Add new props:
```typescript
type Props = {
  // existing props...
  replayMode?: boolean
  replayBarIndex?: number          // current bar index in replay
  onReplayBarChange?: (idx: number) => void
}
```

In replay mode:
- **Slice the candles array**: only render `candles.slice(0, replayBarIndex)`
- **Conditionally show markers**: only show entry arrow if `replayBarIndex >= entryBarIndex`
- **Conditionally show price lines**: same logic
- On bar index change, call `chart.timeScale().scrollToPosition()` to keep the current bar in view

### 2. New `ReplayControls` component

```typescript
// components/charts/ReplayControls.tsx

type Props = {
  totalBars: number
  currentBar: number
  isPlaying: boolean
  speed: number
  onPlay: () => void
  onPause: () => void
  onScrub: (bar: number) => void
  onSpeedChange: (speed: number) => void
  onRestart: () => void
  entryBarIndex: number
  exitBarIndex: number | null
}
```

Uses a `<input type="range">` for scrubbing, styled with the app design system.

### 3. Replay State in Trade Detail Page

```typescript
// app/trades/[id]/page.tsx additions

const [replayMode, setReplayMode] = useState(false)
const [replayBarIndex, setReplayBarIndex] = useState(0)
const [isPlaying, setIsPlaying] = useState(false)
const [replaySpeed, setReplaySpeed] = useState(1)
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

// Pre-entry bars config
const PRE_ENTRY_BARS = 20  // show 20 bars before entry when replay starts

// When entering replay mode:
function enterReplay() {
  setReplayMode(true)
  const entryIdx = candles.findIndex(c => c.time >= entryTime)
  setReplayBarIndex(Math.max(0, entryIdx - PRE_ENTRY_BARS))
  setIsPlaying(false)
}

// Play loop
useEffect(() => {
  if (!isPlaying) { clearInterval(intervalRef.current!); return }
  const delay = 500 / replaySpeed   // 500ms at 1x speed
  intervalRef.current = setInterval(() => {
    setReplayBarIndex(prev => {
      if (prev >= candles.length - 1) { setIsPlaying(false); return prev }
      return prev + 1
    })
  }, delay)
  return () => clearInterval(intervalRef.current!)
}, [isPlaying, replaySpeed, candles.length])
```

### 4. Finding Entry/Exit Bar Indices

```typescript
function findBarIndex(candles: PriceCandle[], timestamp: number): number {
  // Find the candle whose time is <= timestamp (closest match)
  return candles.reduce((bestIdx, candle, idx) => {
    return candle.time <= timestamp ? idx : bestIdx
  }, 0)
}

const entryBarIndex = findBarIndex(candles, entryTime)
const exitBarIndex = exitTime ? findBarIndex(candles, exitTime) : null
```

---

## Replay Controls Design

```
Dark bar docked to bottom of chart:
bg-[#0f0f14] border-t border-[#2d2d3a] h-12 px-4

Left group: [⏮ Restart] [◀ Step back] [▶/⏸ Play/Pause] [▶ Step fwd]
Center:      ══════════●══════════  (range input, styled with accent color)
             "Bar 47 of 120 • 23 bars before entry"
Right group: Speed: [0.5x] [1x] [2x] [5x] pill buttons
             [Exit Replay ✕]
```

The range slider knob shows `accent` color, track fills green before entry, accent at entry, until exit.

---

## "Hide Future" Mode

Optional setting — when enabled, even in replay mode:
- Chart only shows the N bars behind the current replay position
- Prevents "looking ahead" at right side of chart
- Creates a true blind replay experience

```typescript
// Slice both start and end:
const visibleCandles = hideMode
  ? candles.slice(Math.max(0, replayBarIndex - LOOKBACK), replayBarIndex)
  : candles.slice(0, replayBarIndex)
```

---

## Packages Needed

None — pure React state + existing Lightweight Charts API.

---

## Verification

1. Open any trade detail page → "Replay Mode" button visible
2. Click "Replay Mode" → chart rewinds to pre-entry position, no entry/exit arrows visible
3. Click Play → bars animate forward one by one
4. Entry bar reached → green arrow appears
5. Exit bar reached → red arrow appears, P&L shown
6. Pause/scrub works
7. Speed change works (0.5x visibly slower, 5x visibly faster)
8. "Exit Replay" → full chart restored with all markers
