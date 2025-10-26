
'use client'

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
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
    prevMonth: string;
    nextMonth: string;
}

export default function CalendarClient({ 
    publicHolidays: initialPublicHolidays, 
    officialHolidays: initialOfficialHolidays,
    selectedDate,
    prevMonth,
    nextMonth,
}: CalendarClientProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(() => parseISO(selectedDate));
    const [isAddHolidayOpen, setAddHolidayOpen] = useState(false);
    const [publicHolidays, setPublicHolidays] = useState(initialPublicHolidays);
    const [officialHolidays, setOfficialHolidays] = useState(initialOfficialHolidays);
    const [holidayToDelete, setHolidayToDelete] = useState<OfficialHoliday | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const allHolidays = useMemo(() => {
        const holidays = new Map<string, { name: string, type: 'public' | 'official', id?: number }>();
        
        publicHolidays.forEach(h => {
            const day = startOfDay(parseISO(h.date));
            holidays.set(day.toISOString(), { name: h.localName, type: 'public' });
        });
        
        officialHolidays.forEach(h => {
            const day = startOfDay(parseISO(h.date));
            holidays.set(day.toISOString(), { name: h.name, type: 'official', id: h.id });
        });
        
        return holidays;
    }, [publicHolidays, officialHolidays]);

    const sundays = (date: Date) => getDay(date) === 0;
    
    const modifiers = {
        sunday: sundays,
        public: publicHolidays.map(h => startOfDay(parseISO(h.date))),
        official: officialHolidays.map(h => startOfDay(parseISO(h.date))),
    };

    const modifiersClassNames = {
        sunday: 'text-red-500',
        public: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full',
        official: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full',
    };

    const handlePrevMonth = () => {
        router.push(`/calendar?month=${prevMonth}`);
    };

    const handleNextMonth = () => {
        router.push(`/calendar?month=${nextMonth}`);
    };

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

    return (
        <div className="p-4 md:p-8 lg:p-10">
            <header className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-semibold w-32 text-center">
                            {format(currentDate, 'MMMM yyyy')}
                        </span>
                        <Button variant="outline" size="icon" onClick={handleNextMonth}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={() => setAddHolidayOpen(true)}>
                        <Plus className="mr-2 h-4 w-4"/>
                        Add Holiday
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <main className="lg:col-span-2">
                    <Card>
                        <CardContent className="p-0">
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={(date) => date && setCurrentDate(date)}
                                modifiers={modifiers}
                                modifiersClassNames={modifiersClassNames}
                                className="p-4"
                                month={currentDate}
                                onMonthChange={(month) => router.push(`/calendar?month=${format(month, 'yyyy-MM')}`)}
                                components={{
                                    DayContent: ({ date }) => {
                                        const holiday = allHolidays.get(startOfDay(date).toISOString());
                                        return (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <span>{format(date, 'd')}</span>
                                                {holiday && (
                                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full" 
                                                        style={{ backgroundColor: holiday.type === 'public' ? 'hsl(var(--primary))' : 'hsl(var(--success))' }}
                                                    />
                                                )}
                                            </div>
                                        )
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </main>
                <aside>
                    <Card>
                        <CardHeader>
                            <CardTitle>Holidays & Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-4">
                                {Array.from(allHolidays.entries())
                                    .filter(([dateStr]) => parseISO(dateStr).getMonth() === currentDate.getMonth())
                                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                                    .map(([dateStr, holiday]) => (
                                    <div key={dateStr} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-2 h-2 rounded-full", holiday.type === 'public' ? 'bg-blue-500' : 'bg-green-500')} />
                                            <div>
                                                <p className="font-medium">{holiday.name}</p>
                                                <p className="text-sm text-muted-foreground">{format(parseISO(dateStr), 'EEEE, MMMM d')}</p>
                                            </div>
                                        </div>
                                        {holiday.type === 'official' && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600" onClick={() => setHolidayToDelete(officialHolidays.find(h => h.id === holiday.id)!)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
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
