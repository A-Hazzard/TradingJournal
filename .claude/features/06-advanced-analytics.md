# Feature 06: Advanced Analytics

**Priority:** Medium  
**Effort:** Medium (1–2 days)  
**Depends on:** Reports page (exists), existing selectors  
**Unlocks:** Deeper insight that makes the reports page worth opening every day

---

## Problem

The current reports page shows basic breakdowns. Serious traders need more specific insights — especially time-based patterns (which hours are profitable, which days) and execution quality metrics (MAE/MFE).

---

## New Analytics to Add

### 1. P&L by Hour of Day Heatmap

The current scatter plot shows individual trades. Replace/augment it with an **hourly heatmap** showing average P&L per hour:

```
         Mon   Tue   Wed   Thu   Fri
9:00 AM  +120  +234  -45   +89   +156
10:00 AM +345  +123  +234  +178  +234
11:00 AM -89   +45   -134  +23   -56
12:00 PM -234  -89   -45   -123  -178
1:00 PM  +45   -23   +89   -45   +23
2:00 PM  +178  +234  +156  +189  +245
3:00 PM  +89   +45   +123  +67   +134
```

Color scale: deep green → light green → neutral → light red → deep red

### 2. P&L by Day of Week

Simple bar chart + stats table:
```
Monday:    15 trades  Win Rate: 40%  Avg P&L: -$67   Net: -$1,005  ← danger day
Tuesday:   22 trades  Win Rate: 64%  Avg P&L: +$145  Net: +$3,190
Wednesday: 18 trades  Win Rate: 61%  Avg P&L: +$123  Net: +$2,214
Thursday:  20 trades  Win Rate: 60%  Avg P&L: +$98   Net: +$1,960
Friday:    12 trades  Win Rate: 50%  Avg P&L: +$12   Net: +$144
```

Auto-highlight the best day (emerald) and worst day (red).
Insight callout: "You lose on Mondays. Consider waiting until Tuesday."

### 3. MAE / MFE Analysis

**MAE** (Maximum Adverse Excursion) — how far against you a trade moved before it closed  
**MFE** (Maximum Favorable Excursion) — how far in your favor before it closed

These reveal:
- Are stops too tight? (MAE > stop distance on winning trades)
- Are you exiting too early? (MFE >> actual gain)
- Could you use tighter stops? (MAE is small on losing trades)

Requires new fields on Trade model:
```typescript
mae: Number | null   // $ amount adverse excursion from entry
mfe: Number | null   // $ amount favorable excursion from entry
```

**Scatter plot (MAE vs MFE):**
- X axis: MAE (how much it went against you, 0 to -$X)
- Y axis: MFE (how much it went in your favor, 0 to +$Y)
- Green dots: winning trades, Red dots: losing trades
- Diagonal reference line: MFE = MAE (balanced risk/reward)

**Insight:** "Your average MFE is 3.2x your average MAE — you're leaving money on the table by exiting too early."

### 4. Holding Time Distribution

Bar chart showing trade duration buckets vs P&L:
```
< 5 min:   8 trades  Avg: -$123  (red) ← scalp trades losing
5-30 min:  15 trades  Avg: +$45
30-2hr:    22 trades  Avg: +$189  (green) ← sweet spot
2-8hr:     12 trades  Avg: +$87
> 8hr:     5 trades   Avg: -$234  (red) ← holding too long
```

Insight: "Your best trades last 30 min – 2 hours. Trades held longer than 8 hours average -$234."

### 5. Streak Analysis

```
Current streak: 3 wins ✅ 
Best win streak: 8 trades (Feb 12–Feb 21)
Worst loss streak: 5 trades (Mar 3–Mar 7)

Recovery time after loss streaks:
  After 3+ losses: average 1.4 days to return to profit
  After 5+ losses: average 3.2 days

Win Streak Distribution:
  1 win then loss:  12 occurrences
  2 wins then loss: 8 occurrences
  3 wins then loss: 5 occurrences
  4+ wins:          3 occurrences
```

### 6. Expectancy Curve (Rolling)

Line chart showing rolling 20-trade expectancy over time:
- X axis: trade number / date
- Y axis: rolling expectancy ($)
- Rising line = improving edge
- Flat line = consistent edge
- Falling line = edge deteriorating (needs attention)

---

## Data Model Changes

### Trade model additions for MAE/MFE
```typescript
// app/api/lib/models/trade.ts additions
mae: { type: Number, default: null }    // maximum adverse excursion in $
mfe: { type: Number, default: null }    // maximum favorable excursion in $
```

These are manually entered (import from broker) or calculated from candlestick data (high-fidelity). Add to add-trade form as optional fields: "Max loss point (MAE)" and "Max profit point (MFE)".

---

## Reports Page Changes

### New Tabs

Current tabs: Overview | By Setup | By Ticker | By Time

