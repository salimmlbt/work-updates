
'use client'

import { Calendar } from '@/components/ui/calendar';
import type { DayContentProps } from 'react-day-picker';
import { format, isSameDay, getMonth, isToday } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo, useRef, useLayoutEffect } from 'react';

const typeColorMap: { [key: string]: { bg: string; border: string } } = {
    public: { bg: 'bg-blue-100', border: 'border-blue-500' },
    official: { bg: 'bg-purple-100', border: 'border-purple-500' },
    leave: { bg: 'bg-red-100', border: 'border-red-500' },
    working_sunday: { bg: 'bg-green-100', border: 'border-green-500' },
    task: { bg: 'bg-yellow-100', border: 'border-yellow-500' },
    project: { bg: 'bg-green-100', border: 'border-green-500' },
    personal: { bg: 'bg-pink-100', border: 'border-pink-500' },
    special_day: { bg: 'bg-purple-100', border: 'border-purple-500' },
};


function DayContent({
  date,
  displayMonth,
  events,
  onEventClick,
  activeCalendar,
  selectedDate,
}: DayContentProps & {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  activeCalendar: string;
  selectedDate: Date | null;
}) {
  const dayEvents = useMemo(() => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  }, [date, events]);
  
  const isOutside = getMonth(date) !== getMonth(displayMonth);

  const dayNumber = format(date, 'd');
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  const { visibleEvents, overflowCount } = useMemo(() => {
    if (!containerRef.current || !eventsRef.current || dayEvents.length === 0) {
      return { visibleEvents: dayEvents, overflowCount: 0 };
    }
    
    // Simple calculation assuming a fixed height for event items
    const eventItemHeight = 22; // approx height of one event badge
    const containerHeight = containerRef.current.offsetHeight;
    const dayNumberHeight = 24; // approx height of the day number
    const availableHeight = containerHeight - dayNumberHeight;
    const maxVisibleEvents = Math.floor(availableHeight / eventItemHeight);

    if (dayEvents.length > maxVisibleEvents) {
      return {
        visibleEvents: dayEvents.slice(0, maxVisibleEvents -1),
        overflowCount: dayEvents.length - (maxVisibleEvents -1),
      };
    }
    
    return { visibleEvents: dayEvents, overflowCount: 0 };
  }, [dayEvents]);


  return (
     <div ref={containerRef} className={cn("relative flex flex-col h-full p-2 overflow-hidden", isOutside && "opacity-50")}>
      <span
        className={cn(
          'self-start mb-1 h-6 w-6 flex items-center justify-center',
          isToday(date) && 'text-primary font-bold',
          isSelected &&
            'bg-primary text-primary-foreground rounded-full'
        )}
      >
        {dayNumber}
      </span>

      <div ref={eventsRef} className="flex-1 overflow-hidden space-y-1">
        {visibleEvents.map((event, index) => {
          const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || 'official';
          const color = typeColorMap[eventType] || { bg: 'bg-gray-100', border: 'border-gray-500' };
          return (
            <div
              key={`${event.id}-${index}`}
              onClick={(e) => {
                e.stopPropagation(); 
                onEventClick(event, e.currentTarget);
              }}
              className={cn(
                'text-xs p-1 rounded-sm truncate cursor-pointer border-l-4',
                color.bg,
                color.border,
                isOutside && 'opacity-50'
              )}
              title={event.name}
            >
              {event.name}
            </div>
          );
        })}
        {overflowCount > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            + {overflowCount} more
          </div>
        )}
      </div>
    </div>
  );
}

interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, target: HTMLElement) => void;
  activeCalendar: string;
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
}

export default function MonthView({
  date,
  events,
  onEventClick,
  activeCalendar,
  onDateSelect,
  selectedDate,
}: MonthViewProps) {
  return (
    <Calendar
      month={date}
      mode="single"
      selected={selectedDate || undefined}
      onSelect={(day) => day && onDateSelect(day)}
      className="p-0 h-full flex flex-col"
      classNames={{
        months: 'flex-1 flex flex-col',
        month: 'flex-1 flex flex-col',
        caption_label: 'text-lg font-medium',
        nav: 'hidden',
        table: 'w-full h-full border-collapse flex-1 flex flex-col table-fixed',
        head_row: 'flex',
        head_cell: 'flex-1 p-2 text-center text-sm font-medium text-muted-foreground',
        body: 'flex-1 grid grid-cols-7 grid-rows-5',
        row: 'flex-1 grid grid-cols-7 contents-start border-t',
        cell: cn(
          'h-full p-0 align-top relative flex flex-col border-r',
          'last:border-r-0'
        ),
        day: 'w-full h-full flex',
        day_selected: '',
        day_today: '',
        day_outside: 'text-muted-foreground',
      }}
      components={{
        DayContent: (props) => (
          <DayContent
            {...props}
            events={events}
            onEventClick={onEventClick}
            activeCalendar={activeCalendar}
            selectedDate={selectedDate}
          />
        ),
      }}
      onDayClick={(day, modifiers) => {
        if (modifiers.disabled) return;
        onDateSelect(day);
      }}
    />
  );
}
