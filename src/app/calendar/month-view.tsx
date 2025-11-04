
'use client'

import { Calendar } from '@/components/ui/calendar'
import { format, isSameDay, getMonth, isToday, getDay } from 'date-fns'
import { type CalendarEvent } from './calendar-client'
import { cn } from '@/lib/utils'
import { useMemo, useRef, useEffect, useState } from 'react'

const typeColorMap: Record<string, { bg: string; border: string; text: string }> = {
  public: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
  official: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
  leave: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
  working_sunday: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
  task: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' },
  project: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
  personal: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' },
  special_day: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800' },
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
          isOutside && 'opacity-40'
        )}
      >
        <span
          className={cn(
            'self-start mb-1 text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full',
            isToday(date) && !isSelected && 'text-primary font-bold',
            isSelected && 'bg-primary text-white'
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
        isOutside && 'opacity-40'
      )}
    >
      <span
        className={cn(
          'self-start mb-1 text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full',
          isToday(date) && !isSelected && 'text-primary font-bold',
          isSelected && 'bg-primary text-white'
        )}
      >
        {dayNumber}
      </span>

      <div className="flex-1 overflow-hidden space-y-0.5">
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
                'truncate text-[11px] sm:text-xs px-1.5 py-0.5 rounded-sm cursor-pointer border-l-4 shadow-sm hover:shadow-md transition-all',
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
          <p className="text-[10px] sm:text-xs text-muted-foreground italic mt-0.5">
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
      className="p-0 h-full flex flex-col"
      classNames={{
        months: 'flex-1 flex flex-col',
        month: 'flex-1 flex flex-col',
        caption: 'hidden',
        nav: 'hidden',
        table: 'w-full h-full border-collapse table-fixed',
        head_row: '',
        head_cell:
          'p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground w-[14.28%]',
        body: 'flex-1',
        row: 'h-[16.6%] border-t',
        cell: 'p-0 align-top relative border-r last:border-r-0 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors',
        day: 'w-full h-full flex',
      }}
      components={{
        DayContent: props => {
          const key = format(props.date, 'yyyy-MM-dd')
          const isSunday = getDay(props.date) === 0
          const isWorkingSunday = eventsByDay[key]?.some(
            e => e.falaq_event_type === 'working_sunday'
          )
          const isSelected = selectedDate && isSameDay(props.date, selectedDate)

          return (
            <div
              className={cn(
                'h-full w-full rounded-sm',
                isSunday && !isWorkingSunday && 'bg-red-50 dark:bg-red-900/20',
                isToday(props.date) && !isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                isSelected && 'bg-blue-100 dark:bg-blue-900/40'
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
