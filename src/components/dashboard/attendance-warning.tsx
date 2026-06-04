
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, Coffee, LogIn, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parse, isAfter, addMinutes, format } from 'date-fns';
import type { Profile, Attendance } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  profile: Profile | null;
}

export function AttendanceWarning({ profile }: Props) {
  const [warning, setWarning] = useState<'MISSING_CHECK_IN' | 'MISSING_LUNCH_OUT' | 'LATE_LUNCH_RETURN' | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [lunchTime, setLunchTime] = useState<{ default: string; friday: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [attRes, settingsRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('user_id', profile.id).eq('date', today).maybeSingle(),
        supabase.from('app_settings').select('value').eq('key', 'lunch_start_time').single()
      ]);

      if (attRes.data) setAttendance(attRes.data as Attendance);
      
      if (settingsRes.data?.value) {
        const val = settingsRes.data.value;
        if (typeof val === 'string' && val.trim().startsWith('{')) {
          try {
            setLunchTime(JSON.parse(val));
          } catch (e) {
            setLunchTime({ default: '13:00', friday: '13:00' });
          }
        } else {
          const time = typeof val === 'string' ? val : '13:00';
          setLunchTime({ default: time, friday: time });
        }
      }
    };

    fetchData();

    // Sync status in real-time
    const channel = supabase.channel(`guard-attendance-${profile.id}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'attendance', filter: `user_id=eq.${profile.id}` }, 
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setAttendance(null);
          } else {
            setAttendance(payload.new as Attendance);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, supabase]);

  useEffect(() => {
    if (!profile) return;

    const checkMilestones = () => {
      const now = new Date();
      
      // 1. Missing Check-In Warning
      if (!attendance?.check_in && profile.work_start_time) {
        try {
          const startTime = parse(profile.work_start_time, 'HH:mm:ss', now);
          if (isAfter(now, addMinutes(startTime, 1))) {
            setWarning('MISSING_CHECK_IN');
            return;
          }
        } catch (e) {}
      }

      // 2. Missing Lunch Out Warning
      if (attendance?.check_in && !attendance.lunch_out && !attendance.check_out && lunchTime) {
        const isFriday = now.getDay() === 5;
        const lTimeStr = isFriday ? lunchTime.friday : lunchTime.default;
        if (lTimeStr) {
          try {
            const lStartTime = parse(lTimeStr, 'HH:mm', now);
            if (isAfter(now, addMinutes(lStartTime, 15))) {
              setWarning('MISSING_LUNCH_OUT');
              return;
            }
          } catch (e) {}
        }
      }

      // 3. Late Lunch Return Warning (More than 60 mins)
      if (attendance?.lunch_out && !attendance.lunch_in && !attendance.check_out) {
        const lunchOutTime = new Date(attendance.lunch_out);
        if (isAfter(now, addMinutes(lunchOutTime, 61))) {
          setWarning('LATE_LUNCH_RETURN');
          return;
        }
      }

      setWarning(null);
    };

    checkMilestones();
    const interval = setInterval(checkMilestones, 30000);
    return () => clearInterval(interval);
  }, [profile, attendance, lunchTime]);

  if (!warning) return null;

  const warningConfig = {
    MISSING_CHECK_IN: {
      title: "Missing Check-In",
      desc: "Your scheduled shift has started.",
      icon: LogIn,
      color: "from-rose-600 to-orange-600",
      glow: "shadow-rose-500/20 ring-rose-500/30",
      edgeLight: "rgba(244, 63, 94, 0.4)", // Red (Rose-500)
    },
    MISSING_LUNCH_OUT: {
      title: "Lunch Milestone",
      desc: "It is past the studio break window.",
      icon: Coffee,
      color: "from-amber-600 to-yellow-600",
      glow: "shadow-amber-500/20 ring-amber-500/30",
      edgeLight: "rgba(245, 158, 11, 0.4)", // Yellow (Amber-500)
    },
    LATE_LUNCH_RETURN: {
      title: "Break Time Concluded",
      desc: "Return statement is now overdue.",
      icon: Clock,
      color: "from-sky-600 to-indigo-600",
      glow: "shadow-sky-500/20 ring-sky-500/30",
      edgeLight: "rgba(14, 165, 233, 0.4)", // Blue (Sky-500)
    }
  }[warning];

  const Icon = warningConfig.icon;

  return (
    <AnimatePresence>
      {/* 🌌 Cinematic Edge Light Overlay */}
      <motion.div
        key={`edge-light-${warning}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        exit={{ opacity: 0 }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="fixed inset-0 z-[140] pointer-events-none isolation-auto"
        style={{
          boxShadow: `inset 0 0 100px ${warningConfig.edgeLight}, inset 0 0 40px ${warningConfig.edgeLight}`,
        }}
      />

      <div className="fixed top-28 left-0 right-0 z-[150] flex justify-center pointer-events-none px-4 isolation-auto">
        <motion.div
          initial={{ y: -50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-3xl pointer-events-auto isolate"
        >
          <div className={cn(
            "group relative overflow-hidden rounded-[2.5rem] bg-black/20 backdrop-blur-[40px] p-8 border border-white/10 flex items-center justify-between gap-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-700",
            "hover:bg-black/30 hover:border-white/20"
          )}
          style={{
            WebkitBackdropFilter: 'blur(40px)',
            maskImage: 'linear-gradient(white, white)',
          }}>
            {/* 💎 Glass Inner Glare */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-30 pointer-events-none" />

            {/* Animated Background Glow on Hover */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none",
              warningConfig.color
            )} />
            
            <div className="flex items-center gap-8 relative z-10">
              {/* Dynamic Pulsing Icon */}
              <div className={cn(
                "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-all duration-700 ring-1 group-hover:scale-110 group-hover:rotate-3",
                "bg-gradient-to-br", warningConfig.color, warningConfig.glow
              )}>
                <Icon className="h-8 w-8 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-sky-300 transition-colors duration-500">
                  {warningConfig.title}
                </h4>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em] leading-tight opacity-80">
                  {warningConfig.desc}
                </p>
              </div>
            </div>

            {/* Live Status Guard Badge */}
            <div className="hidden sm:flex items-center gap-4 px-6 py-3 rounded-full bg-white/5 border border-white/5 relative z-10 group-hover:bg-white/10 transition-all duration-500">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_10px_#10b981]"></span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400 group-hover:text-white transition-colors">
                  System Guard Active
                </span>
            </div>

            {/* Cyber decoration lines */}
            <div className="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-white/10 to-transparent opacity-10" />
            <div className="absolute bottom-0 left-1/4 w-[1px] h-full bg-gradient-to-t from-white/10 to-transparent opacity-10" />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
