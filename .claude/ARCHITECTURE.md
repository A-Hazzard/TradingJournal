# TradeJournal — Technical Architecture

---

## System Overview

```
Browser (Next.js SSR + Client)
  │
  ├─ Middleware (middleware.ts) — JWT verification, header injection
  │
  ├─ App Router Pages — React components with Redux state
  │     ├─ (auth)/ — No sidebar, centered layout
  │     ├─ dashboard/
  │     ├─ trades/[id]/
  │     ├─ journal/
  │     ├─ reports/
  │     └─ admin/
  │
  └─ API Routes (app/api/)
        ├─ auth/ — signup, login, logout, me
        ├─ trades/ — CRUD + candles
        ├─ journal/ — CRUD
        └─ admin/users/ — admin user management
              │
              └─ MongoDB (localhost:27017/tradejournal)
                    ├─ users collection
                    ├─ trades collection
                    └─ journals collection
```

---

## Request Lifecycle

### Page Request
1. Browser requests `/dashboard`
2. `middleware.ts` intercepts — reads `token` cookie
3. `verifyToken(token)` — if invalid → redirect `/login`
4. Injects `x-user-id` + `x-user-role` headers
5. Next.js renders page component
6. Page mounts → `useEffect` dispatches `fetchTrades()`
7. Redux thunk calls `fetch('/api/trades')`
8. API route calls `connectDB()` → queries MongoDB
9. Returns JSON → thunk sets state → selectors recompute → component rerenders

### API Request (authenticated)
1. Browser calls `fetch('/api/trades', { method: 'POST', body: ... })`
2. `middleware.ts` checks JWT — returns 401 if invalid
3. Middleware injects user headers
4. Route handler reads `req.headers.get('x-user-id')` for user scoping
5. `connectDB()` → Mongoose operation → JSON response

---

## Database Schema

### users
```
{
  _id: ObjectId,
  username: String (unique, min 3),
  email: String (unique, lowercase),
  passwordHash: String (bcrypt, 12 rounds),
  role: 'user' | 'admin',
  createdAt: Date,
  updatedAt: Date
}
Indexes: username (unique), email (unique)
```

### trades
```
{
  _id: ObjectId,
  userId: ObjectId (ref: User),         ← multi-user isolation key
  ticker: String,
  assetClass: String (enum),
  direction: 'LONG' | 'SHORT',
  status: 'OPEN' | 'CLOSED',
  entryDateTime: String (ISO),
  entryPrice: Number,
  exitDateTime: String | null,
  exitPrice: Number | null,
  quantity: Number,
  stopLoss: Number | null,
  takeProfit: Number | null,
  commission: Number (default 0),
  fees: Number (default 0),
  tags: [String],
  setup: String,
  journalNotes: String (HTML),
  screenshot: String (URL),
  pnl: Number,                           ← computed server-side
  pnlPercent: Number,                    ← computed server-side
  rMultiple: Number | null,              ← computed if stopLoss set
  holdingDurationMs: Number | null,
  createdAt: Date,
  updatedAt: Date
}
Indexes:
  { userId: 1, entryDateTime: -1 }      ← primary query pattern
  { userId: 1, ticker: 1 }
  { userId: 1, status: 1 }
```

### journals
```
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  date: String (YYYY-MM-DD, unique per user),
  content: String (HTML),
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible',
  dailyGoal: String,
  lessonLearned: String,
  createdAt: Date,
  updatedAt: Date
}
Indexes:
  { userId: 1, date: 1 } (unique)       ← one entry per user per day
```

---

## State Management (Redux)

### Store Shape
```typescript
{
  trades: {
    trades: Trade[],
    filters: TradeFilters,
    selectedTradeId: string | null,
    status: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: string | null
  },
  journal: {
    entries: JournalEntry[],
    selectedDate: string,   // YYYY-MM-DD
    status: LoadingState,
    error: string | null
  },
  ui: {
    sidebarCollapsed: boolean,
    toasts: { id: string, message: string, type: 'success'|'error'|'info' }[]
  }
}
```

### Selector Memoization Chain
```
trades[]
  └─ selectFilteredTrades (applies filters)
       ├─ selectClosedTrades (status === 'CLOSED')
       │    ├─ selectKpis (computeKpis)
       │    │    └─ selectRadarData (buildRadarData)
       │    ├─ selectCumulativePnlSeries (buildCumulativePnlSeries)
       │    ├─ selectDailyBarSeries (buildDailyBarSeries)
       │    ├─ selectScatterSeries (buildScatterSeries)
       │    ├─ selectSetupStats (buildSetupStats)
       │    └─ selectTickerStats (buildTickerStats)
       └─ selectOpenTrades (status === 'OPEN')
```

All selectors use `createSelector` — they only recompute when inputs change.

---

## Auth Architecture

