'use client'

import { cn } from '@/lib/formatters'
import { Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react'

const SPEEDS = [0.5, 1, 2, 5] as const

type Props = {
  totalBars: number
  currentBar: number
  isPlaying: boolean
  speed: number
  entryBarIndex: number
  exitBarIndex: number | null
  onPlay: () => void
  onPause: () => void
  onStep: (delta: number) => void
  onScrub: (bar: number) => void
  onSpeedChange: (speed: number) => void
  onRestart: () => void
  onExit: () => void
}

export function ReplayControls({
  totalBars, currentBar, isPlaying, speed, entryBarIndex, exitBarIndex,
  onPlay, onPause, onStep, onScrub, onSpeedChange, onRestart, onExit,
}: Props) {
  const barsBeforeEntry = entryBarIndex - currentBar
  const statusLabel =
    currentBar < entryBarIndex
      ? `${barsBeforeEntry} bar${barsBeforeEntry === 1 ? '' : 's'} before entry`
      : exitBarIndex != null && currentBar >= exitBarIndex
      ? 'Trade complete'
      : 'In trade'

  return (
    <div className="bg-[#0f0f14] border-t border-[#2d2d3a] px-4 py-3 rounded-b-lg">
      <div className="flex items-center gap-4">
        {/* Transport controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onRestart} title="Restart" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors">
            <RotateCcw size={15} />
          </button>
          <button onClick={() => onStep(-1)} title="Step back" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors">
            <SkipBack size={15} />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={() => onStep(1)} title="Step forward" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors">
            <SkipForward size={15} />
          </button>
        </div>

        {/* Scrubber */}
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={totalBars - 1}
            value={currentBar}
            onChange={(e) => onScrub(Number(e.target.value))}
            className="w-full accent-accent cursor-pointer"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[10px] text-text-muted">Bar {currentBar + 1} / {totalBars}</span>
            <span className="text-[10px] text-text-muted">{statusLabel}</span>
          </div>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-1 shrink-0">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                speed === s ? 'bg-accent/20 text-accent border border-accent/30' : 'text-text-muted hover:text-text-primary border border-transparent'
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Exit */}
        <button onClick={onExit} title="Exit replay" className="p-1.5 rounded-lg text-text-muted hover:text-loss hover:bg-loss/10 transition-colors shrink-0">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
