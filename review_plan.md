# TradeJournal — Implementation Review & Plan (for Gemini)

> This is an implementation brief produced after a full audit of the TradeJournal
> codebase. It is ordered by priority; each part is independently shippable. Implement
> the parts in the suggested order at the bottom.

---

## Context

TradeJournal has auth + 8 premium features built (trade replay, risk dashboard,
playbook, psychology tracking, prop-firm challenges, CSV import, shareable cards,
advanced analytics). Before a hypothetical "everyone gets premium" production launch,
three things are needed:

1. Replicate the `.claude` + `.instructions` engineering-rules system from the sibling
   repo `C:\Users\pc\Documents\Github\evolution-one-cms`, adapted to a trading-journal
   (not casino) domain.
2. Close the production-readiness gaps (security, scale, UX, edge cases).
3. A real fix for **Trade Replay** — the candles do not visibly move and the chart
   feels non-interactive during replay (confirmed root cause in Part B).

---

## VERDICT: is it 100%? — No. Core is strong; ~70% of a production product.

**Solid:** auth + middleware, per-user data isolation on the routes, P&L/analytics
math, the feature surface, clean dark UI, skeletons on the original pages.

**Missing / under-thought (must address before "production for everyone"):**
- **Trade Replay is functionally broken** (Part B) — rebuilds the whole chart every
  tick, leaks chart instances, `fitContent()` makes it look like zoom not scroll, and
  the constant teardown kills interactivity.
- **Security holes** (Part C): hardcoded JWT fallback secret, mass-assignment on every
  PATCH/POST (`$set: body` / `create({...body})`), ReDoS in search, no login rate
  limiting, 7-day tokens, signup with no email verification.
- **No pagination anywhere** — `/api/trades`, `/journal`, `/notifications` and the
  Redux store load 100% of a user's history into memory on every page.
- **No global input-validation layer** — Zod schemas exist only on the two auth forms;
  the API trusts the client.
- **Product gaps**: no Settings page (sidebar item was removed), no password reset, no
  email verification, no account deletion/export, no error boundaries, no empty-data
  onboarding, unproven mobile/responsive behaviour, no tests.
