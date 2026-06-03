'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, Coffee, LogIn } from 'lucide-react';
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
      glow: "shadow-rose-500/40 ring-rose-500/30",
    },
    MISSING_LUNCH_OUT: {
      title: "Lunch Milestone",
      desc: "It is past the studio break window.",
      icon: Coffee,
      color: "from-amber-600 to-yellow-600",
      glow: "shadow-amber-500/40 ring-amber-500/30",
    },
    LATE_LUNCH_RETURN: {
      title: "Break Time Concluded",
      desc: "Return statement is now overdue.",
      icon: Clock,
      color: "from-purple-600 to-indigo-600",
      glow: "shadow-purple-500/40 ring-purple-500/30",
    }
  }[warning];

  const Icon = warningConfig.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -100, opacity: 0, scale: 0.8 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: -100, opacity: 0, scale: 0.8 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="fixed bottom-6 left-6 z-[100] w-full max-w-[320px]"
      >
        <div className={cn(
          "relative overflow-hidden rounded-[2.5rem] bg-zinc-950/80 backdrop-blur-3xl p-6 border border-white/10 flex items-center gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)]",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-15",
          warningConfig.color
        )}>
          {/* Animated Indicator */}
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl transition-all duration-1000 animate-pulse ring-2",
            "bg-gradient-to-br", warningConfig.color, warningConfig.glow
          )}>
            <Icon className="h-7 w-7 text-white drop-shadow-lg" />
          </div>
          
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-black uppercase tracking-tight text-white truncate">{warningConfig.title}</h4>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] leading-tight">{warningConfig.desc}</p>
          </div>

          {/* Glowing Ping */}
          <div className="absolute top-4 right-4 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}