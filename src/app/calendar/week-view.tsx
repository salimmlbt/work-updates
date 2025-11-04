'use client'

import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  setHours,
  isToday,
  getDay,
  isSameDay,
  getHours,
  getMinutes,
  parseISO,
} from 'date-fns'
import { type CalendarEvent } from './calendar-client'
import { cn } from '@/lib/utils'
import { useMemo, useEffect, useState } from 'react'

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

interface WeekViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void
  activeCalendar: string
  onDateSelect: (date: Date) => void
  selectedDate: Date
}

const isAllDayEvent = (event: CalendarEvent) => event.date.length === 10

export default function WeekView({
  date,
  events,
  onEventClick,
  activeCalendar,
  onDateSelect,
  selectedDate,
}: WeekViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const allDayEvents = useMemo(() => events.filter(isAllDayEvent), [events])
  const timedEvents = useMemo(() => events.filter(e => !isAllDayEvent(e)), [events])

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd')
      grouped[key] = timedEvents
        .filter(e => isSameDay(parseISO(e.date), day))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    })
    return grouped
  }, [weekDays, timedEvents])

  const allDayEventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    weekDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd')
      grouped[key] = allDayEvents.filter(e => isSameDay(parseISO(e.date), day))
    })
    return grouped
  }, [weekDays, allDayEvents])

  const nowIndicator = useMemo(() => {
    if (!weekDays.some(d => isSameDay(d, currentTime))) return null
    const top = (getHours(currentTime) + getMinutes(currentTime) / 60) * 64
    return (
      <div
        className="absolute w-full pointer-events-none z-20"
        style={{ top }}
      >
        <div className="relative flex items-center">
          <div className="h-0.5 bg-red-500 flex-1"></div>
          <div className="h-3 w-3 bg-red-500 rounded-full shadow"></div>
        </div>
      </div>
    )
  }, [currentTime, weekDays])

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] sticky top-0 bg-white dark:bg-neutral-900 z-20 border-b">
        <div className="border-r"></div>
        {weekDays.map((day, i) => {
          const isSunday = getDay(day) === 0
          return (
            <div
              key={day.toString()}
              className={cn(
                'py-2 text-center border-r cursor-pointer transition-colors',
                isSunday && 'bg-red-50 dark:bg-red-900/10',
                isToday(day) && 'bg-blue-50 dark:bg-blue-900/20',
                isSameDay(day, selectedDate) && 'bg-blue-100 dark:bg-blue-900/40'
              )}
              onClick={() => onDateSelect(day)}
            >
              <p
                className={cn(
                  'text-xs',
                  isToday(day) ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {format(day, 'EEE')}
              </p>
              <p
                className={cn(
                  'text-xl font-semibold',
                  isToday(day) && 'text-primary'
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b bg-gray-50/40 dark:bg-neutral-800/40">
        <div className="text-center text-xs py-1 border-r text-muted-foreground flex items-center justify-center">
          All-day
        </div>
        {weekDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = allDayEventsByDay[key] || []
          return (
            <div key={key} className="p-2 border-r space-y-1 min-h-[4rem]">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-gray-400 italic">—</p>
              ) : (
                dayEvents.map(event => {
                  const type = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official'
                  const color = typeColorMap[type] || typeColorMap.official
                  return (
                    <div
                      key={event.id}
                      onClick={e => {
                        e.stopPropagation()
                        onEventClick(event, e.currentTarget)
                      }}
                      className={cn(
                        'p-1 rounded-md text-xs cursor-pointer border-l-4 shadow-sm',
                        color.bg,
                        color.border,
                        color.text,
                        'hover:shadow-md transition-all'
                      )}
                    >
                      <p className="font-semibold truncate">{event.name}</p>
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] flex-1 overflow-y-auto relative">
        {/* Sticky Time Column */}
        <div className="border-r bg-gray-50 dark:bg-neutral-800 sticky left-0 z-10">
          {hours.map(hour => (
            <div key={hour} className="h-16 border-b text-right pr-2 pt-1 text-xs text-muted-foreground">
              {format(setHours(new Date(), hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Days */}
        {weekDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const isSunday = getDay(day) === 0
          const isWorkingSunday = allDayEventsByDay[key]?.some(e => e.falaq_event_type === 'working_sunday')
          const isLeave = allDayEventsByDay[key]?.some(e => e.falaq_event_type === 'leave')

          return (
            <div
              key={day.toString()}
              className={cn(
                'relative border-r overflow-hidden',
                (activeCalendar === 'falaq_calendar' && isLeave) || (isSunday && !isWorkingSunday)
                  ? 'bg-red-50 dark:bg-red-900/10'
                  : 'bg-white dark:bg-neutral-900',
                'hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors'
              )}
            >
              {/* Grid Lines */}
              {hours.map((_, i) => (
                <div
                  key={i}
                  onClick={() => onDateSelect(setHours(day, i))}
                  className={cn(
                    'h-16 border-b border-gray-100 dark:border-neutral-800',
                    i % 2 === 0 && 'bg-gray-50/30 dark:bg-neutral-800/20'
                  )}
                />
              ))}

              {/* Timed Events */}
              <div className="absolute inset-0 p-1">
                {(eventsByDay[key] || []).map((event, index, arr) => {
                  const hour = getHours(parseISO(event.date))
                  const top = hour * 64
                  const width = `${100 / arr.length}%`
                  const left = `${index * 100 / arr.length}%`
                  const type = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official'
                  const color = typeColorMap[type] || typeColorMap.official

                  return (
                    <div
                      key={event.id}
                      onClick={e => {
                        e.stopPropagation()
                        onEventClick(event, e.currentTarget)
                      }}
                      style={{ top, width, left }}
                      className={cn(
                        'absolute p-2 rounded-md shadow-sm border-l-4 cursor-pointer',
                        color.bg,
                        color.border,
                        color.text,
                        'hover:shadow-lg transition-all duration-200 pointer-events-auto'
                      )}
                    >
                      <p className="font-semibold truncate">{event.name}</p>
                    </div>
                  )
                })}
              </div>

              {/* Now Line */}
              {isSameDay(day, currentTime) && nowIndicator}
            </div>
          )
        })}
      </div>
    </div>
  )
}
