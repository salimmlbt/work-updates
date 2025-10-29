
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
  holiday: 'bg-purple-100 text-purple-800',
  weekend: 'bg-red-100 text-red-800',
  task: 'bg-yellow-100 text-yellow-800',
  project: 'bg-green-100 text-green-800',
  personal: 'bg-pink-100 text-pink-800',
};

function DayContent({ date, events, onEventClick, activeCalendar, selectedDate }: DayContentProps & { events: CalendarEvent[]; onEventClick: (event: CalendarEvent, target: HTMLElement) => void; activeCalendar: string; selectedDate: Date | null }) {
  const dayEvents = useMemo(() => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  }, [date, events]);
  
  const dayNumber = format(date, 'd');
  const isSelected = selectedDate && isSameDay(date, selectedDate);
  const isWeekendDay = getDay(date) === 0;

  const isMarkedAsWeekend = dayEvents.some(e => e.type === 'weekend');
  const isHoliday = dayEvents.some(e => (e as any).type === 'public');


  return (
    <div className={cn("flex flex-col h-full w-full p-2", isHoliday ? "bg-red-50" : (isWeekendDay && "bg-gray-50/50"), isMarkedAsWeekend && "bg-red-100")}>
      <span className={cn("self-start", isToday(date) && 'text-primary font-bold', isSelected && 'bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center')}>{dayNumber}</span>
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
        {dayEvents.slice(0, 3).map((event, index) => {
           const isFalaqHoliday = (event as any).falaq_event_type === 'holiday';
          return (
            <div
              key={`${event.id}-${index}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent DayPicker from selecting the date
                onEventClick(event, e.currentTarget);
              }}
              className={cn(
                'text-xs p-1 rounded-sm truncate cursor-pointer', 
                isFalaqHoliday ? typeColorMap['holiday'] : typeColorMap[event.type] || 'bg-gray-100'
              )}
              title={event.name}
            >
              {event.name}
            </div>
        )})}
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
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
}

export default function MonthView({ date, events, onEventClick, activeCalendar, onDateSelect, selectedDate }: MonthViewProps) {
  return (
    <Calendar
      month={date}
      mode="single"
      selected={selectedDate || undefined}
      onSelect={(day) => day && onDateSelect(day)}
      className="p-0 h-full flex flex-col"
      classNames={{
        months: "flex-1 flex flex-col",
        month: "flex-1 flex flex-col",
        table: 'w-full h-full border-collapse flex flex-col',
        head_row: "flex",
        head_cell: "flex-1",
        body: "flex-1 grid grid-cols-7 grid-rows-6",
        row: "flex-1 grid grid-cols-7 contents-start",
        cell: cn('p-0 align-top relative flex flex-col border', 
           '[&:has(.rdp-day_today)]:bg-blue-50 dark:[&:has(.rdp-day_today)]:bg-blue-900/20'
        ),
        day: 'w-full h-full flex',
        day_selected: 'bg-blue-100 dark:bg-blue-900/30',
      }}
      components={{
        DayContent: (props) => <DayContent {...props} events={events} onEventClick={onEventClick} activeCalendar={activeCalendar} selectedDate={selectedDate} />,
      }}
      onDayClick={(day, modifiers) => {
        if (modifiers.disabled) return;
        onDateSelect(day);
      }}
    />
  );
}
