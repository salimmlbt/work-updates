
'use client'

import { format, startOfDay, addHours, isSameHour, setHours, isSameDay, getHours, getMinutes, parseISO } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';

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

interface DayViewProps {
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


export default function DayView({ date, events, onEventClick, activeCalendar, onDateSelect, selectedDate }: DayViewProps) {
  const dayEvents = useMemo(() => {
    return events
      .filter(e => isSameDay(parseISO(e.date), date))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [date, events]);

  const allDayEvents = useMemo(() => dayEvents.filter(isAllDayEvent), [dayEvents]);
  const timedEvents = useMemo(() => dayEvents.filter(e => !isAllDayEvent(e)), [dayEvents]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const eventsByHour = useMemo(() => {
    const grouped: { [key: number]: CalendarEvent[] } = {};
    timedEvents.forEach(event => {
      const hour = getHours(parseISO(event.date));
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(event);
    });
    return grouped;
  }, [timedEvents]);

  const isFalaqLeave = allDayEvents.some(e => e.falaq_event_type === 'leave');

  const nowIndicator = useMemo(() => {
    if (!isSameDay(date, currentTime)) return null;

    const topPosition = (currentTime.getHours() + currentTime.getMinutes() / 60) * 4; // 4rem per hour (h-16)
    return (
      <div className="absolute w-full" style={{ top: `${topPosition}rem`, left: 0 }}>
        <div className="relative">
          <div className="h-0.5 bg-red-500 w-full"></div>
          <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500"></div>
        </div>
      </div>
    );
  }, [currentTime, date]);

  return (
    <div className={cn("h-full w-full flex flex-col", (activeCalendar === 'falaq_calendar' && isFalaqLeave) && "bg-red-50")}>
       <div className="border-b">
         <div className="grid grid-cols-[60px_1fr]">
            <div className="w-16 text-center py-2 text-xs text-muted-foreground border-r flex items-center justify-center">All-day</div>
            <div className="p-2 space-y-1 min-h-[4rem]">
                 {allDayEvents.map(event => {
                    const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official';
                    const color = typeColorMap[eventType] || { bg: 'bg-gray-100', border: 'border-gray-500' };
                    return (
                        <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                            className={cn('p-1 rounded-sm text-sm cursor-pointer w-full border-l-4', color.bg, color.border)}
                        >
                            <p className="font-semibold truncate">{event.name}</p>
                        </div>
                    )
                 })}
            </div>
         </div>
       </div>
      <div className="grid grid-cols-[60px_1fr] flex-1 overflow-y-auto">
        <div className="col-start-1 col-end-2 border-r">
          {hours.map(hour => (
            <div key={hour} className="h-16 text-right pr-2 pt-1 border-b">
              {hour > 0 && <span className="text-xs text-muted-foreground">{format(setHours(new Date(), hour), 'ha')}</span>}
            </div>
          ))}
        </div>
        <div className="col-start-2 col-end-3 relative">
          {hours.map(hour => (
            <div 
              key={`grid-${hour}`} 
              className={cn(
                "h-16 border-b cursor-pointer",
                isSameHour(setHours(date, hour), selectedDate) && isSameDay(date, selectedDate) ? 'bg-blue-50 dark:bg-blue-900/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/20'
              )}
              onClick={() => onDateSelect(setHours(date, hour))}
            ></div>
          ))}
          <div className="absolute top-0 left-0 w-full h-full p-1 pointer-events-none">
            {Object.entries(eventsByHour).map(([hour, hourEvents]) => {
                const hourNumber = parseInt(hour);
                const topPosition = hourNumber * 4; // 4rem per hour (h-16)
                
                const eventsWithLayout = hourEvents.map((event, index, arr) => ({
                    event,
                    width: `${100 / arr.length}%`,
                    left: `${index * (100 / arr.length)}%`,
                }));

                return (
                    <div key={hour} className="absolute w-[calc(100%-0.5rem)]" style={{ top: `${topPosition}rem`, left: '0.25rem' }}>
                        {eventsWithLayout.map(({event, width, left}) => {
                          const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official';
                          const color = typeColorMap[eventType] || { bg: 'bg-gray-100', border: 'border-gray-500' };
                          
                          return (
                            <div
                                key={event.id}
                                onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                                className={cn(
                                  'absolute p-2 rounded-lg text-xs cursor-pointer mb-1 pointer-events-auto border-l-4', 
                                  color.bg, color.border
                                )}
                                style={{ width, left }}
                            >
                                <p className="font-semibold truncate">{event.name}</p>
                                <p className="text-xs truncate">{event.description}</p>
                            </div>
                        )})}
                    </div>
                )
            })}
          </div>
          {nowIndicator}
        </div>
      </div>
    </div>
  );
}
