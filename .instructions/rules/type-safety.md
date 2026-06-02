---
description: Strict TypeScript & Type-Safety Rules - Core guidelines for maintaining a zero-any, robustly typed codebase
globs:
  - '**/*.ts'
  - '**/*.tsx'
alwaysApply: true
---

# Strict TypeScript & Type-Safety Rules

## 1. Zero-Any Policy

**RULE**: The usage of `any` is strictly prohibited.

- ❌ **NEVER** use `any` as a type
- ✅ **ALWAYS** define a concrete `type`
- ✅ **USE** `unknown` if type can't be determined, then narrow immediately

---

## 2. Type Location Hierarchy

| Scope | Directory | Use Case |
| :--- | :--- | :--- |
| **Shared** | `types/` | Types used in both frontend and backend |
| **API/Backend** | `app/api/lib/types/` | Types used only in API routes and helpers |

---

## 3. Prefer `type` over `interface`

- ✅ `type Trade = { ... }`
- ❌ `interface Trade { ... }` (avoid unless required by library)

---

## 4. Explicit Type Annotations

- ✅ Annotate function return types in helpers and API routes
- ✅ Annotate `useState` when initial value is `null`, `undefined`, or `[]`

```typescript
const [trades, setTrades] = useState<Trade[]>([]);
const chartRef = useRef<HTMLDivElement>(null);

function computeKpis(trades: Trade[]): KpiSummary { ... }
```

---

## 5. Mongoose & Database Type Safety

Every `findOne`, `find`, `findOneAndUpdate` MUST specify return type via `.lean<T>()`.

```typescript
// ❌ WRONG
const trade = await TradeModel.findOne({ _id: id }).lean();

// ✅ CORRECT
const trade = await TradeModel.findOne({ _id: id }).lean<TradeDocument>();
if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
trade.ticker; // typed
```

For `find`:
```typescript
const trades = await TradeModel.find(filter).lean<TradeDocument[]>();
```

---

## 6. No Comments in Type Files

Type files in `types/` and `app/api/lib/types/` must contain **zero comments**. Type names and field names must be self-documenting.

---

## 7. No Implicit Conversions

- Avoid `!` (non-null assertion) unless absolutely certain
- Prefer `?.` (optional chaining) and `??` (nullish coalescing)

---

## 8. Error Logging in Catch Blocks

```typescript
// ✅ CORRECT
} catch (e) {
  console.error('[FunctionName] Error:', e instanceof Error ? e.message : 'Unknown error');
}

// ❌ WRONG
} catch (e: any) {
  console.error(e);
}
```

---

## 9. Function Parameter Guards

Exported functions MUST validate required parameters at the start:

```typescript
// ✅ CORRECT
async function updateTrade(tradeId: string, data: Partial<TradeDocument>): Promise<void> {
  if (!tradeId) {
    console.error('[updateTrade] tradeId is required');
    return;
  }
  // ...
}
```

---

## 10. Avoid `Record` Type

Prefer specific types over generic `Record<string, unknown>`.

```typescript
// ❌ WRONG
const updateFields: Record<string, unknown> = {};

// ✅ CORRECT
type TradeUpdateFields = Partial<Pick<TradeDocument, 'exitPrice' | 'exitDateTime' | 'tags'>>;
const updateFields: TradeUpdateFields = {};
```

---

**Summary:**
Type safety is the backbone of reliability. Run `npm run build` frequently to catch violations.
