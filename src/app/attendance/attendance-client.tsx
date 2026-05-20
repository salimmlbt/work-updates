
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
import { getInitials, cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Attendance, Profile } from '@/lib/types';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, Clock3, UserCheck, UserX, Activity, MessageSquare, Info, Filter } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest text-[9px]">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3 w-3" />
          Present
        </span>
      </Badge>
    );
  }
  if (attendance.check_in && attendance.check_out) {
    return (
      <Badge className="bg-zinc-800 text-zinc-400 border border-white/5 font-black uppercase tracking-widest text-[9px]">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Shift Done
        </span>
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border border-rose-500/20 font-black uppercase tracking-widest text-[9px]">
      <span className="flex items-center gap-1.5">
        <UserX className="h-3 w-3" />
        Absent
      </span>
    </Badge>
  );
}

export default function AttendanceClient({ initialData, isEditor }: { initialData: AttendanceWithProfile[], isEditor: boolean }) {
  const router = useRouter();
  const [attendanceList, setAttendanceList] = useState(initialData);
  const [showReasons, setShowReasons] = useState(false);

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
    <div className="min-h-screen bg-[#0f0f0f] p-4 md:p-8 lg:p-10 text-zinc-100">
      <TooltipProvider>
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Live Attendance
          </h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.25em] mt-1">
            Real-time studio presence monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isEditor && (
            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-full px-5 py-2 shadow-2xl">
              <Switch 
                id="show-reasons" 
                checked={showReasons} 
                onCheckedChange={setShowReasons}
                className="data-[state=checked]:bg-sky-500"
              />
              <Label htmlFor="show-reasons" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 cursor-pointer">
                Late Reasons
              </Label>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-300 bg-white/5 border border-white/10 rounded-full px-5 py-2 shadow-2xl">
            <Clock3 className="h-4 w-4 text-sky-400" />
            <span>{todayLabel}</span>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <Card className="relative overflow-hidden border border-emerald-500/10 bg-emerald-500/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem] group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-60" />
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <UserCheck className="h-4 w-4" />
              In Studio Now
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-5xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{presentCount}</p>
            <p className="text-[10px] text-emerald-500/60 font-bold uppercase mt-1">Active team members</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem]">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-sky-400" />
              Shifts Finished
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-5xl font-black text-white tracking-tighter">{completedCount}</p>
            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Successfully logged out</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-rose-500/10 bg-rose-500/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem]">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-400">
              <UserX className="h-4 w-4" />
              Unaccounted
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-5xl font-black text-white tracking-tighter">{absentCount}</p>
            <p className="text-[10px] text-rose-500/60 font-bold uppercase mt-1">No activity reported</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">
                Live Overview
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 font-medium mt-1">
                Select a member to view their detailed attendance history.
              </CardDescription>
            </div>
            <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 font-black uppercase tracking-widest text-[10px] flex items-center gap-2 h-7 px-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Sync Active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/5 border-b border-white/10 hover:bg-transparent">
                  <TableHead className="w-[300px] text-[10px] font-black uppercase tracking-widest text-zinc-500 py-4">User</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">In</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Out</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Overtime</TableHead>
                  {isEditor && showReasons && (
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Late Note</TableHead>
                  )}
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceList.map((item) => (
                  <TableRow
                    key={item.user_id}
                    onClick={() => handleRowClick(item.user_id)}
                    className="group cursor-pointer border-b border-white/5 hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-white/10 group-hover:scale-105 transition-transform">
                          <AvatarImage
                            src={item.profiles.avatar_url ?? undefined}
                            alt={item.profiles.full_name ?? ''}
                          />
                          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-bold">
                            {getInitials(item.profiles.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-100 tracking-tight group-hover:text-white">
                            {item.profiles.full_name}
                          </span>
                          {item.profiles.designation && (
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                              {item.profiles.designation}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-zinc-300">
                      <TimeDisplay time={item.check_in} />
                    </TableCell>
                    <TableCell className="text-sm font-medium text-zinc-300">
                      <TimeDisplay time={item.check_out} />
                    </TableCell>
                    <TableCell className="text-sm font-black text-zinc-100">
                      {formatHours(item.total_hours)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={cn(
                          "font-black tracking-tighter",
                          item.extra_hours && item.extra_hours > 0
                            ? 'text-sky-400'
                            : 'text-zinc-700'
                        )}
                      >
                        {formatExtraHours(item.extra_hours)}
                      </span>
                    </TableCell>
                    {isEditor && showReasons && (
                      <TableCell className="text-sm">
                        {item.check_in_reason ? (
                          <div className="flex items-center gap-2 text-amber-400/80 font-medium bg-amber-500/5 px-3 py-1.5 rounded-xl border border-amber-500/10 max-w-[200px]">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate text-xs" title={item.check_in_reason}>
                              {item.check_in_reason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-800">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-6">{getStatusBadge(item)}</TableCell>
                  </TableRow>
                ))}

                {attendanceList.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isEditor && showReasons ? 7 : 6}
                      className="py-32 text-center"
                    >
                      <div className="flex flex-col items-center gap-2 opacity-20">
                          <Activity className="h-12 w-12 text-zinc-400" />
                          <p className="text-sm font-bold uppercase tracking-widest">No activity reported yet</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </TooltipProvider>
    </div>
  );
}
