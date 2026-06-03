'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useAppDispatch, useAppSelector } from '@/store'
import { fetchTrades, createTrade, updateTradeAsync, selectAllTrades, selectTradesStatus } from '@/store/tradesSlice'
import { addToast } from '@/store/uiSlice'
import { computePnl } from '@/lib/calculations'
import { formatCurrency } from '@/lib/formatters'
import { ALL_TAGS, ALL_SETUPS, ASSET_CLASSES, COMMON_PAIRS } from '@/lib/constants'
import { Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { EmotionPicker } from '@/components/ui/EmotionPicker'
import { ProcessGradePicker } from '@/components/ui/ProcessGradePicker'
import type { EmotionTag, ProcessGrade, MistakeType } from '@/types/trade'

const schema = z.object({
  assetClass: z.enum(['forex', 'indices', 'stocks', 'crypto', 'commodities', 'futures']),
  ticker: z.string().min(1).max(20),
  direction: z.enum(['LONG', 'SHORT']),
  status: z.enum(['OPEN', 'CLOSED']),
  entryDateTime: z.string().min(1, 'Required'),
  entryPrice: z.coerce.number().positive(),
  exitDateTime: z.string().optional(),
  exitPrice: z.coerce.number().positive().optional(),
  quantity: z.coerce.number().positive(),
  stopLoss: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : val), z.coerce.number().positive().nullable().optional()),
  takeProfit: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : val), z.coerce.number().positive().nullable().optional()),
  commission: z.coerce.number().min(0).default(1),
  fees: z.coerce.number().min(0).default(0.35),
  setup: z.string().min(1, 'Required'),
  tags: z.array(z.string()),
  journalNotes: z.string(),
})

type FormData = z.infer<typeof schema>

function AddTradeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const trades = useAppSelector(selectAllTrades)
  const status = useAppSelector(selectTradesStatus)
  const editId = searchParams.get('edit')
  const editTrade = editId ? trades.find((trade) => trade.id === editId) : null

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTrades())
  }, [dispatch, status])

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetClass: editTrade?.assetClass ?? 'forex',
      direction: editTrade?.direction ?? 'LONG',
      status: editTrade?.status ?? 'CLOSED',
      ticker: editTrade?.ticker ?? '',
      entryDateTime: editTrade ? editTrade.entryDateTime.slice(0, 16) : '',
      entryPrice: editTrade?.entryPrice ?? undefined,
      exitDateTime: editTrade?.exitDateTime?.slice(0, 16) ?? '',
      exitPrice: editTrade?.exitPrice ?? undefined,
      quantity: editTrade?.quantity ?? undefined,
      stopLoss: editTrade?.stopLoss ?? undefined,
      takeProfit: editTrade?.takeProfit ?? undefined,
      commission: editTrade?.commission ?? 1,
      fees: editTrade?.fees ?? 0.35,
      setup: editTrade?.setup ?? '',
      tags: editTrade?.tags ?? [],
      journalNotes: editTrade?.journalNotes ?? '',
    },
  })

  const watchAll = watch()
  const [livePnl, setLivePnl] = useState<number | null>(null)
  const [liveRisk, setLiveRisk] = useState<number | null>(null)
  const [liveReward, setLiveReward] = useState<number | null>(null)
  const [liveRatio, setLiveRatio] = useState<number | null>(null)

  useEffect(() => {
    const { direction, entryPrice, exitPrice, quantity, commission, fees, status: formStatus } = watchAll
    if (formStatus === 'CLOSED' && entryPrice && exitPrice && quantity) {
      setLivePnl(computePnl(direction, entryPrice, exitPrice, quantity, commission ?? 0, fees ?? 0))
    } else {
      setLivePnl(null)
    }
  }, [watchAll])

  useEffect(() => {
    const { direction, entryPrice, stopLoss, takeProfit, quantity } = watchAll
    if (entryPrice && quantity) {
      if (stopLoss) {
        const r = direction === 'LONG' ? entryPrice - stopLoss : stopLoss - entryPrice
        setLiveRisk(r > 0 ? r * quantity : null)
      } else {
        setLiveRisk(null)
      }
      if (takeProfit) {
        const rew = direction === 'LONG' ? takeProfit - entryPrice : entryPrice - takeProfit
        setLiveReward(rew > 0 ? rew * quantity : null)
      } else {
        setLiveReward(null)
      }
    } else {
      setLiveRisk(null)
      setLiveReward(null)
    }
  }, [watchAll])

  useEffect(() => {
    if (liveRisk && liveReward) {
      setLiveRatio(parseFloat((liveReward / liveRisk).toFixed(2)))
    } else {
      setLiveRatio(null)
    }
  }, [liveRisk, liveReward])

  const tradeStatus = watch('status')
  const tags = watch('tags')

  // ── Psychology state (uncontrolled — not in RHF schema, sent separately) ──
  const [emotionTag, setEmotionTag] = useState<EmotionTag | null>(
    (editTrade as unknown as { emotionTag?: EmotionTag | null })?.emotionTag ?? null
  )
  const [processGrade, setProcessGrade] = useState<ProcessGrade | null>(
    (editTrade as unknown as { processGrade?: ProcessGrade | null })?.processGrade ?? null
  )
  const [mistakeType, setMistakeType] = useState<MistakeType | null>(
    (editTrade as unknown as { mistakeType?: MistakeType | null })?.mistakeType ?? null
  )
  const [psychOpen, setPsychOpen] = useState(false)

  // ── User playbook setups (merged into the setup dropdown) ──
  const [userSetups, setUserSetups] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/setups?activeOnly=true')
      .then((res) => (res.ok ? res.json() : []))
      .then((setups: { name: string }[]) => setUserSetups(setups.map((s) => s.name)))
      .catch(() => {})
  }, [])
  const setupOptions = useMemo(
    () => Array.from(new Set([...userSetups, ...ALL_SETUPS])),
    [userSetups]
  )

  function toggleTag(tag: string) {
    const current = tags ?? []
    setValue('tags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
  }

  function onSubmit(data: FormData) {
    const payload = {
      ...data,
      assetClass: data.assetClass,
      ticker: data.ticker.toUpperCase(),
      entryDateTime: new Date(data.entryDateTime).toISOString(),
      exitDateTime: data.status === 'CLOSED' && data.exitDateTime ? new Date(data.exitDateTime).toISOString() : null,
      exitPrice: data.status === 'CLOSED' && data.exitPrice ? data.exitPrice : null,
      stopLoss: data.stopLoss ?? null,
      takeProfit: data.takeProfit ?? null,
      commission: data.commission ?? 0,
      fees: data.fees ?? 0,
      pnl: 0,
      pnlPercent: 0,
      // Psychology
      emotionTag: emotionTag ?? null,
      processGrade: processGrade ?? null,
      mistakeType: processGrade && ['C','D','F'].includes(processGrade) ? (mistakeType ?? null) : null,
    }

    if (editId) {
      dispatch(updateTradeAsync({ id: editId, updates: payload }))
      dispatch(addToast({ message: 'Trade updated', type: 'success' }))
    } else {
      dispatch(createTrade(payload))
      dispatch(addToast({ message: 'Trade added', type: 'success' }))
    }
    router.push('/trades')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={editId ? 'Edit Trade' : 'Add Trade'} />
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6">

          {/* Live P&L Preview */}
          {livePnl !== null && (
            <div className={`flex items-center justify-between p-4 rounded-xl border ${livePnl >= 0 ? 'bg-profit/5 border-profit/20' : 'bg-loss/5 border-loss/20'}`}>
              <span className="text-sm text-text-secondary">Estimated P&L</span>
              <span className={`text-2xl font-bold ${livePnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(livePnl)}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Trade Info</h3>

            {/* Asset Class Selector */}
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Asset Class *</label>
              <div className="flex gap-2 flex-wrap">
                {ASSET_CLASSES.map(ac => (
                  <button key={ac} type="button" onClick={() => setValue('assetClass', ac)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors capitalize ${
                      watchAll.assetClass === ac
                        ? 'bg-accent/20 text-accent border-accent/30'
                        : 'border-border text-text-muted hover:border-accent/50'
                    }`}>
                    {ac}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Symbol *</label>
                <input {...register('ticker')} className="input-base uppercase" placeholder={
                  watchAll.assetClass === 'forex' ? 'EURUSD' :
                  watchAll.assetClass === 'indices' ? 'SPX500' :
                  watchAll.assetClass === 'crypto' ? 'BTC/USD' :
                  watchAll.assetClass === 'futures' ? 'MGC' :
                  'AAPL'
                 } />
                {errors.ticker && <p className="text-xs text-loss mt-1">{errors.ticker.message}</p>}

                {/* Quick-pick common pairs */}
                {COMMON_PAIRS[watchAll.assetClass] && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {COMMON_PAIRS[watchAll.assetClass].slice(0, 7).map(pair => (
                      <button key={pair} type="button" onClick={() => setValue('ticker', pair)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                          watchAll.ticker?.toUpperCase() === pair.toUpperCase()
                            ? 'bg-accent/20 text-accent border-accent/30'
                            : 'border-border/50 text-text-muted hover:border-accent/50 hover:text-text-secondary'
                        }`}>
                        {pair}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Direction *</label>
                <div className="flex gap-2">
                  {(['LONG', 'SHORT'] as const).map(d => (
                    <button key={d} type="button" onClick={() => setValue('direction', d)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${watchAll.direction === d ? (d === 'LONG' ? 'bg-profit/20 text-profit border-profit/30' : 'bg-loss/20 text-loss border-loss/30') : 'border-border text-text-muted hover:border-accent/50'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Entry Date & Time *</label>
                <Controller
                  name="entryDateTime"
                  control={control}
                  render={({ field }) => (
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select Entry Date & Time"
                    />
                  )}
                />
                {errors.entryDateTime && <p className="text-xs text-loss mt-1">Required</p>}
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Entry Price *</label>
                <input type="number" step="0.01" {...register('entryPrice')} className="input-base" placeholder="0.00" />
                {errors.entryPrice && <p className="text-xs text-loss mt-1">Must be positive</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Quantity *</label>
                <input type="number" step="any" {...register('quantity')} className="input-base" placeholder="100" />
                {errors.quantity && <p className="text-xs text-loss mt-1">{errors.quantity.message}</p>}
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Commission</label>
                <input type="number" step="0.01" {...register('commission')} className="input-base" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Fees</label>
                <input type="number" step="0.01" {...register('fees')} className="input-base" />
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Risk Management</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Stop Loss Price</label>
                <input type="number" step="any" {...register('stopLoss')} className="input-base" placeholder="0.00" />
                {errors.stopLoss && <p className="text-xs text-loss mt-1">{errors.stopLoss.message}</p>}
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">Take Profit Price</label>
                <input type="number" step="any" {...register('takeProfit')} className="input-base" placeholder="0.00" />
                {errors.takeProfit && <p className="text-xs text-loss mt-1">{errors.takeProfit.message}</p>}
              </div>
            </div>

            {/* Live Risk & Reward Preview */}
            {(liveRisk !== null || liveReward !== null) && (
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl border bg-surface-alt border-border text-center">
                <div>
                  <span className="text-[10px] text-text-muted block uppercase tracking-wider">Potential Risk</span>
                  <span className="text-sm font-bold text-loss mt-1 block">
                    {liveRisk !== null ? `-${formatCurrency(liveRisk)}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase tracking-wider">Potential Reward</span>
                  <span className="text-sm font-bold text-profit mt-1 block">
                    {liveReward !== null ? formatCurrency(liveReward) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block uppercase tracking-wider">Risk / Reward Ratio</span>
                  <span className="text-sm font-bold text-accent mt-1 block">
                    {liveRatio !== null ? `${liveRatio}R` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Exit Info */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Exit / Status</h3>
              <div className="flex gap-2">
                {(['OPEN', 'CLOSED'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setValue('status', s)}
                    className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${tradeStatus === s ? 'bg-accent/20 text-accent border-accent/30' : 'border-border text-text-muted hover:border-accent/50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {tradeStatus === 'CLOSED' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Exit Date & Time</label>
                  <Controller
                    name="exitDateTime"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Exit Date & Time"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Exit Price</label>
                  <input type="number" step="0.01" {...register('exitPrice')} className="input-base" placeholder="0.00" />
                </div>
              </div>
            )}
          </div>

          {/* Setup + Tags */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Classification</h3>
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Setup *</label>
              <select {...register('setup')} className="input-base">
                <option value="">Select setup…</option>
                {setupOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.setup && <p className="text-xs text-loss mt-1">Required</p>}
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${(tags ?? []).includes(tag) ? 'bg-accent/20 text-accent border-accent/30' : 'border-border text-text-muted hover:border-accent/50'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Trade Notes</h3>
            <Controller
              name="journalNotes"
              control={control}
              render={({ field }) => (
                <RichTextEditor content={field.value} onChange={field.onChange} placeholder="Describe your entry reason, execution, and lessons..." />
              )}
            />
          </div>

          {/* Psychology — collapsible */}
          <div className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setPsychOpen(o => !o)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-alt transition-colors"
            >
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Psychology</h3>
                <p className="text-xs text-text-muted mt-0.5">Emotion tag, process grade, mistake type — optional</p>
              </div>
              {psychOpen ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
            </button>

            {psychOpen && (
              <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-2">How did you feel entering this trade?</label>
                  <EmotionPicker value={emotionTag} onChange={setEmotionTag} />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted block mb-2">Process Grade</label>
                  <ProcessGradePicker
                    grade={processGrade}
                    mistakeType={mistakeType}
                    onGradeChange={(g) => { setProcessGrade(g); if (!g || !['C','D','F'].includes(g)) setMistakeType(null) }}
                    onMistakeChange={setMistakeType}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" leftIcon={<Save size={16} />} className="flex-1 justify-center">
              {editId ? 'Update Trade' : 'Add Trade'}
            </Button>
            <Button type="button" variant="secondary" leftIcon={<X size={16} />} onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AddTradePage() {
  return (
    <Suspense>
      <AddTradeContent />
    </Suspense>
  )
}
