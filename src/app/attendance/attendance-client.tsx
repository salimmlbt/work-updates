
'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import type { Attendance, Profile } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock3, UserCheck, UserX, Activity } from 'lucide-react';

type AttendanceWithProfile = Attendance & {
  profiles: Profile;
  extra_hours: number;
};

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

  return <span>{formattedTime}</span>;
}

function formatHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined') return '-';
  return `${hours.toFixed(2)} hrs`;
}

function formatExtraHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined' || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getStatusBadge(attendance: AttendanceWithProfile) {
  if (attendance.check_in && !attendance.check_out) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Present
        </span>
      </Badge>
    );
  }
  if (attendance.check_in && attendance.check_out) {
    return (
      <Badge className="bg-slate-50 text-slate-700 border border-slate-200">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="bg-rose-50 text-rose-700 border border-rose-200">
      <span className="flex items-center gap-1">
        <UserX className="h-3 w-3" />
        Absent
      </span>
    </Badge>
  );
}

export default function AttendanceClient({ initialData }: { initialData: AttendanceWithProfile[] }) {
  const router = useRouter();
  const [attendanceList, setAttendanceList] = useState(initialData);

  useEffect(() => {
    setAttendanceList(initialData);
  }, [initialData]);

  // Realtime updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-attendance-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          setAttendanceList((prevList) => {
            const newList = [...prevList];
            const record = payload.new as Attendance;
            const index = newList.findIndex((item) => item.user_id === record.user_id);
            if (index !== -1) {
              const profile = newList[index].profiles;
              newList[index] = {
                ...record,
                profiles: profile,
                // extra_hours not recalculated here; kept as is
                extra_hours: newList[index].extra_hours,
              } as AttendanceWithProfile;
            }
            return newList;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRowClick = (userId: string) => {
    router.push(`/attendance/${userId}`);
  };

  const todayLabel = useMemo(() => format(new Date(), 'dd MMM yyyy (EEEE)'), []);

  // Summary stats
  const { presentCount, completedCount, absentCount } = useMemo(() => {
    let present = 0;
    let completed = 0;
    let absent = 0;

    attendanceList.forEach((a) => {
      if (a.check_in && !a.check_out) present += 1;
      else if (a.check_in && a.check_out) completed += 1;
      else if (!a.check_in && !a.check_out) absent += 1;
    });

    return {
      presentCount: present,
      completedCount: completed,
      absentCount: absent,
    };
  }, [attendanceList]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-sky-50 p-4 md:p-8 lg:p-10">
      {/* Header */}
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live overview of today&apos;s attendance for your team.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 bg-white/70 border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
          <Clock3 className="h-4 w-4 text-sky-500" />
          <span>Today: {todayLabel}</span>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border border-emerald-100 bg-emerald-50/70 shadow-sm rounded-2xl">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <UserCheck className="h-4 w-4" />
              Present (Checked In)
            </CardTitle>
            <CardDescription className="text-xs text-emerald-700/80">
              Currently working
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-emerald-900">{presentCount}</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Completed Shifts
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Checked in & out today
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
          </CardContent>
        </Card>

        <Card className="border border-rose-100 bg-rose-50/80 shadow-sm rounded-2xl">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-rose-800">
              <UserX className="h-4 w-4" />
              Absent
            </CardTitle>
            <CardDescription className="text-xs text-rose-700/80">
              No check-in recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-bold text-rose-900">{absentCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="px-4 md:px-6 py-3 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Today&apos;s Attendance
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Click any row to view detailed history for that team member.
              </CardDescription>
            </div>
            <Badge className="bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100">
                  <TableHead className="w-[260px] text-xs font-semibold text-slate-600">
                    User
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Check In
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Check Out
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Total Hours
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Extra Hours
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceList.map((item) => (
                  <TableRow
                    key={item.user_id}
                    onClick={() => handleRowClick(item.user_id)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                  >
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-100">
                          <AvatarImage
                            src={item.profiles.avatar_url ?? undefined}
                            alt={item.profiles.full_name ?? ''}
                          />
                          <AvatarFallback className="bg-slate-100 text-slate-700 text-xs">
                            {getInitials(item.profiles.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {item.profiles.full_name}
                          </span>
                          {item.profiles.designation && (
                            <span className="text-xs text-slate-500">
                              {item.profiles.designation}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      <TimeDisplay time={item.check_in} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      <TimeDisplay time={item.check_out} />
                    </TableCell>
                    <TableCell className="text-sm text-slate-800">
                      {formatHours(item.total_hours)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={
                          item.extra_hours && item.extra_hours > 0
                            ? 'text-sky-700 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        {formatExtraHours(item.extra_hours)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{getStatusBadge(item)}</TableCell>
                  </TableRow>
                ))}

                {attendanceList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-slate-500"
                    >
                      No attendance records for today.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
