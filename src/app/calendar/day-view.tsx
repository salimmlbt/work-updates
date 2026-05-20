
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
  public: { bg: 'bg-blue-900/40', border: 'border-blue-500/50', text: 'text-blue-200' },
  official: { bg: 'bg-purple-900/40', border: 'border-purple-500/50', text: 'text-purple-200' },
  leave: { bg: 'bg-red-900/40', border: 'border-red-500/50', text: 'text-red-200' },
  weekend: { bg: 'bg-zinc-800/60', border: 'border-white/10', text: 'text-zinc-400' },
  task: { bg: 'bg-yellow-900/40', border: 'border-yellow-500/50', text: 'text-yellow-200' },
  project: { bg: 'bg-green-900/40', border: 'border-green-500/50', text: 'text-green-200' },
  personal: { bg: 'bg-pink-900/40', border: 'border-pink-500/50', text: 'text-pink-200' },
  special_day: { bg: 'bg-indigo-900/40', border: 'border-indigo-500/50', text: 'text-indigo-200' },
  working_sunday: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-200' },
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
        className="absolute w-full pointer-events-none z-20"
        style={{ top }}
      >
        <div className="relative flex items-center">
          <div className="h-0.5 bg-red-500 flex-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          <div className="h-3 w-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
        </div>
      </div>
    )
  }, [currentTime, date])

  return (
    <div
      className={cn(
        'h-full w-full flex flex-col bg-[#0f0f0f] transition-colors',
        activeCalendar === 'falaq_calendar' && isFalaqLeave && 'bg-red-950/10'
      )}
    >
      {/* 🕓 All-day Section */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="grid grid-cols-[70px_1fr]">
          <div className="text-center py-2 text-[10px] uppercase tracking-widest font-black text-zinc-500 border-r border-white/10 bg-white/5 flex items-center justify-center">
            All-day
          </div>
          <div className="p-2 space-y-2 min-h-[4rem]">
            {allDayEvents.length === 0 && (
              <p className="text-xs text-zinc-600 italic">No all-day events</p>
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
                    'p-2 rounded-xl shadow-lg cursor-pointer border-l-4 backdrop-blur-md',
                    color.bg,
                    color.border,
                    color.text,
                    'hover:shadow-sky-500/10 transition-all duration-300'
                  )}
                >
                  <p className="font-bold truncate text-sm">{event.name}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 🧭 Hourly Grid */}
      <div className="grid grid-cols-[70px_1fr] flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Hour labels */}
        <div className="border-r border-white/10 text-right text-[10px] font-bold text-zinc-500 bg-white/[0.02]">
          {hours.map(hour => (
            <div
              key={hour}
              className="h-16 border-b border-white/5 pr-2 pt-1 uppercase tracking-tighter"
            >
              {hour > 0 && format(setHours(new Date(), hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Time slots */}
        <div className="relative bg-[#0f0f0f]">
          {hours.map(hour => (
            <div
              key={hour}
              onClick={() => onDateSelect(setHours(date, hour))}
              className={cn(
                'h-16 border-b border-white/5 cursor-pointer transition-colors',
                isSameHour(setHours(date, hour), selectedDate) && isSameDay(date, selectedDate)
                  ? 'bg-sky-500/10'
                  : 'hover:bg-white/[0.03]',
                hour % 2 === 0 && 'bg-white/[0.01]'
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
                          'absolute p-3 rounded-xl shadow-2xl border-l-4 cursor-pointer pointer-events-auto backdrop-blur-lg',
                          color.bg,
                          color.border,
                          color.text,
                          'hover:scale-[1.02] hover:shadow-sky-500/20 transition-all duration-200 z-10'
                        )}
                      >
                        <p className="font-bold truncate text-sm">{event.name}</p>
                        {event.description && (
                          <p className="text-[10px] opacity-60 truncate font-medium mt-0.5">{event.description}</p>
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
