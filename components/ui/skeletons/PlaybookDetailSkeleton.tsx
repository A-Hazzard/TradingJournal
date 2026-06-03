'use client'

export default function PlaybookDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* Back link and actions */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-surface-alt rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-surface-alt rounded-lg" />
          <div className="h-8 w-16 bg-surface-alt rounded-lg" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-4 space-y-2">
            <div className="h-3 w-16 bg-surface-alt rounded" />
            <div className="h-6 w-24 bg-surface-alt rounded" />
          </div>
        ))}
      </div>

      {/* Setup Specification columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rules detail block */}
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, rIdx) => (
            <div key={rIdx} className="card p-5 space-y-3">
              <div className="h-4 w-32 bg-surface-alt rounded" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-surface-alt rounded" />
                <div className="h-3 w-full bg-surface-alt rounded" />
                <div className="h-3 w-4/5 bg-surface-alt rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Parameters block */}
        <div className="card p-5 space-y-4 lg:col-span-1 h-fit">
          <div className="h-4 w-36 bg-surface-alt rounded" />
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 bg-surface-alt rounded" />
              <div className="flex gap-1">
                <div className="h-5 w-14 bg-surface-alt rounded-full" />
                <div className="h-5 w-12 bg-surface-alt rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="h-2.5 w-20 bg-surface-alt rounded" />
              <div className="flex gap-1">
                <div className="h-5 w-16 bg-surface-alt rounded-full" />
                <div className="h-5 w-16 bg-surface-alt rounded-full" />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