**New tabs:**
- `By Time` → expanded with heatmap + day-of-week + holding duration
- `Streaks` → new tab with streak analysis  
- `Execution` → MAE/MFE scatter + expectancy curve

Final tab order: **Overview | Setup | Ticker | Time | Execution | Streaks**

---

## New Selectors

```typescript
// store/tradesSlice.ts additions

// P&L by hour of day (for heatmap)
export const selectPnlByHour = createSelector(
  selectClosedTrades,
  (trades) => {
    const hours: Record<number, { totalPnl: number, count: number }> = {}
    trades.forEach(t => {
      const hour = new Date(t.entryDateTime).getHours()
      if (!hours[hour]) hours[hour] = { totalPnl: 0, count: 0 }
      hours[hour].totalPnl += t.pnl
      hours[hour].count++
    })
    return Object.entries(hours).map(([hour, data]) => ({
      hour: parseInt(hour),
      avgPnl: data.count > 0 ? data.totalPnl / data.count : 0,
      totalPnl: data.totalPnl,
      count: data.count,
    })).sort((a, b) => a.hour - b.hour)
  }
)

// P&L by day of week
export const selectPnlByDayOfWeek = createSelector(
  selectClosedTrades,
  (trades) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const data = days.map((day, idx) => {
      const dayTrades = trades.filter(t => new Date(t.entryDateTime).getDay() === idx)
      return {
        day, idx,
        count: dayTrades.length,
        wins: dayTrades.filter(t => t.pnl > 0).length,
        winRate: dayTrades.length ? dayTrades.filter(t => t.pnl > 0).length / dayTrades.length * 100 : 0,
        avgPnl: dayTrades.length ? dayTrades.reduce((s, t) => s + t.pnl, 0) / dayTrades.length : 0,
        totalPnl: dayTrades.reduce((s, t) => s + t.pnl, 0),
      }
    }).filter(d => d.idx !== 0 && d.idx !== 6) // remove weekends
    return data
  }
)

// Holding duration buckets
export const selectPnlByDuration = createSelector(
  selectClosedTrades,
  (trades) => {
    const buckets = [
      { label: '< 5m',   max: 5 * 60 * 1000 },
      { label: '5–30m',  max: 30 * 60 * 1000 },
      { label: '30m–2h', max: 2 * 60 * 60 * 1000 },
      { label: '2–8h',   max: 8 * 60 * 60 * 1000 },
      { label: '> 8h',   max: Infinity },
    ]
    return buckets.map(bucket => {
      const inBucket = trades.filter(t => 
        t.holdingDurationMs != null && t.holdingDurationMs < bucket.max
      )
      return {
        label: bucket.label,
        count: inBucket.length,
        avgPnl: inBucket.length ? inBucket.reduce((s, t) => s + t.pnl, 0) / inBucket.length : 0,
        totalPnl: inBucket.reduce((s, t) => s + t.pnl, 0),
      }
    })
  }
)

// Rolling expectancy (20-trade window)
export const selectRollingExpectancy = createSelector(
  selectClosedTrades,
  (trades) => {
    const WINDOW = 20
    return trades.slice(WINDOW - 1).map((_, i) => {
      const window = trades.slice(i, i + WINDOW)
      const expectancy = window.reduce((s, t) => s + t.pnl, 0) / WINDOW
      return { date: trades[i + WINDOW - 1].entryDateTime, expectancy, tradeIndex: i + WINDOW }
    })
  }
)
```

---

## Insight Callouts

Each analytics section ends with an auto-generated insight:

```typescript
// lib/insights.ts
export function generateTimeInsight(pnlByHour: HourStat[]): string {
  const best = pnlByHour.reduce((a, b) => a.avgPnl > b.avgPnl ? a : b)
  const worst = pnlByHour.reduce((a, b) => a.avgPnl < b.avgPnl ? a : b)
  return `Your best hour is ${formatHour(best.hour)} (+${formatCurrency(best.avgPnl)} avg). 
          Avoid trading after ${formatHour(worst.hour)} (${formatCurrency(worst.avgPnl)} avg).`
}

export function generateDayInsight(pnlByDay: DayStat[]): string | null {
  const losingDay = pnlByDay.find(d => d.winRate < 40 && d.count >= 5)
  if (!losingDay) return null
  return `You consistently lose on ${losingDay.day}s (${losingDay.winRate.toFixed(0)}% win rate). 
          Consider skipping ${losingDay.day}s — it would save you ${formatCurrency(Math.abs(losingDay.totalPnl))}.`
}
```

These appear as yellow/amber callout boxes above the charts.

---

## Packages Needed

None — uses existing Recharts.

---

## Verification

1. Reports → Time tab shows P&L by hour chart and day-of-week table
2. Holding duration chart shows all 5 buckets
3. Execution tab shows MAE/MFE scatter (for trades with those fields)
4. Streaks tab shows current streak and historical analysis
5. Insight callouts appear with meaningful text when 10+ trades exist
