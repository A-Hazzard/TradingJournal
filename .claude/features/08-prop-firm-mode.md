# Feature 08: Prop Firm Challenge Tracker

**Priority:** Medium  
**Effort:** Medium (1–2 days)  
**Depends on:** Risk settings concept (Feature 02), Trades  
**Why traders care:** Prop firm trading is a massive and growing market (FTMO, Apex, MyFundedFutures, TopstepTrader)

---

## Problem

Traders trading prop firm challenges have strict rules: max daily loss, max total drawdown, profit target. Breaking any single rule fails the challenge and loses the entry fee ($150–$600). There's no way to track these constraints in the current app.

---

## User Story

> As a trader attempting an FTMO $25k challenge, I want a real-time dashboard showing exactly where I stand on each constraint — daily loss, total drawdown, profit target — so I never accidentally breach a rule and fail the challenge.

---

## Challenge Rules Reference

| Firm | Challenge | Account | Profit Target | Max Daily Loss | Max Total DD |
|---|---|---|---|---|---|
| FTMO | Standard | $25k | $2,500 (10%) | $1,250 (5%) | $2,500 (10%) |
| FTMO | Standard | $100k | $10,000 (10%) | $5,000 (5%) | $10,000 (10%) |
| Apex | Standard | $50k | $3,000 (6%) | $1,000 (2%) | $2,500 (5%) |
| MyFundedFutures | Standard | $50k | $3,000 (6%) | $1,000 (2%) | $2,500 (5%) |
| TopstepTrader | Standard | $50k | $3,000 (6%) | $2,000 (4%) | $3,000 (6%) |

---

## Data Model

### New Mongoose model: `PropChallenge`
```typescript
// app/api/lib/models/propChallenge.ts
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  name: String,                           // "FTMO $25k Phase 1"
  firm: String,                           // 'ftmo' | 'apex' | 'mff' | 'topstep' | 'custom'
  accountSize: Number,                    // 25000
  startingBalance: Number,                // 25000
  profitTarget: Number,                   // 2500
  maxDailyLoss: Number,                   // 1250 (absolute $ amount)
  maxTotalDrawdown: Number,               // 2500 (absolute $ amount)
  drawdownType: 'static' | 'trailing',    // FTMO = static, Apex = trailing
  startDate: String,                      // YYYY-MM-DD
  endDate: String | null,                 // null if no deadline
  phase: 'challenge' | 'verification' | 'funded',
  status: 'active' | 'passed' | 'failed',
  createdAt: Date,
  updatedAt: Date
}
Indexes: { userId: 1, status: 1 }
```

---

## API Routes

### `GET /api/challenges`
List all challenges for current user.

### `POST /api/challenges`
Create new challenge.

**Body:**
```typescript
{
  name: string
  firm: string
  accountSize: number
  profitTarget: number
  maxDailyLoss: number
  maxTotalDrawdown: number
  drawdownType: 'static' | 'trailing'
  startDate: string
  endDate: string | null
  phase: 'challenge' | 'verification' | 'funded'
}
```

### `GET /api/challenges/:id`
Returns challenge document + computed status:
```typescript
{
  challenge: PropChallenge,
  currentBalance: number,
  unrealizedProgress: {
    profitTargetProgress: number,        // % toward profit target
    profitTargetMet: boolean,
    todayLoss: number,
    dailyLossUsed: number,               // % of daily limit used
    dailyLimitBreached: boolean,
    peakBalance: number,
    currentDrawdown: number,
    totalDrawdownUsed: number,           // % of total DD limit used
    totalDrawdownBreached: boolean,
    daysRemaining: number | null,
    tradingDaysLeft: number | null,
    isEligibleToPass: boolean,           // profit met, no breaches
    status: 'safe' | 'warning' | 'danger' | 'passed' | 'failed'
  }
}
```

### `PATCH /api/challenges/:id`
Update challenge (mark passed/failed, update fields).

### `DELETE /api/challenges/:id`
Delete challenge.

---

## Challenge Status Calculation

