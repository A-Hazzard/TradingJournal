'use client'

export default function ReportsSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-pulse">
      {/* Tabs bar skeleton */}
      <div className="flex gap-1 bg-surface-alt rounded-xl p-1 w-fit">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-9 w-24 bg-surface rounded-lg border border-border" />
        ))}
      </div>

      {/* Overview stats skeleton (mimics main view) */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-4 space-y-2">
              <div className="h-3 w-16 bg-surface-alt rounded" />
              <div className="h-6 w-24 bg-surface-alt rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-4 space-y-2">
              <div className="h-3 w-16 bg-surface-alt rounded" />
              <div className="h-6 w-24 bg-surface-alt rounded" />
            </div>
          ))}
        </div>

        {/* Large chart box skeleton */}
        <div className="card p-5 h-80 bg-surface-alt/30 rounded-xl" />
      </div>
    </div>
  )
}
