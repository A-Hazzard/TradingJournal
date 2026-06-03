'use client'

export default function PlaybookSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* Search and filters bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 bg-surface-alt rounded-lg" />
        <div className="h-9 w-32 bg-surface-alt rounded-lg" />
      </div>

      {/* Grid of playbook setup cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="h-5 w-36 bg-surface-alt rounded" />
              <div className="h-5 w-12 bg-surface-alt rounded-full" />
            </div>
            
            {/* Description lines */}
            <div className="space-y-2">
              <div className="h-3 w-full bg-surface-alt rounded" />
              <div className="h-3 w-5/6 bg-surface-alt rounded" />
            </div>

            {/* Timeframe & Asset tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <div className="h-5 w-14 bg-surface-alt rounded-full" />
              <div className="h-5 w-18 bg-surface-alt rounded-full" />
              <div className="h-5 w-12 bg-surface-alt rounded-full" />
            </div>

            {/* Setup Stats segment */}
            <div className="border-t border-border pt-4 grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-surface-alt rounded" />
                <div className="h-5.5 w-16 bg-surface-alt rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-surface-alt rounded" />
                <div className="h-5.5 w-16 bg-surface-alt rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-12 bg-surface-alt rounded" />
                <div className="h-5.5 w-16 bg-surface-alt rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
