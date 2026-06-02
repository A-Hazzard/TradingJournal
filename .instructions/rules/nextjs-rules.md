---
description: Senior Software Engineering Rules for Next.js Projects - Strict engineering guidelines for code quality, maintainability, and security
globs:
  - '**/*.ts'
  - '**/*.tsx'
alwaysApply: true
---

# Senior Software Engineering Rules for Next.js Projects

Strict engineering guidelines to ensure code quality, maintainability, and security for the TradeJournal Next.js project.

## Project Context: TradeJournal

**System Overview:**
- **Purpose**: Premium dark-mode trading journal & analytics platform
- **Technology Stack**: Next.js 16, TypeScript, MongoDB with Mongoose, Tailwind CSS v3, Redux Toolkit
- **Key Features**: Trade analytics dashboard, candlestick charts with entry/exit markers, daily journal, P&L reporting

---

## 2. React Imports & Hook Usage

**CRITICAL**: Never import the React namespace itself.

- ❌ **NEVER** use `import React from 'react'` or `import * as React from 'react'`
- ❌ **NEVER** use `React.useState`, `React.useEffect`, `React.FC`, etc.
- ✅ **ALWAYS** import hooks and types directly: `import { useState, useEffect } from 'react'`

```typescript
// ✅ CORRECT
import { useState, useEffect, useMemo, useCallback } from 'react';
import { FC, ReactNode } from 'react';

// ❌ INCORRECT
import React from 'react';
React.useState(); // Never do this
```

---

## 3. TypeScript Discipline

- **Prefer `type` over `interface`** for consistency.
- **No `any` allowed** — use concrete type definitions.
- **No single-letter variables** — use descriptive names even in loops.
- **No underscore prefixes** except `_id` for MongoDB.
- **Explicit return types** on all helper and API route functions.

---

## 4. API Route Structure — CRITICAL REQUIREMENTS

```typescript
/**
 * [Route Name] API Route
 *
 * [Brief description]
 * It supports:
 * - Feature 1
 * - Feature 2
 *
 * @module app/api/[path]/route
 */

import { connectDB } from '@/app/api/lib/db';
import { TradeModel } from '@/app/api/lib/models/trade';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler
 *
 * Flow:
 * 1. Parse request parameters
 * 2. Connect to database
 * 3. Fetch data
 * 4. Return response
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    // ============================================================================
    // STEP 1: Parse request parameters
    // ============================================================================

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch data
    // ============================================================================

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) console.warn(`[Route GET] Slow: ${duration}ms`);
    return NextResponse.json(data);
  } catch (e) {
    console.error('[Route GET] Error:', e instanceof Error ? e.message : 'Unknown error');
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
```

---

## 4.1. Page.tsx Structure

- **Thin wrapper**: `page.tsx` should only handle routing/layout
- **Content component**: Extract logic to a `[Page]PageContent` component
- **Section comments**: Use `// ============================================================================` separators

---

## 4.2. Component Structure

```typescript
export default function ComponentName(props: ComponentNameProps) {
  // ============================================================================
  // Hooks & State
  // ============================================================================

  // ============================================================================
  // Computed Values
  // ============================================================================

  // ============================================================================
  // Event Handlers
  // ============================================================================

  // ============================================================================
  // Effects
  // ============================================================================

  return (/* JSX */);
}
```

---

## 5. Loading States — CRITICAL

- **MANDATORY**: Every page with async data MUST use specific skeleton loaders
- **NEVER** use generic "Loading..." text or generic spinners
- Skeletons must match the exact layout and structure of actual content
- Place skeleton files in `components/ui/skeletons/`
- Name specifically: `DashboardSkeleton`, `TradeLogSkeleton`, etc.

---

## 6. Error Logging Pattern

```typescript
// ✅ CORRECT
} catch (e) {
  console.error('[FunctionName] Error:', e instanceof Error ? e.message : 'Unknown error');
}
```

---

## 7. MongoDB Query Standards

- ✅ Use `Model.findOne({ _id: id })` — never `findById(id)`
- ✅ Always use `.lean<T>()` on Mongoose queries
- ✅ Never use `db.collection()` directly — always use imported Mongoose models
- ✅ No `findByIdAndUpdate` — use `findOneAndUpdate({ _id: id }, ...)`

---

**Summary:**
This project enforces strict discipline in type safety, code style, modularity, and build integrity.
All contributors must follow these rules to ensure a robust, maintainable codebase.
