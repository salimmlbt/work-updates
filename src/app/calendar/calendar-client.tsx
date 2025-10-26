'use client'

import { useState, useMemo, useTransition, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, parseISO, startOfDay, getDay } from 'date-fns';
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
import { CalendarDay } from './calendar-day';
import { cn } from '@/lib/utils';

interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

interface CalendarClientProps {
    publicHolidays: PublicHoliday[];
    officialHolidays: OfficialHoliday[];
    selectedDate: string;
}

export default function CalendarClient({ 
    publicHolidays: initialPublicHolidays, 
    officialHolidays: initialOfficialHolidays,
    selectedDate,
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
          const day = startOfDay(parseISO(dateStr)).toISOString();
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
               <div className="flex items-center gap-4">
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
                              onMonthChange={handleMonthChange}
                              initialFocus
                              className="p-0"
                              classNames={{
                                  caption_label: "hidden",
                                  head_row: 'hidden',
                                  row: 'flex w-full mt-2',
                                  cell: 'w-10 h-10 text-center text-sm p-0 relative',
                                  day: 'w-10 h-10 p-0',
                              }}
                              components={{
                                Day: () => <Fragment />,
                                Month: (props) => {
                                  const { ...monthProps } = props;
                                  return (
                                    <div className="grid grid-cols-4 gap-2 p-2">
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <Button
                                                key={i}
                                                variant={currentDate.getMonth() === i ? 'default' : 'ghost'}
                                                onClick={() => handleMonthChange(new Date(currentDate.getFullYear(), i, 1))}
                                            >
                                                {format(new Date(currentDate.getFullYear(), i, 1), 'MMM')}
                                            </Button>
                                        ))}
                                    </div>
                                  )
                                }
                              }}
                          />
                      </PopoverContent>
                  </Popover>
               </div>
                <Button onClick={() => setAddHolidayOpen(true)}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Create Event
                </Button>
            </header>

            <main className="flex-1">
                <Calendar
                    month={currentDate}
                    onMonthChange={handleMonthChange}
                    className="h-full"
                    classNames={{
                        months: 'h-full',
                        month: 'h-full flex flex-col',
                        table: 'w-full h-full border-collapse',
                        head_row: 'flex',
                        head_cell: 'text-muted-foreground font-normal text-sm p-2 w-[14.28%] text-center border',
                        row: 'flex w-full h-[16.66%]',
                        cell: 'p-2 border relative w-[14.28%]',
                        day: 'h-full w-full',
                        day_today: 'bg-transparent',
                        day_outside: 'text-muted-foreground opacity-50',
                    }}
                    components={{
                        DayContent: (props) => (
                            <CalendarDay {...props} holidays={allHolidaysByDate.get(startOfDay(props.date).toISOString()) || []} />
                        )
                    }}
                />
            </main>
           
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
