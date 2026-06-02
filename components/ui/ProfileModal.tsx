'use client'

import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'
import { User, Lock, Save, Key } from 'lucide-react'

type ProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  onProfileUpdated?: () => void
}

type UserProfile = {
  username: string
  email: string
  role: string
  createdAt: string
}

export function ProfileModal({ isOpen, onClose, onProfileUpdated }: ProfileModalProps) {
  // === State & Hooks ===
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')
  const [loading, setLoading] = useState(false)
  
  // Profile Form State
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [joinedDate, setJoinedDate] = useState('')

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // === Effects ===
  useEffect(() => {
    if (isOpen) {
      // Reset states
      setActiveTab('profile')
      setLoading(true)
      
      fetch('/api/auth/me')
        .then((res) => {
          if (!res.ok) throw new Error()
          return res.json()
        })
        .then((data: UserProfile) => {
          setUsername(data.username)
          setEmail(data.email)
          setRole(data.role)
          if (data.createdAt) {
            setJoinedDate(new Date(data.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }))
          }
        })
        .catch(() => {
          dispatch(addToast({ message: 'Failed to load profile details', type: 'error' }))
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, dispatch])

  // === Handlers ===
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !email.trim()) {
      dispatch(addToast({ message: 'Username and Email are required', type: 'error' }))
      return
    }
    if (username.trim().length < 3) {
      dispatch(addToast({ message: 'Username must be at least 3 characters', type: 'error' }))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      dispatch(addToast({ message: 'Profile updated successfully!', type: 'success' }))
      if (onProfileUpdated) onProfileUpdated()
      onClose()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  async function handleSecuritySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      dispatch(addToast({ message: 'All password fields are required', type: 'error' }))
      return
    }
    if (newPassword.length < 8) {
      dispatch(addToast({ message: 'New password must be at least 8 characters', type: 'error' }))
      return
    }
    if (newPassword !== confirmPassword) {
      dispatch(addToast({ message: 'New passwords do not match', type: 'error' }))
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      dispatch(addToast({ message: 'Password updated successfully!', type: 'success' }))
      
      // Clear password inputs
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  // === Render ===
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile Settings" size="md">
      {loading && username === '' ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-text-muted">Loading profile details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs header */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'profile'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <User size={16} />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'security'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Lock size={16} />
              Security
            </button>
          </div>

          {/* Form Content */}
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-background border border-border focus:border-accent text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  placeholder="Username"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border focus:border-accent text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  placeholder="Email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-surface-alt/50 border border-border rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Account Role</p>
                  <p className="text-sm font-medium text-text-primary mt-1 capitalize">{role || 'User'}</p>
                </div>
                <div className="bg-surface-alt/50 border border-border rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Joined Date</p>
                  <p className="text-sm font-medium text-text-primary mt-1">{joinedDate || 'N/A'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading} leftIcon={<Save size={16} />}>
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSecuritySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-background border border-border focus:border-accent text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-background border border-border focus:border-accent text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  placeholder="•••••••• (min 8 chars)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-background border border-border focus:border-accent text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading} leftIcon={<Key size={16} />}>
                  Update Password
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}
