import { cn } from '@/lib/formatters'
import type { EmotionTag } from '@/types/trade'

type Emotion = {
  value: EmotionTag
  emoji: string
  label: string
  colorClass: string
}

export const EMOTIONS: Emotion[] = [
  { value: 'confident',  emoji: '💪', label: 'Confident',  colorClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  { value: 'focused',    emoji: '🎯', label: 'Focused',    colorClass: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  { value: 'neutral',    emoji: '😐', label: 'Neutral',    colorClass: 'border-slate-500/40 bg-slate-500/10 text-slate-400' },
  { value: 'anxious',    emoji: '😰', label: 'Anxious',    colorClass: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  { value: 'frustrated', emoji: '😤', label: 'Frustrated', colorClass: 'border-orange-500/40 bg-orange-500/10 text-orange-400' },
  { value: 'fomo',       emoji: '🏃', label: 'FOMO',       colorClass: 'border-red-500/40 bg-red-500/10 text-red-400' },
  { value: 'revenge',    emoji: '💀', label: 'Revenge',    colorClass: 'border-red-600/40 bg-red-600/10 text-red-500' },
  { value: 'bored',      emoji: '😴', label: 'Bored',      colorClass: 'border-slate-600/40 bg-slate-600/10 text-slate-500' },
  { value: 'greedy',     emoji: '🤑', label: 'Greedy',     colorClass: 'border-amber-600/40 bg-amber-600/10 text-amber-500' },
]

type Props = {
  value: EmotionTag | null | undefined
  onChange: (value: EmotionTag | null) => void
}

export function EmotionPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {EMOTIONS.map((emotion) => {
        const selected = value === emotion.value
        return (
          <button
            key={emotion.value}
            type="button"
            title={emotion.label}
            onClick={() => onChange(selected ? null : emotion.value)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
              selected
                ? emotion.colorClass
                : 'border-border text-text-muted hover:border-accent/30 hover:text-text-secondary'
            )}
          >
            <span className="text-lg leading-none">{emotion.emoji}</span>
            <span>{emotion.label}</span>
          </button>
        )
      })}
    </div>
  )
}