### Token Flow
```
Signup/Login
  → bcrypt.hash/compare
  → jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn: '7d' })
  → response.cookies.set('token', jwt, { httpOnly, secure: conditional, sameSite: 'lax' })

Subsequent requests
  → middleware reads cookies.get('token')
  → jose.jwtVerify(token, JWT_SECRET)
  → injects x-user-id, x-user-role headers
  → API routes read headers — no re-verification needed
```

### Cookie Security Rules
- `secure: false` in development (all HTTP)
- `secure: true` in production when `x-forwarded-proto: https`
- Always use `getAuthCookieOptions(request)` — never hardcode
- `sameSite: 'lax'` always

---

## P&L Calculation Logic (`lib/calculations.ts`)

### computePnl
```
LONG:  (exitPrice - entryPrice) * quantity - commission - fees
SHORT: (entryPrice - exitPrice) * quantity - commission - fees
```

### computePnlPercent
```
LONG:  (exitPrice - entryPrice) / entryPrice * 100
SHORT: (entryPrice - exitPrice) / entryPrice * 100
```

### Zella Score (0–100)
A composite score across 6 dimensions:
```
Win Rate component:      winRate / 100 * 25 points
Profit Factor component: min(profitFactor / 3, 1) * 25 points
R-Multiple component:    min(avgR / 3, 1) * 20 points
Day Win Rate component:  dayWinRate / 100 * 10 points
Frequency component:     min(totalTrades / 50, 1) * 20 points
Total: 0–100
```

---

## Price Chart Architecture (`components/charts/TradeChart.tsx`)

Uses Lightweight Charts v4 (TradingView library) with dynamic import for SSR safety:

```
TradeChart props: candles[], entryTime, entryPrice, exitTime, exitPrice, direction, height
  │
  └─ useEffect (runs on prop change)
       └─ dynamic import('lightweight-charts')
            ├─ createChart(container, config)
            ├─ addCandlestickSeries → setData(candles)
            │    ├─ scaleMargins { top: 0.05, bottom: 0.25 }
            │    ├─ createPriceLine({ entry, green, dashed })
            │    └─ createPriceLine({ exit, red, dashed })
            ├─ addHistogramSeries → setData(volume)
            │    └─ scaleMargins { top: 0.75, bottom: 0 }
            ├─ setMarkers([entryArrow, exitArrow])
            ├─ subscribeCrosshairMove → setOhlc(bar)
            └─ ResizeObserver → chart.applyOptions({ width })

Cleanup: resizeObs.disconnect() + chart.remove()
```

---

## Middleware Architecture

```typescript
// Runs on: /((?!_next/static|_next/image|favicon.ico).*)
// This includes all API routes and all page routes

PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/logout']

if (pathname.startsWith('/api')) {
  if (PUBLIC_API_PATHS) → next()
  if (!token) → 401
  verifyToken → inject x-user-id, x-user-role headers → next()
}

if (AUTH_PAGES ['/login', '/signup']) {
  if (validToken) → redirect /dashboard
  else → next()
}

if (!token) → redirect /login
if (ADMIN_PATHS && role !== 'admin') → redirect /dashboard
→ next()
```

---

## Performance Patterns

### API Route Timing
Every API handler wraps in `const startTime = Date.now()` and logs `> 1000ms` as a warning. Pattern:
```typescript
const startTime = Date.now()
try {
  // ... handler
  const duration = Date.now() - startTime
  if (duration > 1000) console.warn(`[Route] Slow: ${duration}ms`)
} catch (e) {
  const duration = Date.now() - startTime
  console.error(`[Route] Error after ${duration}ms:`, ...)
}
```

### MongoDB Connection
The `connectDB()` singleton pattern avoids creating new connections on every hot-reload in development. Uses a global cache:
```typescript
const cache = global.mongooseCache ?? { conn: null, promise: null }
if (cache.conn) return cache.conn
if (!cache.promise) cache.promise = mongoose.connect(MONGODB_URI)
cache.conn = await cache.promise
```

---

## Planned Features Architecture

See `.claude/features/` for detailed specs. High-level architecture impact per feature:

| Feature | New Models | New Routes | New Pages | New Selectors |
|---|---|---|---|---|
| CSV Import | ImportLog | POST /api/trades/import | /import | - |
| Risk Dashboard | - | GET /api/risk | /risk | selectRiskMetrics |
| Trade Replay | - | - | TradeChart extension | - |
| Playbook | Setup | GET/POST/PATCH/DELETE /api/setups | /playbook, /playbook/[id] | selectPlaybookStats |
| Psychology | Trade.emotion field | - | Reports tab | selectEmotionStats |
| Advanced Analytics | Trade.mae, Trade.mfe | - | Reports tabs | selectMaeFmeStats |
| Shareable Cards | - | - | Modal/component | - |
| Prop Firm Mode | PropChallenge | GET/POST /api/challenges | /challenges | selectChallengeStatus |
