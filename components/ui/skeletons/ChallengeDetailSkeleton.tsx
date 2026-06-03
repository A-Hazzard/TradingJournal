'use client'

export default function ChallengeDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* Back link and actions */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-surface-alt rounded" />
        <div className="h-8 w-16 bg-surface-alt rounded-lg" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-4 space-y-2">
            <div className="h-3 w-20 bg-surface-alt rounded" />
            <div className="h-6 w-24 bg-surface-alt rounded" />
          </div>
        ))}
      </div>

      {/* Detail Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Performance Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Balance Area Chart placeholder */}
          <div className="card p-5 h-64 bg-surface-alt/30 rounded-xl" />

          {/* Trade history placeholder */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="h-4 w-32 bg-surface-alt rounded" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, rIdx) => (
                <div key={rIdx} className="flex justify-between items-center py-1">
                  <div className="h-3.5 w-24 bg-surface-alt rounded" />
                  <div className="h-3.5 w-12 bg-surface-alt rounded" />
                  <div className="h-5.5 w-16 bg-surface-alt rounded-full" />
                  <div className="h-3.5 w-16 bg-surface-alt rounded" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Challenge Constraints Sidebar Column */}
        <div className="card p-5 space-y-4 lg:col-span-1 h-fit">
          <div className="h-4 w-36 bg-surface-alt rounded" />
          
          <div className="space-y-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <div className="h-3.5 w-28 bg-surface-alt rounded" />
                  <div className="h-3.5 w-12 bg-surface-alt rounded" />
                </div>
                <div className="h-2 w-full bg-surface-alt rounded-full" />
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  )
}
