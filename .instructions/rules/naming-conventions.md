---
description: Naming conventions and folder structure rules for the TradeJournal project.
globs: **/*.{ts,tsx}
---

# Project Naming Conventions & Folder Structure

## 1. Component Naming Conventions

### Page Components
All page-level content components must follow the `[PageName]PageContent` pattern.
- ✅ `DashboardPageContent.tsx`
- ✅ `TradeLogPageContent.tsx`

### Feature-Specific Components
- ✅ `TradeChartMarkers.tsx`
- ✅ `JournalMoodSelector.tsx`

### Reusable UI Components
Live in `components/ui/` with simple descriptive names.
- ✅ `Button.tsx`, `KpiCard.tsx`, `Badge.tsx`

## 2. Prop Type Naming

Prop types must match the component name with a `Props` suffix using `type`.
- ✅ `type TradeChartProps = { ... }`
- ✅ `type KpiCardProps = { ... }`

## 3. Function Naming

- Event handlers: prefix with `handle` — `handleSubmit`, `handleDelete`
- Data fetching: prefix with `fetch` — `fetchTrades`, `fetchJournalEntry`
- Transformation: prefix with `format`, `calculate`, or `build` — `formatCurrency`, `buildKpis`

## 4. Folder Structure

```
app/
├── api/
│   ├── lib/
│   │   ├── db.ts               # MongoDB connection
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── trade.ts
│   │   │   └── journal.ts
│   │   └── helpers/            # Business logic helpers
│   ├── trades/
│   │   ├── route.ts            # GET (list), POST (create)
│   │   └── [id]/
│   │       └── route.ts        # GET, PATCH, DELETE
│   └── journal/
│       ├── route.ts
│       └── [id]/
│           └── route.ts
components/
├── charts/                     # Chart components
├── layout/                     # Sidebar, Header, Layout
├── ui/
│   ├── skeletons/              # Page-specific skeleton loaders
│   └── [primitives]            # Button, Badge, Modal, etc.
lib/
├── calculations.ts             # KPI computation logic
├── formatters.ts               # cn(), formatCurrency, etc.
├── constants.ts                # ALL_TAGS, ALL_SETUPS, ALL_TICKERS
├── mockPriceData.ts            # Price candle generator
store/
└── [slices]
types/
└── [domain types]
```

## 5. Variable Naming — No Single-Letter Variables (CRITICAL)

Never use single-letter variables in any part of the codebase.

- ❌ `trades.reduce((s, t) => s + t.pnl, 0)`
- ✅ `trades.reduce((sum, trade) => sum + trade.pnl, 0)`
- ❌ `for (let i = 0; i < items.length; i++)`
- ✅ `for (let index = 0; index < items.length; index++)`

## 6. React Imports (CRITICAL)

```typescript
// ✅ CORRECT
import { useState, useEffect, useMemo } from 'react';

// ❌ WRONG
import React from 'react';
React.useState();
```

## 7. Component Section Comments

Use the standardized separator with descriptive domain-specific headers:

```typescript
// ============================================================================
// Trade Data & Filter State
// ============================================================================

// ============================================================================
// P&L Calculations
// ============================================================================

// ============================================================================
// Chart Event Handlers
// ============================================================================
```

- ❌ Generic: `// Hooks & State`, `// Event Handlers`, `// Render Logic`
- ✅ Specific: `// Trade Filter State`, `// Chart Resize Handlers`, `// KPI Computations`
