'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, List, BookOpen, BarChart2, PlusCircle,
  TrendingUp, ChevronLeft, ChevronRight, LogOut, Shield,
  User as UserIcon,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { toggleSidebar, selectSidebarCollapsed } from '@/store/uiSlice'
import { cn } from '@/lib/formatters'
import { useEffect, useState } from 'react'
import { ProfileModal } from '@/components/ui/ProfileModal'

type CurrentUser = {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
} | null

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/trades', label: 'Trade Log', Icon: List },
  { href: '/journal', label: 'Daily Journal', Icon: BookOpen },
  { href: '/reports', label: 'Reports', Icon: BarChart2 },
]

function NavItem({ href, label, Icon, collapsed }: { href: string; label: string; Icon: React.FC<{ size?: number; className?: string }>; collapsed: boolean }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative',
        active
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-alt'
      )}
    >
      <Icon size={18} className={cn('shrink-0', active && 'text-accent')} />
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      {active && !collapsed && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent" />}
    </Link>
  )
}

export function Sidebar() {
  const collapsed = useAppSelector(selectSidebarCollapsed)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const fetchUser = () => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => { if (user) setCurrentUser(user) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchUser()
    window.addEventListener('user-profile-updated', fetchUser)
    return () => window.removeEventListener('user-profile-updated', fetchUser)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-surface border-r border-border transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-border', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-text-primary leading-none">TradeJournal</p>
            <p className="text-[10px] text-text-muted mt-0.5">Analytics Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        {/* Admin link — only visible to admins */}
        {currentUser?.role === 'admin' && (
          <NavItem href="/admin" label="Admin" Icon={Shield} collapsed={collapsed} />
        )}

        <div className="pt-2">
          <Link
            href="/add-trade"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            <PlusCircle size={18} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Add Trade</span>}
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border space-y-1">
        {/* User info */}
        {currentUser && (
          <div
            onClick={() => setProfileOpen(true)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer hover:bg-surface-alt transition-colors',
              collapsed && 'justify-center px-2'
            )}
            title="Profile Settings"
          >
            <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <UserIcon size={13} className="text-accent" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{currentUser.username}</p>
                {currentUser.role === 'admin' && (
                  <p className="text-[10px] text-amber-400">admin</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:text-loss hover:bg-loss/10 transition-colors w-full',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors w-full',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onProfileUpdated={() => {
          // Fire event to update sibling layouts (like Header)
          window.dispatchEvent(new Event('user-profile-updated'))
        }}
      />
    </aside>
  )
}
