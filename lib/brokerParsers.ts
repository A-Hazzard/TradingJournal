/**
 * Broker CSV Parsers
 *
 * Each parser detects its broker from CSV headers and maps rows into the
 * normalized ParsedTrade shape. A generic parser handles arbitrary CSVs via
 * an explicit column mapping supplied by the user.
 */

import type { AssetClass, Direction, TradeStatus } from '@/types/trade'

export type RawRow = Record<string, string>

export type ParsedTrade = {
  ticker: string
  assetClass: AssetClass
  direction: Direction
  status: TradeStatus
  entryDateTime: string
  entryPrice: number
  exitDateTime: string | null
  exitPrice: number | null
  quantity: number
  commission: number
  fees: number
  setup: string
  tags: string[]
  journalNotes: string
}

export type ColumnMapping = {
  ticker: string
  entryDateTime: string
  entryPrice: string
  exitDateTime?: string
  exitPrice?: string
  quantity: string
  side?: string
  commission?: string
  fees?: string
}

function num(v: string | undefined): number {
  if (!v) return 0
  const cleaned = v.replace(/[$,()]/g, '').trim()
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? Math.abs(n) : 0
}

function toIso(v: string | undefined): string | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function inferDirection(side: string | undefined): Direction {
  if (!side) return 'LONG'
  const s = side.toUpperCase()
  if (s.includes('SELL') || s.includes('SHORT') || s === 'S') return 'SHORT'
  return 'LONG'
}

// ── Generic parser (column mapping required) ──
export function parseGeneric(rows: RawRow[], mapping: ColumnMapping): { trades: ParsedTrade[]; errors: string[] } {
  const trades: ParsedTrade[] = []
  const errors: string[] = []

  rows.forEach((row, i) => {
    const ticker = (row[mapping.ticker] ?? '').trim().toUpperCase()
    const entry = toIso(row[mapping.entryDateTime])
    const entryPrice = num(row[mapping.entryPrice])
    const quantity = num(row[mapping.quantity])

    if (!ticker || !entry || entryPrice <= 0 || quantity <= 0) {
      errors.push(`Row ${i + 2}: missing ticker, entry date, price, or quantity`)
      return
    }

    const exit = mapping.exitDateTime ? toIso(row[mapping.exitDateTime]) : null
    const exitPrice = mapping.exitPrice ? num(row[mapping.exitPrice]) : 0

    trades.push({
      ticker,
      assetClass: 'stocks',
      direction: inferDirection(mapping.side ? row[mapping.side] : undefined),
      status: exit && exitPrice > 0 ? 'CLOSED' : 'OPEN',
      entryDateTime: entry,
      entryPrice,
      exitDateTime: exit,
      exitPrice: exitPrice > 0 ? exitPrice : null,
      quantity,
      commission: mapping.commission ? num(row[mapping.commission]) : 0,
      fees: mapping.fees ? num(row[mapping.fees]) : 0,
      setup: '',
      tags: ['imported'],
      journalNotes: '',
    })
  })

  return { trades, errors }
}

// ── Auto-detect known brokers from header signature ──
export function detectBroker(headers: string[]): string {
  const h = headers.map((x) => x.toLowerCase().trim())
  if (h.includes('symbol') && h.includes('t. price') && h.some((x) => x.includes('realized'))) return 'ibkr'
  if (h.includes('exec time') && h.includes('pos effect')) return 'thinkorswim'
  if (h.includes('symbol') && h.includes('side') && h.includes('filled') && h.includes('avg price')) return 'webull'
  return 'generic'
}

// ── Suggest a column mapping by fuzzy-matching common header names ──
export function suggestMapping(headers: string[]): Partial<ColumnMapping> {
  const find = (candidates: string[]): string | undefined =>
    headers.find((h) => candidates.some((c) => h.toLowerCase().trim().includes(c)))

  return {
    ticker: find(['symbol', 'ticker', 'instrument']) ?? '',
    entryDateTime: find(['entry date', 'open date', 'date/time', 'exec time', 'date', 'time']) ?? '',
    entryPrice: find(['entry price', 'open price', 'avg price', 't. price', 'price']) ?? '',
    exitDateTime: find(['exit date', 'close date', 'closing']),
    exitPrice: find(['exit price', 'close price', 'closing price']),
    quantity: find(['quantity', 'qty', 'shares', 'size', 'filled']) ?? '',
    side: find(['side', 'action', 'b/s', 'direction']),
    commission: find(['commission', 'comm']),
    fees: find(['fee', 'fees']),
  }
}
