
'use client'

import { format, startOfDay, addHours, isSameHour, setHours } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const typeColorMap: { [key: string]: string } = {
  public: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500',
  official: 'bg-purple-100 text-purple-800 border-l-4 border-purple-500',
  weekend: 'bg-gray-200 text-gray-700',
  task: 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500',
  project: 'bg-green-100 text-green-800 border-l-4 border-green-500',
  personal: 'bg-pink-100 text-pink-800 border-l-4 border-pink-500',
};

const hours = Array.from({ length: 24 }, (_, i) => i);

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
}

export default function DayView({ date, events, onEventClick }: DayViewProps) {
  const dayEvents = useMemo(() => {
    return events
      .filter(e => format(new Date(e.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [date, events]);
  
  const eventsByHour = useMemo(() => {
    const grouped: { [key: number]: CalendarEvent[] } = {};
    dayEvents.forEach(event => {
      const hour = new Date(event.date).getUTCHours();
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(event);
    });
    return grouped;
  }, [dayEvents]);

  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-[auto_1fr] h-full">
        <div className="col-start-1 col-end-2 border-r">
          {hours.map(hour => (
            <div key={hour} className="h-20 text-right pr-2 pt-1 border-b">
              <span className="text-sm text-muted-foreground">{format(setHours(new Date(), hour), 'ha')}</span>
            </div>
          ))}
        </div>
        <div className="col-start-2 col-end-3 relative">
          {hours.map(hour => (
            <div key={`grid-${hour}`} className="h-20 border-b"></div>
          ))}
          <div className="absolute top-0 left-0 w-full h-full p-2">
            {Object.entries(eventsByHour).map(([hour, hourEvents]) => (
                <div key={hour} className="absolute w-full" style={{ top: `${parseInt(hour) * 5}rem`, left: 0 }}>
                    {hourEvents.map((event, index) => (
                        <div
                            key={event.id}
                            onClick={(e) => onEventClick(event, e.currentTarget)}
                            className={cn('p-2 rounded-lg text-sm cursor-pointer mb-1 w-[98%]', typeColorMap[event.type] || 'bg-gray-100')}
                            style={{ marginLeft: `${index * 5}%` }}
                        >
                            <p className="font-semibold truncate">{event.name}</p>
                            <p className="text-xs truncate">{event.description}</p>
                        </div>
                    ))}
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
