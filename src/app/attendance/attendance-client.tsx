'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  UserX,
  Clock3,
  UserCheck,
  MessageSquare,
  ChevronRight,
  Lock,
  Search,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Attendance, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { AnimatedBackground } from '@/components/dashboard/animated-background';
import { GlassCard } from '@/components/dashboard/glass-card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

type AttendanceWithProfile = Attendance & {
  profiles: Profile;
  extra_hours: number;
};

function TimeDisplay({ time }: { time: string | null }) {
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

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

  if (!formattedTime) return <span className="text-zinc-800 animate-pulse">...</span>;
  return <span>{formattedTime}</span>;
}

export default function AttendanceClient({ 
  initialData, 
  isEditor, 
  currentUserId 
}: { 
  initialData: AttendanceWithProfile[], 
  isEditor: boolean,
  currentUserId: string
}) {
  const router = useRouter();
  const [attendanceList, setAttendanceList] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAttendanceList(initialData);
  }, [initialData]);

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

  const filteredList = useMemo(() => {
    return attendanceList.filter(item => 
      item.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.profiles.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [attendanceList, searchQuery]);

  const stats = useMemo(() => {
    let present = 0;
    let completed = 0;
    let absent = 0;

    attendanceList.forEach((a) => {
      if (a.check_in && !a.check_out) present += 1;
      else if (a.check_in && a.check_out) completed += 1;
      else if (!a.check_in && !a.check_out) absent += 1;
    });

    return { present, completed, absent };
  }, [attendanceList]);

  const handleRowClick = (userId: string) => {
    const canView = isEditor || userId === currentUserId;
    if (canView) {
      startTransition(() => {
        router.push(`/attendance/${userId}`);
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#05050a] text-zinc-100 p-4 md:p-8 lg:p-10 overflow-hidden">
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
                <span className="text-xs text-slate-300 font-black tracking-[0.4em] uppercase">Syncing Statements</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-10 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            Attendance Center
          </h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-[0.4em] mt-2">
            Atmospheric Presence Monitoring Engine
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-80">
            <div className="absolute inset-0 bg-sky-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-sky-400 transition-colors" />
            <Input 
              placeholder="Search studio members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full bg-white/[0.03] border-white/10 rounded-2xl pl-12 text-zinc-200 placeholder:text-zinc-700 focus-visible:ring-sky-500/40 focus-visible:border-sky-500/40 transition-all backdrop-blur-md"
            />
          </div>
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-black uppercase tracking-widest text-zinc-400 backdrop-blur-md">
            <Clock3 className="h-4 w-4 text-sky-400" />
            {format(new Date(), 'dd MMM yyyy')}
          </div>
        </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <GlassCard gradientFrom="rgba(16, 185, 129, 0.12)">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400/70">Studio Active</span>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">{stats.present}</p>
            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mt-2">Currently on site</p>
          </div>
        </GlassCard>

        <GlassCard gradientFrom="rgba(56, 189, 248, 0.12)">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-sky-400/70">Statements Closed</span>
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-inner">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">{stats.completed}</p>
            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mt-2">Shifts finalized today</p>
          </div>
        </GlassCard>

        <GlassCard gradientFrom="rgba(244, 63, 94, 0.12)">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-rose-400/70">Unaccounted</span>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-inner">
                <UserX className="h-5 w-5" />
              </div>
            </div>
            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">{stats.absent}</p>
            <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mt-2">Pending check-in</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="relative z-10 overflow-hidden" gradientFrom="rgba(255,255,255,0.02)">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-600">Studio Member</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Entry</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Break</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Exit</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-600 text-center">Status</th>
                <th className="px-8 py-5 text-xs font-black uppercase tracking-[0.3em] text-zinc-600 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => {
                const canView = isEditor || item.user_id === currentUserId;
                return (
                  <tr 
                    key={item.user_id}
                    onClick={() => handleRowClick(item.user_id)}
                    className={cn(
                      "group border-b border-white/[0.03] transition-all duration-500",
                      canView ? "cursor-pointer hover:bg-white/[0.04]" : "opacity-40 grayscale-[0.5]"
                    )}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <Avatar className="h-14 w-14 border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-2xl">
                            <AvatarImage src={item.profiles.avatar_url ?? undefined} alt={item.profiles.full_name ?? ''} />
                            <AvatarFallback className="bg-zinc-900 text-zinc-600 font-black text-sm">{getInitials(item.profiles.full_name)}</AvatarFallback>
                          </Avatar>
                          {!item.check_in && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-[#05050a]" />}
                          {item.check_in && !item.check_out && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#05050a] animate-pulse" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white text-lg tracking-tight truncate group-hover:text-sky-300 transition-colors">{item.profiles.full_name}</p>
                          <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{item.profiles.email?.split('@')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="text-sm font-black text-zinc-400 font-mono tracking-tighter">
                        <TimeDisplay time={item.check_in} />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <div className="text-sm font-black text-zinc-500 font-mono tracking-tighter">
                        <TimeDisplay time={item.lunch_out} />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <div className="text-sm font-black text-zinc-400 font-mono tracking-tighter">
                        <TimeDisplay time={item.check_out} />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {item.check_in ? (
                        item.check_out ? (
                          <Badge variant="outline" className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[10px] font-black uppercase tracking-widest px-3 h-6">Done</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3 h-6">Live</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-black uppercase tracking-widest px-3 h-6">Absent</Badge>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {canView ? (
                        <ChevronRight className="h-6 w-6 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      ) : (
                        <Lock className="h-4 w-4 text-zinc-800 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredList.length === 0 && (
            <div className="py-32 text-center">
              <div className="bg-white/5 h-20 w-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/5">
                <Search className="h-10 w-10 text-zinc-800" />
              </div>
              <p className="text-zinc-600 font-black uppercase tracking-[0.4em] text-xs">No members found</p>
            </div>
          )}
        </div>
      </GlassCard>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}
