'use client'

import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Briefcase, User, Flag, CheckSquare } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import type { OfficialHoliday, Task, Project } from '@/lib/types';
import { AddHolidayDialog } from './add-holiday-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

interface CalendarClientProps {
    publicHolidays: PublicHoliday[];
    officialHolidays: OfficialHoliday[];
    myTasks: Task[];
    allProjects: Project[];
    sundays: any[];
    daysInMonth: { date: string; isCurrentMonth: boolean; }[];
    selectedDate: string;
    currentUserId?: string | null;
}

const typeColorMap: { [key: string]: string } = {
  public: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500',
  official: 'bg-purple-100 text-purple-800 border-l-4 border-purple-500',
  weekend: 'bg-gray-100 text-gray-600 border-l-4 border-gray-400',
  task: 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500',
  project: 'bg-green-100 text-green-800 border-l-4 border-green-500',
  personal: 'bg-pink-100 text-pink-800 border-l-4 border-pink-500',
};

const CalendarView = ({ days, events, title }: { days: any[], events: any[], title: string }) => (
    <div className="flex flex-col h-full">
        <div className="flex flex-shrink-0">
             {days.map(({ date, isCurrentMonth }) => {
                const dayDate = parseISO(date);
                return (
                    <div key={`header-${date}`} className={cn("w-64 flex-shrink-0 border-r last:border-r-0", !isCurrentMonth && 'opacity-50 bg-muted/30')}>
                         <div className={cn("text-center py-2 border-b font-semibold", isToday(dayDate) && "text-primary")}>
                            <p className="text-sm">{format(dayDate, 'EEE')}</p>
                            <p className="text-2xl">{format(dayDate, 'd')}</p>
                        </div>
                    </div>
                )
             })}
        </div>
        <ScrollArea className="flex-1">
            <div className="flex h-full">
                {days.map(({ date, isCurrentMonth }) => {
                    const dayDate = parseISO(date);
                    const dayKey = format(dayDate, 'yyyy-MM-dd');
                    const dayEvents = events.filter(e => format(parseISO(e.date), 'yyyy-MM-dd') === dayKey);

                    return (
                        <div key={dayKey} className={cn("w-64 flex-shrink-0 border-r last:border-r-0", !isCurrentMonth && 'opacity-50 bg-muted/30')}>
                            <div className="p-2 space-y-2 h-full">
                                {dayEvents.map((event, index) => (
                                    <div key={index} className={cn("p-3 rounded-lg shadow-sm text-sm", typeColorMap[event.type] || 'bg-gray-100')}>
                                        <div className="font-semibold flex items-center gap-2">
                                            {event.type === 'task' && <CheckSquare className="h-4 w-4" />}
                                            {event.type === 'project' && <Briefcase className="h-4 w-4" />}
                                            {event.type === 'personal' && <User className="h-4 w-4" />}
                                            {(event.type === 'public' || event.type === 'official' || event.type === 'weekend') && <Flag className="h-4 w-4" />}
                                            <span className="truncate">{event.name}</span>
                                        </div>
                                        {event.description && event.description !== event.name && <p className="text-xs mt-1 truncate">{event.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </div>
)


export default function CalendarClient({ 
    publicHolidays: initialPublicHolidays, 
    officialHolidays: initialOfficialHolidays,
    myTasks,
    allProjects,
    sundays,
    daysInMonth,
    selectedDate,
    currentUserId
}: CalendarClientProps) {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(() => parseISO(selectedDate));
    const [isAddEventOpen, setAddEventOpen] = useState(false);
    const [dialogType, setDialogType] = useState<'holiday' | 'event'>('holiday');
    const [officialHolidays, setOfficialHolidays] = useState(initialOfficialHolidays);
    const [activeCalendarView, setActiveCalendarView] = useState('holidays');

    const prevMonth = format(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1), 'yyyy-MM');
    const nextMonth = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1), 'yyyy-MM');

    const holidayEvents = useMemo(() => {
        const publicHolidaysFormatted = initialPublicHolidays.map(h => ({ name: h.localName, date: h.date, type: 'public', description: h.name }));
        const officialHolidaysFormatted = officialHolidays
            .filter(h => !h.user_id)
            .map(h => ({ name: h.name, date: h.date, type: 'official', description: h.description }));
        return [...publicHolidaysFormatted, ...officialHolidaysFormatted];
    }, [initialPublicHolidays, officialHolidays]);

    const myCalendarEvents = useMemo(() => {
        const tasksFormatted = myTasks.map(t => ({ name: t.description, date: t.deadline, type: 'task', description: `Task ID: ${t.id}` }));
        const personalEvents = officialHolidays
            .filter(h => h.user_id === currentUserId)
            .map(h => ({ name: h.name, date: h.date, type: 'personal', description: h.description }));
        return [...tasksFormatted, ...personalEvents];
    }, [myTasks, officialHolidays, currentUserId]);

    const falaqCalendarEvents = useMemo(() => {
        const officialEvents = officialHolidays
            .filter(h => !h.user_id)
            .map(h => ({ name: h.name, date: h.date, type: 'official', description: h.description }));
        const projectsFormatted = allProjects.filter(p => p.due_date).map(p => ({ name: p.name, date: p.due_date!, type: 'project', description: `Project: ${p.name}` }));
        const sundaysFormatted = sundays.map(s => ({ ...s, type: 'weekend' }));
        return [...officialEvents, ...projectsFormatted, ...sundaysFormatted];
    }, [officialHolidays, allProjects, sundays]);

    const onEventAdded = (newEvent: OfficialHoliday) => {
        setOfficialHolidays(prev => [...prev, newEvent]);
    }
    
    const handleMonthChange = (month: Date | undefined) => {
        if (!month) return;
        setCurrentDate(month);
        router.push(`/calendar?month=${format(month, 'yyyy-MM')}`);
    }

    const openAddDialog = (type: 'holiday' | 'event') => {
        setDialogType(type);
        setAddEventOpen(true);
    };

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
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-full bg-muted p-1">
                        <Button
                            variant={activeCalendarView === 'holidays' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveCalendarView('holidays')}
                            className={cn('rounded-full', activeCalendarView === 'holidays' ? 'bg-background shadow' : '')}
                        >
                            Holidays
                        </Button>
                        <Button
                            variant={activeCalendarView === 'my-calendar' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveCalendarView('my-calendar')}
                            className={cn('rounded-full', activeCalendarView === 'my-calendar' ? 'bg-background shadow' : '')}
                        >
                            My Calendar
                        </Button>
                         <Button
                            variant={activeCalendarView === 'falaq-calendar' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveCalendarView('falaq-calendar')}
                            className={cn('rounded-full', activeCalendarView === 'falaq-calendar' ? 'bg-background shadow' : '')}
                        >
                            Falaq Calendar
                        </Button>
                    </div>
                   <div className="flex gap-2">
                     <Button onClick={() => openAddDialog('event')} className={cn(activeCalendarView !== 'my-calendar' && 'hidden')}>
                        <Plus className="mr-2 h-4 w-4"/>
                        Add Event
                    </Button>
                     <Button onClick={() => openAddDialog('holiday')} className={cn(activeCalendarView !== 'falaq-calendar' && 'hidden')}>
                        <Plus className="mr-2 h-4 w-4"/>
                        Create Holiday/Event
                    </Button>
                   </div>
                </div>
            </header>

            <Tabs value={activeCalendarView} onValueChange={setActiveCalendarView} className="flex flex-col flex-1">
                <TabsContent value="holidays" className="mt-0 flex-1 flex flex-col">
                    <CalendarView days={daysInMonth} events={holidayEvents} title="Holidays" />
                </TabsContent>
                <TabsContent value="my-calendar" className="mt-0 flex-1 flex flex-col">
                    <CalendarView days={daysInMonth} events={myCalendarEvents} title="My Calendar" />
                </TabsContent>
                <TabsContent value="falaq-calendar" className="mt-0 flex-1 flex flex-col">
                    <CalendarView days={daysInMonth} events={falaqCalendarEvents} title="Falaq Calendar" />
                </TabsContent>
            </Tabs>
           
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
