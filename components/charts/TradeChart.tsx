'use client'

import { useState, useEffect, useRef } from 'react'
import type { PriceCandle } from '@/types/chart'
import type { Direction } from '@/types/trade'
import type { IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts'

type OhlcState = {
  open: number
  high: number
  low: number
  close: number
  time: number
} | null

function formatPrice(val: number): string {
  if (val < 10) return val.toFixed(5)
  return val.toFixed(2)
}

type Props = {
  candles: PriceCandle[]
  entryTime: number
  entryPrice: number
  exitTime: number | null
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  direction: Direction
  height?: number
  /** When set, only render candles up to this index (replay mode). null = full chart. */
  replayIndex?: number | null
}

export function TradeChart({
  candles, entryTime, entryPrice, exitTime, exitPrice, stopLoss, takeProfit, direction, height = 420,
  replayIndex = null,
}: Props) {
  // === State & Refs ===
  const containerRef = useRef<HTMLDivElement>(null)
  const [ohlc, setOhlc] = useState<OhlcState>(null)
  const [chartLoaded, setChartLoaded] = useState(false)

  // Chart and Series instances
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const tpSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const slSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  // Price line refs (for updating/removing without recreation of chart)
  const entryPriceLineRef = useRef<IPriceLine | null>(null)
  const exitPriceLineRef = useRef<IPriceLine | null>(null)
  const tpPriceLineRef = useRef<IPriceLine | null>(null)
  const slPriceLineRef = useRef<IPriceLine | null>(null)

  // ResizeObserver ref
  const resizeObsRef = useRef<ResizeObserver | null>(null)

  // Tracking state transitions
  const wasInReplayRef = useRef<boolean>(false)
  const hasInitiallyFitRef = useRef<boolean>(false)

  // ============================================================================
  // Effect 1: Chart & Series Initialization (Once on Mount)
  // ============================================================================
  useEffect(() => {
    if (!containerRef.current) return

    let chartInstance: IChartApi | null = null

    // Load Lightweight Charts dynamically to prevent Next.js SSR document/window errors
    import('lightweight-charts').then(({ createChart }) => {
      if (!containerRef.current) return

      // Create Chart API — use autoSize so the chart fills its container correctly
      // regardless of when the async import resolves relative to layout paint.
      // (Manually measuring clientWidth inside a .then() callback can return 0
      // if the browser hasn't completed layout yet, causing a blank chart.)
      chartInstance = createChart(containerRef.current, {
        autoSize: true,
        height,
        layout: {
          background: { color: '#16161e' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#2d2d3a' },
          horzLines: { color: '#2d2d3a' },
        },
        crosshair: {
          mode: 0, // CrosshairMode.Normal
        },
        rightPriceScale: { borderColor: '#2d2d3a' },
        timeScale: {
          borderColor: '#2d2d3a',
          timeVisible: true,
          secondsVisible: false,
        },
      })
      chartRef.current = chartInstance

      // Add Candlestick Series
      const candleSeries = chartInstance.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })
      candleSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.05, bottom: 0.25 },
      })
      candleSeriesRef.current = candleSeries

      // Add Volume Series
      const volumeSeries = chartInstance.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Overlay series
      })
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      })
      volumeSeriesRef.current = volumeSeries

      // Add Take Profit Shaded Area
      const tpSeries = chartInstance.addAreaSeries({
        topColor: 'rgba(16, 185, 129, 0.15)',
        bottomColor: 'rgba(16, 185, 129, 0.05)',
        lineColor: 'rgba(16, 185, 129, 0.5)',
        lineWidth: 1,
        lineStyle: 1, // LineStyle.Dotted
        priceScaleId: 'right',
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      tpSeriesRef.current = tpSeries

      // Add Stop Loss Shaded Area
      const slSeries = chartInstance.addAreaSeries({
        topColor: 'rgba(239, 68, 68, 0.05)',
        bottomColor: 'rgba(239, 68, 68, 0.15)',
        lineColor: 'rgba(239, 68, 68, 0.5)',
        lineWidth: 1,
        lineStyle: 1, // LineStyle.Dotted
        priceScaleId: 'right',
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      slSeriesRef.current = slSeries

      // Subscribe to Crosshair Movement for Legend Updates
      chartInstance.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setOhlc(null)
          return
        }
        const bar = param.seriesData.get(candleSeries)
        if (bar && 'open' in bar) {
          setOhlc({
            open: bar.open as number,
            high: bar.high as number,
            low: bar.low as number,
            close: bar.close as number,
            time: param.time as number,
          })
        }
      })

      // Mark the chart as ready — no manual ResizeObserver needed since autoSize handles it
      setChartLoaded(true)
    })

    // Clean up instances when the component is unmounted
    return () => {
      setChartLoaded(false)
      if (resizeObsRef.current) {
        resizeObsRef.current.disconnect()
        resizeObsRef.current = null
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      tpSeriesRef.current = null
      slSeriesRef.current = null
      entryPriceLineRef.current = null
      exitPriceLineRef.current = null
      tpPriceLineRef.current = null
      slPriceLineRef.current = null
    }
  }, [height])

  // ============================================================================
  // Effect 2: Data & Overlay updates (On Input Property Changes)
  // ============================================================================
  useEffect(() => {
    if (
      !chartLoaded ||
      !chartRef.current ||
      !candleSeriesRef.current ||
      !volumeSeriesRef.current ||
      !tpSeriesRef.current ||
      !slSeriesRef.current
    ) {
      return
    }

    {
      const chart = chartRef.current
      const candleSeries = candleSeriesRef.current
      const volumeSeries = volumeSeriesRef.current
      const tpSeries = tpSeriesRef.current
      const slSeries = slSeriesRef.current

      // ── Replay mode: slice candles and gate marker/line visibility ──
      const inReplay = replayIndex != null
      const visibleCandles = inReplay
        ? candles.slice(0, Math.max(1, (replayIndex as number) + 1))
        : candles


      const lastVisibleTime = visibleCandles[visibleCandles.length - 1]?.time ?? entryTime
      const entryRevealed = !inReplay || entryTime <= lastVisibleTime
      const exitRevealed = !inReplay || (exitTime != null && exitTime <= lastVisibleTime)

      // 1. Update Candlestick Data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candleSeries.setData(visibleCandles as any)

      // 2. Update Volume Data
      volumeSeries.setData(
        visibleCandles.map((candle) => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open
            ? 'rgba(16,185,129,0.35)'
            : 'rgba(239,68,68,0.35)',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any
      )

      // 3. Update Entry Price Line
      if (entryPriceLineRef.current) {
        candleSeries.removePriceLine(entryPriceLineRef.current)
        entryPriceLineRef.current = null
      }
      if (entryRevealed) {
        entryPriceLineRef.current = candleSeries.createPriceLine({
          price: entryPrice,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 2, // LineStyle.Dashed
          axisLabelVisible: true,
          title: 'Entry',
        })
      }

      // 4. Update Exit Price Line
      if (exitPriceLineRef.current) {
        candleSeries.removePriceLine(exitPriceLineRef.current)
        exitPriceLineRef.current = null
      }
      if (exitPrice !== null && exitRevealed) {
        exitPriceLineRef.current = candleSeries.createPriceLine({
          price: exitPrice,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 2, // LineStyle.Dashed
          axisLabelVisible: true,
          title: 'Exit',
        })
      }

      // 5. Update TP & SL Area bounds and labels
      const tradeEndTime = exitRevealed && exitTime ? exitTime : lastVisibleTime
      const tradeCandles = entryRevealed
        ? visibleCandles.filter((c) => c.time >= entryTime && c.time <= tradeEndTime)
        : []

      // Take Profit
      if (tpPriceLineRef.current) {
        candleSeries.removePriceLine(tpPriceLineRef.current)
        tpPriceLineRef.current = null
      }
      if (takeProfit !== null && tradeCandles.length > 0) {
        const tpData = tradeCandles.map((c) => ({
          time: c.time,
          value: takeProfit,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tpSeries.setData(tpData as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(tpSeries as any).applyOptions?.({ baseValue: { type: 'price', price: entryPrice } })

        tpPriceLineRef.current = candleSeries.createPriceLine({
          price: takeProfit,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: 1, // LineStyle.Dotted
          axisLabelVisible: true,
          title: 'TP',
        })
      } else {
        tpSeries.setData([])
      }

      // Stop Loss
      if (slPriceLineRef.current) {
        candleSeries.removePriceLine(slPriceLineRef.current)
        slPriceLineRef.current = null
      }
      if (stopLoss !== null && tradeCandles.length > 0) {
        const slData = tradeCandles.map((c) => ({
          time: c.time,
          value: stopLoss,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        slSeries.setData(slData as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(slSeries as any).applyOptions?.({ baseValue: { type: 'price', price: entryPrice } })

        slPriceLineRef.current = candleSeries.createPriceLine({
          price: stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: 1, // LineStyle.Dotted
          axisLabelVisible: true,
          title: 'SL',
        })
      } else {
        slSeries.setData([])
      }

      // 6. Update Arrow Markers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers: any[] = []
      if (entryRevealed) {
        markers.push({
          time: entryTime,
          position: direction === 'LONG' ? 'belowBar' : 'aboveBar',
          color: '#10b981',
          shape: direction === 'LONG' ? 'arrowUp' : 'arrowDown',
          text: `Entry $${entryPrice}`,
          size: 2,
        })
      }
      if (exitTime !== null && exitPrice !== null && exitRevealed) {
        markers.push({
          time: exitTime,
          position: direction === 'LONG' ? 'aboveBar' : 'belowBar',
          color: '#ef4444',
          shape: direction === 'LONG' ? 'arrowDown' : 'arrowUp',
          text: `Exit $${exitPrice}`,
          size: 2,
        })
      }
      markers.sort((markerA, markerB) => markerA.time - markerB.time)
      candleSeries.setMarkers(markers)

      // 7. TimeScale Viewport logical range management
      const wasInReplay = wasInReplayRef.current
      const inReplayNow = replayIndex != null
      wasInReplayRef.current = inReplayNow

      if (inReplayNow) {
        // Keep a stable window of 90 candles so bars flow smoothly on play ticks
        const totalCount = visibleCandles.length
        chart.timeScale().setVisibleLogicalRange({
          from: Math.max(0, totalCount - 90),
          to: totalCount,
        })
      } else if (wasInReplay && !inReplayNow) {
        // Transitioning out of replay — scale to fit all candles
        chart.timeScale().fitContent()
      } else if (!inReplayNow && visibleCandles.length > 0 && !hasInitiallyFitRef.current) {
        // Fit to screen on initial mount
        chart.timeScale().fitContent()
        hasInitiallyFitRef.current = true
      }
    }
  }, [
    chartLoaded,
    candles,
    replayIndex,
    entryTime,
    entryPrice,
    exitTime,
    exitPrice,
    stopLoss,
    takeProfit,
    direction,
  ])

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height }}>
      {/* OHLC Legend — top-left overlay (updates on crosshair move) */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 px-2 py-1
                      rounded bg-[#16161e]/90 backdrop-blur-sm border border-[#2d2d3a]
                      text-[11px] font-mono pointer-events-none select-none">
        <span className="text-[#94a3b8]">O</span>
        <span className="text-[#e2e8f0]">{ohlc ? `$${formatPrice(ohlc.open)}` : '—'}</span>
        <span className="text-[#94a3b8]">H</span>
        <span className="text-[#10b981]">{ohlc ? `$${formatPrice(ohlc.high)}` : '—'}</span>
        <span className="text-[#94a3b8]">L</span>
        <span className="text-[#ef4444]">{ohlc ? `$${formatPrice(ohlc.low)}` : '—'}</span>
        <span className="text-[#94a3b8]">C</span>
        <span className={
          ohlc
            ? ohlc.close >= ohlc.open ? 'text-[#10b981]' : 'text-[#ef4444]'
            : 'text-[#94a3b8]'
        }>
          {ohlc ? `$${formatPrice(ohlc.close)}` : '—'}
        </span>
        {ohlc && (
          <span className="ml-1 border-l border-[#2d2d3a] pl-2 text-[#94a3b8]">
            {new Date(ohlc.time * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
        )}
      </div>

      {/* Lightweight Charts canvas container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