- **New feature pages lack skeletons** (risk, playbook, challenges, import use plain
  "Loading…" text — violates the project's own skeleton rule).

---

## PART A — Replicate `.claude` + `.instructions` rules (adapt casino→trading)

Source of truth: `evolution-one-cms/.instructions/rules/` and
`evolution-one-cms/.claude/skills/`. Replicate the **engineering** rules; DROP the
casino-domain ones (gaming-day, licencee multi-tenant, isediting, vault, collection
reports, currency-multiplier).

### A1. `.instructions/rules/` — create/align these files
Copy and adapt (keep the rule text, swap examples to trading domain):
- `ARCHITECTURE.md` — rule hierarchy: `CLAUDE.md` → `.instructions/rules/` →
  `.claude/skills/`. (Already partially present — align.)
- `nextjs-rules.md` (alwaysApply) — direct named React imports (never `import React`),
  `'use client'` discipline, `await context.params`, API route template (parse →
  validate → connectDB → query → return), error handling.
- `type-safety.md` (alwaysApply) — zero `any` (use `unknown` + narrow), `type` over
  `interface`, type-location hierarchy (`types/`, `lib/types/`, `app/api/lib/types/`),
  result-checking on critical ops.
- `mongoose-query-typing.md` (alwaysApply) — always `.lean<T>()`; `findOne({ _id })`
  never `findById()`; `.aggregate<T>()` for pipelines; cursor for large sets.
- `naming-conventions.md` — `[Page]PageContent.tsx`, `type [Component]Props`, no
  single-letter vars (use `index`), domain-specific section comments.
- `http-https-cookie-rules.md` — already present; keep. Conditional `secure`,
  `sameSite:'lax'`, always via `getAuthCookieOptions()`.
- **NEW** `pnl-display.md` (trading analog of casino `currency-display.md`) — never
  hardcode color logic ad-hoc; always use `getPnlColorClass`/`getPnlBgClass` and
  `formatCurrency`/`formatPercent`/`formatRMultiple` from `lib/formatters.ts`; green =
  profit, red = loss, slate = flat.

DROP: `currency-display.md` (multi-currency), `licencee-access-context.md`,
`authorization.md` (reviewer scale), `gaming-day-offset-system.md`,
`isediting-system.md`, `collection-reports-guidelines.md`, `vault-FRD.md`.

### A2. `.claude/skills/<name>/SKILL.md` — create these adapted skills
- `api-route-structure` — JSDoc `@module`, numbered `// ===` steps, perf-warn
  >1000ms, extract helpers >30 lines, **must read `x-user-id` and scope every query**
  (trading-specific addition).
- `backend-standards` — Mongoose only, `findOne({_id,userId})`, `.lean<T>()`,
  whitelist fields before `$set` (ties to Part C mass-assignment fix).
- `react-typescript-rules` — direct imports, no `any`, `type` over `interface`.
- `page-component-structure` — thin `page.tsx` wrapper + `PageContent`, skeleton on
  every async page.
- `skeleton-loaders` — every async page has a matching skeleton in
  `components/ui/skeletons/`, never plain "Loading…".
- `file-organization` — `types/`, `app/api/lib/`, `lib/`, `components/{ui,charts,layout}`.
- `code-style-eslint` — migrate to ESLint v9 flat config (`eslint.config.mjs`); the
  repo currently fails `eslint` because it still has `.eslintrc.json` (v8). Fix this so
  `npm run lint` works.

### A3. `.claude/` housekeeping
- `settings.local.json` — allowlist read-only Bash (`git *`, `ls *`, `find *`,
  `npx tsc --noEmit`, `npm run build`, `npm run lint`) + preview MCP tools.
- `launch.json` already exists (Next dev :3000) — keep.
- Update root `CLAUDE.md` "Coding Rules" to point at the new skills/rules and add the
  security invariants from Part C as hard rules.

---

## PART B — Trade Replay: ROOT CAUSE + REQUIRED REFACTOR (highest-value fix)

**File:** `components/charts/TradeChart.tsx` (+ minor: `app/trades/[id]/page.tsx`,
`components/charts/ReplayControls.tsx`).

### Root cause (confirmed by reading the code)
1. `replayIndex` is in the chart-building `useEffect` dependency array (last line of
   the effect deps). So **the entire chart is destroyed and recreated every ~600ms**
   tick (`delay = 600 / replaySpeed` in the page's play loop).
2. The chart is created inside `import('lightweight-charts').then(...)` (async) but the
   effect cleanup (`chart?.remove()`) runs synchronously. Under rapid ticks this races:
   cleanup can run before `chart` is assigned, **leaking 30+ chart instances** over a
   replay and sometimes rendering a stale instance.
3. `chart.timeScale().fitContent()` runs on every rebuild. Going from N→N+1 visible
   candles on a ~900-candle chart **rescales the whole x-axis each tick** → looks like
   "breathing/zoom", not bars scrolling in. This is exactly the "candles don't move"
   symptom.
4. Because the canvas is torn down every 600ms, crosshair/pan/zoom listeners are
   constantly removed → the chart feels **non-interactive** during replay.

### Required fix — create chart once, update data on tick
Refactor `TradeChart.tsx` to the standard lightweight-charts pattern:
- Hold instances in refs: `chartRef`, `candleSeriesRef`, `volumeSeriesRef`, and refs
  for the entry/exit `IPriceLine`s and the markers.
- **Effect #1 (deps: `[height]` only, or `[]`)** — create the chart + series ONCE.
  Track readiness with a `chartReadyRef`/state so effect #2 waits for the async import.
  Cleanup `chart.remove()` only on unmount.
- **Effect #2 (deps: `[candles, replayIndex, entry/exit/sl/tp, direction]`)** — when
  inputs change, call `candleSeriesRef.current.setData(visibleCandles)` and
  `volumeSeriesRef.current.setData(...)`, update markers via `setMarkers`, and add/
  remove the entry/exit price lines based on `entryRevealed`/`exitRevealed`. NO chart
  re-creation.
- **Do not call `fitContent()` during replay.** Instead keep a fixed window so bars
  scroll through it:
  `chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, len-90), to: len })`.
  Call `fitContent()` only once when entering/leaving replay or on first load.
- Keep the OHLC overlay (already `pointer-events-none`) — it isn't the blocker.
- Optional polish: a subtle "playhead" vertical line at the current bar; debounce
  resize; clamp speed so 5x uses `setData` (cheap now) without flicker.

### Replay verification (must pass)
Run dev, open a CLOSED trade with candles, click Replay → Play:
- Bars visibly scroll in left→right within a stable viewport (no zoom/flicker).
- Entry arrow appears only when the playhead reaches the entry bar; exit arrow + exit
  line only at the exit bar.
- Pause/scrub/step/speed all update the same chart instance; crosshair + pan work while
  paused. DOM has exactly ONE chart canvas throughout (check devtools).

---

## PART C — Security hardening (API + UI)

Ranked. Each item: file → problem → fix.

### Critical
1. **Hardcoded JWT fallback secret** — `lib/auth.ts:9-11`
   `process.env.JWT_SECRET || 'default-secret-key-...'`. Forgeable tokens if env is
   missing. **Fix:** remove the fallback; throw on startup if `JWT_SECRET` unset (allow
   it only when `NODE_ENV==='test'`). Ensure `.env.local` is git-ignored.
2. **Mass-assignment** — every PATCH spreads the raw body:
   `app/api/trades/[id]/route.ts` (`$set: body`), `journal/[id]`, `setups/[id]`,
   `challenges/[id]`, `risk/settings`; and POSTs do `create({...body})` (trades,
   setups, challenges). A client can set server-owned fields (`userId`, `pnl`,
   `rMultiple`, `pnlPercent`, `role`, `importBatchId`, `createdAt`). **Fix:** add a
   per-resource field whitelist (or Zod `.pick`) and only persist allowed keys; always
   force `userId` from the header, never the body. Recompute `pnl/rMultiple`
   server-side (already done for trades — extend the discipline).
3. **Signup role/abuse** — `app/api/auth/signup/route.ts` creates an account with no
   email verification; confirm `role` can't be supplied by the client (force
   `role:'user'`). **Fix:** force role server-side; add email-verification flow (token
   + `verified` flag) before the account is usable, or at minimum gate it behind an
   allowlist for the first launch.

### High
4. **ReDoS in search** — `app/api/search/route.ts` `new RegExp(query,'i')` on raw
   input. **Fix:** escape regex metacharacters
   (`query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')`) or use an Atlas text index / simple
   `$regex` on an escaped string; cap query length.
5. **No login rate limiting** — `app/api/auth/login`. **Fix:** per-IP+identifier
   limiter (in-memory LRU for single instance, or Upstash/Redis); exponential backoff /
   lockout after N fails.
6. **Long-lived tokens** — `JWT_EXPIRES_IN ?? '7d'`. **Fix:** 1h access token +
   refresh-token rotation (httpOnly), or at least drop to 24h and add logout-all via a
   `sessionVersion` claim.
7. **Pagination / unbounded reads** — `api/trades`, `journal`, `notifications`,
   `admin/users`, plus `risk/today` walks ALL closed trades. **Fix:** add `?page&limit`
   (default 50) with `.skip().limit()`; for risk, precompute/store running balance or
   use an aggregation. Update Redux thunks + trades table to page.

### Medium / UI
8. **Numeric range validation** — POST trade allows negative/zero prices, quantities,
   absurd values. **Fix:** Zod schema server-side mirroring the add-trade form.
9. **Admin defense-in-depth** — `/api/admin/**` checks role in-handler (good) but
   middleware only guards the `/admin` *pages*. **Fix:** add an explicit
   `pathname.startsWith('/api/admin') && role!=='admin' → 403` branch in `middleware.ts`.
10. **UI authz** — admin link is hidden client-side only; fine since server enforces,
    but ensure no premium/admin data is fetched then hidden. Add an error boundary so a
    failed `/api/auth/me` doesn't white-screen the app.
11. **Cookie/CSRF** — confirm `sameSite:'lax'` everywhere (it is); state-changing
    routes are POST/PATCH/DELETE with cookie → low CSRF risk, but add an
    `Origin`/`Referer` check on mutations for defense-in-depth.

---

## PART D — Product gaps & edge cases (to feel "complete")

### Missing pages / flows
- **Settings page** (sidebar entry was dropped) — profile (username/email/password
  change exists in `ProfileModal`), risk defaults, account export (CSV of all trades),
  **account deletion** (GDPR), theme.
- **Password reset** (explicitly deferred — required for real users) and **email
  verification**.
- **Onboarding/empty states** — a brand-new user sees empty charts and a −$0 dashboard;
  add a first-run checklist (add first trade / import / create setup).

### Skeletons (project rule violation)
- `app/risk`, `app/playbook`, `app/playbook/[id]`, `app/challenges`,
  `app/challenges/[id]`, `app/import` use plain "Loading…". Add matching skeletons in
  `components/ui/skeletons/` (pattern already established for dashboard/trades).

### Edge cases to handle
- **OPEN trades**: replay/candles, R-multiple, and several stats assume an exit; verify
  OPEN trades render gracefully everywhere.
- **Timezone**: dates stored as ISO; `getHours()`/day-of-week analytics use the
  server/browser local TZ inconsistently (client selectors use browser TZ, risk/today
  uses server). Pin a single TZ (user setting) to avoid "today" drift.
- **Forex/crypto precision**: `formatPrice` switches at <10; quantities can be
  fractional — verify rounding in P&L for BTC-size positions.
- **Duplicate-import edge**: dedup keys on `entryDateTime` exact match — partial fills /
  re-imports with second-level differences slip through; document the limitation.
- **Concurrent edits / journal upsert race**: unique `{userId,date}` index can throw on
  simultaneous upserts — handle the duplicate-key error.
- **Self-deletion / last-admin**: admin user delete blocks self (good); also block
  deleting the last admin.
- **Number inputs**: empty/NaN handling in position calculator and add-trade (coerce +
  guard).

### Tests / CI (none exist)
- Add Vitest unit tests for `lib/calculations.ts`, `lib/playbook.ts`,
  `lib/propChallenge.ts`, `lib/brokerParsers.ts` (pure functions — high ROI).
- Add a Playwright smoke test: login → dashboard → add trade → see it in reports.

---

## Suggested execution order
1. **Part B** (replay refactor) — most visible, self-contained.
2. **Part C critical+high** (JWT secret, mass-assignment whitelist, search ReDoS,
   pagination, rate limit) — blocks any real launch.
3. **Part D skeletons + edge cases** + Settings/onboarding.
4. **Part A** (rules/skills docs + ESLint v9 flat config) — codifies the standards so
   future work stays consistent.

## Global verification
- `npx tsc --noEmit` clean; fix ESLint flat-config then `npm run lint` clean;
  `npm run build` passes.
- Manual: re-run the browser test matrix (login email+username, replay scroll,
  pagination, an unauthorized cross-user `GET /api/trades/<other-id>` returns 404,
  forged-token request rejected, login brute-force throttled).
- Unit tests green.
