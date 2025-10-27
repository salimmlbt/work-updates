
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  Plane,
} from 'lucide-react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import type { OfficialHoliday } from '@/lib/types';
import { AddHolidayDialog } from './add-holiday-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import WeekView from './week-view';
import MonthView from './month-view';
import DayView from './day-view';
import { EventPopover } from './event-popover';
import { deleteHoliday } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  id: string | number;
  name: string;
  date: string;
  type: string;
  description: string | null;
  user_id?: string | null;
}

type EventSources = {
    my_calendar: CalendarEvent[],
    falaq_calendar: CalendarEvent[],
    holidays: CalendarEvent[],
}

interface CalendarClientProps {
  eventSources: EventSources;
  initialMonth: string;
  currentUserId?: string | null;
}

const calendarViews = [
    { id: 'my_calendar', label: 'My calendar', icon: User },
    { id: 'falaq_calendar', label: 'Falaq calendar', icon: Building },
    { id: 'holidays', label: 'Holidays', icon: Plane },
]

export default function CalendarClient({
  eventSources,
  initialMonth,
  currentUserId,
}: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const initialView = searchParams.get('view') || 'week';
  const [view, setView] = useState<'day' | 'week' | 'month'>(initialView as any);

  const initialCalendar = searchParams.get('calendar') || 'my_calendar';
  const [activeCalendar, setActiveCalendar] = useState<keyof EventSources>(initialCalendar as keyof EventSources);
  
  const [isAddEventOpen, setAddEventOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'holiday' | 'event'>('holiday');

  const [allEvents, setAllEvents] = useState(eventSources[activeCalendar]);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [mainHeight, setMainHeight] = useState('100vh');
  
  useEffect(() => {
    if (initialMonth) {
      setCurrentDate(parse(initialMonth, 'yyyy-MM', new Date()));
    }
  }, [initialMonth]);

  useEffect(() => {
    setAllEvents(eventSources[activeCalendar]);
  }, [activeCalendar, eventSources]);

  useEffect(() => {
    const updateHeight = () => {
      const header = document.getElementById('calendar-header');
      const headerHeight = header ? header.offsetHeight : 0;
      setMainHeight(`calc(100vh - ${headerHeight}px)`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleDateChange = (date: Date | undefined) => {
    if (!date || !currentDate) return;
    const newMonth = format(date, 'yyyy-MM');
    const oldMonth = format(currentDate, 'yyyy-MM');
    setCurrentDate(date);
    if (newMonth !== oldMonth) {
      router.push(`/calendar?month=${newMonth}&view=${view}&calendar=${activeCalendar}`);
    }
  };
  
  const handleCalendarChange = (newCalendar: keyof EventSources) => {
    if (!currentDate) return;
    setActiveCalendar(newCalendar);
    router.push(`/calendar?month=${format(currentDate, 'yyyy-MM')}&view=${view}&calendar=${newCalendar}`);
  };

  const handleViewChange = (newView: 'day' | 'week' | 'month') => {
    if (!currentDate) return;
    setView(newView);
    router.push(`/calendar?month=${format(currentDate, 'yyyy-MM')}&view=${newView}&calendar=${activeCalendar}`);
  };

  const openAddDialog = (type: 'holiday' | 'event') => {
    setDialogType(type);
    setAddEventOpen(true);
  };

  const onEventAdded = (newEvent: OfficialHoliday) => {
    const fullEvent: CalendarEvent = {
      ...newEvent,
      id: `official-${newEvent.id}`,
      type: newEvent.user_id ? 'personal' : 'official',
    };
    setAllEvents((prev) => [...prev, fullEvent]);
  };

  const handleEventClick = (event: CalendarEvent, eventTarget: HTMLElement) => {
    const rect = eventTarget.getBoundingClientRect();
    const sheet = document.querySelector('[data-radix-dialog-content]');
    const sheetRect = sheet?.getBoundingClientRect() || { top: 0, left: 0 };

    let top = rect.top - sheetRect.top + rect.height / 2;
    let left = rect.left - sheetRect.left + rect.width + 10;

    setSelectedEvent(event);
    setPopoverPosition({ top, left });
  };

  const closePopover = () => setSelectedEvent(null);

  const handleDelete = (eventId: string | number) => {
    startTransition(async () => {
      const numericId = typeof eventId === 'string' ? parseInt(eventId.split('-')[1]) : eventId;
      if (isNaN(numericId)) return;

      const { error } = await deleteHoliday(numericId);
      if (error) {
        toast({
          title: 'Error deleting event',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Event deleted' });
        setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
        closePopover();
      }
    });
  };

  const renderView = () => {
    if (!currentDate) return null;
    switch (view) {
      case 'day':
        return (
          <DayView date={currentDate} events={allEvents} onEventClick={handleEventClick} />
        );
      case 'week':
        return (
          <WeekView date={currentDate} events={allEvents} onEventClick={handleEventClick} />
        );
      case 'month':
      default:
        return (
          <MonthView date={currentDate} events={allEvents} onEventClick={handleEventClick} />
        );
    }
  };

  if (!currentDate) {
    return <div className="flex h-full w-full items-center justify-center">Loading...</div>;
  }
  
  const ActiveCalendarIcon = calendarViews.find(v => v.id === activeCalendar)?.icon || User;
  const activeCalendarLabel = calendarViews.find(v => v.id === activeCalendar)?.label;

  return (
    <div className="flex h-screen flex-col bg-white">
      <header
        id="calendar-header"
        className="sticky top-0 z-30 flex flex-col items-center justify-between gap-4 border-b bg-white p-4 pb-4 shadow-sm sm:flex-row sm:p-6 lg:p-8"
      >
        <div className="flex flex-shrink-0 items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                    <div className="flex items-center gap-2">
                        <ActiveCalendarIcon className="h-4 w-4" />
                        {activeCalendarLabel}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
                {calendarViews.map(calendar => (
                    <DropdownMenuItem key={calendar.id} onSelect={() => handleCalendarChange(calendar.id as keyof EventSources)} className={cn(activeCalendar === calendar.id && "bg-accent")}>
                        <calendar.icon className="mr-2 h-4 w-4" />
                        {calendar.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
           </DropdownMenu>

          <Button variant="outline" size="icon" onClick={() => handleDateChange(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-48 justify-center whitespace-nowrap text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                month={currentDate}
                onMonthChange={(month) => month && handleDateChange(month)}
                selected={currentDate}
                onSelect={(date) => date && handleDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={() => handleDateChange(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={() => handleDateChange(new Date())}>
            Today
          </Button>
        </div>

        <div className="flex flex-shrink-0 items-center gap-4">
          <div className="flex items-center rounded-md bg-muted p-1">
            <Button
              variant={view === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('day')}
              className="rounded-sm"
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('week')}
              className="rounded-sm"
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('month')}
              className="rounded-sm"
            >
              Month
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => openAddDialog('event')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>
      </header>

      <main
        className="relative flex-1 overflow-auto"
        style={{ height: mainHeight }}
      >
        {renderView()}
        {selectedEvent && (
          <EventPopover
            event={selectedEvent}
            position={popoverPosition}
            onClose={closePopover}
            onDelete={handleDelete}
            isPending={isPending}
          />
        )}
      </main>

      <AddHolidayDialog
        isOpen={isAddEventOpen}
        setIsOpen={setAddEventOpen}
        onEventAdded={onEventAdded}
        userId={dialogType === 'event' ? currentUserId : null}
        dialogType={dialogType}
      />
    </div>
  );
}
