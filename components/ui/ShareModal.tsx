'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Copy, Download, Share2 } from 'lucide-react'
import { useAppSelector } from '@/store'
import { selectClosedTrades } from '@/store/tradesSlice'
import { computeKpis, buildSetupStats } from '@/lib/calculations'
import { filterTradesByPeriod, getPeriodLabel, type SharePeriod } from '@/lib/utils/periodFilter'
import { cn } from '@/lib/formatters'
import { Button } from './Button'
import { PerformanceCard } from './PerformanceCard'

type Props = {
  isOpen: boolean
  onClose: () => void
  username: string
}

const PERIODS: { value: SharePeriod; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'alltime', label: 'All Time' },
]

export function ShareModal({ isOpen, onClose, username }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [period, setPeriod] = useState<SharePeriod>('month')
  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const allTrades = useAppSelector(selectClosedTrades)

  const periodTrades = useMemo(
    () => filterTradesByPeriod(allTrades, period),
    [allTrades, period]
  )

  const kpis = useMemo(() => computeKpis(periodTrades), [periodTrades])

  const setupStats = useMemo(() => buildSetupStats(periodTrades), [periodTrades])

  const bestTrade = useMemo(() => {
    if (periodTrades.length === 0) return null
    return [...periodTrades].sort((a, b) => b.pnl - a.pnl)[0]
  }, [periodTrades])

  const cardProps = {
    username,
    period: getPeriodLabel(period),
    netPnl: kpis.netPnl,
    winRate: kpis.winRate,
    profitFactor: kpis.profitFactor,
    totalTrades: kpis.totalTrades,
    totalWins: kpis.totalWins,
    totalLosses: kpis.totalLosses,
    avgWin: kpis.avgWin,
    avgLoss: kpis.avgLoss,
    zellaScore: kpis.zellaScore,
    bestTrade: bestTrade
      ? { ticker: bestTrade.ticker, direction: bestTrade.direction, pnl: bestTrade.pnl }
      : null,
    bestSetup: setupStats[0] ?? null,
  }

  const capturePng = useCallback(async (): Promise<string> => {
    if (!cardRef.current) throw new Error('Card not rendered')
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#0f0f14',
    })
  }, [])

  async function handleDownload() {
    setDownloading(true)
    try {
      const dataUrl = await capturePng()
      const link = document.createElement('a')
      link.download = `performance-${period}-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopy() {
    setCopying(true)
    try {
      const dataUrl = await capturePng()
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (e) {
      console.error('Copy failed:', e)
    } finally {
      setCopying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <Share2 size={18} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Share Performance</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ── Period Selector ── */}
        <div className="px-5 pt-4 shrink-0">
          <div className="flex gap-2 p-1 bg-background rounded-xl">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  period === value
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card Preview ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex justify-center">
            <div className="scale-[0.85] origin-top">
              <PerformanceCard ref={cardRef} {...cardProps} />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-center"
            loading={copying}
            onClick={handleCopy}
            leftIcon={copySuccess ? undefined : <Copy size={13} />}
          >
            {copySuccess ? '✓ Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button
            size="sm"
            className="flex-1 justify-center"
            loading={downloading}
            onClick={handleDownload}
            leftIcon={<Download size={13} />}
          >
            Download PNG
          </Button>
        </div>
      </div>
    </div>
  )
}
