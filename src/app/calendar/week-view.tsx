
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
  public: { bg: 'bg-blue-900/40', border: 'border-blue-500/50', text: 'text-blue-200' },
  official: { bg: 'bg-purple-900/40', border: 'border-purple-500/50', text: 'text-purple-200' },
  leave: { bg: 'bg-red-900/40', border: 'border-red-500/50', text: 'text-red-200' },
  weekend: { bg: 'bg-zinc-800/60', border: 'border-white/10', text: 'text-zinc-500' },
  task: { bg: 'bg-yellow-900/40', border: 'border-yellow-500/50', text: 'text-yellow-200' },
  project: { bg: 'bg-green-900/40', border: 'border-green-500/50', text: 'text-green-200' },
  personal: { bg: 'bg-pink-900/40', border: 'border-pink-500/50', text: 'text-pink-200' },
  special_day: { bg: 'bg-indigo-900/40', border: 'border-indigo-500/50', text: 'text-indigo-200' },
  working_sunday: { bg: 'bg-emerald-900/40', border: 'border-emerald-500/50', text: 'text-emerald-200' },
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
          <div className="h-0.5 bg-red-500 flex-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
          <div className="h-3 w-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
        </div>
      </div>
    )
  }, [currentTime, weekDays])

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f0f] text-zinc-100">
      {/* Header */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] sticky top-0 bg-[#0f0f0f]/90 backdrop-blur-md z-30 border-b border-white/10">
        <div className="border-r border-white/10"></div>
        {weekDays.map((day) => {
          const isSun = getDay(day) === 0
          return (
            <div
              key={day.toString()}
              className={cn(
                'py-3 text-center border-r border-white/10 cursor-pointer transition-colors',
                isSun && 'bg-red-500/5',
                isToday(day) && 'bg-sky-500/10',
                isSameDay(day, selectedDate) && 'bg-white/5 shadow-inner'
              )}
              onClick={() => onDateSelect(day)}
            >
              <p
                className={cn(
                  'text-[10px] uppercase font-black tracking-widest mb-1',
                  isToday(day) ? 'text-sky-400' : 'text-zinc-500'
                )}
              >
                {format(day, 'EEE')}
              </p>
              <p
                className={cn(
                  'text-2xl font-black tracking-tighter leading-none',
                  isToday(day) ? 'text-white drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'text-zinc-400'
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          )
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-white/10 bg-white/[0.02]">
        <div className="text-center text-[10px] font-black uppercase tracking-widest py-1 border-r border-white/10 text-zinc-500 flex items-center justify-center">
          All-day
        </div>
        {weekDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = allDayEventsByDay[key] || []
          return (
            <div key={key} className={cn("p-2 border-r border-white/10 space-y-1 min-h-[4.5rem]", getDay(day) === 0 && "bg-red-500/5")}>
              {dayEvents.length > 0 ? (
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
                        'p-1.5 rounded-lg text-[11px] font-bold cursor-pointer border-l-4 shadow-xl backdrop-blur-md',
                        color.bg,
                        color.border,
                        color.text,
                        'hover:scale-[1.03] transition-all duration-200'
                      )}
                    >
                      <p className="truncate">{event.name}</p>
                    </div>
                  )
                })
              ) : (
                <p className="text-[10px] text-zinc-700 italic text-center mt-4">—</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[70px_repeat(7,1fr)] flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Sticky Time Column */}
        <div className="border-r border-white/10 bg-white/[0.02] sticky left-0 z-20">
          {hours.map(hour => (
            <div key={hour} className="h-16 border-b border-white/5 text-right pr-2 pt-1 text-[10px] font-bold uppercase tracking-tighter text-zinc-500">
              {format(setHours(new Date(), hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Days */}
        {weekDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const isSun = getDay(day) === 0
          const isWorkingSunday = allDayEventsByDay[key]?.some(e => e.falaq_event_type === 'working_sunday')
          const isLeave = allDayEventsByDay[key]?.some(e => e.falaq_event_type === 'leave')

          return (
            <div
              key={day.toString()}
              className={cn(
                'relative border-r border-white/10 overflow-hidden',
                (activeCalendar === 'falaq_calendar' && isLeave) || (isSun && !isWorkingSunday)
                  ? 'bg-red-500/[0.03]'
                  : 'bg-transparent',
                'hover:bg-white/[0.02] transition-colors'
              )}
            >
              {/* Grid Lines */}
              {hours.map((_, i) => (
                <div
                  key={i}
                  onClick={() => onDateSelect(setHours(day, i))}
                  className={cn(
                    'h-16 border-b border-white/5',
                    i % 2 === 0 && 'bg-white/[0.01]'
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
                        'absolute p-2 rounded-xl shadow-2xl border-l-4 cursor-pointer backdrop-blur-lg z-10',
                        color.bg,
                        color.border,
                        color.text,
                        'hover:scale-[1.05] hover:z-20 transition-all duration-200 pointer-events-auto'
                      )}
                    >
                      <p className="font-bold truncate text-[11px]">{event.name}</p>
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
