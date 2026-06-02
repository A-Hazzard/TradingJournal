'use client'

export default function TradeDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 animate-pulse">
      {/* Title skeleton */}
      <div className="h-8 w-48 bg-surface-alt rounded" />
      {/* Large chart card skeleton */}
      <div className="card h-96 bg-surface-alt/30 rounded-xl" />
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card p-4 h-20 bg-surface-alt/30 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
