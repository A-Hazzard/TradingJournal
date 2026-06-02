'use client'

export default function DashboardSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card p-4 space-y-2">
            <div className="h-3 w-20 bg-surface-alt rounded" />
            <div className="h-7 w-24 bg-surface-alt rounded" />
            <div className="h-3 w-16 bg-surface-alt rounded" />
          </div>
        ))}
      </div>
      {/* Chart row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 h-64 bg-surface-alt/30 rounded-xl" />
        <div className="card p-5 h-64 bg-surface-alt/30 rounded-xl lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 h-52 bg-surface-alt/30 rounded-xl" />
        <div className="card p-5 h-52 bg-surface-alt/30 rounded-xl" />
      </div>
      <div className="card p-5 h-72 bg-surface-alt/30 rounded-xl" />
    </div>
  )
}
