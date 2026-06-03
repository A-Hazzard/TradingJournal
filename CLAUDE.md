# TradeJournal — AI Context File

> This file is the primary reference for AI models working on this codebase.
> Read this before touching any file. Keep it updated when architecture changes.

---

## What This App Is

A full-stack **premium trading journal and analytics platform**. Traders log their trades, review performance with rich charts and statistics, write daily journal entries, and track their psychological state. Think TradeZella + Tradervue but self-hosted and extensible.

**Live URL:** `http://localhost:3000` (dev)
**DB:** MongoDB `localhost:27017/tradejournal`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| State | Redux Toolkit (RTK) — client state + async thunks |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (jose) + bcryptjs, httpOnly cookies |
| Styling | TailwindCSS — custom dark design system |
| Charts | Recharts (analytics) + Lightweight Charts 4 (price/candles) |
| Forms | React Hook Form + Zod |
| Rich Text | TipTap |
| Icons | Lucide React |

---

## Directory Map

```
app/
  (auth)/           Route group — login/signup pages (no sidebar)
  admin/            Admin user management (admin role required)
  add-trade/        Trade create/edit form
  dashboard/        Main KPI dashboard
  journal/          Daily journal with calendar
  reports/          Analytics tabs (Overview, Setup, Ticker, Time)
  trades/
    page.tsx        Trade log with filters
    [id]/page.tsx   Trade detail with price chart

  api/
    auth/           signup, login, logout, me
    admin/users/    GET list, DELETE by id
    trades/         GET list, POST create, PATCH update, DELETE
    journal/        GET list, POST upsert, DELETE

  api/lib/
    db.ts           MongoDB singleton connectDB()
    models/
      trade.ts      TradeModel + TradeDocument
      journal.ts    JournalModel + JournalDocument
      user.ts       UserModel + UserDocument

components/
  layout/
    AppShell.tsx    Hides sidebar on auth pages
    Sidebar.tsx     Nav + user info + logout
    Header.tsx      Search (Cmd+K) + notifications + profile
  charts/
    PnlAreaChart    Cumulative P&L area chart
    DailyBarChart   Daily P&L bar chart
    RadarScoreChart 6-axis radar + Zella score
    ScatterPlot     Trade P&L by time of day
    TradeChart      TradingView-style candlestick + OHLC + volume
  ui/
    Button, Badge, KpiCard, Modal, Toast, Calendar
    DateTimePicker, RichTextEditor, SearchModal, ProfileModal
    skeletons/      DashboardSkeleton, TradesSkeleton, etc.

store/
  tradesSlice.ts    trades[], filters, async thunks, memoised selectors
  journalSlice.ts   entries[], selectedDate, async thunks
  uiSlice.ts        sidebarCollapsed, toasts[]

lib/
  auth.ts           signToken, verifyToken, getTokenFromRequest
  calculations.ts   computePnl, computeKpis, buildXxxSeries, filterTrades
  formatters.ts     formatCurrency, formatPercent, cn(), getPnlColorClass
  constants.ts      ALL_TAGS, ALL_SETUPS, ASSET_CLASSES, COMMON_PAIRS
  utils/
    cookieSecurity.ts  isSecureContext, getAuthCookieOptions

types/
  trade.ts          Trade, Direction, TradeStatus, TradeFilters, KpiSummary
  journal.ts        JournalEntry, Mood, DailyStats
  chart.ts          PriceCandle, CumulativePnlPoint, SetupStat, etc.

middleware.ts       Route protection — JWT check, admin guard, API guard
```

---

## Design System

All colors are CSS custom properties set in `tailwind.config.ts`:

```
Background:    #0f0f14   (bg-background)
Surface:       #16161e   (bg-surface)
Surface Alt:   #1a1a24   (bg-surface-alt)
Border:        #2d2d3a   (border-border)
Accent:        #8b5cf6   (purple — primary CTA)
Accent Dark:   #7c3aed
Profit:        #10b981   (green — wins/positive P&L)
Loss:          #ef4444   (red — losses/negative P&L)
Text Primary:  #f1f5f9
Text Secondary:#94a3b8
Text Muted:    #64748b
```

**Never use raw hex colors in components.** Always use the semantic tokens above.

---

## Auth System

- JWT stored in `httpOnly` cookie named `token`
- Cookie `secure` flag is **conditional** — never hardcoded. Use `getAuthCookieOptions()` from `lib/utils/cookieSecurity.ts`
- Middleware at `middleware.ts` protects all page routes and API routes
- Middleware injects `x-user-id` and `x-user-role` headers into API requests
- API routes read user identity from these headers (set by middleware) or verify token directly
- Two roles: `user` (default) and `admin`
- Admin pages: `/admin` — protected by middleware + client-side guard in `app/admin/layout.tsx`

---

## Data Flow

