'use client'

export default function AdminSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-pulse">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-alt rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <div className="h-6 w-10 bg-surface-alt rounded" />
              <div className="h-3 w-16 bg-surface-alt rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Users table card skeleton */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Table title */}
        <div className="px-4 py-3 border-b border-border">
          <div className="h-4 w-16 bg-surface-alt rounded" />
        </div>

        {/* Table skeleton */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <th key={idx} className="px-4 py-3 text-left">
                    <div className="h-3.5 w-16 bg-surface-alt rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  <td className="px-4 py-4"><div className="h-3.5 w-24 bg-surface-alt rounded font-medium" /></td>
                  <td className="px-4 py-4"><div className="h-3.5 w-32 bg-surface-alt rounded" /></td>
                  <td className="px-4 py-4"><div className="h-5 w-14 bg-surface-alt rounded-full" /></td>
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
