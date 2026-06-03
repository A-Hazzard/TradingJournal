# Feature 01: Broker CSV Import

**Priority:** Critical  
**Effort:** Large (3–4 days)  
**Depends on:** Nothing  
**Unlocks:** All serious users — this removes the #1 adoption blocker

---

## Problem

Every trade must be entered manually today. Serious traders execute 10–50+ trades per day. Manual entry is a dealbreaker — it's the primary reason traders don't stick with journals.

---

## User Story

> As a trader, I want to upload my broker's trade history CSV and have all my trades imported automatically so I don't have to enter them by hand.

---

## Supported Brokers (Phase 1)

| Broker | File Type | Notes |
|---|---|---|
| TD Ameritrade / thinkorswim | CSV | Standard export from Activity & Positions |
| Interactive Brokers (IBKR) | CSV / Flex XML | Activity statement CSV |
| Webull | CSV | Order history export |
| Robinhood | CSV | Account statements |
| TradeStation | CSV | Account activity report |
| Tastytrade | CSV | Transactions CSV |
| **Generic** | CSV | Manual column mapping fallback |

---

## UI Flow

```
/import page
  1. Drag & drop or click-to-upload CSV file
  2. Auto-detect broker from column headers
  3. Show preview: first 5 rows of parsed data
  4. Column mapping UI (if broker not auto-detected)
  5. Duplicate detection: show count of skipped duplicates
  6. Confirm import button
  7. Progress indicator (processing row X of Y)
  8. Success summary: "47 trades imported, 3 skipped (duplicates)"
  9. "View Imported Trades" button
```

---

## Data Model Changes

### New Mongoose model: `ImportLog`
```typescript
// app/api/lib/models/importLog.ts
{
  userId: ObjectId,
  filename: String,
  broker: String,               // 'thinkorswim' | 'ibkr' | 'webull' | 'generic' | ...
  totalRows: Number,
  imported: Number,
  skipped: Number,              // duplicates
  errors: Number,
  errorMessages: [String],
  status: 'success' | 'partial' | 'failed',
  createdAt: Date
}
```

### Trade model additions
```typescript
importedFrom: String | null    // broker name
importBatchId: ObjectId | null // links to ImportLog
```

---

## API Routes

### `POST /api/trades/import`
**Request:** `multipart/form-data` with `file` field

**Flow:**
1. Parse multipart body — extract CSV buffer
2. Detect broker from column headers (compare against known schemas)
3. Parse rows using broker-specific mapper
4. Validate each row: price > 0, quantity > 0, valid dates
5. Duplicate check: `findOne({ userId, ticker, entryDateTime, quantity })`
6. Bulk insert non-duplicate trades: `TradeModel.insertMany([...], { ordered: false })`
7. Create `ImportLog` document
8. Return `{ imported, skipped, errors, batchId }`

**Response:**
```typescript
{
  imported: number
  skipped: number         // duplicates
  errors: number
  errorMessages: string[]
  batchId: string
}
```

### `GET /api/trades/import/history`
Returns all `ImportLog` documents for current user, sorted newest first.

### `DELETE /api/trades/import/:batchId`
Deletes all trades with matching `importBatchId` — "undo import" functionality.

---

## Broker Parsers

Each broker has a mapper function:

```typescript
// lib/brokerParsers/index.ts
type RawRow = Record<string, string>
type ParsedTrade = Omit<Trade, 'id' | 'pnl' | 'pnlPercent'>

type BrokerParser = {
  name: string
  detect: (headers: string[]) => boolean        // returns true if headers match
  parse: (rows: RawRow[]) => ParsedTrade[]
}
```

### thinkorswim Parser
Columns: `Exec Time`, `Spread`, `Side`, `Qty`, `Pos Effect`, `Symbol`, `Exp`, `Strike`, `Type`, `Price`, `Net Price`, `Order Type`
- `Side` → direction (BUY = LONG entry or SHORT exit, SELL = SHORT entry or LONG exit)
- Match BUY/SELL pairs by symbol + date to build entry/exit

### IBKR Parser
Columns: `Date/Time`, `Symbol`, `Quantity`, `T. Price`, `Comm/Fee`, `Realized P&L`, `MTM P&L`
- Already has realized P&L — use directly
- Positive quantity = BUY, negative = SELL

### Generic Fallback
Show column mapping UI with dropdowns:
```
Map your columns:
  Symbol/Ticker → [dropdown: your columns]
  Entry Date    → [dropdown: your columns]
  Entry Price   → [dropdown: your columns]
  Exit Date     → [dropdown: your columns]
  Exit Price    → [dropdown: your columns]
  Quantity      → [dropdown: your columns]
  Side          → [dropdown: your columns]
```

---

## New Page: `/import`

```
components/
  import/
    BrokerDropzone.tsx      Drag & drop zone with broker logo cards
    CsvPreviewTable.tsx     Shows first 5 rows with column mapping
    ColumnMapper.tsx        Dropdown UI for generic imports
    ImportProgress.tsx      Progress bar during processing
    ImportHistoryTable.tsx  Past imports with undo button
```

**Page layout:**
- Header: "Import Trades" + "View Import History" button
- Step 1: Drop zone with supported broker logos
- Step 2: Preview + mapping (auto-hidden if broker detected)
- Step 3: Confirm + import
- Step 4: Results summary

---

## Duplicate Detection Logic

```typescript
// For each parsed row, check:
const dupe = await TradeModel.findOne({
  userId,
  ticker: parsed.ticker,
  entryDateTime: parsed.entryDateTime,   // exact match within 1 minute
  quantity: parsed.quantity,
  direction: parsed.direction,
})
```

For near-duplicate handling (partial fills), match trades within 60 seconds and merge quantities.

---

## Error Handling

Per-row errors are collected but don't abort the import:
- Invalid date format → skip + log
- Negative quantity → skip + log
- Unknown ticker format → import with warning
- Missing required field → skip + log

Show error summary after import: "3 rows had errors — [View Details]"

---

## Nav Integration

Add to Sidebar nav:
```typescript
{ href: '/import', label: 'Import', Icon: Upload }
```

Or as a button on the Trades page: "Import CSV" → `/import`

---

## Packages Needed

```bash
npm install papaparse @types/papaparse
```

`papaparse` handles CSV parsing including quoted fields, escaped commas, etc.

---

## Verification

1. Export trades from thinkorswim → upload → verify counts match
2. Re-upload same file → verify 0 imported (all duplicates)
3. Upload invalid file (image, malformed CSV) → verify error message
4. Click "Undo Import" → verify trades deleted
5. Import history shows all past imports
