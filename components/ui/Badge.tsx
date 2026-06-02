import { cn } from '@/lib/formatters'

interface BadgeProps {
  label: string
  variant?: 'default' | 'profit' | 'loss' | 'accent' | 'neutral' | 'long' | 'short'
  size?: 'sm' | 'md'
  className?: string
}

const variants: Record<string, string> = {
  default: 'bg-border text-text-secondary',
  profit: 'bg-profit/15 text-profit',
  loss: 'bg-loss/15 text-loss',
  accent: 'bg-accent/15 text-accent',
  neutral: 'bg-surface-alt text-text-muted',
  long: 'bg-profit/15 text-profit',
  short: 'bg-loss/15 text-loss',
}

const sizes: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}

export function Badge({ label, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}>
      {label}
    </span>
  )
}
