import { cn } from '@/lib/formatters'
import type { PreSessionChecklist as ChecklistType } from '@/types/journal'

const ITEMS: { key: keyof ChecklistType; label: string; emoji: string }[] = [
  { key: 'sleptWell',       label: 'Slept well (7+ hrs)',       emoji: '😴' },
  { key: 'focused',         label: 'Mind is clear & focused',   emoji: '🧠' },
  { key: 'reviewedPlan',    label: 'Reviewed my trading plan',  emoji: '📋' },
  { key: 'notDistracted',   label: 'No major distractions',     emoji: '🔕' },
  { key: 'acceptedRisk',    label: 'I accept individual losses', emoji: '✅' },
]

type Props = {
  value: ChecklistType | null | undefined
  mentalScore: number | null | undefined
  onChange: (value: ChecklistType) => void
  onScoreChange: (score: number) => void
}

const DEFAULT_CHECKLIST: ChecklistType = {
  sleptWell: false, focused: false, reviewedPlan: false,
  notDistracted: false, acceptedRisk: false,
}

export function PreSessionChecklist({ value, mentalScore, onChange, onScoreChange }: Props) {
  const checklist = value ?? DEFAULT_CHECKLIST
  const checkedCount = Object.values(checklist).filter(Boolean).length
  const allChecked = checkedCount === ITEMS.length

  function toggle(key: keyof ChecklistType) {
    onChange({ ...checklist, [key]: !checklist[key] })
  }

  return (
    <div className="card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-primary">Morning Checklist</p>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-medium border',
          allChecked
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        )}>
          {checkedCount}/{ITEMS.length} {allChecked ? '✓ Ready' : 'incomplete'}
        </span>
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 gap-2">
        {ITEMS.map(({ key, label, emoji }) => {
          const checked = checklist[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                checked
                  ? 'border-emerald-500/30 bg-emerald-500/8'
                  : 'border-border hover:border-border/80'
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors text-[10px]',
                checked ? 'bg-emerald-500 border-emerald-500' : 'border-border'
              )}>
                {checked && '✓'}
              </span>
              <span className="mr-1">{emoji}</span>
              <span className={cn('text-xs', checked ? 'text-text-primary' : 'text-text-muted')}>
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Mental score slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-text-muted">Mental state today</p>
          <span className={cn(
            'text-xs font-bold tabular-nums',
            (mentalScore ?? 5) >= 7 ? 'text-emerald-400' : (mentalScore ?? 5) >= 5 ? 'text-amber-400' : 'text-red-400'
          )}>
            {mentalScore ?? 5}/10
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={mentalScore ?? 5}
          onChange={(e) => onScoreChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent bg-border"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-text-muted">Poor</span>
          <span className="text-[9px] text-text-muted">Excellent</span>
        </div>
      </div>
    </div>
  )
}
