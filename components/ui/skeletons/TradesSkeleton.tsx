'use client'

export default function TradesSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-4 space-y-2">
            <div className="h-3 w-20 bg-surface-alt rounded" />
            <div className="h-7 w-24 bg-surface-alt rounded" />
          </div>
        ))}
      </div>

      {/* Main trades log table card skeleton */}
      <div className="card overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="h-4 w-28 bg-surface-alt rounded" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-surface-alt rounded-lg" />
            <div className="h-8 w-24 bg-surface-alt rounded-lg" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <th key={idx} className="px-4 py-3 text-left">
                    <div className="h-3 w-16 bg-surface-alt rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  <td className="px-4 py-4"><div className="h-3.5 w-24 bg-surface-alt rounded" /></td>
                  <td className="px-4 py-4"><div className="h-3.5 w-12 bg-surface-alt rounded font-semibold" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-14 bg-surface-alt rounded-full" /></td>
                  <td className="px-4 py-4"><div className="h-3.5 w-16 bg-surface-alt rounded" /></td>
                  <td className="px-4 py-4"><div className="h-3.5 w-16 bg-surface-alt rounded" /></td>
                  <td className="px-4 py-4"><div className="h-3.5 w-10 bg-surface-alt rounded" /></td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="h-3.5 w-16 bg-surface-alt rounded" />
                      <div className="h-3 w-10 bg-surface-alt rounded" />
                    </div>
                  </td>
                  <td className="px-4 py-4"><div className="h-3.5 w-20 bg-surface-alt rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