```typescript
function computeChallengeStatus(challenge: PropChallenge, trades: Trade[]) {
  const challengeTrades = trades.filter(t => 
    new Date(t.entryDateTime) >= new Date(challenge.startDate) &&
    t.status === 'CLOSED'
  )

  const totalPnl = challengeTrades.reduce((s, t) => s + t.pnl, 0)
  const currentBalance = challenge.startingBalance + totalPnl

  // Profit target
  const profitTargetProgress = (totalPnl / challenge.profitTarget) * 100
  const profitTargetMet = totalPnl >= challenge.profitTarget

  // Daily loss (today only)
  const today = new Date().toISOString().split('T')[0]
  const todayTrades = challengeTrades.filter(t => t.entryDateTime.startsWith(today))
  const todayLoss = Math.min(0, todayTrades.reduce((s, t) => s + t.pnl, 0))
  const dailyLimitBreached = Math.abs(todayLoss) >= challenge.maxDailyLoss

  // Total drawdown
  let peakBalance = challenge.startingBalance
  if (challenge.drawdownType === 'trailing') {
    // Trailing: peak updates as balance grows, never drops
    let running = challenge.startingBalance
    for (const trade of challengeTrades.sort((a,b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime())) {
      running += trade.pnl
      peakBalance = Math.max(peakBalance, running)
    }
  }
  // Static: peak is always the starting balance (FTMO style)
  const currentDrawdown = Math.max(0, peakBalance - currentBalance)
  const totalDrawdownBreached = currentDrawdown >= challenge.maxTotalDrawdown

  const status = 
    totalDrawdownBreached || dailyLimitBreached ? 'failed' :
    profitTargetMet ? 'passed' :
    Math.abs(todayLoss) > challenge.maxDailyLoss * 0.75 || currentDrawdown > challenge.maxTotalDrawdown * 0.75 ? 'warning' :
    'safe'

  return { profitTargetProgress, profitTargetMet, todayLoss, dailyLimitBreached, currentDrawdown, totalDrawdownBreached, status }
}
```

---

## New Page: `/challenges`

### Challenge List View (`/challenges`)

```
┌── Active Challenges ──────────────────────────────────┐
│                                                       │
│  FTMO $25k Phase 1            ● SAFE (8 days left)   │
│  Progress: ████████░░░░░░  62%                        │
│  P&L: +$1,556 / $2,500 target                        │
│  Daily: -$120 / $1,250 limit  ●●●░░░░░░░ 10%         │
│  Total DD: -$340 / $2,500    ●●●░░░░░░░░ 14%         │
│  [View Details]                                       │
│                                                       │
│  Apex $50k Challenge          ⚠ WARNING (2 days left) │
│  Progress: ██████████████░░  89%                      │
│  P&L: +$2,670 / $3,000 target                        │
│  Daily: -$780 / $1,000 limit  ████████░░ 78% ⚠       │
│  Total DD: -$1,890 / $2,500   ████████░░ 76%         │
│  [View Details]                                       │
│                                                       │
│  [+ New Challenge]                                    │
└───────────────────────────────────────────────────────┘

Completed Challenges:
  ✅ FTMO $10k Phase 1  — PASSED  (+$1,100 / 10 days)
  ❌ Apex $25k          — FAILED  (Daily loss breach, Day 3)
```

### Challenge Detail View (`/challenges/[id]`)

**Header:**
```
FTMO $25k Phase 1
Started Mar 1 · 8 days remaining · ● SAFE
Account: $25,000 → $26,556 (+$1,556)
```

**4 progress rings (TradingView-style):**
```
  Profit Target    Daily Loss Limit    Total Drawdown    Days Left
      62%               10%                14%            8/30
  ████████░░░░     ●░░░░░░░░░          ██░░░░░░░░         
  $1,556/$2,500    $120/$1,250         $340/$2,500
  Target Met? NO   Status: SAFE        Status: SAFE
```

**Rules reminder panel:**
```
⚠ Challenge Rules — Do not violate these
  ☐ Minimum trading days: 10 (you have 8 so far)
  ☑ No overnight positions
  ☑ No news trading
  ☐ Reach profit target: $2,500
```

**Trade list for this challenge period:**
Table of all trades since challenge start date.

---

## Pre-built Challenge Templates

When creating a challenge, offer "Quick Setup" buttons:

```typescript
const CHALLENGE_TEMPLATES = {
  ftmo_25k: {
    name: 'FTMO $25k Challenge',
    firm: 'ftmo', accountSize: 25000, profitTarget: 2500,
    maxDailyLoss: 1250, maxTotalDrawdown: 2500, drawdownType: 'static'
  },
  ftmo_100k: { ... },
  apex_50k: { ... },
  mff_50k: { ... },
  topstep_50k: { ... },
}
```

---

## Sidebar Integration

If user has an active challenge in `warning` or `danger` state, show a persistent badge:

```
⚠ Active: FTMO $25k
  Daily: 78% used
```

As a small chip in the sidebar below the nav items.

---

## Packages Needed

None — uses existing Recharts and patterns.

---

## Verification

1. Create FTMO $25k challenge using quick template
2. Add trades until profit target is met → status shows "passed"
3. Add a large losing trade that breaches daily limit → status shows "failed" + red banner
4. Trailing drawdown challenge: peak balance updates correctly as account grows
5. Quick setup templates pre-fill all fields correctly
6. Challenge shows correct trade count from start date only (not all-time trades)
