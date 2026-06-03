'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, PlayCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { TradeChart } from '@/components/charts/TradeChart'
import { ReplayControls } from '@/components/charts/ReplayControls'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchTrades, selectAllTrades, selectTradesStatus } from '@/store/tradesSlice'
import { generatePriceCandlesForTrade } from '@/lib/mockPriceData'
import type { PriceCandle } from '@/types/chart'
import { formatCurrency, formatDateTime, formatDuration, formatPercent, formatRMultiple } from '@/lib/formatters'
import TradeDetailSkeleton from '@/components/ui/skeletons/TradeDetailSkeleton'
import { EMOTIONS } from '@/components/ui/EmotionPicker'

const GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  B: 'text-green-400 border-green-500/30 bg-green-500/10',
  C: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  D: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  F: 'text-red-400 border-red-500/30 bg-red-500/10',
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-alt rounded-xl p-4 border border-border">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-lg font-bold text-text-primary mt-1">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

export default function TradeDetailPage() {
  const dispatch = useAppDispatch()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const trades = useAppSelector(selectAllTrades)
  const status = useAppSelector(selectTradesStatus)
  const trade = trades.find((tradeItem) => tradeItem.id === id)

  const initialRisk = trade?.stopLoss
    ? Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity
    : null
  const initialRiskPercent = trade?.stopLoss
    ? (Math.abs(trade.entryPrice - trade.stopLoss) / trade.entryPrice) * 100
    : null

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTrades())
  }, [dispatch, status])

  const [candles, setCandles] = useState<PriceCandle[]>([])
  const [loadingCandles, setLoadingCandles] = useState<boolean>(true)
  const [timeframe, setTimeframe] = useState<string>('auto')

  // ── Replay state ──
  const PRE_ENTRY_BARS = 20
  const [replayActive, setReplayActive] = useState(false)
  const [replayIndex, setReplayIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const entryBarIndex = useMemo(() => {
    if (!trade || candles.length === 0) return 0
    const target = Math.floor(new Date(trade.entryDateTime).getTime() / 1000)
    let idx = 0
    candles.forEach((c, i) => { if (c.time <= target) idx = i })
    return idx
  }, [trade, candles])

  const exitBarIndex = useMemo(() => {
    if (!trade?.exitDateTime || candles.length === 0) return null
    const target = Math.floor(new Date(trade.exitDateTime).getTime() / 1000)
    let idx = 0
    candles.forEach((c, i) => { if (c.time <= target) idx = i })
    return idx
  }, [trade, candles])

  function enterReplay() {
    setReplayActive(true)
    setIsPlaying(false)
    setReplayIndex(Math.max(0, entryBarIndex - PRE_ENTRY_BARS))
  }

  function exitReplay() {
    setReplayActive(false)
    setIsPlaying(false)
  }

  // Play loop
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearInterval(playRef.current)
      return
    }
    const delay = 600 / replaySpeed
    playRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= candles.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, delay)
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [isPlaying, replaySpeed, candles.length])

  useEffect(() => {
    if (!trade) return
    setLoadingCandles(true)
    const intervalParam = timeframe !== 'auto' ? `?interval=${timeframe}` : ''
    fetch(`/api/trades/${trade.id}/candles${intervalParam}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch candles')
        return res.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setCandles(data)
        setLoadingCandles(false)
      })
      .catch((err) => {
        console.warn('Falling back to mock candle generator:', err)
        setCandles(generatePriceCandlesForTrade(trade))
        setLoadingCandles(false)
      })
  }, [trade, timeframe])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Trade Detail" />
        <TradeDetailSkeleton />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Trade Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-muted mb-4">This trade doesn&apos;t exist or has been deleted.</p>
            <Button onClick={() => router.push('/trades')}>Back to Trade Log</Button>
          </div>
        </div>
      </div>
    )
  }

  const entryTimeSec = Math.floor(new Date(trade.entryDateTime).getTime() / 1000)
  const exitTimeSec = trade.exitDateTime ? Math.floor(new Date(trade.exitDateTime).getTime() / 1000) : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={`${trade.ticker} Trade Detail`} subtitle={formatDateTime(trade.entryDateTime)} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Back + Header */}
        <div className="flex items-start justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-text-primary">{trade.ticker}</span>
            {trade.assetClass && <Badge label={trade.assetClass} variant="neutral" />}
            <Badge label={trade.direction} variant={trade.direction === 'LONG' ? 'long' : 'short'} />
            <Badge label={trade.status} variant={trade.status === 'OPEN' ? 'accent' : 'neutral'} />
            <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-lg ${trade.pnl >= 0 ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
              {trade.pnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {formatCurrency(trade.pnl)}
            </div>
            <Button onClick={() => router.push(`/add-trade?edit=${trade.id}`)} size="sm" variant="secondary">
              Edit
            </Button>
          </div>
        </div>

        {/* Price Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Price Chart</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-profit inline-block" /> Entry ${trade.entryPrice}
                </span>
                {trade.exitPrice && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-loss inline-block" /> Exit ${trade.exitPrice}
                  </span>
                )}
              </div>
              {!replayActive && candles.length > 0 && (
                <button
                  onClick={enterReplay}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
                >
                  <PlayCircle size={13} /> Replay Mode
                </button>
              )}
            </div>
          </div>

          {/* Timeframe Toggle — hidden during replay */}
          {!replayActive && (
            <div className="flex items-center gap-1.5 mb-3">
              {['auto', '1m', '5m', '15m', '30m', '1h', '4h', '1d'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium uppercase transition-colors ${
                    timeframe === tf
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'border border-border text-text-muted hover:text-text-secondary hover:border-accent/50'
                  }`}
                >
                  {tf === 'auto' ? 'Auto' : tf}
                </button>
              ))}
            </div>
          )}

          {loadingCandles ? (
            <div className="w-full bg-surface-alt rounded-lg animate-pulse flex items-center justify-center" style={{ height: 400 }}>
              <span className="text-xs text-text-muted uppercase tracking-wider">Syncing live market candles...</span>
            </div>
          ) : (
            <>
              <TradeChart
                candles={candles}
                entryTime={entryTimeSec}
                entryPrice={trade.entryPrice}
                exitTime={exitTimeSec}
                exitPrice={trade.exitPrice}
                stopLoss={trade.stopLoss ?? null}
                takeProfit={trade.takeProfit ?? null}
                direction={trade.direction}
                height={400}
                replayIndex={replayActive ? replayIndex : null}
              />
              {replayActive && (
                <ReplayControls
                  totalBars={candles.length}
                  currentBar={replayIndex}
                  isPlaying={isPlaying}
                  speed={replaySpeed}
                  entryBarIndex={entryBarIndex}
                  exitBarIndex={exitBarIndex}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onStep={(delta) => setReplayIndex((p) => Math.min(candles.length - 1, Math.max(0, p + delta)))}
                  onScrub={(bar) => { setIsPlaying(false); setReplayIndex(bar) }}
                  onSpeedChange={setReplaySpeed}
                  onRestart={() => { setIsPlaying(false); setReplayIndex(Math.max(0, entryBarIndex - PRE_ENTRY_BARS)) }}
                  onExit={exitReplay}
                />
              )}
            </>
          )}
        </div>

        {/* Trade Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBlock label="Entry Price" value={`$${trade.entryPrice.toFixed(2)}`} sub={formatDateTime(trade.entryDateTime)} />
          <StatBlock
            label="Exit Price"
            value={trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : 'Open'}
            sub={trade.exitDateTime ? formatDateTime(trade.exitDateTime) : undefined}
          />
          <StatBlock label="Quantity" value={trade.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} sub={`${formatCurrency(trade.entryPrice * trade.quantity)} notional`} />
          <StatBlock
            label="Hold Time"
            value={trade.holdingDurationMs ? formatDuration(trade.holdingDurationMs) : '—'}
            sub={`${formatPercent(trade.pnlPercent)} return`}
          />
          <StatBlock label="Stop Loss" value={trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : '—'} />
          <StatBlock label="Take Profit" value={trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '—'} />
          <StatBlock
            label="Initial Risk"
            value={initialRisk !== null ? formatCurrency(initialRisk) : '—'}
            sub={initialRiskPercent !== null ? `${initialRiskPercent.toFixed(1)}% of entry` : undefined}
          />
          <StatBlock label="R-Multiple" value={formatRMultiple(trade.rMultiple)} />
          <StatBlock label="Commission" value={formatCurrency(trade.commission)} />
          <StatBlock label="Fees" value={formatCurrency(trade.fees)} />
          <StatBlock label="Setup" value={trade.setup} />
          <StatBlock label="Status" value={trade.status} />
        </div>

        {/* Tags */}
        {trade.tags.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {trade.tags.map(tag => <Badge key={tag} label={tag} variant="accent" />)}
            </div>
          </div>
        )}

        {/* Psychology */}
        {(trade.emotionTag || trade.processGrade || trade.mistakeType) && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Psychology</h3>
            <div className="flex flex-wrap gap-3">
              {trade.emotionTag && (() => {
                const emotion = EMOTIONS.find((e) => e.value === trade.emotionTag)
                return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface-alt">
                    <span className="text-base">{emotion?.emoji ?? '❓'}</span>
                    <div>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Emotion</p>
                      <p className="text-sm font-medium text-text-primary">{emotion?.label ?? trade.emotionTag}</p>
                    </div>
                  </div>
                )
              })()}
              {trade.processGrade && (
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${GRADE_COLORS[trade.processGrade] ?? 'border-border'}`}>
                  <span className="text-xl font-black">{trade.processGrade}</span>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Process Grade</p>
                    <p className="text-sm font-medium">Execution quality</p>
                  </div>
                </div>
              )}
              {trade.mistakeType && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10">
                  <span className="text-base">⚠</span>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Mistake</p>
                    <p className="text-sm font-medium text-red-400 capitalize">{trade.mistakeType.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Journal Notes */}
        {trade.journalNotes && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-accent" /> Trade Notes
            </h3>
            <RichTextEditor content={trade.journalNotes} readOnly />
          </div>
        )}
      </div>
    </div>
  )
}
