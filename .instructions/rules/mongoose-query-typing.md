---
description: Mongoose Query Typing Rules - Always specify generic types on lean(), cursor(), and aggregate() to eliminate Record casting
globs:
  - 'app/api/**/*.ts'
alwaysApply: true
---

# Mongoose Query Typing Rules

Every Mongoose query must specify its return type through the query's generic parameter. **Never** cast query results to `Record<string, unknown>` or `any` — type it at the source.

---

## Rule 1: Always use `.lean<T>()`, never bare `.lean()`

```typescript
// ❌ NEVER
const trade = await TradeModel.findOne({ _id: id }).lean();
const pnl = (trade as Record<string, unknown>).pnl as number;

// ✅ ALWAYS
const trade = await TradeModel.findOne({ _id: id }).lean<TradeDocument>();
if (!trade) return;
trade.pnl; // typed as number
```

For `find`:
```typescript
const trades = await TradeModel.find(filter).lean<TradeDocument[]>();
```

For `findOneAndUpdate` when you need the returned document:
```typescript
const updated = await TradeModel.findOneAndUpdate(
  { _id: id },
  { $set: { exitPrice: price } },
  { new: true }
).lean<TradeDocument>();
```

---

## Rule 2: Use `.lean<T>().cursor().toArray()` for large result sets

```typescript
// ❌ AVOID for large sets
const allTrades = await TradeModel.find({}).lean<TradeDocument[]>();

// ✅ PREFER for large sets
const allTrades = await TradeModel.find({}).lean<TradeDocument>().cursor().toArray();
```

**When to use each:**
- `.lean<T>()` — single documents, or small bounded sets
- `.lean<T>().cursor().toArray()` — large or unbounded result sets

---

## Rule 3: Always type aggregation pipelines

```typescript
// ❌ WRONG — result is any[]
const results = await TradeModel.aggregate([{ $group: { _id: '$ticker' } }]).exec();

// ✅ CORRECT — result is TickerStat[]
const results = await TradeModel.aggregate<TickerStat>([{ $group: { _id: '$ticker' } }]).exec();
```

---

## Rule 4: Never use `findById` or `findByIdAndUpdate`

```typescript
// ❌ WRONG
const trade = await TradeModel.findById(id);
await TradeModel.findByIdAndUpdate(id, update);

// ✅ CORRECT
const trade = await TradeModel.findOne({ _id: id }).lean<TradeDocument>();
await TradeModel.findOneAndUpdate({ _id: id }, update, { new: true });
```

---

## Summary

| Pattern | Use when |
| :--- | :--- |
| `.lean<T>()` | Single document or small bounded query |
| `.lean<T[]>()` on `find` | Small bounded multi-document query |
| `.lean<T>().cursor().toArray()` | Large or unbounded multi-document query |
| `.aggregate<T>([]).exec()` | Any aggregation pipeline |
