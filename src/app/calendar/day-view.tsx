'use client'

import {
  format,
  setHours,
  isSameDay,
  isSameHour,
  getHours,
  getMinutes,
  parseISO,
} from 'date-fns'
import { type CalendarEvent } from './calendar-client'
import { cn } from '@/lib/utils'
import { useMemo, useState, useEffect } from 'react'

const typeColorMap: Record<string, { bg: string; border: string; text: string }> = {
  public: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
  official: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
  leave: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
  weekend: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700' },
  task: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' },
  project: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
  personal: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' },
  special_day: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-800' },
  working_sunday: { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
}

const hours = Array.from({ length: 24 }, (_, i) => i)

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void
  activeCalendar: string
  onDateSelect: (date: Date) => void
  selectedDate: Date
}

const isAllDayEvent = (event: CalendarEvent) => event.date.length === 10

export default function DayView({
  date,
  events,
  onEventClick,
  activeCalendar,
  onDateSelect,
  selectedDate,
}: DayViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const dayEvents = useMemo(
    () =>
      events
        .filter(e => isSameDay(parseISO(e.date), date))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [date, events]
  )

  const allDayEvents = useMemo(() => dayEvents.filter(isAllDayEvent), [dayEvents])
  const timedEvents = useMemo(() => dayEvents.filter(e => !isAllDayEvent(e)), [dayEvents])

  const eventsByHour = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {}
    timedEvents.forEach(event => {
      const hour = getHours(parseISO(event.date))
      grouped[hour] = grouped[hour] || []
      grouped[hour].push(event)
    })
    return grouped
  }, [timedEvents])

  const isFalaqLeave = allDayEvents.some(e => e.falaq_event_type === 'leave')

  const nowIndicator = useMemo(() => {
    if (!isSameDay(date, currentTime)) return null
    const top = (getHours(currentTime) + getMinutes(currentTime) / 60) * 64 // 4rem = 64px
    return (
      <div
        className="absolute w-full pointer-events-none"
        style={{ top }}
      >
        <div className="relative flex items-center">
          <div className="h-0.5 bg-red-500 flex-1"></div>
          <div className="h-3 w-3 bg-red-500 rounded-full shadow"></div>
        </div>
      </div>
    )
  }, [currentTime, date])

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col bg-white dark:bg-neutral-900 transition-colors',
        activeCalendar === 'falaq_calendar' && isFalaqLeave && 'bg-red-50 dark:bg-red-900/10'
      )}
    >
      {/* 🕓 All-day Section */}
      <div className="border-b bg-gray-50 dark:bg-neutral-800/40">
        <div className="grid grid-cols-[70px_1fr]">
          <div className="text-center py-2 text-xs text-muted-foreground border-r bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
            All-day
          </div>
          <div className="p-2 space-y-2 min-h-[4rem]">
            {allDayEvents.length === 0 && (
              <p className="text-xs text-gray-400 italic">No all-day events</p>
            )}
            {allDayEvents.map(event => {
              const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official'
              const color = typeColorMap[eventType] || typeColorMap['official']
              return (
                <div
                  key={event.id}
                  onClick={e => {
                    e.stopPropagation()
                    onEventClick(event, e.currentTarget)
                  }}
                  className={cn(
                    'p-2 rounded-md shadow-sm cursor-pointer border-l-4',
                    color.bg,
                    color.border,
                    color.text,
                    'hover:shadow-md transition'
                  )}
                >
                  <p className="font-semibold truncate">{event.name}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 🧭 Hourly Grid */}
      <div className="grid grid-cols-[70px_1fr] flex-1 overflow-y-auto relative">
        {/* Hour labels */}
        <div className="border-r text-right text-xs text-muted-foreground bg-gray-50 dark:bg-neutral-800">
          {hours.map(hour => (
            <div
              key={hour}
              className="h-16 border-b border-gray-200 dark:border-neutral-700 pr-2 pt-1"
            >
              {hour > 0 && format(setHours(new Date(), hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="relative bg-white dark:bg-neutral-900">
          {hours.map(hour => (
            <div
              key={hour}
              onClick={() => onDateSelect(setHours(date, hour))}
              className={cn(
                'h-16 border-b border-gray-100 dark:border-neutral-800 cursor-pointer transition-colors',
                isSameHour(setHours(date, hour), selectedDate) && isSameDay(date, selectedDate)
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-neutral-800/50',
                hour % 2 === 0 && 'bg-gray-50/30 dark:bg-neutral-800/20'
              )}
            />
          ))}

          {/* Timed Events */}
          <div className="absolute top-0 left-0 w-full h-full p-1">
            {Object.entries(eventsByHour).map(([hour, events]) => {
              const hourNumber = parseInt(hour)
              const top = hourNumber * 64
              const eventWidth = `${100 / events.length}%`

              return (
                <div key={hour} className="absolute w-[calc(100%-1rem)]" style={{ top }}>
                  {events.map((event, index) => {
                    const eventType =
                      (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official'
                    const color = typeColorMap[eventType] || typeColorMap['official']

                    return (
                      <div
                        key={event.id}
                        onClick={e => {
                          e.stopPropagation()
                          onEventClick(event, e.currentTarget)
                        }}
                        style={{ width: eventWidth, left: `${index * 100 / events.length}%` }}
                        className={cn(
                          'absolute p-2 rounded-md shadow-sm border-l-4 cursor-pointer pointer-events-auto',
                          color.bg,
                          color.border,
                          color.text,
                          'hover:shadow-lg transition-all duration-200'
                        )}
                      >
                        <p className="font-semibold truncate">{event.name}</p>
                        {event.description && (
                          <p className="text-xs opacity-80 truncate">{event.description}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* 🔴 Now Indicator */}
          {nowIndicator}
        </div>
      </div>
    </div>
  )
}
