'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar as CalendarIcon,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials, cn } from '@/lib/utils';
import type { Profile, Attendance } from '@/lib/types';
import { AnimatedBackground } from '@/components/dashboard/animated-background';
import { GlassCard } from '@/components/dashboard/glass-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Props {
  user: Profile;
  allProfiles: Profile[];
  monthlyAttendance: MonthlyAttendance[];
  selectedDate: string;
  prevMonth: string;
  nextMonth: string;
  isEditor: boolean;
}

function TimeDisplay({ time }: { time: string | null }) {
  if (!time) return <span className="text-zinc-800">—</span>;
  return <span>{format(parseISO(time), 'h:mm a')}</span>;
}

export default function AttendanceDetailClient({
  user,
  allProfiles,
  monthlyAttendance: initialMonthlyAttendance,
  selectedDate,
  prevMonth,
  nextMonth,
  isEditor,
}: Props) {
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState(initialMonthlyAttendance);

  useEffect(() => {
    setMonthlyData(initialMonthlyAttendance);
  }, [initialMonthlyAttendance]);

  const stats = useMemo(() => {
    const totalHours = monthlyData.reduce((sum, d) => sum + (d.total_hours || 0), 0);
    const presentDays = monthlyData.filter(d => d.check_in).length;
    const totalExtra = monthlyData.reduce((sum, d) => sum + (d.extra_hours || 0), 0);
    return { totalHours, presentDays, totalExtra };
  }, [monthlyData]);

  const handleUserChange = (val: string) => {
    router.push(`/attendance/${val}?month=${format(parseISO(selectedDate), 'yyyy-MM')}`);
  };

  const currentMonthLabel = format(parseISO(selectedDate), 'MMMM yyyy');

  return (
    <div className="relative min-h-screen bg-[#05050a] text-zinc-100 p-4 md:p-8 lg:p-10 overflow-hidden">
      <AnimatedBackground />
      <TooltipProvider>
        
        <header className="relative z-10 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-6">
            <button 
              onClick={() => router.push('/attendance')}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-sky-400 hover:text-sky-300 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Audit List
            </button>
            
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 ring-4 ring-white/5 border border-white/10 shadow-[0_0_40px_rgba(56,189,248,0.1)]">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-zinc-900 text-zinc-600 font-black text-2xl">{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                {isEditor ? (
                   <div className="mb-2">
                     <Select value={user.id} onValueChange={handleUserChange}>
                        <SelectTrigger className="h-auto p-0 bg-transparent border-0 text-3xl md:text-5xl font-black tracking-tighter text-white uppercase focus:ring-0 shadow-none hover:text-sky-400 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white backdrop-blur-3xl shadow-2xl">
                          <div className="p-2 pb-1 text-[9px] font-black uppercase tracking-widest text-zinc-600">Switch Auditor Statement</div>
                          {allProfiles.map(p => (
                            <SelectItem key={p.id} value={p.id} className="rounded-xl focus:bg-white/5 focus:text-white">
                              {p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                ) : (
                  <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    {user.full_name}
                  </h1>
                )}
                <div className="flex items-center gap-4 mt-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
                    Monthly Performance Statement
                   </p>
                   <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[9px] font-black uppercase tracking-widest h-6 px-3">
                    Verified
                   </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-full p-1.5 backdrop-blur-xl shadow-2xl">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => router.push(`/attendance/${user.id}?month=${prevMonth}`)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs font-black w-36 text-center text-zinc-200 uppercase tracking-widest">{currentMonthLabel}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => router.push(`/attendance/${user.id}?month=${nextMonth}`)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
            <Button variant="outline" className="rounded-full h-12 px-8 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-[10px] border-0 shadow-2xl shadow-sky-900/40 transition-all active:scale-95">
              <Download className="mr-3 h-4 w-4" />
              Export Statement
            </Button>
          </div>
        </header>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <GlassCard gradientFrom="rgba(255,255,255,0.08)">
              <div className="p-8">
                 <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Aggregate Hours</span>
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400"><Clock className="h-5 w-5" /></div>
                 </div>
                 <p className="text-5xl font-black text-white tracking-tighter">{stats.totalHours.toFixed(2)}<span className="text-xl text-zinc-700 ml-1">h</span></p>
              </div>
            </GlassCard>

            <GlassCard gradientFrom="rgba(56, 189, 248, 0.12)">
              <div className="p-8">
                 <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400/70">Overtime Yield</span>
                    <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400"><ArrowUpRight className="h-5 w-5" /></div>
                 </div>
                 <p className="text-5xl font-black text-sky-300 tracking-tighter">{stats.totalExtra.toFixed(2)}<span className="text-xl text-sky-900 ml-1">h</span></p>
              </div>
            </GlassCard>

            <GlassCard gradientFrom="rgba(16, 185, 129, 0.12)">
              <div className="p-8">
                 <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/70">Present Cycles</span>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><Building2 className="h-5 w-5" /></div>
                 </div>
                 <p className="text-5xl font-black text-emerald-300 tracking-tighter">{stats.presentDays}<span className="text-xl text-emerald-900 ml-1">d</span></p>
              </div>
            </GlassCard>

            <GlassCard gradientFrom="rgba(99, 102, 241, 0.12)">
              <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                 <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-4 border border-white/5">
                    <div className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full w-[85%] shadow-[0_0_15px_#0ea5e9]" />
                 </div>
                 <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Efficiency Score</span>
                 <p className="text-2xl font-black text-white mt-1">A+ Excellence</p>
              </div>
            </GlassCard>
        </div>

        <GlassCard className="relative z-10 overflow-hidden" gradientFrom="rgba(255,255,255,0.01)">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Timestamp Date</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Entry</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Lunch Out</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Lunch In</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Exit</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Yield (H)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Extra</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 text-right">Audit</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((item) => (
                  <tr 
                    key={item.date} 
                    className={cn(
                      "group border-b border-white/[0.03] transition-all duration-500 hover:bg-white/[0.04]",
                      !item.check_in && "opacity-40 grayscale"
                    )}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex flex-col items-center justify-center font-black transition-all group-hover:scale-110",
                          item.check_in ? "bg-white/5 text-zinc-200 border border-white/10" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        )}>
                          <span className="text-[8px] uppercase tracking-tighter opacity-60">{format(parseISO(item.date), 'MMM')}</span>
                          <span className="text-base leading-none mt-0.5">{format(parseISO(item.date), 'dd')}</span>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">
                          {format(parseISO(item.date), 'EEEE')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center text-xs font-black text-zinc-400 font-mono tracking-tighter">
                      <TimeDisplay time={item.check_in} />
                    </td>
                    <td className="px-6 py-6 text-center text-xs font-bold text-zinc-500 font-mono tracking-tighter">
                      <TimeDisplay time={item.lunch_out} />
                    </td>
                    <td className="px-6 py-6 text-center text-xs font-bold text-zinc-500 font-mono tracking-tighter">
                      <TimeDisplay time={item.lunch_in} />
                    </td>
                    <td className="px-6 py-6 text-center text-xs font-black text-zinc-400 font-mono tracking-tighter">
                      <TimeDisplay time={item.check_out} />
                    </td>
                    <td className="px-6 py-6 text-center text-sm font-black text-white tracking-tighter">
                      {item.total_hours?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-6 text-center">
                      {item.extra_hours > 0 ? (
                        <span className="text-sm font-black text-sky-400 tracking-tighter">+{item.extra_hours.toFixed(2)}</span>
                      ) : (
                        <span className="text-zinc-800">—</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       {item.check_in_reason ? (
                         <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 items-center justify-center text-amber-500 hover:scale-110 transition-transform cursor-help">
                                <MessageSquare className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-900 border-zinc-800 text-white p-4 rounded-2xl max-w-[280px] shadow-2xl">
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Manual Reason Entry</p>
                              <p className="text-sm italic font-medium leading-relaxed">"{item.check_in_reason}"</p>
                            </TooltipContent>
                         </Tooltip>
                       ) : (
                         <div className="h-2 w-2 rounded-full bg-zinc-900 mx-auto" />
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </TooltipProvider>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}

import { useMemo } from 'react';
