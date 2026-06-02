'use client'

import { useState, useEffect, useRef } from 'react'
import type { PriceCandle } from '@/types/chart'
import type { Direction } from '@/types/trade'

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
}

export function TradeChart({
  candles, entryTime, entryPrice, exitTime, exitPrice, stopLoss, takeProfit, direction, height = 420,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ohlc, setOhlc] = useState<OhlcState>(null)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return

    let chart: ReturnType<typeof import('lightweight-charts')['createChart']> | null = null
    let resizeObs: ResizeObserver | null = null

    import('lightweight-charts').then(({ createChart, CrosshairMode, LineStyle }) => {
      if (!containerRef.current) return

      // ============================================================================
      // Chart base config — dark theme matching the app design system
      // ============================================================================
      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height,
        layout: {
          background: { color: '#16161e' },
          textColor: '#94a3b8',
        },
        grid: {
          vertLines: { color: '#2d2d3a' },
          horzLines: { color: '#2d2d3a' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#2d2d3a' },
        timeScale: {
          borderColor: '#2d2d3a',
          timeVisible: true,
          secondsVisible: false,
        },
      })

      // ============================================================================
      // Candlestick series
      // ============================================================================
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })

      // Push candles up to leave bottom 25% for volume
      candleSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.05, bottom: 0.25 },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candleSeries.setData(candles as any)

      // ============================================================================
      // Volume histogram — bottom 25%, coloured green/red per candle direction
      // ============================================================================
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      })

      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      })

      volumeSeries.setData(
        candles.map((candle) => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open
            ? 'rgba(16,185,129,0.35)'
            : 'rgba(239,68,68,0.35)',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any
      )

      // ============================================================================
      // Dashed horizontal price lines at exact entry and exit prices
      // ============================================================================
      candleSeries.createPriceLine({
        price: entryPrice,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Entry',
      })

      if (exitPrice !== null) {
        candleSeries.createPriceLine({
          price: exitPrice,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Exit',
        })
      }

      // ============================================================================
      // TP / SL shaded box zones — classic risk-reward visualization
      // Uses area series with inverted base to create filled rectangles between
      // entry price and TP/SL levels. Only shown within the trade time window.
      // ============================================================================
      const tradeEndTime = exitTime ?? candles[candles.length - 1]?.time ?? entryTime

      // Filter candles within trade window for box rendering
      const tradeCandles = candles.filter(c => c.time >= entryTime && c.time <= tradeEndTime)

      if (takeProfit !== null && tradeCandles.length > 0) {
        const tpSeries = chart.addAreaSeries({
          topColor: 'rgba(16, 185, 129, 0.15)',
          bottomColor: 'rgba(16, 185, 129, 0.05)',
          lineColor: 'rgba(16, 185, 129, 0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceScaleId: 'right',
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })

        const tpData = tradeCandles.map(c => ({
          time: c.time,
          value: takeProfit,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tpSeries.setData(tpData as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(tpSeries as any).applyOptions?.({ baseValue: { type: 'price', price: entryPrice } })

        candleSeries.createPriceLine({
          price: takeProfit,
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'TP',
        })
      }

      if (stopLoss !== null && tradeCandles.length > 0) {
        const slSeries = chart.addAreaSeries({
          topColor: 'rgba(239, 68, 68, 0.05)',
          bottomColor: 'rgba(239, 68, 68, 0.15)',
          lineColor: 'rgba(239, 68, 68, 0.5)',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          priceScaleId: 'right',
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        })

        const slData = tradeCandles.map(c => ({
          time: c.time,
          value: stopLoss,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        slSeries.setData(slData as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(slSeries as any).applyOptions?.({ baseValue: { type: 'price', price: entryPrice } })

        candleSeries.createPriceLine({
          price: stopLoss,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'SL',
        })
      }

      // ============================================================================
      // Entry / exit arrow markers (mandatory ascending sort before setMarkers)
      // ============================================================================
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers: any[] = []

      markers.push({
        time: entryTime,
        position: direction === 'LONG' ? 'belowBar' : 'aboveBar',
        color: '#10b981',
        shape: direction === 'LONG' ? 'arrowUp' : 'arrowDown',
        text: `Entry $${entryPrice}`,
        size: 2,
      })

      if (exitTime !== null && exitPrice !== null) {
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
      chart.timeScale().fitContent()

      // ============================================================================
      // OHLC legend — update React state on crosshair move
      // ============================================================================
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setOhlc(null)
          return
        }
        const bar = param.seriesData.get(candleSeries)
        if (bar && 'open' in bar) {
          setOhlc({
            open: (bar as { open: number }).open,
            high: (bar as { high: number }).high,
            low: (bar as { low: number }).low,
            close: (bar as { close: number }).close,
            time: param.time as number,
          })
        }
      })

      // ============================================================================
      // Responsive resize
      // ============================================================================
      resizeObs = new ResizeObserver(() => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth })
        }
      })
      resizeObs.observe(containerRef.current)
    })

    return () => {
      resizeObs?.disconnect()
      chart?.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, entryTime, entryPrice, exitTime, exitPrice, stopLoss, takeProfit, direction, height])

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height }}>
      {/* ============================================================================
          OHLC Legend — top-left overlay, updates on crosshair move (TradingView style)
      ============================================================================ */}
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

      {/* Lightweight Charts canvas */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
