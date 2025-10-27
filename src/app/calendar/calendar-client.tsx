
'use client'

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Briefcase, User, Flag, CheckSquare } from 'lucide-react';
import { format, parse, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import type { OfficialHoliday } from '@/lib/types';
import { AddHolidayDialog } from './add-holiday-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import WeekView from './week-view';
import MonthView from './month-view';
import DayView from './day-view';
import { EventPopover } from './event-popover';
import { deleteHoliday } from '../actions';
import { useToast } from '@/hooks/use-toast';

export interface CalendarEvent {
  id: string | number;
  name: string;
  date: string;
  type: string;
  description: string | null;
  user_id?: string | null;
}

interface CalendarClientProps {
  events: CalendarEvent[];
  initialMonth: string;
  currentUserId?: string | null;
}

export default function CalendarClient({
  events,
  initialMonth,
  currentUserId,
}: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  
  const initialView = searchParams.get('view') || 'week';
  const [view, setView] = useState<'day' | 'week' | 'month'>(initialView as any);

  const [isAddEventOpen, setAddEventOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'holiday' | 'event'>('holiday');
  const [allEvents, setAllEvents] = useState(events);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (initialMonth) {
      setCurrentDate(parse(initialMonth, 'yyyy-MM', new Date()));
    }
  }, [initialMonth]);

  const handleDateChange = (date: Date | undefined) => {
    if (!date || !currentDate) return;
    const newMonth = format(date, 'yyyy-MM');
    const oldMonth = format(currentDate, 'yyyy-MM');
    setCurrentDate(date);
    if (newMonth !== oldMonth) {
        router.push(`/calendar?month=${newMonth}&view=${view}`);
    }
  };
  
  const handleViewChange = (newView: 'day' | 'week' | 'month') => {
      if (!currentDate) return;
      setView(newView);
      router.push(`/calendar?month=${format(currentDate, 'yyyy-MM')}&view=${newView}`);
  }

  const openAddDialog = (type: 'holiday' | 'event') => {
    setDialogType(type);
    setAddEventOpen(true);
  };
  
  const onEventAdded = (newEvent: OfficialHoliday) => {
    const fullEvent: CalendarEvent = {
        ...newEvent,
        id: `official-${newEvent.id}`,
        type: newEvent.user_id ? 'personal' : 'official'
    };
    setAllEvents(prev => [...prev, fullEvent]);
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
  
  const closePopover = () => {
    setSelectedEvent(null);
  }

  const handleDelete = (eventId: string | number) => {
      startTransition(async () => {
          if (typeof eventId !== 'number') return;
          const { error } = await deleteHoliday(eventId);
          if (error) {
            toast({ title: 'Error deleting event', description: error, variant: 'destructive' });
          } else {
            toast({ title: 'Event deleted' });
            setAllEvents(prev => prev.filter(e => e.id !== eventId));
            closePopover();
          }
      });
  }

  const renderView = () => {
    if (!currentDate) return null;
    switch(view) {
      case 'day':
        return <DayView date={currentDate} events={allEvents} onEventClick={handleEventClick} />;
      case 'week':
        return <WeekView date={currentDate} events={allEvents} onEventClick={handleEventClick} />;
      case 'month':
      default:
        return <MonthView date={currentDate} events={allEvents} onEventClick={handleEventClick} />;
    }
  }
  
  if (!currentDate) {
    return <div className="flex h-full w-full items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row items-center justify-between pb-4 mb-4 border-b gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleDateChange(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-lg font-semibold w-48 justify-center">
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
          <Button variant="outline" onClick={() => handleDateChange(new Date())}>Today</Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md bg-muted p-1">
            <Button variant={view === 'day' ? 'secondary': 'ghost'} size="sm" onClick={() => handleViewChange('day')} className="rounded-sm">Day</Button>
            <Button variant={view === 'week' ? 'secondary': 'ghost'} size="sm" onClick={() => handleViewChange('week')} className="rounded-sm">Week</Button>
            <Button variant={view === 'month' ? 'secondary': 'ghost'} size="sm" onClick={() => handleViewChange('month')} className="rounded-sm">Month</Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => openAddDialog('event')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto relative">
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