```
User Action
  → React component
    → Redux async thunk (createAsyncThunk)
      → fetch() to Next.js API route
        → connectDB() + Mongoose query
          → JSON response
            → Redux state update
              → Memoised selector re-renders component
```

All data fetching goes through Redux thunks — **never fetch directly in components** (exception: auth/user fetch in Sidebar/Header which is UI-local state).

---

## Coding Rules

### Rule Hierarchy & References
- Rules are organized hierarchically: `CLAUDE.md` → `.instructions/rules/` (e.g. `pnl-display.md`) → `.claude/skills/` (e.g. `api-route-structure/SKILL.md`).

### General
- TypeScript strict — zero `any` (use `unknown` + type narrowing or proper types).
- Use `type` not `interface` for type definitions.
- All async functions have try/catch with performance timing warnings (`> 1000ms`).
- Step-numbered comments with `// ===` separators in all API routes and complex functions.
- JSDoc `@module` block on every API route file.
- Prevent ReDoS: escape regex metacharacters when building regex from input.

### Mongoose & Security
- Always `connectDB()` before Mongoose calls in API routes.
- Use `findOne({ _id: id })` — **never `findById()`**.
- Scope all Mongoose queries by `userId` resolved from request header `x-user-id`.
- Always `.lean<T>()` on read queries for plain objects.
- Whitelist request body attributes explicitly in POST/PATCH controllers to avoid mass-assignment.

### Next.js & UI
- All pages that use hooks must declare `'use client'`.
- `params` in route handlers is `Promise<{...}>` — always `await context.params`.
- API route handlers follow: parse → validate → connect DB → query → return.
- Never use generic loading text/spinners; use matching skeletons from `components/ui/skeletons/` for all async loading pages.

### Cookies & P&L Display
- Never hardcode `secure: true` — always use `getAuthCookieOptions(request)` from `lib/utils/cookieSecurity.ts`.
- Format and style P&L values using formatters (`formatCurrency`, `formatPercent`, `formatRMultiple`) and color classes (`getPnlColorClass`, `getPnlBgClass`) from `lib/formatters.ts`. Never hardcode colors for P&L manually.

---

## Key Selectors (tradesSlice)

These are memoized with `createSelector` — use them, don't recompute in components:

```typescript
selectFilteredTrades   // trades after all filters applied
selectClosedTrades     // only CLOSED trades
selectKpis             // full KpiSummary computed from closed trades
selectCumulativePnlSeries  // CumulativePnlPoint[] for area chart
selectDailyBarSeries       // DailyBarPoint[] for bar chart
selectScatterSeries        // ScatterPoint[] for scatter plot
selectRadarData            // RadarDataPoint[] for radar chart
selectSetupStats           // SetupStat[] sorted by total P&L
selectTickerStats          // TickerStat[] sorted by total P&L
selectTradesStatus         // 'idle' | 'loading' | 'succeeded' | 'failed'
```

---

## Feature Roadmap

Detailed specs live in `.claude/features/`. Priority order:

All 8 features are implemented (no premium gating yet — that comes later).

1. `01-broker-csv-import.md` — ✅ Built — `/import`, papaparse, dedup, undo, import history
2. `02-risk-dashboard.md` — ✅ Built — `/risk`, RiskSettings model, position calc, R-multiple dist
3. `03-trade-replay.md` — ✅ Built — `TradeChart` `replayIndex` prop + `ReplayControls`
4. `04-playbook-setups.md` — ✅ Built — `/playbook`, Setup model, grade + expectancy
5. `05-psychology-tracking.md` — ✅ Built — emotion/grade/mistake on trades, checklist on journal, Psychology report tab
6. `06-advanced-analytics.md` — ✅ Built — By Time + Trends report tabs (hour/day/duration/streaks/rolling expectancy)
7. `07-shareable-cards.md` — ✅ Built — `ShareModal` + `PerformanceCard`, PNG export
8. `08-prop-firm-mode.md` — ✅ Built — `/challenges`, PropChallenge model, constraint rings, templates

### Models added
`user`, `riskSettings`, `setup`, `propChallenge`, `importLog` (+ Trade fields: emotionTag, processGrade, mistakeType, importedFrom, importBatchId)

### Shared domain libs
`lib/playbook.ts` (setup grading), `lib/propChallenge.ts` (challenge progress + templates), `lib/brokerParsers.ts` (CSV parsing), `lib/insights.ts` (auto-insights), `lib/calculations.ts` (analytics builders)

---

## File Naming Conventions

- Pages: `app/[route]/page.tsx`
- API routes: `app/api/[resource]/route.ts`
- Components: PascalCase, colocated with their page if single-use
- Shared UI: `components/ui/ComponentName.tsx`
- Feature-specific components: `components/[feature]/ComponentName.tsx`
- Types: `types/[domain].ts`
- Lib utilities: `lib/[utility].ts`

---

## Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/tradejournal
JWT_SECRET=<64-char hex>
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false          # true only in production with HTTPS
```
