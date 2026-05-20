
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
import { getInitials, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, MessageSquare, Download } from 'lucide-react';
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
    <div className="p-4 md:p-8 lg:p-10 min-h-screen bg-[#0f0f0f] text-zinc-100">
      <TooltipProvider>
      <header className="mb-10 flex flex-col gap-6">
        <Button variant="ghost" className="w-fit p-0 text-sky-400 hover:text-sky-300 hover:bg-transparent font-black uppercase tracking-widest text-[10px] flex items-center gap-2" onClick={() => handleNavClick('/attendance')}>
            <ChevronLeft className="h-4 w-4" />
            Back to Team Overview
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20 border-2 border-white/10 shadow-2xl">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name ?? ''} />
                    <AvatarFallback className="bg-sky-500/20 text-sky-300 text-xl font-black">{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">{user.full_name}</h1>
                    <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Monthly Attendance Statement</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full p-1.5 shadow-2xl">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-400 hover:text-white" onClick={() => handleNavClick(`/attendance/${user.id}?month=${prevMonth}`)}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-black w-32 text-center text-zinc-200">{format(parseISO(selectedDate), 'MMMM yyyy')}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-400 hover:text-white" onClick={() => handleNavClick(`/attendance/${user.id}?month=${nextMonth}`)}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
                <Button variant="outline" className="rounded-full h-12 px-6 bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 transition-all font-bold">
                    <Download className="mr-2 h-4 w-4 text-sky-400" />
                    Export Report
                </Button>
            </div>
        </div>
      </header>

       <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <Card className="relative overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Working Hours</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-black text-white tracking-tighter">{totalHours.toFixed(2)}</p>
                </CardContent>
            </Card>
            <Card className="relative overflow-hidden border border-sky-500/10 bg-sky-500/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-sky-400">Overtime Logged</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-black text-sky-300 tracking-tighter">{formatExtraHours(totalExtraHours)}</p>
                </CardContent>
            </Card>
            <Card className="relative overflow-hidden border border-emerald-500/10 bg-emerald-500/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Total Present</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-black text-emerald-300 tracking-tighter">{totalDaysPresent} <span className="text-xs text-zinc-600 font-bold uppercase tracking-tight">Days</span></p>
                </CardContent>
            </Card>
            <Card className="relative overflow-hidden border border-rose-500/10 bg-rose-500/[0.03] backdrop-blur-xl shadow-2xl rounded-[2rem]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-400">Total Absent</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-black text-rose-300 tracking-tighter">{allDaysCount - totalDaysPresent} <span className="text-xs text-zinc-600 font-bold uppercase tracking-tight">Days</span></p>
                </CardContent>
            </Card>
        </div>


      <div className="border border-white/10 rounded-[2.5rem] overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/50">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="w-[220px] text-[10px] font-black uppercase tracking-widest text-zinc-500 py-4">Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Check In</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lunch Out</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lunch In</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Check Out</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Working</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Extra</TableHead>
              {isEditor && <TableHead className="w-[180px] text-[10px] font-black uppercase tracking-widest text-zinc-500">Status Notes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyAttendance.map((item) => (
              <TableRow key={item.date} className={cn("border-b border-white/5 transition-colors hover:bg-white/[0.04]", !item.check_in && 'bg-rose-500/[0.02] grayscale')}>
                <TableCell className="py-4">
                  <div className="font-black text-white tracking-tight">{format(parseISO(item.date), 'dd MMM, yyyy')}</div>
                  <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">{format(parseISO(item.date), 'EEEE')}</div>
                </TableCell>
                <TableCell className="text-zinc-400 font-medium"><TimeDisplay time={item.check_in} /></TableCell>
                <TableCell className="text-zinc-500 font-medium"><TimeDisplay time={item.lunch_out} /></TableCell>
                <TableCell className="text-zinc-500 font-medium"><TimeDisplay time={item.lunch_in} /></TableCell>
                <TableCell className="text-zinc-400 font-medium"><TimeDisplay time={item.check_out} /></TableCell>
                <TableCell className="font-black text-zinc-100">{formatHours(item.total_hours)}</TableCell>
                <TableCell className="font-black text-sky-400 tracking-tighter">{formatExtraHours(item.extra_hours)}</TableCell>
                {isEditor && (
                  <TableCell>
                    {item.check_in_reason ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500/80 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/10 cursor-help group transition-all hover:bg-amber-500/20">
                            <MessageSquare className="h-3 w-3" />
                            <span className="truncate max-w-[100px] uppercase tracking-tighter">{item.check_in_reason}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-900 border-zinc-800 text-white shadow-2xl p-4 rounded-[1.5rem] max-w-[300px]">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Late Entry Reason</p>
                          <p className="text-sm text-zinc-200 font-medium italic leading-relaxed">"{item.check_in_reason}"</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-zinc-800">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      </TooltipProvider>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
