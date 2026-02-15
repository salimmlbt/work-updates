
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Profile } from '@/lib/types';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Attendance } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthlyAttendance {
    date: string;
    check_in: string | null;
    check_out: string | null;
    lunch_in: string | null;
    lunch_out: string | null;
    total_hours: number;
    extra_hours: number;
    check_in_reason: string | null;
}

interface AttendanceDetailClientProps {
  user: Profile;
  monthlyAttendance: MonthlyAttendance[];
  selectedDate: string;
  prevMonth: string;
  nextMonth: string;
  allDaysCount: number;
  isEditor: boolean;
}

function TimeDisplay({ time }: { time: string | null }) {
  const [formattedTime, setFormattedTime] = useState('-');

  useEffect(() => {
    if (time) {
      try {
        const localTime = new Date(time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setFormattedTime(localTime);
      } catch (e) {
        setFormattedTime('-');
      }
    } else {
      setFormattedTime('-');
    }
  }, [time]);

  return <>{formattedTime}</>;
}


function formatHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined') return '0.00';
  return hours.toFixed(2);
}

function formatExtraHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined' || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function AttendanceDetailClient({
  user,
  monthlyAttendance: initialMonthlyAttendance,
  selectedDate,
  prevMonth,
  nextMonth,
  allDaysCount,
  isEditor,
}: AttendanceDetailClientProps) {

  const router = useRouter();
  const [monthlyAttendance, setMonthlyAttendance] = useState(initialMonthlyAttendance);

  useEffect(() => {
    setMonthlyAttendance(initialMonthlyAttendance);
  }, [initialMonthlyAttendance]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-attendance-detail-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as Attendance;
          setMonthlyAttendance((prevAttendance) => {
            const updatedAttendance = [...prevAttendance];
            const recordIndex = updatedAttendance.findIndex(
              (day) => day.date === newRecord.date
            );
            if (recordIndex !== -1) {
              updatedAttendance[recordIndex] = {
                date: newRecord.date,
                check_in: newRecord.check_in,
                check_out: newRecord.check_out,
                lunch_in: newRecord.lunch_in,
                lunch_out: newRecord.lunch_out,
                total_hours: newRecord.total_hours || 0,
                extra_hours: updatedAttendance[recordIndex].extra_hours, // This won't be live updated
                check_in_reason: newRecord.check_in_reason || null,
              };
            }
            return updatedAttendance;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);


  const totalHours = monthlyAttendance.reduce((sum, day) => sum + (day.total_hours || 0), 0);
  const totalDaysPresent = monthlyAttendance.filter(day => day.check_in).length;
  const totalExtraHours = monthlyAttendance.reduce((sum, day) => sum + (day.extra_hours || 0), 0);

  const handleNavClick = (href: string) => {
    router.push(href);
  };


  return (
    <div className="p-4 md:p-8 lg:p-10">
      <TooltipProvider>
      <header className="mb-8">
        <Button variant="link" className="p-0 text-sm text-primary hover:underline flex items-center gap-1 mb-4" onClick={() => handleNavClick('/attendance')}>
            <ChevronLeft className="h-4 w-4" />
            Back to Attendance
        </Button>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? ''} />
                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{user.full_name}</h1>
                    <p className="text-muted-foreground">Monthly Attendance Report</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => handleNavClick(`/attendance/${user.id}?month=${prevMonth}`)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-32 text-center">{format(parseISO(selectedDate), 'MMMM yyyy')}</span>
                <Button variant="outline" onClick={() => handleNavClick(`/attendance/${user.id}?month=${nextMonth}`)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </header>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Working Hours</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Extra Hours</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{formatExtraHours(totalExtraHours)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Days Present</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{totalDaysPresent}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Days Absent</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{allDaysCount - totalDaysPresent}</p>
                </CardContent>
            </Card>
        </div>


      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[200px]">Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Lunch Out</TableHead>
              <TableHead>Lunch In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Extra Time</TableHead>
              {isEditor && <TableHead className="w-[150px]">Note</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyAttendance.map((item) => (
              <TableRow key={item.date} className={!item.check_in ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{format(parseISO(item.date), 'dd MMM, yyyy')}</div>
                  <div className="text-xs text-muted-foreground">{format(parseISO(item.date), 'EEEE')}</div>
                </TableCell>
                <TableCell className="text-slate-700"><TimeDisplay time={item.check_in} /></TableCell>
                <TableCell className="text-slate-700"><TimeDisplay time={item.lunch_out} /></TableCell>
                <TableCell className="text-slate-700"><TimeDisplay time={item.lunch_in} /></TableCell>
                <TableCell className="text-slate-700"><TimeDisplay time={item.check_out} /></TableCell>
                <TableCell className="font-medium">{formatHours(item.total_hours)}</TableCell>
                <TableCell className="font-bold text-sky-700">{formatExtraHours(item.extra_hours)}</TableCell>
                {isEditor && (
                  <TableCell>
                    {item.check_in_reason ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium cursor-help">
                            <MessageSquare className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{item.check_in_reason}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-white border-slate-200 shadow-xl p-3 rounded-xl max-w-[250px]">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Late Reason</p>
                          <p className="text-sm text-slate-700 font-medium italic">"{item.check_in_reason}"</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </TooltipProvider>
    </div>
  );
}
