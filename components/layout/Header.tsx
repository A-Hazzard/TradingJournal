'use client'

import { useState, useEffect } from 'react'
import { Bell, Search } from 'lucide-react'
import { SearchModal } from '@/components/ui/SearchModal'
import { ProfileModal } from '@/components/ui/ProfileModal'
import { NotificationPanel } from './NotificationPanel'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'

interface Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

type HeaderUser = {
  username: string
  email: string
  role: string
} | null

type HeaderNotification = {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'alert'
  read: boolean
  createdAt: string
}

export function Header({ title, subtitle, actions }: Props) {
  // === State & Hooks ===
  const dispatch = useAppDispatch()
  
  const [currentUser, setCurrentUser] = useState<HeaderUser>(null)
  const [notifications, setNotifications] = useState<HeaderNotification[]>([])
  
  // Modals / Dropdowns visibility
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  // === Effects ===
  // Load User Details
  useEffect(() => {
    function fetchUser() {
      fetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((user) => { if (user) setCurrentUser(user) })
        .catch(() => {})
    }
    
    fetchUser()
    window.addEventListener('user-profile-updated', fetchUser)
    return () => window.removeEventListener('user-profile-updated', fetchUser)
  }, [])

  // Load Notifications
  useEffect(() => {
    fetchNotifications()
    // Poll notifications every 45 seconds for a dynamic feel
    const interval = setInterval(fetchNotifications, 45000)
    return () => clearInterval(interval)
  }, [])

  // Command-K keyboard listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // === Handlers ===
  function fetchNotifications() {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotifications(data))
      .catch(() => {})
  }

  async function handleMarkAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      
      // Local state update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch {
      dispatch(addToast({ message: 'Failed to update notification', type: 'error' }))
    }
  }

  async function handleDeleteNotification(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch {
      dispatch(addToast({ message: 'Failed to delete notification', type: 'error' }))
    }
  }

  async function handleMarkAllRead() {
    try {
      const res = await fetch('/api/notifications', { method: 'PUT' })
      if (!res.ok) throw new Error()
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      dispatch(addToast({ message: 'All notifications marked as read', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Failed to update notifications', type: 'error' }))
    }
  }

  async function handleClearAll() {
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      
      setNotifications([])
      dispatch(addToast({ message: 'Notifications cleared', type: 'success' }))
    } catch {
      dispatch(addToast({ message: 'Failed to clear notifications', type: 'error' }))
    }
  }

  function getInitials(name?: string) {
    if (!name) return 'AT'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // === Render ===
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
      {/* Title block */}
      <div>
        <h1 className="text-lg font-bold text-text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>

      {/* Action controls */}
      <div className="flex items-center gap-3 relative">
        {actions}
        {/* Search toggle */}
        <button
          onClick={() => setSearchOpen(true)}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
          title="Search (Cmd+K)"
        >
          <Search size={18} />
        </button>

        {/* Notifications toggle */}
        <button
          onClick={() => setNotificationsOpen((prev) => !prev)}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors relative"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border border-surface animate-pulse" />
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        <NotificationPanel
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onDelete={handleDeleteNotification}
          onMarkAllRead={handleMarkAllRead}
          onClearAll={handleClearAll}
        />

        {/* Profile Avatar Trigger */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-8 h-8 rounded-full bg-accent hover:bg-accent-dark flex items-center justify-center text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          title="Profile & Settings"
        >
          {getInitials(currentUser?.username)}
        </button>
      </div>

      {/* Global Modals */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onProfileUpdated={() => {
          // Trigger custom event to sync with Sidebar
          window.dispatchEvent(new Event('user-profile-updated'))
        }}
      />
    </header>
  )
}
