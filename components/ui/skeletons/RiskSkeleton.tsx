'use client'

export default function RiskSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-4 space-y-2">
            <div className="h-3 w-20 bg-surface-alt rounded" />
            <div className="h-7 w-24 bg-surface-alt rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Risk settings form skeleton */}
        <div className="card p-5 space-y-4 lg:col-span-1">
          <div className="h-4 w-28 bg-surface-alt rounded" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-24 bg-surface-alt rounded" />
                <div className="h-9 w-full bg-surface-alt rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Analytics & Distributions */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-5 h-64 bg-surface-alt/30 rounded-xl" />
          <div className="card p-5 h-56 bg-surface-alt/30 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
