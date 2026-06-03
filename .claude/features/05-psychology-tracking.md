# Feature 05: Psychology & Emotion Tracking

**Priority:** High  
**Effort:** Small-Medium (1 day)  
**Depends on:** Trade model, Journal model  
**Why traders pay:** Emotional trades are the #1 cause of account blowups. Showing the correlation is eye-opening.

---

## Problem

Most traders know emotions hurt their trading but have no data to prove it to themselves. This feature collects emotional state on each trade and surfaces the correlation between emotions and P&L — creating a mirror that forces self-awareness.

---

## User Stories

> As a trader, I want to tag each trade with my emotional state so I can later see that "FOMO" trades lose me $340 on average.

> As a trader, I want a pre-session checklist so I'm forced to evaluate my mental readiness before trading.

> As a trader, I want an automatic revenge trade flag when I enter a trade too quickly after a loss.

---

## Data Model Changes

### Trade model additions
```typescript
// Add to app/api/lib/models/trade.ts schema:
emotionTag: {
  type: String,
  enum: ['confident', 'focused', 'neutral', 'anxious', 'frustrated', 'fomo', 'revenge', 'bored', 'greedy'],
  default: null
},
processGrade: {
  type: String,
  enum: ['A', 'B', 'C', 'D', 'F'],
  default: null
},
mistakeType: {
  type: String,
  enum: ['early_exit', 'late_entry', 'oversized', 'no_stop', 'broke_rules', 'chased', null],
  default: null
}
```

### Journal model additions
```typescript
// Add to app/api/lib/models/journal.ts schema:
preSessionChecklist: {
  sleptWell: Boolean,
  focused: Boolean,
  reviewedPlan: Boolean,
  notDistracted: Boolean,
  acceptedRisk: Boolean,
},
mentalScore: { type: Number, min: 1, max: 10, default: null }  // self-rated mental state
```

---

## Emotion Tags

### Tag Definitions
```typescript
const EMOTION_TAGS = [
  { value: 'confident',   label: 'Confident',   emoji: '💪', color: 'emerald' },
  { value: 'focused',     label: 'Focused',     emoji: '🎯', color: 'blue' },
  { value: 'neutral',     label: 'Neutral',     emoji: '😐', color: 'slate' },
  { value: 'anxious',     label: 'Anxious',     emoji: '😰', color: 'amber' },
  { value: 'frustrated',  label: 'Frustrated',  emoji: '😤', color: 'orange' },
  { value: 'fomo',        label: 'FOMO',        emoji: '🏃', color: 'red' },
  { value: 'revenge',     label: 'Revenge',     emoji: '💀', color: 'red' },
  { value: 'bored',       label: 'Bored',       emoji: '😴', color: 'slate' },
  { value: 'greedy',      label: 'Greedy',      emoji: '🤑', color: 'amber' },
] as const
```

---

## UI Components

### 1. `EmotionPicker` component
```typescript
// components/ui/EmotionPicker.tsx
// Used in: add-trade form (optional field)

// Renders as a row of emoji buttons:
// 💪 🎯 😐 😰 😤 🏃 💀 😴 🤑

// Selected state: filled background with emotion color
// Hover: show label tooltip
// One-click selection, click again to deselect
```

### 2. `ProcessGradePicker` component
```typescript
// components/ui/ProcessGradePicker.tsx
// Used in: add-trade form (optional)

// Renders as: [A] [B] [C] [D] [F] pill buttons
// A = emerald, B = green, C = amber, D = orange, F = red
// Tooltip: "Grade the quality of your execution, not the outcome"
```

### 3. `MistakeTypePicker` component
```typescript
// components/ui/MistakeTypePicker.tsx
// Only shows when processGrade is C, D, or F

// Options as pill buttons:
// "Exited Early" | "Late Entry" | "Oversized" | "No Stop" | "Broke Rules" | "Chased"
```

### 4. `PreSessionChecklist` component
```typescript
// components/ui/PreSessionChecklist.tsx
// Used in: journal page (top of entry form)

// Renders as 5 toggle checkboxes:
// ☐ Slept well (7+ hours)
// ☐ Mind is clear and focused
// ☐ Reviewed trading plan
// ☐ No major distractions today
// ☐ I accept I may lose on individual trades

// Mental score slider: 1 ─────●──── 10
// "How would you rate your mental state today?"
```

---

## Add Trade Form Changes (`app/add-trade/page.tsx`)

Add a new "Psychology" section at the bottom of the form (collapsible):

```
▼ Psychology (optional)
  
  Emotional State
  [💪 Confident] [🎯 Focused] [😐 Neutral] [😰 Anxious] [😤 Frustrated] [🏃 FOMO] [💀 Revenge]

  Process Grade  — "How well did you execute your rules?"
  [A] [B] [C] [D] [F]

  Mistake (if C or below)
  [Exited Early] [Late Entry] [Oversized] [No Stop] [Broke Rules] [Chased]
```

