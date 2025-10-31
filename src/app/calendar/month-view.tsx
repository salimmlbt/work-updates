'use client'

import { Calendar } from '@/components/ui/calendar';
import type { DayContentProps } from 'react-day-picker';
import { format, isSameDay, getDay, isToday } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const typeColorMap: { [key: string]: string } = {
  public: 'bg-blue-100 text-blue-800',
  official: 'bg-purple-100 text-purple-800',
  leave: 'bg-red-100 text-red-800',
  working_sunday: 'bg-green-100 text-green-800',
  task: 'bg-yellow-100 text-yellow-800',
  project: 'bg-green-100 text-green-800',
  personal: 'bg-pink-100 text-pink-800',
};

function DayContent({
  date,
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

  const dayNumber = format(date, 'd');
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const isWeekendDay = getDay(date) === 0;

  const isWorkingSunday = dayEvents.some(e => e.falaq_event_type === 'working_sunday');

  return (
    <div
      className={cn(
        'flex flex-col h-full w-full p-2',
        isWeekendDay && !isWorkingSunday ? 'bg-red-50/50' : 'bg-transparent'
      )}
    >
      <span
        className={cn(
          'self-start mb-1',
          isToday(date) && 'text-primary font-bold',
          isSelected &&
            'bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center'
        )}
      >
        {dayNumber}
      </span>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
        {dayEvents.slice(0, 2).map((event, index) => {
          const eventType = (event.falaq_event_type || event.type)?.toLowerCase?.() || '';
          return (
            <div
              key={`${event.id}-${index}`}
              onClick={(e) => {
                e.stopPropagation(); 
                onEventClick(event, e.currentTarget);
              }}
              className={cn(
                'text-xs p-1 rounded-sm truncate cursor-pointer',
                typeColorMap[eventType] || 'bg-gray-100'
              )}
              title={event.name}
            >
              {event.name}
            </div>
          );
        })}
        {dayEvents.length > 2 && (
          <div className="text-xs text-muted-foreground mt-1">
            + {dayEvents.length - 2} more
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
        table: 'w-full h-full border-collapse flex-1 flex flex-col',
        head_row: 'flex',
        head_cell: 'flex-1 p-2 text-center text-sm font-medium text-muted-foreground',
        body: 'flex-1 grid grid-cols-7 grid-rows-5',
        row: 'flex-1 grid grid-cols-7 contents-start border-t',
        cell: cn(
          'p-0 align-top relative flex flex-col border-r',
          'last:border-r-0'
        ),
        day: 'w-full h-full flex',
        day_selected: 'bg-blue-50',
        day_today: 'bg-accent/50',
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
