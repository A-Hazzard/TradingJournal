# Feature 04: Playbook / Setup Library

**Priority:** High  
**Effort:** Medium-Large (2–3 days)  
**Depends on:** Auth (done), Trades (done)  
**Why traders pay:** Edgewonk charges $169/year primarily for this

---

## Problem

Setups are currently just free-text tags on trades. Traders can't:
- Define what a setup actually is (rules, conditions)
- Track how each setup performs over time with real stats
- Compare setups side-by-side to kill underperforming ones
- Know the expectancy of each setup before taking a trade

---

## User Story

> As a trader, I want to create formal setup definitions with entry/exit rules, then see exactly how each setup has performed over time — win rate, R-multiple, expectancy — so I can focus on what works and abandon what doesn't.

---

## Data Model

### New Mongoose model: `Setup`
```typescript
// app/api/lib/models/setup.ts
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String (required),                      // "Bull Flag Breakout"
  description: String,                          // "VWAP reclaim with higher low..."
  entryRules: String (rich text HTML),          // Detailed entry criteria
  exitRules: String (rich text HTML),           // Take profit and stop loss rules
  idealConditions: String,                      // Market conditions
  timeframes: [String],                         // ["5m", "15m", "1h"]
  assetClasses: [String],                       // ["stocks", "futures"]
  tags: [String],                               // ["momentum", "breakout"]
  isActive: Boolean (default: true),            // Can soft-delete
  createdAt: Date,
  updatedAt: Date
}
Indexes: { userId: 1, name: 1 }
```

### Trade model: change `setup` field
Currently `setup: String` (free text). After this feature:
```typescript
setup: String         // keep as display name (backward compatible)
setupId: ObjectId     // optional link to Setup document (null for manual entries)
```

---

## API Routes

### `GET /api/setups`
List all setups for current user.  
Query: `?activeOnly=true`

### `POST /api/setups`
Create new setup.

### `GET /api/setups/:id`
Fetch single setup with performance stats:
```typescript
{
  setup: SetupDocument,
  stats: {
    totalTrades: number
    wins: number
    losses: number
    winRate: number
    totalPnl: number
    avgPnl: number
    avgRMultiple: number | null
    expectancy: number            // avgWin * winRate - avgLoss * (1-winRate)
    profitFactor: number
    bestTrade: Trade
    worstTrade: Trade
    grade: 'A' | 'B' | 'C' | 'D' | 'F'   // computed from expectancy
  }
}
```

### `PATCH /api/setups/:id`
Update setup fields.

### `DELETE /api/setups/:id`
Soft delete (`isActive: false`) — preserve historical data.

---

## Setup Grade Calculation

Computed from expectancy score:

```typescript
function gradeSetup(expectancy: number, sampleSize: number): 'A'|'B'|'C'|'D'|'F' {
  if (sampleSize < 10) return 'N/A'  // insufficient data
  if (expectancy > 150) return 'A'
  if (expectancy > 75) return 'B'
  if (expectancy > 0) return 'C'
  if (expectancy > -50) return 'D'
  return 'F'
}
```

Grade badges: A=emerald, B=green, C=amber, D=orange, F=red

---

## Pages

### `/playbook` — Setup Library

**Header:** "My Playbook" + "New Setup" button

**Setup cards grid** (2 columns on desktop):
```
┌─ Bull Flag Breakout ──────────────── Grade: A ─┐
│  5m • stocks, futures                           │
│  "VWAP reclaim with higher low..."              │
│                                                 │
│  47 trades  |  Win Rate: 68%  |  Avg R: +1.8R  │
│  Expectancy: +$142 per trade                    │
│                                                 │
│  P&L curve (sparkline)  ████████▂█▂▂█████       │
│                                                 │
│  [View Details]  [Edit]  [Archive]              │
└─────────────────────────────────────────────────┘
```

Sort options: By expectancy, by total P&L, by trade count, by grade

**"Kill Alert" indicator:** If expectancy < 0 after 20+ trades → amber warning badge on card

### `/playbook/[id]` — Setup Detail

**Sections:**
1. **Setup Description** — rich text rules (read-only, click edit to modify)
2. **Performance Card**
   ```
   Grade: B   Expectancy: +$87/trade   Profit Factor: 2.1
   Trades: 34   Wins: 22   Losses: 12   Win Rate: 65%
   Avg Win: +$234   Avg Loss: -$128   Avg R: +1.8R
   ```
3. **P&L Equity Curve** — area chart of cumulative P&L from this setup only
4. **R-Multiple Distribution** — bar chart for this setup only
5. **Trade History Table** — all trades with this setup, sortable
6. **Performance Over Time** — rolling 10-trade win rate line chart
7. **Edit Setup** — inline edit with RichTextEditor for rules

---

## New Selectors

```typescript
// store/tradesSlice.ts additions

// Returns stats keyed by setup name (extends existing buildSetupStats)
export const selectPlaybookStats = createSelector(
  selectClosedTrades,
  (trades) => {
    const bySetup = new Map<string, Trade[]>()
    trades.forEach(t => {
      if (!t.setup) return
      const list = bySetup.get(t.setup) ?? []
      list.push(t)
      bySetup.set(t.setup, list)
    })
    return Array.from(bySetup.entries()).map(([setup, trades]) => ({
      setup,
      trades: trades.length,
      wins: trades.filter(t => t.pnl > 0).length,
      winRate: trades.filter(t => t.pnl > 0).length / trades.length * 100,
      totalPnl: trades.reduce((s, t) => s + t.pnl, 0),
      avgPnl: trades.reduce((s, t) => s + t.pnl, 0) / trades.length,
      avgR: trades.filter(t => t.rMultiple != null).reduce((s, t) => s + t.rMultiple!, 0) /
            trades.filter(t => t.rMultiple != null).length || null,
      expectancy: computeExpectancy(trades),
      grade: gradeSetup(computeExpectancy(trades), trades.length),
    }))
  }
)
```

---

## Add Trade Form Integration

In `app/add-trade/page.tsx`, change the Setup dropdown:
- Load user's setups from `GET /api/setups`
- Show setup name + grade badge in dropdown
- "Create new setup" option at bottom → opens mini modal
- On selection: pre-fill `setupId` field

---

## Packages Needed

None — uses existing RichTextEditor (TipTap) and Recharts.

---

## Verification

1. Create a new setup with rules → appears in `/playbook`
2. Create 5+ trades tagged with the setup
3. `/playbook/[id]` shows correct stats and grade
4. Modify trades → stats update on next visit
5. Grade changes as more trades are added
6. "Kill alert" appears if expectancy goes negative after 20 trades
7. Archive setup → hidden from list but trades retain setup name
