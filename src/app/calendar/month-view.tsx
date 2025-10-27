
'use client'

import { Calendar } from '@/components/ui/calendar';
import type { DayContentProps } from 'react-day-picker';
import { format, isSameDay, getDay } from 'date-fns';
import { type CalendarEvent } from './calendar-client';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const typeColorMap: { [key: string]: string } = {
  public: 'bg-blue-100 text-blue-800',
  official: 'bg-purple-100 text-purple-800',
  weekend: 'bg-gray-200 text-gray-700',
  task: 'bg-yellow-100 text-yellow-800',
  project: 'bg-green-100 text-green-800',
  personal: 'bg-pink-100 text-pink-800',
};

function DayContent({ date, events, onEventClick, activeCalendar }: DayContentProps & { events: CalendarEvent[]; onEventClick: (event: CalendarEvent, target: HTMLElement) => void; activeCalendar: string; }) {
  const dayEvents = useMemo(() => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  }, [date, events]);
  
  const dayNumber = format(date, 'd');
  const isSunday = getDay(date) === 0;

  return (
    <div className={cn("flex flex-col h-full w-full", activeCalendar === 'falaq_calendar' && isSunday && 'bg-red-50')}>
      <span className="self-start">{dayNumber}</span>
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
        {dayEvents.slice(0, 3).map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent DayPicker from selecting the date
              onEventClick(event, e.currentTarget);
            }}
            className={cn('text-xs p-1 rounded-sm truncate cursor-pointer', typeColorMap[event.type] || 'bg-gray-100')}
            title={event.name}
          >
            {event.name}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-xs text-muted-foreground">+ {dayEvents.length - 3} more</div>
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
}

export default function MonthView({ date, events, onEventClick, activeCalendar }: MonthViewProps) {
  return (
    <Calendar
      month={date}
      mode="single"
      className="p-0 h-full flex flex-col"
      classNames={{
        months: "flex-1 flex flex-col",
        month: "flex-1 flex flex-col",
        table: 'w-full h-full border-collapse flex flex-col',
        head_row: "flex",
        head_cell: "flex-1",
        body: "flex-1 grid grid-cols-7 grid-rows-6",
        row: "flex-1 grid grid-cols-7 contents-start",
        cell: 'p-0 align-top relative flex flex-col border',
        day: 'w-full h-full p-2 flex',
      }}
      components={{
        DayContent: (props) => <DayContent {...props} events={events} onEventClick={onEventClick} activeCalendar={activeCalendar} />,
      }}
      // To prevent date selection when clicking on a day cell
      onDayClick={(day, modifiers) => {
        if (modifiers.disabled) return;
        // Do nothing to prevent selection
      }}
    />
  );
}
