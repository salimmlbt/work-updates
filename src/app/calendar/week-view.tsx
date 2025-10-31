'use client'

import { format, startOfWeek, endOfWeek, eachDayOfInterval, setHours, isToday, getDay, isSameDay } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const typeColorMap: { [key: string]: string } = {
  public: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500',
  official: 'bg-purple-100 text-purple-800 border-l-4 border-purple-500',
  leave: 'bg-red-100 text-red-800 border-l-4 border-red-500',
  weekend: 'bg-gray-200 text-gray-700',
  task: 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500',
  project: 'bg-green-100 text-green-800 border-l-4 border-green-500',
  personal: 'bg-pink-100 text-pink-800 border-l-4 border-pink-500',
};


const hours = Array.from({ length: 24 }, (_, i) => i);

interface WeekViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  activeCalendar: string;
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  onWeekChange: (direction: 'next' | 'prev') => void;
}

export default function WeekView({ date, events, onEventClick, activeCalendar, onDateSelect, selectedDate, onWeekChange }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 }); // Saturday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = events
        .filter(e => format(new Date(e.date), 'yyyy-MM-dd') === dayKey)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return grouped;
  }, [weekDays, events]);

  return (
    <div className="relative h-full w-full">
      <div className="grid grid-cols-[auto_repeat(7,1fr)] h-full w-full">
        {/* Day headers (sticky) */}
        <div className="col-start-1 col-end-2 border-r sticky top-0 bg-white z-20">
          <div className="h-20 border-b flex items-center justify-center gap-1">
             <Button variant="ghost" size="icon" onClick={() => onWeekChange('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
             <Button variant="ghost" size="icon" onClick={() => onWeekChange('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {weekDays.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const isWorkingSunday = eventsByDay[dayKey]?.some(e => (e as any).falaq_event_type === 'working_sunday');
          const isSunday = getDay(day) === 0;
          const isFalaqLeave = eventsByDay[dayKey]?.some(e => (e as any).falaq_event_type === 'leave');
          
          return (
          <div 
            key={`header-${day.toString()}`} 
            className={cn(
                "sticky top-0 bg-white z-20 text-center py-2 border-b border-r cursor-pointer", 
                dayIndex === 6 && 'border-r-0',
                activeCalendar === 'falaq_calendar' && isFalaqLeave ? 'bg-red-50' : '',
                isSunday && !isWorkingSunday ? 'bg-red-50' : '',
                isToday(day) && !isSameDay(day, selectedDate) && 'bg-blue-50 dark:bg-blue-900/20',
                isSameDay(day, selectedDate) && 'bg-blue-100 dark:bg-blue-900/40'
            )}
            onClick={() => onDateSelect(day)}
          >
            <p className={cn("text-sm", isToday(day) && !isSameDay(day, selectedDate) ? 'text-primary' : 'text-muted-foreground', isSameDay(day, selectedDate) && 'text-primary font-bold')}>{format(day, 'EEE')}</p>
            <p className={cn("text-2xl font-semibold", isToday(day) && !isSameDay(day, selectedDate) && 'text-primary', isSameDay(day, selectedDate) && 'text-primary')}>{format(day, 'd')}</p>
          </div>
        )})}
        
        {/* Time column */}
        <div className="col-start-1 col-end-2 border-r">
          {hours.map(hour => (
            <div key={hour} className="h-20 text-right pr-2 pt-1 border-b">
              {hour > 0 && <span className="text-sm text-muted-foreground">{format(setHours(new Date(), hour), 'ha')}</span>}
            </div>
          ))}
        </div>
        
        {/* Day columns */}
        {weekDays.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const isWorkingSunday = eventsByDay[dayKey]?.some(e => (e as any).falaq_event_type === 'working_sunday');
          const isSunday = getDay(day) === 0;
          const isFalaqLeave = eventsByDay[dayKey]?.some(e => (e as any).falaq_event_type === 'leave');

          return (
          <div key={day.toString()} className={cn(
            "relative border-r", 
            dayIndex === 6 && 'border-r-0',
            activeCalendar === 'falaq_calendar' && isFalaqLeave ? 'bg-red-50' : '',
            isSunday && !isWorkingSunday ? 'bg-red-50' : '',
            isToday(day) && !isSameDay(day, selectedDate) && 'bg-blue-50 dark:bg-blue-900/20',
            isSameDay(day, selectedDate) && 'bg-blue-100 dark:bg-blue-900/40'
          )}>
            {/* Grid lines */}
            <div className="absolute top-0 left-0 w-full h-full">
              {hours.map(hour => (
                <div key={`grid-${hour}`} className="h-20 border-b cursor-pointer" onClick={() => onDateSelect(setHours(day, hour))}></div>
              ))}
            </div>

            {/* Events */}
            <div className="relative h-full p-1 space-y-1 pointer-events-none">
               {eventsByDay[format(day, 'yyyy-MM-dd')].map(event => {
                  const eventHour = new Date(event.date).getUTCHours();
                  const topPosition = eventHour * 5; // 5rem per hour (h-20)
                  const isEventFalaqLeave = (event as any).falaq_event_type === 'leave';
                  
                  return (
                      <div
                          key={event.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
                          className={cn(
                              'absolute w-[95%] p-2 rounded-lg text-sm cursor-pointer z-10 pointer-events-auto', 
                              (activeCalendar === 'falaq_calendar' && isEventFalaqLeave) ? typeColorMap['leave'] : typeColorMap[event.type] || 'bg-gray-100'
                          )}
                          style={{ top: `${topPosition}rem`}}
                      >
                          <p className="font-semibold truncate">{event.name}</p>
                          <p className="text-xs truncate">{event.description}</p>
                      </div>
                  );
               })}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
