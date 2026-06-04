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

  if (!time) return <span className="text-zinc-800">—</span>;
  if (!mounted) return <span className="text-zinc-800 animate-pulse">...</span>;
  
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
    <div className="relative min-h-screen bg-[#05050a] text-zinc-100 p-4 md:p-8 lg:p-10 overflow-hidden font-sans">
      <AnimatedBackground />

      {/* 🚀 Processing Portal */}
      <AnimatePresence>
        {isPending && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030407]/60"
          >
            <div className="flex flex-col items-center gap-8">
              <div className="relative flex items-center justify-center">
                <motion.div 
                  className="absolute w-24 h-24 rounded-full border border-sky-400/20"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div 
                  className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 shadow-[0_0_40px_rgba(14,165,233,0.8)]"
                  animate={{ scale: [1, 0.8, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-300 font-bold tracking-[0.4em] uppercase">Recalculating Ledger</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TooltipProvider>
        
        <header className="relative z-10 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-6">
            <button 
              onClick={() => {
                  startTransition(() => {
                    router.push('/attendance');
                  });
              }}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400 hover:text-sky-300 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              Audit List
            </button>
            
            <div className="flex items-center gap-6">
              <Avatar className="h-16 w-16 ring-4 ring-white/5 border border-white/10 shadow-[0_0_40px_rgba(56,189,248,0.1)]">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-zinc-900 text-zinc-600 font-bold text-lg">{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                {isEditor ? (
                   <div className="mb-2">
                     <Select value={user.id} onValueChange={handleUserChange}>
                        <SelectTrigger className="h-auto p-0 bg-transparent border-0 text-xl font-bold tracking-tight text-white uppercase focus:ring-0 shadow-none hover:text-sky-400 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white backdrop-blur-3xl shadow-2xl">
                          <div className="p-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600">Switch Auditor Statement</div>
                          {allProfiles.map(p => (
                            <SelectItem key={p.id} value={p.id} className="rounded-xl focus:bg-white/5 focus:text-white text-xs">
                              {p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                ) : (
                  <h1 className="text-xl font-bold tracking-tight text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    {user.full_name}
                  </h1>
                )}
                <div className="flex items-center gap-4 mt-2">
                   <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-500">
                    Monthly Performance Statement
                   </p>
                   <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[8px] font-bold uppercase tracking-widest h-5 px-2">
                    Verified
                   </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-full p-1.5 backdrop-blur-xl shadow-2xl">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => handleMonthNav(prevMonth)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[10px] font-black w-32 text-center text-zinc-200 uppercase tracking-widest">{currentMonthLabel}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/5" onClick={() => handleMonthNav(nextMonth)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <Button variant="outline" className="rounded-full h-10 px-6 bg-sky-600 hover:bg-sky-500 text-white font-bold uppercase tracking-widest text-[9px] border-0 shadow-2xl shadow-sky-900/40 transition-all active:scale-95">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </header>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <GlassCard gradientFrom="rgba(255,255,255,0.08)">
              <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Aggregate Hours</span>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400"><Clock className="h-4 w-4" /></div>
                 </div>
                 <p className="text-2xl font-bold text-white tracking-tight">{stats.totalHours.toFixed(2)}<span className="text-xs text-zinc-700 ml-1">h</span></p>
              </div>
            </GlassCard>

            <GlassCard gradientFrom="rgba(56, 189, 248, 0.12)">
              <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-400/70">Overtime Yield</span>
                    <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400"><ArrowUpRight className="h-4 w-4" /></div>
                 </div>
                 <p className="text-2xl font-bold text-sky-300 tracking-tight">{stats.totalExtra.toFixed(2)}<span className="text-xs text-sky-900 ml-1">h</span></p>
              </div>
            </GlassCard>

            <GlassCard gradientFrom="rgba(16, 185, 129, 0.12)">
              <div className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">Present Cycles</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><Building2 className="h-4 w-4" /></div>
                 </div>
                 <p className="text-2xl font-bold text-emerald-300 tracking-tight">{stats.presentDays}<span className="text-xs text-emerald-900 ml-1">d</span></p>
              </div>
            </GlassCard>

            <GlassCard gradientFrom="rgba(99, 102, 241, 0.12)">
              <div className="p-6 text-center flex flex-col items-center justify-center h-full">
                 <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-3 border border-white/5">
                    <div className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full w-[85%] shadow-[0_0_10px_#0ea5e9]" />
                 </div>
                 <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-500">Efficiency Index</span>
                 <p className="text-base font-bold text-white mt-1">A+ Excellence</p>
              </div>
            </GlassCard>
        </div>

        <GlassCard className="relative z-10 overflow-hidden" gradientFrom="rgba(255,255,255,0.01)">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Statement Date</th>
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
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "h-16 w-16 rounded-2xl flex flex-col items-center justify-center font-bold transition-all group-hover:scale-105",
                          item.check_in ? "bg-white/5 text-zinc-200 border border-white/10" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        )}>
                          <span className="text-[10px] uppercase font-black tracking-widest opacity-60">{format(parseISO(item.date), 'MMM')}</span>
                          <span className="text-3xl leading-none mt-1">{format(parseISO(item.date), 'dd')}</span>
                        </div>
                        <div className="text-sm font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-200 transition-colors">
                          {format(parseISO(item.date), 'EEEE')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="text-sm font-bold text-zinc-400 font-mono tracking-tight">
                        <TimeDisplay time={item.check_in} />
                      </div>
                      {item.check_in_reason && (
                        <div className="mt-4 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 text-left max-w-[420px] mx-auto group-hover:bg-amber-500/10 transition-colors shadow-2xl">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600/80">Audit Context Statement</span>
                            </div>
                            <p className="text-sm italic font-medium text-amber-100 leading-relaxed tracking-tight">
                              "{item.check_in_reason}"
                            </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center text-sm font-medium text-zinc-500 font-mono tracking-tight">
                      <TimeDisplay time={item.lunch_out} />
                    </td>
                    <td className="px-6 py-6 text-center text-sm font-medium text-zinc-500 font-mono tracking-tight">
                      <TimeDisplay time={item.lunch_in} />
                    </td>
                    <td className="px-6 py-6 text-center text-sm font-bold text-zinc-400 font-mono tracking-tight">
                      <TimeDisplay time={item.check_out} />
                    </td>
                    <td className="px-6 py-6 text-center text-sm font-bold text-white tracking-tight">
                      {item.total_hours?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-6 text-center">
                      {item.extra_hours > 0 ? (
                        <span className="text-sm font-bold text-sky-400 tracking-tight">+{item.extra_hours.toFixed(2)}</span>
                      ) : (
                        <span className="text-zinc-800">—</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                       <Badge variant="outline" className={cn(
                           "text-[9px] font-bold uppercase tracking-widest border-0 px-3 h-6",
                           item.check_in ? "text-emerald-500 bg-emerald-500/5" : "text-rose-500 bg-rose-500/5"
                       )}>
                           {item.check_in ? "Verified" : "Missing"}
                       </Badge>
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
