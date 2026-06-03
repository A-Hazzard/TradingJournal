'use client'

export default function ImportSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* File Drag & Drop column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dashed upload dropzone */}
          <div className="card p-8 h-64 bg-surface-alt/25 flex flex-col items-center justify-center space-y-4 rounded-xl border-dashed">
            <div className="h-10 w-10 bg-surface-alt rounded-full" />
            <div className="h-4 w-52 bg-surface-alt rounded" />
            <div className="h-3 w-36 bg-surface-alt rounded" />
          </div>

          {/* Import batches list placeholder */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="h-4 w-36 bg-surface-alt rounded" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, rIdx) => (
                <div key={rIdx} className="flex justify-between items-center py-1">
                  <div className="h-3.5 w-32 bg-surface-alt rounded" />
                  <div className="h-3.5 w-24 bg-surface-alt rounded" />
                  <div className="h-3.5 w-12 bg-surface-alt rounded" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Supporting brokers details sidebar */}
        <div className="card p-5 space-y-4 lg:col-span-1 h-fit">
          <div className="h-4 w-40 bg-surface-alt rounded" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 bg-surface-alt rounded-full" />
                <div className="h-4 w-32 bg-surface-alt rounded" />
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  )
}
