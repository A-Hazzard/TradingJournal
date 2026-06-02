'use client'

export default function JournalSkeleton() {
  return (
    <div className="flex-1 overflow-hidden flex animate-pulse">
      {/* Left Sidebar Calendar Skeleton */}
      <div className="w-72 shrink-0 border-r border-border p-4 space-y-4 hidden md:block">
        <div className="flex items-center justify-between">
          <div className="h-4 w-4 bg-surface-alt rounded" />
          <div className="h-4 w-28 bg-surface-alt rounded" />
          <div className="h-4 w-4 bg-surface-alt rounded" />
        </div>
        {/* Calendar Grid Skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, rIdx) => (
            <div key={rIdx} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, cIdx) => (
                <div key={cIdx} className="aspect-square bg-surface-alt rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right Editor Skeleton */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Day Stats Skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card p-3 space-y-1 text-center">
              <div className="h-3 w-12 bg-surface-alt rounded mx-auto" />
              <div className="h-5 w-20 bg-surface-alt rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Mood Selection Card Skeleton */}
        <div className="card p-4 space-y-3">
          <div className="h-3.5 w-32 bg-surface-alt rounded" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex-1 h-16 bg-surface-alt rounded-xl" />
            ))}
          </div>
        </div>

        {/* Goal Input Skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 w-16 bg-surface-alt rounded" />
          <div className="h-10 bg-surface-alt rounded-lg" />
        </div>

        {/* Editor Box Skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 w-24 bg-surface-alt rounded" />
          <div className="h-40 bg-surface-alt rounded-xl" />
        </div>

        {/* Lesson Learned Skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 w-36 bg-surface-alt rounded" />
          <div className="h-20 bg-surface-alt rounded-lg" />
        </div>

        {/* Button Skeleton */}
        <div className="h-10 bg-surface-alt rounded-lg" />
      </div>
    </div>
  )
}
