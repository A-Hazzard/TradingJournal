'use client'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/formatters'
import { Shield, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import AdminSkeleton from '@/components/ui/skeletons/AdminSkeleton'

type User = {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  createdAt: string
}

type DeleteState = { userId: string; username: string } | null

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteState>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/auth/me'),
      ])
      if (!usersRes.ok) throw new Error('Failed to load users')
      const { users: data } = await usersRes.json()
      setUsers(data)
      if (meRes.ok) {
        const me = await meRes.json()
        setCurrentUserId(me.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to delete user')
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirm.userId))
      setDeleteConfirm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20 animate-pulse">
            <Shield size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Admin</h1>
            <p className="text-xs text-text-muted">User management</p>
          </div>
        </div>
        <AdminSkeleton />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
          <Shield size={18} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Admin</h1>
          <p className="text-xs text-text-muted">User management</p>
        </div>
      </div>

      {/* Stat card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{users.length}</p>
            <p className="text-xs text-text-muted">Total users</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">
              {users.filter((u) => u.role === 'admin').length}
            </p>
            <p className="text-xs text-text-muted">Admins</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-loss/10 border border-loss/20 rounded-lg px-4 py-3 text-sm text-loss">
          {error}
        </div>
      )}

      {/* Users table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Users</h2>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{user.username}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          user.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-border text-text-muted border border-border'
                        )}
                      >
                        {user.role === 'admin' && <Shield size={10} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={user.id === currentUserId}
                        title={user.id === currentUserId ? 'Cannot delete your own account' : 'Delete user'}
                        onClick={() => setDeleteConfirm({ userId: user.id, username: user.username })}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-text-primary mb-2">Delete user</h3>
            <p className="text-sm text-text-secondary mb-5">
              Are you sure you want to delete{' '}
              <span className="font-medium text-text-primary">{deleteConfirm.username}</span>?
              This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
