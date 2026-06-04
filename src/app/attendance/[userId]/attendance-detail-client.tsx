'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar as CalendarIcon,
  Clock,
  ArrowUpRight,
  Building2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { AnimatedBackground } from '@/components/dashboard/animated-background';
import { GlassCard } from '@/components/dashboard/glass-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!time) return <span className="text-zinc-600">—</span>;
  if (!mounted) return <span className="text-zinc-600 animate-pulse">...</span>;
  
  return <span className="font-medium text-zinc-200">{format(parseISO(time), 'h:mm a')}</span>;
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
  const [isPending, startTransition] = useTransition();

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
    startTransition(() => {
        router.push(`/attendance/${val}?month=${format(parseISO(selectedDate), 'yyyy-MM')}`);
    });
  };

  const handleMonthNav = (month: string) => {
    startTransition(() => {
        router.push(`/attendance/${user.id}?month=${month}`);
    });
  };

  const currentMonthLabel = format(parseISO(selectedDate), 'MMMM yyyy');

  return (
    <div className="relative min-h-screen bg-[#05050a] text-zinc-100 p-4 md:p-6 font-sans selection:bg-sky-500/30 overflow-x-hidden">
      <AnimatedBackground />

      <AnimatePresence>
        {isPending && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030407]/60"
          >
            <div className="flex flex-col items-center gap-4 bg-zinc-900/80 p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
              <motion.div 
                className="w-10 h-10 rounded-full border-2 border-zinc-800 border-t-sky-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-[0.3em]">Updating Records...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TooltipProvider>
        <div className="w-full space-y-10 relative z-10">
          
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
            <div className="space-y-6">
              <button 
                onClick={() => {
                    startTransition(() => {
                      router.push('/attendance');
                    });
                }}
                className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-sky-400 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Directory
              </button>
              
              <div className="flex items-center gap-5">
                <Avatar className="h-14 w-14 border border-white/10 shadow-2xl">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold text-lg">{getInitials(user.full_name)}</AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col gap-1">
                  {isEditor ? (
                     <div className="-ml-3">
                       <Select value={user.id} onValueChange={handleUserChange}>
                          <SelectTrigger className="h-auto py-1 px-3 bg-transparent border-0 text-2xl font-bold tracking-tight text-white uppercase focus:ring-0 shadow-none hover:bg-white/5 rounded-xl transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10 text-white backdrop-blur-3xl shadow-2xl rounded-2xl">
                            <div className="p-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Select Employee</div>
                            {allProfiles.map(p => (
                              <SelectItem key={p.id} value={p.id} className="rounded-xl focus:bg-white/5 focus:text-white text-xs cursor-pointer">
                                {p.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                     </div>
                  ) : (
                    <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                      {user.full_name}
                    </h1>
                  )}
                  <div className="flex items-center gap-3">
                     <span className="text-sm text-zinc-500 font-medium">Monthly Attendance Statement</span>
                     <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">
                      Verified
                     </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-1 backdrop-blur-xl shadow-2xl">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => handleMonthNav(prevMonth)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-center min-w-[150px] gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-sky-400" />
                    <span className="text-sm font-bold text-zinc-200 uppercase tracking-widest">{currentMonthLabel}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => handleMonthNav(nextMonth)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
              <Button variant="outline" className="h-11 px-6 bg-white border-0 hover:bg-zinc-200 text-zinc-950 font-bold uppercase tracking-widest text-[10px] shadow-2xl transition-all active:scale-95 rounded-xl">
                <Download className="mr-2 h-4 w-4" />
                Export Statement
              </Button>
            </div>
          </header>

          {/* KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <GlassCard gradientFrom="rgba(255,255,255,0.08)">
                <div className="p-6 h-full flex flex-col justify-between">
                   <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Aggregate Hours</span>
                      <Clock className="h-4 w-4 text-zinc-500" />
                   </div>
                   <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white tracking-tighter">{stats.totalHours.toFixed(1)}</span>
                      <span className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Hrs</span>
                   </div>
                </div>
              </GlassCard>

              <GlassCard gradientFrom="rgba(56, 189, 248, 0.12)">
                <div className="p-6 h-full flex flex-col justify-between">
                   <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400/70">Overtime Yield</span>
                      <ArrowUpRight className="h-4 w-4 text-sky-400" />
                   </div>
                   <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-sky-300 tracking-tighter">{stats.totalExtra.toFixed(1)}</span>
                      <span className="text-xs font-bold text-sky-900 uppercase tracking-widest">Hrs</span>
                   </div>
                </div>
              </GlassCard>

              <GlassCard gradientFrom="rgba(16, 185, 129, 0.12)">
                <div className="p-6 h-full flex flex-col justify-between">
                   <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">Days Present</span>
                      <Building2 className="h-4 w-4 text-emerald-400" />
                   </div>
                   <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-emerald-300 tracking-tighter">{stats.presentDays}</span>
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-widest">Days</span>
                   </div>
                </div>
              </GlassCard>

              <GlassCard gradientFrom="rgba(99, 102, 241, 0.12)">
                <div className="p-6 h-full flex flex-col justify-center">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Efficiency index</span>
                      <span className="text-xs font-bold text-white">92%</span>
                   </div>
                   <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full w-[92%] shadow-[0_0_10px_#0ea5e9]" />
                   </div>
                </div>
              </GlassCard>
          </div>

          {/* Main Statement Table */}
          <GlassCard className="overflow-hidden" gradientFrom="rgba(255,255,255,0.02)">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Date</th>
                    <th className="px-4 py-5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Entry</th>
                    <th className="px-4 py-5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Break Out</th>
                    <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Break In</th>
                    <th className="px-4 py-5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Exit</th>
                    <th className="px-4 py-5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Yield (H)</th>
                    <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Overtime</th>
                    <th className="px-4 py-4 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-center">Audit</th>
                    <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] text-right">Audit Statement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {monthlyData.map((item) => {
                    const isMissing = !item.check_in;
                    return (
                      <tr 
                        key={item.date} 
                        className={cn(
                          "group transition-all duration-300 hover:bg-white/[0.04]",
                          isMissing && "bg-white/[0.01] opacity-60 grayscale-[0.4]"
                        )}
                      >
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-bold", isMissing ? "text-zinc-500" : "text-zinc-200")}>
                              {format(parseISO(item.date), 'MMM d, yyyy')}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{format(parseISO(item.date), 'EEEE')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-6 text-center text-sm">
                          <TimeDisplay time={item.check_in} />
                        </td>
                        <td className="px-4 py-6 text-center text-sm">
                          <TimeDisplay time={item.lunch_out} />
                        </td>
                        <td className="px-4 py-6 text-center text-sm">
                          <TimeDisplay time={item.lunch_in} />
                        </td>
                        <td className="px-4 py-6 text-center text-sm">
                          <TimeDisplay time={item.check_out} />
                        </td>
                        <td className="px-4 py-6 text-center">
                          <span className={cn("text-sm font-medium", item.total_hours ? "text-zinc-200" : "text-zinc-700")}>
                            {item.total_hours?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-center">
                          {item.extra_hours > 0 ? (
                            <span className="text-sm font-medium text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md">
                              +{item.extra_hours.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-zinc-800">—</span>
                          )}
                        </td>
                        <td className="px-4 py-6 text-center">
                           <div className="flex justify-center">
                             <Badge variant="outline" className={cn(
                                 "text-[9px] font-bold uppercase tracking-widest border-0 px-3 h-6 gap-1.5",
                                 item.check_in ? "text-emerald-400 bg-emerald-500/5" : "text-rose-400 bg-rose-500/5"
                             )}>
                                 {item.check_in ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                 {item.check_in ? "Verified" : "Missing"}
                             </Badge>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           {item.check_in_reason ? (
                             <div className="inline-flex items-start gap-1.5 max-w-[280px] text-left">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500/70 shrink-0 mt-0.5" />
                                <span className="text-xs text-zinc-400 italic leading-snug">
                                  {item.check_in_reason}
                                </span>
                            </div>
                           ) : (
                             <span className="text-zinc-800">—</span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </TooltipProvider>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}
