'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import { removeToast, selectToasts } from '@/store/uiSlice'
import { cn } from '@/lib/formatters'

const icons = { success: CheckCircle, error: XCircle, info: Info }
const styles = {
  success: 'border-profit/30 bg-profit/10 text-profit',
  error: 'border-loss/30 bg-loss/10 text-loss',
  info: 'border-accent/30 bg-accent/10 text-accent',
}

function Toast({ id, message, type }: { id: string; message: string; type: 'success' | 'error' | 'info' }) {
  const dispatch = useAppDispatch()
  const Icon = icons[type]

  useEffect(() => {
    const t = setTimeout(() => dispatch(removeToast(id)), 4000)
    return () => clearTimeout(t)
  }, [id, dispatch])

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium', styles[type])}>
      <Icon size={16} />
      <span className="text-text-primary">{message}</span>
      <button onClick={() => dispatch(removeToast(id))} className="ml-auto text-text-muted hover:text-text-primary">
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useAppSelector(selectToasts)
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 min-w-[300px]">
      {toasts.map((t) => <Toast key={t.id} {...t} />)}
    </div>
  )
}
