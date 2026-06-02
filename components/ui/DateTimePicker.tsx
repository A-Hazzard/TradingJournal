'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/formatters'

type DateTimePickerProps = {
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select Date & Time',
  className
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Internal date state representation
  const parsedDate = value ? new Date(value) : null
  const [tempDate, setTempDate] = useState<Date | null>(parsedDate)
  const [viewMonth, setViewMonth] = useState<Date>(parsedDate || new Date())
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync prop value changes with local temp state
  useEffect(() => {
    setTempDate(value ? new Date(value) : null)
    if (value) {
      setViewMonth(new Date(value))
    }
  }, [value])

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const handlePrevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1))
  }

  const selectDay = (day: number) => {
    const hours = tempDate ? tempDate.getHours() : 12
    const minutes = tempDate ? tempDate.getMinutes() : 0
    const newDate = new Date(year, month, day, hours, minutes)
    setTempDate(newDate)
  }

  const handleHourChange = (hours: number) => {
    const baseDate = tempDate || new Date()
    const newDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      Math.min(23, Math.max(0, hours)),
      baseDate.getMinutes()
    )
    setTempDate(newDate)
  }

  const handleMinuteChange = (minutes: number) => {
    const baseDate = tempDate || new Date()
    const newDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      baseDate.getHours(),
      Math.min(59, Math.max(0, minutes))
    )
    setTempDate(newDate)
  }

  const handleApply = () => {
    if (tempDate) {
      onChange(tempDate.toISOString())
    } else {
      onChange(null)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setTempDate(null)
    onChange(null)
    setIsOpen(false)
  }

  // Format date for display in the input field
  const displayValue = parsedDate
    ? parsedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    : ''

  // Generate calendar days
  const calendarCells = []
  
  // Previous month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i)
    })
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    })
  }

  // Next month padding days
  const totalCells = 42 // 6 rows of 7 days
  const nextMonthPadding = totalCells - calendarCells.length
  for (let i = 1; i <= nextMonthPadding; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    })
  }

  const tempHour = tempDate ? String(tempDate.getHours()).padStart(2, '0') : '12'
  const tempMinute = tempDate ? String(tempDate.getMinutes()).padStart(2, '0') : '00'

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {/* Trigger Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-surface-alt border border-border rounded-lg px-3 py-2 cursor-pointer hover:border-accent/50 transition-colors"
      >
        <span className={cn('text-sm truncate', displayValue ? 'text-text-primary' : 'text-text-muted')}>
          {displayValue || placeholder}
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="p-0.5 rounded text-text-muted hover:text-loss hover:bg-surface transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <CalendarIcon size={16} className="text-text-muted" />
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-72 bg-surface border border-border rounded-xl shadow-2xl p-4 space-y-4">
          
          {/* Month/Year Selection Header */}
          <div className="flex items-center justify-between border-b border-border pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-text-primary">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS_SHORT.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-text-muted py-0.5">
                {day}
              </div>
            ))}
            {calendarCells.map((cell, idx) => {
              const isSelected = tempDate
                ? tempDate.getDate() === cell.day &&
                  tempDate.getMonth() === cell.date.getMonth() &&
                  tempDate.getFullYear() === cell.date.getFullYear()
                : false

              const isCurrentDay = cell.isCurrentMonth
              
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => isCurrentDay && selectDay(cell.day)}
                  disabled={!isCurrentDay}
                  className={cn(
                    'aspect-square rounded-lg flex items-center justify-center text-xs transition-colors',
                    isCurrentDay
                      ? isSelected
                        ? 'bg-accent text-white font-semibold'
                        : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
                      : 'text-text-muted/30 cursor-not-allowed'
                  )}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Time Picker Row */}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <Clock size={16} className="text-text-muted" />
            <span className="text-xs text-text-secondary">Time (24h):</span>
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min="0"
                max="23"
                value={tempHour}
                onChange={(e) => handleHourChange(parseInt(e.target.value) || 0)}
                className="w-10 bg-surface-alt border border-border rounded px-1.5 py-0.5 text-center text-xs text-text-primary focus:outline-none focus:border-accent"
              />
              <span className="text-text-muted text-xs font-semibold">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={tempMinute}
                onChange={(e) => handleMinuteChange(parseInt(e.target.value) || 0)}
                className="w-10 bg-surface-alt border border-border rounded px-1.5 py-0.5 text-center text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end border-t border-border pt-3 text-xs">
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1.5 rounded text-text-secondary hover:text-loss transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
            >
              Apply
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
