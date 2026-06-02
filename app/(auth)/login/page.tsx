'use client'

import { Button } from '@/components/ui/Button'
import { zodResolver } from '@hookform/resolvers/zod'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      const data = await res.json()
      setServerError(data.error ?? 'Login failed')
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
          <TrendingUp size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary leading-none">TradeJournal</p>
          <p className="text-[10px] text-text-muted mt-0.5">Analytics Platform</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-text-primary mb-1">Welcome back</h1>
        <p className="text-sm text-text-muted mb-6">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-loss">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Password
            </label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-loss">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="bg-loss/10 border border-loss/20 rounded-lg px-3 py-2.5 text-sm text-loss">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            loading={isSubmitting}
            size="lg"
            className="w-full justify-center"
          >
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-text-muted">
          No account?{' '}
          <Link href="/signup" className="text-accent hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
