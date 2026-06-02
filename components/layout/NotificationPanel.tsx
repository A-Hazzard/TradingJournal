'use client'

import { useEffect, useRef } from 'react'
import { Bell, CheckCircle, Info, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type NotificationItem = {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'alert'
  read: boolean
  createdAt: string
}

type NotificationPanelProps = {
  isOpen: boolean
  onClose: () => void
  notifications: NotificationItem[]
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onMarkAllRead: () => void
  onClearAll: () => void
}

const icons = {
  info: Info,
  success: CheckCircle,
  warning: Info,
  alert: Info,
}

const itemBorderColors = {
  info: 'border-l-accent',
  success: 'border-l-profit',
  warning: 'border-l-amber-400',
  alert: 'border-l-loss',
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllRead,
  onClearAll,
}: NotificationPanelProps) {
  // === State & Hooks ===
  const panelRef = useRef<HTMLDivElement>(null)

  // === Effects ===
  // Click outside to close panel
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // === Render ===
  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-[360px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[480px] text-text-primary animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-accent" />
          <span className="text-sm font-semibold">Notifications</span>
          {notifications.filter((n) => !n.read).length > 0 && (
            <Badge
              variant="accent"
              label={`${notifications.filter((n) => !n.read).length} new`}
            />
          )}
        </div>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <>
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[10px] font-medium text-accent hover:text-accent-dark transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClearAll}
                className="text-[10px] font-medium text-text-muted hover:text-loss transition-colors flex items-center gap-1"
              >
                <Trash2 size={10} />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body List */}
      <div className="flex-1 overflow-y-auto min-h-[120px] max-h-[380px] p-2 space-y-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted gap-1">
            <Bell size={24} className="text-text-secondary opacity-40 mb-1" />
            <p className="text-xs font-semibold text-text-secondary">All caught up!</p>
            <p className="text-[10px] max-w-[200px]">You have no notifications at this time.</p>
          </div>
        ) : (
          notifications.map((item) => {
            const Icon = icons[item.type] || Info
            return (
              <div
                key={item.id}
                onClick={() => !item.read && onMarkAsRead(item.id)}
                className={`relative flex items-start gap-3 p-3 rounded-xl border-l-4 transition-all duration-150 group select-none ${
                  item.read
                    ? 'bg-transparent border-transparent opacity-65 hover:opacity-100 hover:bg-surface-alt/30'
                    : 'bg-accent/5 hover:bg-accent/10 border-l border-t border-r border-b border-border ' + itemBorderColors[item.type]
                } cursor-pointer`}
              >
                {/* Type Icon */}
                <div className={`mt-0.5 shrink-0 ${
                  item.type === 'success' ? 'text-profit' : item.type === 'alert' ? 'text-loss' : item.type === 'warning' ? 'text-amber-400' : 'text-accent'
                }`}>
                  <Icon size={14} />
                </div>

                {/* Message block */}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold ${item.read ? 'text-text-primary' : 'text-accent'}`}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                  <p className="text-[9px] text-text-muted mt-1">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                  }}
                  className="text-text-muted hover:text-loss transition-colors self-center p-1 rounded-lg hover:bg-surface-alt shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
