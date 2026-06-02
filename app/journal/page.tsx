'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Calendar } from '@/components/ui/Calendar'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Button } from '@/components/ui/Button'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  upsertJournalEntry, fetchJournalEntries, setSelectedDate, selectSelectedDate,
  selectAllEntries, selectJournalStatus,
} from '@/store/journalSlice'
import { fetchTrades, selectClosedTrades, selectTradesStatus } from '@/store/tradesSlice'
import { getMonthlyCalendarData } from '@/lib/calculations'
import { formatCurrency } from '@/lib/formatters'
import { addToast } from '@/store/uiSlice'
import type { Mood } from '@/types/journal'
import JournalSkeleton from '@/components/ui/skeletons/JournalSkeleton'

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '🚀', label: 'Great' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'bad', emoji: '😔', label: 'Bad' },
  { value: 'terrible', emoji: '😤', label: 'Terrible' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function JournalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const entries = useAppSelector(selectAllEntries)
  const trades = useAppSelector(selectClosedTrades)
  const tradesStatus = useAppSelector(selectTradesStatus)
  const journalStatus = useAppSelector(selectJournalStatus)
  const today = new Date().toISOString().slice(0, 10)
  const paramDate = searchParams.get('date')
  const storedDate = useAppSelector(selectSelectedDate)
  const selectedDate = paramDate ?? storedDate ?? today

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  useEffect(() => {
    if (tradesStatus === 'idle') dispatch(fetchTrades())
    dispatch(fetchJournalEntries())
  }, [dispatch, tradesStatus])

  const entry = entries.find(e => e.date === selectedDate)
  const [content, setContent] = useState(entry?.content ?? '')
  const [mood, setMood] = useState<Mood>(entry?.mood ?? 'neutral')
  const [goal, setGoal] = useState(entry?.dailyGoal ?? '')
  const [lesson, setLesson] = useState(entry?.lessonLearned ?? '')
  const [saving, setSaving] = useState(false)

  const monthStats = getMonthlyCalendarData(trades, calYear, calMonth)
  const dayTrades = trades.filter(t => t.entryDateTime.slice(0, 10) === selectedDate)
  const dayPnl = dayTrades.reduce((s, t) => s + t.pnl, 0)
  const dayWins = dayTrades.filter(t => t.pnl > 0).length

  function selectDay(date: string) {
    dispatch(setSelectedDate(date))
    router.push(`/journal?date=${date}`)
    const e = entries.find(x => x.date === date)
    setContent(e?.content ?? '')
    setMood(e?.mood ?? 'neutral')
    setGoal(e?.dailyGoal ?? '')
    setLesson(e?.lessonLearned ?? '')
  }

  async function handleSave() {
    setSaving(true)
    dispatch(upsertJournalEntry({ date: selectedDate, content, mood, dailyGoal: goal, lessonLearned: lesson }))
    dispatch(addToast({ message: 'Journal entry saved', type: 'success' }))
    setTimeout(() => setSaving(false), 500)
  }

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (journalStatus === 'loading' || tradesStatus === 'loading') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Daily Journal" subtitle={displayDate} />
        <JournalSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Daily Journal" subtitle={displayDate} />
      <div className="flex-1 overflow-hidden flex">

        {/* Left: Calendar */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-1 text-text-muted hover:text-text-primary"><ChevronLeft size={16} /></button>
            <span className="text-xs font-medium text-text-secondary">{MONTHS[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="p-1 text-text-muted hover:text-text-primary"><ChevronRight size={16} /></button>
          </div>
          <Calendar year={calYear} month={calMonth} stats={monthStats} onDayClick={selectDay} />
        </div>

        {/* Right: Editor */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Day Stats */}
          {dayTrades.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-3 text-center">
                <p className="text-xs text-text-muted">Trades</p>
                <p className="text-xl font-bold text-text-primary">{dayTrades.length}</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xs text-text-muted">P&L</p>
                <p className={`text-xl font-bold ${dayPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatCurrency(dayPnl)}</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-xs text-text-muted">Win Rate</p>
                <p className="text-xl font-bold text-text-primary">{dayTrades.length > 0 ? `${Math.round(dayWins / dayTrades.length * 100)}%` : '—'}</p>
              </div>
            </div>
          )}

          {/* Mood */}
          <div className="card p-4">
            <p className="text-xs font-medium text-text-muted mb-3">How did today feel?</p>
            <div className="flex gap-2">
              {MOODS.map(m => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${mood === m.value ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/30'}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-text-muted">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-2">Daily Goal</label>
            <input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="What was your focus today?"
              className="input-base"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-2">Trading Notes</label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Describe your trades, mindset, market observations..."
            />
          </div>

          {/* Lesson */}
          <div>
            <label className="text-xs font-medium text-text-muted block mb-2">Key Lesson / Takeaway</label>
            <textarea
              value={lesson}
              onChange={e => setLesson(e.target.value)}
              rows={3}
              placeholder="What did you learn today?"
              className="input-base resize-none"
            />
          </div>

          <Button leftIcon={<Save size={16} />} onClick={handleSave} loading={saving} className="w-full justify-center">
            Save Journal Entry
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function JournalPage() {
  return (
    <Suspense>
      <JournalContent />
    </Suspense>
  )
}
