'use client'

import { useState, useMemo, useTransition, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import type { OfficialHoliday } from '@/lib/types';
import { AddHolidayDialog } from './add-holiday-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteHoliday } from '@/app/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

interface CalendarClientProps {
    publicHolidays: PublicHoliday[];
    officialHolidays: OfficialHoliday[];
    daysInMonth: {
        date: string;
        isCurrentMonth: boolean;
    }[];
    selectedDate: string;
    prevMonth: string;
    nextMonth: string;
}

const typeColorMap = {
    public: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500',
    official: 'bg-purple-100 text-purple-800 border-l-4 border-purple-500',
}

export default function CalendarClient({ 
    publicHolidays: initialPublicHolidays, 
    officialHolidays: initialOfficialHolidays,
    daysInMonth,
    selectedDate,
    prevMonth,
    nextMonth
}: CalendarClientProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(() => parseISO(selectedDate));
    const [isAddHolidayOpen, setAddHolidayOpen] = useState(false);
    const [publicHolidays, setPublicHolidays] = useState(initialPublicHolidays);
    const [officialHolidays, setOfficialHolidays] = useState(initialOfficialHolidays);
    const [holidayToDelete, setHolidayToDelete] = useState<OfficialHoliday | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const allHolidaysByDate = useMemo(() => {
      const holidays = new Map<string, Array<{ name: string; type: 'public' | 'official'; id?: number, description: string | null }>>();
      
      const addHolidayToMap = (dateStr: string, holiday: { name: string; type: 'public' | 'official'; id?: number, description: string | null }) => {
          const day = format(parseISO(dateStr), 'yyyy-MM-dd');
          if (!holidays.has(day)) {
              holidays.set(day, []);
          }
          holidays.get(day)?.push(holiday);
      }

      publicHolidays.forEach(h => {
          addHolidayToMap(h.date, { name: h.localName, type: 'public', description: h.name });
      });
      
      officialHolidays.forEach(h => {
          addHolidayToMap(h.date, { name: h.name, type: 'official', id: h.id, description: h.description });
      });
      
      return holidays;
  }, [publicHolidays, officialHolidays]);

    const onHolidayAdded = (newHoliday: OfficialHoliday) => {
        setOfficialHolidays(prev => [...prev, newHoliday]);
    }
    
    const handleDeleteHoliday = () => {
        if (!holidayToDelete) return;

        startTransition(async () => {
            const { error } = await deleteHoliday(holidayToDelete.id);
            if (error) {
                toast({ title: 'Error deleting holiday', description: error, variant: 'destructive' });
            } else {
                toast({ title: 'Holiday deleted' });
                setOfficialHolidays(prev => prev.filter(h => h.id !== holidayToDelete.id));
            }
            setHolidayToDelete(null);
        });
    }

    const handleMonthChange = (month: Date) => {
        setCurrentDate(month);
        router.push(`/calendar?month=${format(month, 'yyyy-MM')}`);
    }

    return (
        <div className="p-4 md:p-8 lg:p-10 h-full flex flex-col">
            <header className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleMonthChange(parseISO(prevMonth))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="text-lg font-semibold w-48 justify-between">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(currentDate, 'MMMM yyyy')}
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <Calendar
                              mode="single"
                              month={currentDate}
                              onMonthChange={(month) => month && handleMonthChange(month)}
                              initialFocus
                              className="p-0"
                          />
                      </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="icon" onClick={() => handleMonthChange(parseISO(nextMonth))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
               </div>
                <Button onClick={() => setAddHolidayOpen(true)}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Create Event
                </Button>
            </header>

            <ScrollArea className="flex-1 -mx-8">
                <div className="flex px-8">
                    {daysInMonth.map(({ date, isCurrentMonth }) => {
                        const dayDate = parseISO(date);
                        const dayKey = format(dayDate, 'yyyy-MM-dd');
                        const events = allHolidaysByDate.get(dayKey) || [];

                        return (
                            <div key={dayKey} className={cn("w-64 flex-shrink-0 border-r last:border-r-0", !isCurrentMonth && 'opacity-50 bg-muted/30')}>
                                <div className={cn("text-center py-2 border-b font-semibold sticky top-0 bg-background/80 backdrop-blur-sm z-10", isToday(dayDate) && "text-primary")}>
                                    <p className="text-sm">{format(dayDate, 'EEE')}</p>
                                    <p className="text-2xl">{format(dayDate, 'd')}</p>
                                </div>
                                <div className="p-2 space-y-2 h-full">
                                    {events.map((event, index) => (
                                        <div key={index} className={cn("p-3 rounded-lg shadow-sm text-sm", typeColorMap[event.type])}>
                                            <p className="font-semibold">{event.name}</p>
                                            {event.description && event.description !== event.name && <p className="text-xs">{event.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
           
            <AddHolidayDialog 
                isOpen={isAddHolidayOpen}
                setIsOpen={setAddHolidayOpen}
                onHolidayAdded={onHolidayAdded}
            />
            <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the holiday "{holidayToDelete?.name}".
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteHoliday} disabled={isPending}>
                        {isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}