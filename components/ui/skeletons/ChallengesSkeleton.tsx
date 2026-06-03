'use client'

export default function ChallengesSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* Header bar actions */}
      <div className="flex justify-between items-center">
        <div className="h-4 w-40 bg-surface-alt rounded" />
        <div className="h-9 w-36 bg-surface-alt rounded-lg" />
      </div>

      {/* Grid of challenge cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5 space-y-4">
            
            {/* Title / meta */}
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="h-5 w-44 bg-surface-alt rounded" />
                <div className="h-3 w-28 bg-surface-alt rounded" />
              </div>
              <div className="h-5.5 w-16 bg-surface-alt rounded-full" />
            </div>

            {/* Metrics parameters */}
            <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-border">
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-surface-alt rounded" />
                <div className="h-4 w-20 bg-surface-alt rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-surface-alt rounded" />
                <div className="h-4 w-20 bg-surface-alt rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2.5 w-16 bg-surface-alt rounded" />
                <div className="h-4 w-20 bg-surface-alt rounded" />
              </div>
            </div>

            {/* Progress constraint bars */}
            <div className="space-y-3 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <div className="h-3.5 w-32 bg-surface-alt rounded" />
                    <div className="h-3.5 w-12 bg-surface-alt rounded" />
                  </div>
                  <div className="h-2 w-full bg-surface-alt rounded-full" />
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
