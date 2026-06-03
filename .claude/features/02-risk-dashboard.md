# Feature 02: Risk Dashboard

**Priority:** Critical  
**Effort:** Medium (1–2 days)  
**Depends on:** Nothing (uses existing trades + new settings)  
**Why traders pay:** Most losses come from risk management failures, not bad setups

---

## Problem

The app tracks P&L but has no concept of risk. Traders need to know:
- How much of their account they risked on each trade
- Whether they're close to their daily loss limit
- What position size to use given their risk tolerance
- Whether their realized R-multiples match their planned risk/reward

---

## User Stories

> As a trader, I want to see a real-time progress bar toward my daily loss limit so I stop trading before blowing up.

> As a trader, I want a position size calculator so I know exactly how many shares/contracts to buy given my account size and risk tolerance.

> As a trader, I want to see my R-multiple distribution so I know if I'm actually following my risk/reward plan.

---

## New Page: `/risk`

### Layout (3 sections)

**Section 1: Account Overview**
```
┌─ Account Balance ──────────────────────┐
│  Starting: $25,000                     │
│  Current:  $26,340  (+$1,340, +5.4%)   │
│  Peak:     $27,100                     │
│  Max DD from Peak: -$760 (-2.8%)       │
└────────────────────────────────────────┘
```

**Section 2: Today's Risk Status**
```
┌─ Daily Loss Limit ─────────────────────┐
│  Limit: -$500                          │
│  Used:  -$120  ████░░░░░░  24%         │
│  Status: SAFE (green)                  │
│                                        │
│  ⚠ Approaching limit at $380 loss      │
│  🛑 Limit breached — STOP TRADING      │
└────────────────────────────────────────┘
```

**Section 3: Position Size Calculator**
```
┌─ Position Size Calculator ─────────────┐
│  Account Size:    $25,000              │
│  Risk %:         1.0%  → $250 risk     │
│  Entry Price:    $185.50               │
│  Stop Loss:      $183.00               │
│  Stop Distance:  $2.50 (1.35%)         │
│  ─────────────────────────────────────  │
│  Position Size:  100 shares            │
│  Position Value: $18,550               │
│  Max Loss:       $250.00 ✓             │
└────────────────────────────────────────┘
```

**Section 4: R-Multiple Distribution**
```
Bar chart: How often do you hit each R-multiple?
  -3R │ ██ (2)
  -2R │ █████ (5)
  -1R │ ████████ (8)   ← baseline (stopped out at plan)
   0R │ ████ (4)
  +1R │ ██████████ (10)
  +2R │ ███████ (7)
  +3R │ ████ (4)
  +4R │ █ (1)
```

**Section 5: Risk Metrics**
```
┌──────────────────┬──────────────────┐
│  Profit Factor   │  Avg Win/Loss R  │
│  2.34            │  +1.8R / -1.0R   │
├──────────────────┼──────────────────┤
│  Expectancy      │  Max Drawdown    │
│  +$87 per trade  │  -$2,340 (9.4%)  │
├──────────────────┼──────────────────┤
│  Win Rate        │  Consecutive     │
│  58%             │  Max Loss Streak │
│                  │  4 trades        │
└──────────────────┴──────────────────┘
```

---

## Data Model Changes

### New Mongoose model: `RiskSettings`
```typescript
// app/api/lib/models/riskSettings.ts
{
  userId: ObjectId (unique),
  accountBalance: Number,          // current account balance
  startingBalance: Number,         // baseline for drawdown calc
  dailyLossLimit: Number,          // e.g. 500 (dollar amount)
  maxRiskPerTrade: Number,         // e.g. 1.0 (percent)
  maxDailyRiskPercent: Number,     // e.g. 2.0 (percent of account)
  updatedAt: Date
}
```

---

## API Routes

### `GET /api/risk/settings`
Returns current user's RiskSettings document (create with defaults if none exists).

**Response:**
```typescript
{
  accountBalance: number
  startingBalance: number
  dailyLossLimit: number
  maxRiskPerTrade: number
  maxDailyRiskPercent: number
}
```

### `PATCH /api/risk/settings`
Upserts risk settings for current user.
- `findOneAndUpdate({ userId }, { $set: body }, { upsert: true, new: true })`

### `GET /api/risk/today`
Returns today's trading summary for risk context:
```typescript
{
  todayPnl: number           // sum of today's closed trade P&L
  todayTrades: number
  todayRisk: number          // sum of (entryPrice - stopLoss) * quantity for today
  dailyLimitUsedPercent: number
  isLimitBreached: boolean
  peakBalance: number        // all-time high balance
  currentDrawdown: number    // from peak
  currentDrawdownPercent: number
}
```

---

## New Selectors

Add to `store/tradesSlice.ts`:

```typescript
// R-multiple distribution
export const selectRMultipleDistribution = createSelector(
  selectClosedTrades,
  (trades) => {
    // Bucket into: -3R, -2R, -1R, 0R, +1R, +2R, +3R, +4R+
    const buckets = new Map<string, number>()
    trades.forEach(trade => {
      if (trade.rMultiple == null) return
      const bucket = Math.round(Math.clamp(trade.rMultiple, -3, 4))
      const key = bucket >= 4 ? '+4R+' : `${bucket >= 0 ? '+' : ''}${bucket}R`
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    })
    return Array.from(buckets.entries()).map(([r, count]) => ({ r, count }))
  }
)

// Expectancy (average P&L per trade)
export const selectExpectancy = createSelector(
  selectClosedTrades,
  (trades) => trades.length === 0 ? 0 : trades.reduce((s, t) => s + t.pnl, 0) / trades.length
)

// Max consecutive loss streak
export const selectMaxLossStreak = createSelector(
  selectClosedTrades,
  (trades) => {
    let maxStreak = 0, current = 0
    trades.forEach(t => {
      if (t.pnl < 0) { current++; maxStreak = Math.max(maxStreak, current) }
      else current = 0
    })
    return maxStreak
  }
)
```

---

## Position Size Calculator Component

Pure client-side component — no API call needed:

```typescript
// components/risk/PositionSizeCalculator.tsx

type Inputs = {
  accountSize: number     // from risk settings
  riskPercent: number     // user sets 0.5% – 5%
  entryPrice: number
  stopLoss: number
}

function calculate(inputs: Inputs) {
  const riskAmount = inputs.accountSize * (inputs.riskPercent / 100)
  const stopDistance = Math.abs(inputs.entryPrice - inputs.stopLoss)
  const shares = Math.floor(riskAmount / stopDistance)
  const positionValue = shares * inputs.entryPrice
  return { riskAmount, stopDistance, shares, positionValue }
}
```

---

## Daily Loss Limit Alert System

Add to `components/layout/Header.tsx`:
- On mount: fetch `/api/risk/today`
- If `dailyLimitUsedPercent > 80%`: show amber warning banner
- If `isLimitBreached`: show red banner "Daily loss limit reached — consider stopping"
- Banner can be dismissed but re-appears on next page load

---

## Navigation

Add to Sidebar nav items:
```typescript
{ href: '/risk', label: 'Risk', Icon: ShieldAlert }
```

---

## Packages Needed

None — uses existing Recharts for charts.

---

## Verification

1. Set account balance $25,000, daily limit $500
2. Log trades totaling -$200 → progress bar shows 40%
3. Log trades totaling -$600 → bar shows 100%+, red warning shows
4. Position size calculator: $25k account, 1% risk, $185 entry, $183 SL → should show 100 shares
5. R-multiple distribution chart shows all trades bucketed correctly
