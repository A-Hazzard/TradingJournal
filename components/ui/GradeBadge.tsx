import { cn } from '@/lib/formatters'
import type { SetupGrade } from '@/types/setup'

const GRADE_STYLES: Record<SetupGrade, string> = {
  A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  B: 'bg-green-500/10 text-green-400 border-green-500/30',
  C: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  D: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/10 text-red-400 border-red-500/30',
  'N/A': 'bg-surface-alt text-text-muted border-border',
}

export function GradeBadge({ grade, size = 'md' }: { grade: SetupGrade; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl border font-black shrink-0',
        sizeClass,
        GRADE_STYLES[grade]
      )}
      title={grade === 'N/A' ? 'Not enough trades to grade (need 10+)' : `Grade ${grade}`}
    >
      {grade === 'N/A' ? '–' : grade}
    </span>
  )
}
