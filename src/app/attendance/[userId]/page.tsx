
import { createServerClient } from '@/lib/supabase/server';
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
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = 'force-dynamic';

function formatTime(time: string | null): string {
  if (!time) return '-';
  try {
    return format(parseISO(time), 'hh:mm a');
  } catch (e) {
    return '-';
  }
}

function formatHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined') return '0.00';
  return hours.toFixed(2);
}

export default async function UserAttendancePage({ params, searchParams }: { params: { userId: string }, searchParams: { month?: string } }) {
  const supabase = createServerClient();
  const userId = params.userId;

  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return <p>Error fetching user data: {userError?.message || 'User not found'}</p>;
  }

  const selectedDate = searchParams.month ? new Date(searchParams.month) : new Date();
  const firstDayOfMonth = startOfMonth(selectedDate);
  const lastDayOfMonth = endOfMonth(selectedDate);
  const prevMonth = format(new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() - 1, 1), 'yyyy-MM-dd');
  const nextMonth = format(new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth() + 1, 1), 'yyyy-MM-dd');

  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .gte('date', format(firstDayOfMonth, 'yyyy-MM-dd'))
    .lte('date', format(lastDayOfMonth, 'yyyy-MM-dd'));

  if (attendanceError) {
    return <p>Error fetching attendance data: {attendanceError.message}</p>;
  }

  const allDays = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const attendanceMap = new Map(attendanceData.map(a => [a.date, a]));
  
  const monthlyAttendance = allDays.map(day => {
    const dayString = format(day, 'yyyy-MM-dd');
    const record = attendanceMap.get(dayString);
    return {
      date: dayString,
      dayName: format(day, 'EEEE'),
      check_in: record?.check_in || null,
      check_out: record?.check_out || null,
      total_hours: record?.total_hours || 0,
    };
  });
  
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
                    <Link href={`/attendance/${userId}?month=${prevMonth}`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <span className="text-lg font-semibold w-32 text-center">{format(selectedDate, 'MMMM yyyy')}</span>
                <Button variant="outline" asChild>
                    <Link href={`/attendance/${userId}?month=${nextMonth}`}>
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
                    <p className="text-2xl font-bold">{allDays.length - totalDaysPresent}</p>
                </CardContent>
            </Card>
        </div>


      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyAttendance.map((item) => (
              <TableRow key={item.date} className={!item.check_in ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                <TableCell>
                  <div className="font-medium">{format(parseISO(item.date), 'dd MMMM, yyyy')}</div>
                  <div className="text-sm text-muted-foreground">{item.dayName}</div>
                </TableCell>
                <TableCell>{formatTime(item.check_in)}</TableCell>
                <TableCell>{formatTime(item.check_out)}</TableCell>
                <TableCell>{formatHours(item.total_hours)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
