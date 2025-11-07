
'use client'

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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
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

interface MonthlyAttendance {
    date: string;
    check_in: string | null;
    check_out: string | null;
    lunch_in: string | null;
    lunch_out: string | null;
    total_hours: number;
}

interface AttendanceDetailClientProps {
  user: Profile;
  monthlyAttendance: MonthlyAttendance[];
  selectedDate: string;
  prevMonth: string;
  nextMonth: string;
  allDaysCount: number;
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

export default function AttendanceDetailClient({
  user,
  monthlyAttendance: initialMonthlyAttendance,
  selectedDate,
  prevMonth,
  nextMonth,
  allDaysCount,
}: AttendanceDetailClientProps) {

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

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <header className="mb-8">
        <Link href="/attendance" className="text-sm text-primary hover:underline flex items-center gap-1 mb-4">
            <ChevronLeft className="h-4 w-4" />
            Back to Attendance
        </Link>
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
                <Button variant="outline" asChild>
                    <Link href={`/attendance/${user.id}?month=${prevMonth}`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <span className="text-lg font-semibold w-32 text-center">{format(parseISO(selectedDate), 'MMMM yyyy')}</span>
                <Button variant="outline" asChild>
                    <Link href={`/attendance/${user.id}?month=${nextMonth}`}>
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
      </header>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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


      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Lunch Out</TableHead>
              <TableHead>Lunch In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyAttendance.map((item) => (
              <TableRow key={item.date} className={!item.check_in ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                <TableCell>
                  <div className="font-medium">{format(parseISO(item.date), 'dd MMMM, yyyy')}</div>
                  <div className="text-sm text-muted-foreground">{format(parseISO(item.date), 'EEEE')}</div>
                </TableCell>
                <TableCell><TimeDisplay time={item.check_in} /></TableCell>
                <TableCell><TimeDisplay time={item.lunch_out} /></TableCell>
                <TableCell><TimeDisplay time={item.lunch_in} /></TableCell>
                <TableCell><TimeDisplay time={item.check_out} /></TableCell>
                <TableCell>{formatHours(item.total_hours)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
