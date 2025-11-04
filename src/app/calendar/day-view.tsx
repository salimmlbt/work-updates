
'use client'

import { format, startOfDay, addHours, isSameHour, setHours, isSameDay, parseISO } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const typeColorMap: { [key: string]: string } = {
  public: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500',
  official: 'bg-purple-100 text-purple-800 border-l-4 border-purple-500',
  leave: 'bg-red-100 text-red-800 border-l-4 border-red-500',
  weekend: 'bg-gray-200 text-gray-700',
  task: 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500',
  project: 'bg-green-100 text-green-800 border-l-4 border-green-500',
  personal: 'bg-pink-100 text-pink-800 border-l-4 border-pink-500',
};

const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8 AM to 11 PM

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  activeCalendar: string;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const isAllDayEvent = (event: CalendarEvent) => {
    // An event is all-day if its date string doesn't contain a time part.
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

  const eventsByHour = useMemo(() => {
    const grouped: { [key: number]: CalendarEvent[] } = {};
    timedEvents.forEach(event => {
      const hour = parseISO(event.date).getHours();
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(event);
    });
    return grouped;
  }, [timedEvents]);

  const isFalaqLeave = allDayEvents.some(e => (e as any).falaq_event_type === 'leave');

  return (
    <div className={cn("h-full w-full flex flex-col", (activeCalendar === 'falaq_calendar' && isFalaqLeave) && "bg-red-50")}>
       <div className="border-b">
         <div className="grid grid-cols-[auto_1fr] items-center">
            <div className="w-20 text-center py-2 text-sm text-muted-foreground border-r">All day</div>
            <div className="p-2 space-y-1">
                 {allDayEvents.map(event => {
                    const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official';
                    const colorClass = typeColorMap[eventType] || 'bg-gray-100';
                    return (
                        <div
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                            className={cn('p-1 rounded-md text-sm cursor-pointer w-full', colorClass)}
                        >
                            <p className="font-semibold truncate">{event.name}</p>
                        </div>
                    )
                 })}
            </div>
         </div>
       </div>
      <div className="grid grid-cols-[auto_1fr] flex-1">
        <div className="col-start-1 col-end-2 border-r">
          {hours.map(hour => (
            <div key={hour} className="h-20 text-right pr-2 pt-1 border-b">
              <span className="text-sm text-muted-foreground">{format(setHours(new Date(), hour), 'ha')}</span>
            </div>
          ))}
        </div>
        <div className="col-start-2 col-end-3 relative">
          {hours.map(hour => (
            <div 
              key={`grid-${hour}`} 
              className={cn(
                "h-20 border-b cursor-pointer",
                isSameHour(setHours(date, hour), selectedDate) && isSameDay(date, selectedDate) ? 'bg-blue-50' : 'hover:bg-gray-50'
              )}
              onClick={() => onDateSelect(setHours(date, hour))}
            ></div>
          ))}
          <div className="absolute top-0 left-0 w-full h-full p-2 pointer-events-none">
            {Object.entries(eventsByHour).map(([hour, hourEvents]) => {
                const hourNumber = parseInt(hour);
                if (hourNumber < 8) return null; 
                const topPosition = (hourNumber - 8) * 5; // 5rem per hour, offset by 8 hours
                return (
                    <div key={hour} className="absolute w-full" style={{ top: `${topPosition}rem`, left: 0 }}>
                        {hourEvents.map((event, index) => {
                          const isEventFalaqLeave = (event as any).falaq_event_type === 'leave';
                          return (
                            <div
                                key={event.id}
                                onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                                className={cn(
                                  'p-2 rounded-lg text-sm cursor-pointer mb-1 w-[98%] pointer-events-auto', 
                                  (activeCalendar === 'falaq_calendar' && isEventFalaqLeave) ? typeColorMap['leave'] : typeColorMap[event.type] || 'bg-gray-100'
                                )}
                                style={{ marginLeft: `${index * 5}%` }}
                            >
                                <p className="font-semibold truncate">{event.name}</p>
                                <p className="text-xs truncate">{event.description}</p>
                            </div>
                        )})}
                    </div>
                )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
