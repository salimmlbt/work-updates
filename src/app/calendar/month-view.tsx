
'use client'

import { Calendar } from '@/components/ui/calendar'
import { format, isSameDay, getMonth, isToday, getDay } from 'date-fns'
import { type CalendarEvent } from './calendar-client'
import { cn } from '@/lib/utils'
import { useMemo, useRef, useEffect, useState } from 'react'

const typeColorMap: Record<string, { bg: string; border: string; text: string }> = {
  public: { bg: 'bg-blue-900/40', border: 'border-blue-500/50', text: 'text-blue-200' },
  official: { bg: 'bg-purple-900/40', border: 'border-purple-500/50', text: 'text-purple-200' },
  leave: { bg: 'bg-red-900/40', border: 'border-red-500/50', text: 'text-red-200' },
  working_sunday: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-200' },
  task: { bg: 'bg-yellow-900/40', border: 'border-yellow-500/50', text: 'text-yellow-200' },
  project: { bg: 'bg-green-900/40', border: 'border-green-500/50', text: 'text-green-200' },
  personal: { bg: 'bg-pink-900/40', border: 'border-pink-500/50', text: 'text-pink-200' },
  special_day: { bg: 'bg-indigo-900/40', border: 'border-indigo-500/50', text: 'text-indigo-200' },
}

function DayContent({
  date,
  displayMonth,
  events,
  onEventClick,
  selectedDate,
}: {
  date: Date
  displayMonth: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void
  selectedDate: Date | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [maxVisible, setMaxVisible] = useState(3)
  const [hasMounted, setHasMounted] = useState(false)

  // Filter for events on this day
  const dayEvents = useMemo(() => {
    return events.filter(e => isSameDay(new Date(e.date), date))
  }, [date, events])

  const isOutside = getMonth(date) !== getMonth(displayMonth)
  const isSelected = selectedDate && isSameDay(date, selectedDate)
  const dayNumber = format(date, 'd')

  // Dynamically calculate how many events can fit
  useEffect(() => {
    setHasMounted(true);
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      const availableHeight = el.clientHeight - 28 // Leave space for day number
      const lineHeight = 22 // average event item height
      const visibleCount = Math.max(0, Math.floor(availableHeight / lineHeight))
      setMaxVisible(visibleCount)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const visibleEvents = dayEvents.slice(0, maxVisible)
  const overflow = dayEvents.length - visibleEvents.length

  if (!hasMounted) {
    return (
      <div
        className={cn(
          'relative flex flex-col h-full p-1.5 sm:p-2 rounded-md overflow-hidden transition-all',
          isOutside && 'opacity-20'
        )}
      >
        <span
          className={cn(
            'self-start mb-1 text-xs font-black h-7 w-7 flex items-center justify-center rounded-full transition-all',
            isToday(date) && !isSelected && 'text-sky-400 font-bold',
            isSelected && 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]'
          )}
        >
          {dayNumber}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col h-full p-1.5 sm:p-2 rounded-md overflow-hidden transition-all',
        isOutside && 'opacity-20'
      )}
    >
      <span
        className={cn(
            'self-start mb-1 text-xs font-black h-7 w-7 flex items-center justify-center rounded-full transition-all',
            isToday(date) && !isSelected && 'text-sky-400 font-bold',
            isSelected && 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]'
        )}
      >
        {dayNumber}
      </span>

      <div className="flex-1 overflow-hidden space-y-1">
        {visibleEvents.map(event => {
          const type = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official'
          const color = typeColorMap[type] || typeColorMap.official
          return (
            <div
              key={event.id}
              onClick={e => {
                e.stopPropagation()
                onEventClick(event, e.currentTarget)
              }}
              title={event.name}
              className={cn(
                'truncate text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg cursor-pointer border-l-4 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-[1.02]',
                color.bg,
                color.border,
                color.text
              )}
            >
              {event.name}
            </div>
          )
        })}
        {overflow > 0 && (
          <p className="text-[10px] text-zinc-500 font-bold italic mt-0.5 ml-1">
            +{overflow} more
          </p>
        )}
      </div>
    </div>
  )
}

interface MonthViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void
  activeCalendar: string
  onDateSelect: (date: Date) => void
  selectedDate: Date | null
}

export default function MonthView({
  date,
  events,
  onEventClick,
  activeCalendar,
  onDateSelect,
  selectedDate,
}: MonthViewProps) {
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      const key = format(new Date(e.date), 'yyyy-MM-dd')
      grouped[key] = grouped[key] || []
      grouped[key].push(e)
    })
    return grouped
  }, [events])

  return (
    <Calendar
      month={date}
      mode="single"
      selected={selectedDate || undefined}
      onSelect={day => day && onDateSelect(day)}
      className="p-0 h-full flex flex-col bg-[#0f0f0f]"
      classNames={{
        months: 'flex-1 flex flex-col',
        month: 'flex-1 flex flex-col',
        caption: 'hidden',
        nav: 'hidden',
        table: 'w-full h-full border-collapse table-fixed',
        head_row: 'bg-white/[0.02]',
        head_cell:
          'p-3 text-center text-[10px] uppercase font-black tracking-widest text-zinc-500 w-[14.28%] border-b border-white/10',
        body: 'flex-1',
        row: 'h-[16.6%] border-b border-white/5',
        cell: 'p-0 align-top relative border-r border-white/5 last:border-r-0 hover:bg-white/[0.02] transition-colors',
        day: 'w-full h-full flex',
      }}
      components={{
        DayContent: props => {
          const key = format(props.date, 'yyyy-MM-dd')
          const isSun = getDay(props.date) === 0
          const isWorkingSunday = eventsByDay[key]?.some(
            e => e.falaq_event_type === 'working_sunday'
          )
          const isSelected = selectedDate && isSameDay(props.date, selectedDate)

          return (
            <div
              className={cn(
                'h-full w-full rounded-sm transition-colors',
                isSun && !isWorkingSunday && 'bg-red-500/[0.02]',
                isToday(props.date) && !isSelected && 'bg-sky-500/5',
                isSelected && 'bg-white/[0.04] shadow-inner'
              )}
            >
              <DayContent
                {...props}
                events={eventsByDay[key] || []}
                onEventClick={onEventClick}
                selectedDate={selectedDate}
              />
            </div>
          )
        },
      }}
    />
  )
}
