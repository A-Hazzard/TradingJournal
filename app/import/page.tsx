'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'
import { fetchTrades } from '@/store/tradesSlice'
import { formatDateTime } from '@/lib/formatters'
import {
  detectBroker, suggestMapping, parseGeneric,
  type RawRow, type ColumnMapping,
} from '@/lib/brokerParsers'
import { Upload, FileSpreadsheet, CheckCircle2, RotateCcw, X } from 'lucide-react'
import ImportSkeleton from '@/components/ui/skeletons/ImportSkeleton'

type ImportLog = {
  id: string
  filename: string
  broker: string
  totalRows: number
  imported: number
  skipped: number
  errors: number
  status: string
  createdAt: string
}

type ImportResult = { imported: number; skipped: number; errors: number; errorMessages: string[] }

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['ticker', 'entryDateTime', 'entryPrice', 'quantity']
const OPTIONAL_FIELDS: (keyof ColumnMapping)[] = ['exitDateTime', 'exitPrice', 'side', 'commission', 'fees']
const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  ticker: 'Symbol / Ticker',
  entryDateTime: 'Entry Date',
  entryPrice: 'Entry Price',
  exitDateTime: 'Exit Date',
  exitPrice: 'Exit Price',
  quantity: 'Quantity',
  side: 'Side (Buy/Sell)',
  commission: 'Commission',
  fees: 'Fees',
}

export default function ImportPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [filename, setFilename] = useState('')
  const [broker, setBroker] = useState('generic')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [history, setHistory] = useState<ImportLog[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/trades/import/history')
      if (res.ok) setHistory(await res.json())
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  function handleFile(file: File) {
    setResult(null)
    setFilename(file.name)
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsedHeaders = res.meta.fields ?? []
        setHeaders(parsedHeaders)
        setRows(res.data)
        setBroker(detectBroker(parsedHeaders))
        setMapping(suggestMapping(parsedHeaders))
      },
      error: () => dispatch(addToast({ message: 'Failed to parse CSV', type: 'error' })),
    })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const mappingComplete = REQUIRED_FIELDS.every((f) => mapping[f])

  async function handleImport() {
    if (!mappingComplete) return
    setImporting(true)
    try {
      const { trades, errors } = parseGeneric(rows, mapping as ColumnMapping)
      const res = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broker, filename, trades, errors }),
      })
      if (!res.ok) throw new Error()
      const data: ImportResult = await res.json()
      setResult(data)
      dispatch(addToast({ message: `Imported ${data.imported} trades`, type: 'success' }))
      dispatch(fetchTrades())
      await loadHistory()
    } catch {
      dispatch(addToast({ message: 'Import failed', type: 'error' }))
    } finally {
      setImporting(false)
    }
  }

  async function undoImport(batchId: string) {
    try {
      const res = await fetch(`/api/trades/import/${batchId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      dispatch(addToast({ message: 'Import undone', type: 'success' }))
      dispatch(fetchTrades())
      await loadHistory()
    } catch {
      dispatch(addToast({ message: 'Failed to undo import', type: 'error' }))
    }
  }

  function reset() {
    setFilename(''); setHeaders([]); setRows([]); setMapping({}); setResult(null); setBroker('generic')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (historyLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Import Trades" subtitle="Upload a broker CSV export" />
        <ImportSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Import Trades" subtitle="Upload a broker CSV export" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">

        {/* ── Success result ── */}
        {result && (
          <div className="card p-5 border-profit/30">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 size={20} className="text-profit" />
              <h3 className="text-sm font-semibold text-text-primary">Import complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><p className="text-2xl font-bold text-profit">{result.imported}</p><p className="text-xs text-text-muted">Imported</p></div>
              <div><p className="text-2xl font-bold text-text-secondary">{result.skipped}</p><p className="text-xs text-text-muted">Skipped (duplicates)</p></div>
              <div><p className="text-2xl font-bold text-loss">{result.errors}</p><p className="text-xs text-text-muted">Errors</p></div>
            </div>
            {result.errorMessages.length > 0 && (
              <details className="text-xs text-text-muted">
                <summary className="cursor-pointer">View {result.errorMessages.length} error details</summary>
                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {result.errorMessages.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </details>
            )}
            <div className="flex gap-3 mt-4">
              <Button size="sm" onClick={() => router.push('/trades')}>View Trades</Button>
              <Button variant="secondary" size="sm" onClick={reset}>Import Another</Button>
            </div>
          </div>
        )}

        {/* ── Dropzone ── */}
        {!filename && !result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`card border-2 border-dashed cursor-pointer transition-colors p-12 text-center ${
              dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40'
            }`}
          >
            <Upload size={32} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">Drop your CSV here or click to browse</p>
            <p className="text-xs text-text-muted">Supports thinkorswim, IBKR, Webull, and generic CSV exports</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        )}

        {/* ── Mapping + preview ── */}
        {filename && !result && (
          <>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet size={18} className="text-accent" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{filename}</p>
                    <p className="text-xs text-text-muted">{rows.length} rows · detected: <span className="text-accent uppercase">{broker}</span></p>
                  </div>
                </div>
                <button onClick={reset} className="text-text-muted hover:text-loss transition-colors"><X size={18} /></button>
              </div>

              {/* Column mapping */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-text-secondary">Map your columns</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
                    <div key={field}>
                      <label className="text-xs text-text-muted block mb-1">
                        {FIELD_LABELS[field]} {REQUIRED_FIELDS.includes(field) && <span className="text-loss">*</span>}
                      </label>
                      <select
                        value={mapping[field] ?? ''}
                        onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                        className="input-base"
                      >
                        <option value="">— none —</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text-primary">Preview (first 5 rows)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-medium text-text-muted whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {headers.map((h) => <td key={h} className="px-3 py-2 text-text-secondary whitespace-nowrap">{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {!mappingComplete && <p className="text-xs text-amber-400">Map all required (*) columns to continue.</p>}
              <div className="flex gap-3 ml-auto">
                <Button variant="secondary" size="sm" onClick={reset}>Cancel</Button>
                <Button size="sm" loading={importing} disabled={!mappingComplete} onClick={handleImport}>
                  Import {rows.length} Trades
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Import history ── */}
        {history.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">Import History</h3>
            </div>
            <div className="divide-y divide-border">
              {history.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{log.filename || 'Untitled import'}</p>
                    <p className="text-xs text-text-muted">
                      {formatDateTime(log.createdAt)} · {log.imported} imported, {log.skipped} skipped · <span className="uppercase">{log.broker}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => undoImport(log.id)}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-loss transition-colors"
                    title="Undo this import"
                  >
                    <RotateCcw size={13} /> Undo
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