These fields are optional — don't block form submission.

---

## Reports Tab: Psychology Analytics

Add new **"Psychology"** tab to `/reports` page:

### Section 1: Emotion vs P&L Bar Chart
```
Emotion         Avg P&L    Trades   Win Rate
💪 Confident    +$234       23      74%      ████████████████████
🎯 Focused      +$187       15      67%      ███████████████
😐 Neutral      +$45        31      55%      ████
😰 Anxious      -$89        12      42%      ████ (red)
😤 Frustrated   -$156       8       38%      ████████ (red)
🏃 FOMO         -$234       11      27%      ████████████ (red)
💀 Revenge      -$412       5       20%      ████████████████████ (red)
```

### Section 2: Process Grade vs Outcome
```
Grade   Count   Avg P&L   Net P&L
  A      18     +$312     +$5,616
  B      24     +$145     +$3,480
  C      15     -$23      -$345
  D      8      -$167     -$1,336
  F      5      -$298     -$1,490

Key insight: "Your A-grade trades average +$312. Your F-grade trades average -$298.
Follow your rules and you'd earn $610 more per trade."
```

### Section 3: Mistake Analysis
```
Mistake Type     Count   Total P&L Lost
Exited Early       12      -$1,240
Chased              8       -$890
Broke Rules         5       -$760
Late Entry          4       -$320
```

### Section 4: Revenge Trade Detection
```
⚠ Potential Revenge Trades (entered within 10 min of a loss):

  Mar 15 — AAPL — Entered 3 min after -$230 loss — Result: -$180
  Mar 22 — TSLA — Entered 8 min after -$156 loss — Result: -$95

Total P&L from revenge trades: -$275
```

---

## Revenge Trade Detection Algorithm

```typescript
// lib/calculations.ts addition
export function detectRevengeTrades(trades: Trade[], windowMs = 10 * 60 * 1000): Trade[] {
  const sorted = [...trades].sort((a, b) => 
    new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime()
  )
  
  const revengeFlag: Trade[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.pnl < 0) {  // previous trade was a loss
      const gap = new Date(curr.entryDateTime).getTime() - new Date(prev.exitDateTime!).getTime()
      if (gap > 0 && gap <= windowMs) {
        revengeFlag.push(curr)
      }
    }
  }
  return revengeFlag
}
```

---

## Journal Page Changes

Add `PreSessionChecklist` to the top of the journal editor, above the Mood selector:

```
Morning Checklist                        Mental Score: 7/10
☑ Slept well          ☑ Focused          ━━━━━━━━●━━ 
☑ Reviewed plan       ☐ No distractions
☐ Accepted risk

Mood: 😊 Good
```

Auto-save the checklist with the journal entry.

---

## New Selectors

```typescript
// Emotion stats for Psychology tab
export const selectEmotionStats = createSelector(
  selectClosedTrades,
  (trades) => {
    const byEmotion = new Map<string, Trade[]>()
    trades.forEach(t => {
      const tag = t.emotionTag ?? 'untagged'
      const list = byEmotion.get(tag) ?? []
      list.push(t)
      byEmotion.set(tag, list)
    })
    return Array.from(byEmotion.entries()).map(([emotion, trades]) => ({
      emotion,
      count: trades.length,
      avgPnl: trades.reduce((s, t) => s + t.pnl, 0) / trades.length,
      winRate: trades.filter(t => t.pnl > 0).length / trades.length * 100,
      totalPnl: trades.reduce((s, t) => s + t.pnl, 0),
    })).sort((a, b) => b.avgPnl - a.avgPnl)
  }
)

// Process grade stats
export const selectProcessGradeStats = createSelector(
  selectClosedTrades,
  (trades) => {
    const grades = ['A', 'B', 'C', 'D', 'F']
    return grades.map(grade => {
      const graded = trades.filter(t => t.processGrade === grade)
      return {
        grade,
        count: graded.length,
        avgPnl: graded.length ? graded.reduce((s, t) => s + t.pnl, 0) / graded.length : 0,
        totalPnl: graded.reduce((s, t) => s + t.pnl, 0),
      }
    })
  }
)
```

---

## Packages Needed

None — all existing dependencies.

---

## Verification

1. Add trade with "FOMO" emotion tag → appears in psychology report
2. Add trade with process grade "F" + mistake "Broke Rules" → shows in mistake analysis
3. Add two trades in quick succession (second within 10 min of first loser) → revenge trade detected
4. Psychology report shows correct averages grouped by emotion
5. Pre-session checklist saves with journal entry, loads on next visit
