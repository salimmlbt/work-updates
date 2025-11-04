
'use client'

import { format, startOfWeek, endOfWeek, eachDayOfInterval, setHours, isToday, getDay, isSameDay, getHours, parseISO } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const typeColorMap: { [key: string]: { bg: string; border: string } } = {
  public: { bg: 'bg-blue-100', border: 'border-blue-500' },
  official: { bg: 'bg-purple-100', border: 'border-purple-500' },
  leave: { bg: 'bg-red-100', border: 'border-red-500' },
  weekend: { bg: 'bg-gray-200', border: 'border-gray-500' },
  task: { bg: 'bg-yellow-100', border: 'border-yellow-500' },
  project: { bg: 'bg-green-100', border: 'border-green-500' },
  personal: { bg: 'bg-pink-100', border: 'border-pink-500' },
  special_day: { bg: 'bg-purple-100', border: 'border-purple-500' },
  working_sunday: { bg: 'bg-green-100', border: 'border-green-500' },
};

const hours = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  activeCalendar: string;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const isAllDayEvent = (event: CalendarEvent) => {
    return event.date.length === 10;
}

export default function WeekView({ date, events, onEventClick, activeCalendar, onDateSelect, selectedDate }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 }); // Saturday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const allDayEvents = useMemo(() => events.filter(isAllDayEvent), [events]);
  const timedEvents = useMemo(() => events.filter(e => !isAllDayEvent(e)), [events]);

  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = timedEvents
        .filter(e => isSameDay(parseISO(e.date), day))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return grouped;
  }, [weekDays, timedEvents]);
  
  const allDayEventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        grouped[dayKey] = allDayEvents.filter(e => isSameDay(parseISO(e.date), day));
    });
    return grouped;
  }, [weekDays, allDayEvents]);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-white dark:bg-gray-900 z-20 border-b">
        <div className="col-start-1 col-end-2 border-r"></div>
        {weekDays.map((day, dayIndex) => {
          const isSunday = getDay(day) === 0;
          return (
            <div 
              key={`header-${day.toString()}`} 
              className={cn(
                  "text-center py-2 border-r cursor-pointer", 
                  dayIndex === 6 && 'border-r-0',
                  isSunday && 'bg-red-50 dark:bg-red-900/20',
                  isToday(day) && !isSameDay(day, selectedDate) && 'bg-blue-50 dark:bg-blue-900/20',
                  isSameDay(day, selectedDate) && 'bg-blue-100 dark:bg-blue-900/40'
              )}
              onClick={() => onDateSelect(day)}
            >
              <p className={cn("text-xs", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>{format(day, 'EEE')}</p>
              <p className={cn("text-2xl font-medium", isToday(day) && 'text-primary')}>{format(day, 'd')}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="w-16 text-center py-1 text-xs text-muted-foreground border-r flex items-center justify-center">All-day</div>
          {weekDays.map((day, dayIndex) => (
             <div 
                key={`all-day-${day.toString()}`} 
                className={cn(
                    "border-r p-1 space-y-1 min-h-[4rem]", 
                    dayIndex === 6 && "border-r-0"
                )}
             >
                {(allDayEventsByDay[format(day, 'yyyy-MM-dd')] || []).map(event => {
                    const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official';
                    const color = typeColorMap[eventType] || { bg: 'bg-gray-100', border: 'border-gray-500' };
                    return (
                        <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                            className={cn('p-1 rounded-sm text-xs cursor-pointer w-full border-l-4', color.bg, color.border)}
                        >
                            <p className="font-semibold truncate">{event.name}</p>
                        </div>
                    )
                })}
            </div>
        ))}
      </div>
      
      <div className="grid grid-cols-[60px_repeat(7,1fr)] flex-1 overflow-y-auto">
        <div className="col-start-1 col-end-2 border-r">
          {hours.map(hour => (
            <div key={hour} className="h-16 text-right pr-2 -mt-2">
              {hour > 0 && <span className="text-xs text-muted-foreground">{format(setHours(new Date(), hour), 'ha')}</span>}
            </div>
          ))}
        </div>
        
        {weekDays.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const isWorkingSunday = allDayEventsByDay[dayKey]?.some(e => e.falaq_event_type === 'working_sunday');
          const isSunday = getDay(day) === 0;
          const isFalaqLeave = allDayEventsByDay[dayKey]?.some(e => e.falaq_event_type === 'leave');

          return (
            <div key={day.toString()} className={cn(
              "relative border-r", 
              dayIndex === 6 && 'border-r-0',
              (activeCalendar === 'falaq_calendar' && isFalaqLeave) || (isSunday && !isWorkingSunday) ? 'bg-red-50 dark:bg-red-900/20' : '',
              isToday(day) && !isSameDay(day, selectedDate) && 'bg-blue-50 dark:bg-blue-900/20',
              isSameDay(day, selectedDate) && 'bg-blue-100 dark:bg-blue-900/40'
            )}>
              <div className="absolute top-0 left-0 w-full h-full">
                {hours.map(hour => (
                  <div key={`grid-${hour}`} className="h-16 border-b cursor-pointer" onClick={() => onDateSelect(setHours(day, hour))}></div>
                ))}
              </div>

              <div className="relative h-full p-1 space-y-1 pointer-events-none">
                 {(eventsByDay[dayKey] || []).map(event => {
                    const eventHour = getHours(parseISO(event.date));
                    const topPosition = eventHour * 4; // 4rem per hour (h-16)
                    const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official';
                    const color = typeColorMap[eventType] || { bg: 'bg-gray-100', border: 'border-gray-500' };
                    
                    return (
                        <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                            className={cn('absolute w-[calc(100%-0.5rem)] p-2 rounded-lg text-xs cursor-pointer z-10 pointer-events-auto border-l-4', color.bg, color.border)}
                            style={{ top: `${topPosition}rem`}}
                        >
                            <p className="font-semibold truncate">{event.name}</p>
                        </div>
                    );
                 })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
