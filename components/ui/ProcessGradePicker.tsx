import { cn } from '@/lib/formatters'
import type { MistakeType, ProcessGrade } from '@/types/trade'

const GRADES: { value: ProcessGrade; label: string; color: string }[] = [
  { value: 'A', label: 'A', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' },
  { value: 'B', label: 'B', color: 'border-green-500/50 bg-green-500/10 text-green-400' },
  { value: 'C', label: 'C', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
  { value: 'D', label: 'D', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
  { value: 'F', label: 'F', color: 'border-red-500/50 bg-red-500/10 text-red-400' },
]

const MISTAKES: { value: MistakeType; label: string }[] = [
  { value: 'early_exit',  label: 'Exited Early' },
  { value: 'late_entry',  label: 'Late Entry' },
  { value: 'oversized',   label: 'Oversized' },
  { value: 'no_stop',     label: 'No Stop' },
  { value: 'broke_rules', label: 'Broke Rules' },
  { value: 'chased',      label: 'Chased' },
]

type Props = {
  grade: ProcessGrade | null | undefined
  mistakeType: MistakeType | null | undefined
  onGradeChange: (value: ProcessGrade | null) => void
  onMistakeChange: (value: MistakeType | null) => void
}

export function ProcessGradePicker({ grade, mistakeType, onGradeChange, onMistakeChange }: Props) {
  const showMistakes = grade === 'C' || grade === 'D' || grade === 'F'

  return (
    <div className="space-y-3">
      {/* Grade selector */}
      <div>
        <p className="text-[11px] text-text-muted mb-2">
          Grade the quality of your <em>execution</em>, not the outcome
        </p>
        <div className="flex gap-2">
          {GRADES.map((g) => {
            const selected = grade === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => {
                  onGradeChange(selected ? null : g.value)
                  if (selected) onMistakeChange(null)
                }}
                className={cn(
                  'w-11 h-11 rounded-xl border text-sm font-bold transition-all',
                  selected ? g.color : 'border-border text-text-muted hover:border-accent/30'
                )}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mistake type — only shows for C/D/F */}
      {showMistakes && (
        <div>
          <p className="text-[11px] text-text-muted mb-2">What went wrong?</p>
          <div className="flex flex-wrap gap-2">
            {MISTAKES.map((m) => {
              const selected = mistakeType === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onMistakeChange(selected ? null : m.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    selected
                      ? 'border-red-500/40 bg-red-500/10 text-red-400'
                      : 'border-border text-text-muted hover:border-red-500/30'
                  )}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
