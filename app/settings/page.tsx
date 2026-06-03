'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { useAppDispatch } from '@/store'
import { addToast } from '@/store/uiSlice'
import { User, Lock, ShieldAlert, Database, Trash2, Download, Save, ShieldCheck } from 'lucide-react'

type Tab = 'profile' | 'risk' | 'data'

type UserProfile = {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
}

type RiskSettings = {
  accountBalance: number
  startingBalance: number
  dailyLossLimit: number
  maxRiskPerTrade: number
  maxDailyRiskPercent: number
}

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)

  // === Form States ===
  // Profile
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [joinedDate, setJoinedDate] = useState('')

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Risk
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    accountBalance: 25000,
    startingBalance: 25000,
    dailyLossLimit: 500,
    maxRiskPerTrade: 1.0,
    maxDailyRiskPercent: 2.0,
  })

  // Data / GDPR
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // === Load Data ===
  useEffect(() => {
    // Fetch user details
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load profile')
        return res.json()
      })
      .then((data: UserProfile) => {
        setUsername(data.username)
        setEmail(data.email)
        setRole(data.role)
        if (data.createdAt) {
          setJoinedDate(
            new Date(data.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          )
        }
      })
      .catch(() => {
        dispatch(addToast({ message: 'Failed to load profile details', type: 'error' }))
      })

    // Fetch risk settings
    fetch('/api/risk/settings')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load risk settings')
        return res.json()
      })
      .then((data: RiskSettings) => {
        if (data) {
          setRiskSettings({
            accountBalance: data.accountBalance,
            startingBalance: data.startingBalance,
            dailyLossLimit: data.dailyLossLimit,
            maxRiskPerTrade: data.maxRiskPerTrade,
            maxDailyRiskPercent: data.maxDailyRiskPercent,
          })
        }
      })
      .catch(() => {
        dispatch(addToast({ message: 'Failed to load risk settings', type: 'error' }))
      })
  }, [dispatch])

  // === Save Handlers ===
  async function handleProfileSave(e: React.FormEvent) {
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
      window.dispatchEvent(new Event('user-profile-updated'))
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  async function handleSecuritySave(e: React.FormEvent) {
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
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  async function handleRiskSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/risk/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskSettings),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update risk settings')
      }

      dispatch(addToast({ message: 'Risk settings updated successfully!', type: 'success' }))
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  // === Export CSV ===
  async function handleExportTrades() {
    setLoading(true)
    try {
      const res = await fetch('/api/trades')
      if (!res.ok) throw new Error('Failed to fetch trades')
      const trades = await res.json()

      if (!Array.isArray(trades) || trades.length === 0) {
        dispatch(addToast({ message: 'No trades found to export', type: 'info' }))
        return
      }

      // Build CSV headers and rows
      const headers = [
        'Ticker',
        'Asset Class',
        'Direction',
        'Status',
        'Entry Time',
        'Entry Price',
        'Exit Time',
        'Exit Price',
        'Quantity',
        'P&L',
        'P&L %',
        'Stop Loss',
        'Take Profit',
        'Commission',
        'Fees',
        'Setup',
        'Tags',
        'Emotion',
        'Process Grade',
        'Mistake Type',
      ]
      
      const rows = trades.map((t) => [
        t.ticker,
        t.assetClass || '',
        t.direction,
        t.status,
        t.entryDateTime,
        t.entryPrice,
        t.exitDateTime || '',
        t.exitPrice || '',
        t.quantity,
        t.pnl,
        t.pnlPercent,
        t.stopLoss || '',
        t.takeProfit || '',
        t.commission || 0,
        t.fees || 0,
        t.setup || '',
        (t.tags || []).join(';'),
        t.emotionTag || '',
        t.processGrade || '',
        t.mistakeType || '',
      ])

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `tradejournal_export_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      dispatch(addToast({ message: 'Trades exported successfully!', type: 'success' }))
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  // === Delete Account ===
  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      dispatch(addToast({ message: 'Please type DELETE MY ACCOUNT to confirm', type: 'error' }))
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      dispatch(addToast({ message: 'Your account has been deleted.', type: 'success' }))
      router.push('/login')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      dispatch(addToast({ message: errMsg, type: 'error' }))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Settings" subtitle="Manage your profile, risk configurations, and personal data." />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Tab Selection */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === 'profile'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <User size={16} />
            Profile & Security
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === 'risk'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <ShieldAlert size={16} />
            Risk Configurations
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === 'data'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Database size={16} />
            Data Management
          </button>
        </div>

        {/* Tab Contents */}
        <div className="grid grid-cols-1 gap-6 max-w-4xl">
          
          {/* PROFILE & SECURITY */}
          {activeTab === 'profile' && (
            <>
              {/* Profile Details Form */}
              <div className="card p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Profile Details</h3>
                  <p className="text-xs text-text-muted">Update your general user credentials.</p>
                </div>
                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-base"
                        placeholder="Username"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-base"
                        placeholder="Email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 max-w-md">
                    <div className="bg-surface-alt/50 border border-border rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Account Role</p>
                      <p className="text-sm font-medium text-text-primary mt-1 capitalize">{role || 'User'}</p>
                    </div>
                    <div className="bg-surface-alt/50 border border-border rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Joined Date</p>
                      <p className="text-sm font-medium text-text-primary mt-1">{joinedDate || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" loading={loading} leftIcon={<Save size={16} />}>
                      Save Profile
                    </Button>
                  </div>
                </form>
              </div>

              {/* Password Form */}
              <div className="card p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Update Password</h3>
                  <p className="text-xs text-text-muted">Change your current account authentication password.</p>
                </div>
                <form onSubmit={handleSecuritySave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input-base"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-base"
                        placeholder="Min 8 chars"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-base"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" loading={loading} leftIcon={<Lock size={16} />}>
                      Update Password
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* RISK CONFIGURATIONS */}
          {activeTab === 'risk' && (
            <div className="card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Default Risk Settings</h3>
                <p className="text-xs text-text-muted">Set up defaults for trading account balance and risk margins.</p>
              </div>
              <form onSubmit={handleRiskSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Starting Balance ($)</label>
                    <input
                      type="number"
                      value={riskSettings.startingBalance}
                      onChange={(e) => setRiskSettings({ ...riskSettings, startingBalance: Number(e.target.value) })}
                      className="input-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Current Balance ($)</label>
                    <input
                      type="number"
                      value={riskSettings.accountBalance}
                      onChange={(e) => setRiskSettings({ ...riskSettings, accountBalance: Number(e.target.value) })}
                      className="input-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Daily Loss Limit ($)</label>
                    <input
                      type="number"
                      value={riskSettings.dailyLossLimit}
                      onChange={(e) => setRiskSettings({ ...riskSettings, dailyLossLimit: Number(e.target.value) })}
                      className="input-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Max Risk Per Trade (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={riskSettings.maxRiskPerTrade}
                      onChange={(e) => setRiskSettings({ ...riskSettings, maxRiskPerTrade: Number(e.target.value) })}
                      className="input-base"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Max Daily Risk (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={riskSettings.maxDailyRiskPercent}
                      onChange={(e) => setRiskSettings({ ...riskSettings, maxDailyRiskPercent: Number(e.target.value) })}
                      className="input-base"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={loading} leftIcon={<ShieldCheck size={16} />}>
                    Save Risk Configurations
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* DATA MANAGEMENT */}
          {activeTab === 'data' && (
            <>
              {/* CSV Export Card */}
              <div className="card p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary font-medium flex items-center gap-2">
                    <Download size={16} className="text-accent" /> Data Portability (GDPR)
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">Export all your logged trades into standard CSV format.</p>
                </div>
                <div>
                  <Button onClick={handleExportTrades} loading={loading} variant="secondary" leftIcon={<Download size={16} />}>
                    Export Trades (CSV)
                  </Button>
                </div>
              </div>

              {/* GDPR Deletion Card */}
              <div className="card border-red-500/20 bg-red-500/5 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Trash2 size={16} /> Danger Zone
                  </h3>
                  <p className="text-xs text-red-300/80 mt-0.5">Permanently delete your profile and purge all trading journals, settings, and performance data. This action is irreversible.</p>
                </div>
                <form onSubmit={handleDeleteAccount} className="space-y-3 max-w-md">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-red-300/80 uppercase tracking-wider">Type &quot;DELETE MY ACCOUNT&quot; to confirm</label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full bg-background border border-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 text-text-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
                      placeholder="DELETE MY ACCOUNT"
                    />
                  </div>
                  <Button type="submit" loading={isDeleting} variant="danger" leftIcon={<Trash2 size={16} />}>
                    Delete My Entire Account
                  </Button>
                </form>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
