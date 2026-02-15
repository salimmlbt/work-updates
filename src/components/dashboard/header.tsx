
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { checkIn, checkOut, lunchIn, lunchOut, getVoiceGreeting } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { differenceInSeconds, parse, isAfter } from 'date-fns';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function Header() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'checked-out' | 'checked-in' | 'on-lunch' | 'lunch-complete' | 'session-complete'>('checked-out');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'checkout' | 'lunch'>('checkout');
  
  const [isLateReasonOpen, setIsLateReasonOpen] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Greeting State
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [greetingMode, setGreetingType] = useState<'in' | 'out'>('in');

  const { toast } = useToast();

  const [showLunchButton, setShowLunchButton] = useState(false);
  const [lunchTimeSetting, setLunchTimeSetting] = useState<any>({ default: '13:00', friday: '13:00' });
  const [isExpanded, setIsExpanded] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Initial fetch + listen for settings updates
  useEffect(() => {
    if (!hasMounted) return;

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [attendanceRes, settingsRes, profileRes] = await Promise.all([
        supabase.from('attendance').select('*')
          .eq('user_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0])
          .single(),
        supabase.from('app_settings').select('value')
          .eq('key', 'lunch_start_time')
          .single(),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      if (profileRes.data) {
        setUserProfile(profileRes.data);
      }

      const { data: attendanceData } = attendanceRes;
      if (attendanceData) {
        setAttendanceRecord(attendanceData);
        if (attendanceData.check_in && !attendanceData.lunch_out && !attendanceData.check_out) {
          setStatus('checked-in');
          setIsTimerRunning(true);
        } else if (attendanceData.lunch_out && !attendanceData.lunch_in) {
          setStatus('on-lunch');
          setIsTimerRunning(false);
        } else if (attendanceData.lunch_in && !attendanceData.check_out) {
          setStatus('lunch-complete');
          setIsTimerRunning(true);
        } else if (attendanceData.check_out) {
          setStatus('session-complete');
          setIsTimerRunning(false);
        }
      }

      const { data: settingsData } = settingsRes;
      const rawValue = settingsData?.value;
      if (rawValue && typeof rawValue === 'string' && rawValue.trim().startsWith('{')) {
          try {
              setLunchTimeSetting(JSON.parse(rawValue));
          } catch (e) {
              setLunchTimeSetting({ default: '13:00', friday: '13:00' });
          }
      } else if (rawValue && typeof rawValue === 'string' && rawValue.trim() !== '') {
          setLunchTimeSetting({ default: rawValue, friday: rawValue });
      } else if (rawValue && typeof rawValue === 'object') {
          setLunchTimeSetting(rawValue);
      }
      
      setIsLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel('app-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.lunch_start_time` },
        (payload) => {
          const rawValue = payload.new.value;
          if (rawValue && typeof rawValue === 'string' && rawValue.trim().startsWith('{')) {
              try {
                  setLunchTimeSetting(JSON.parse(rawValue));
              } catch (e) {
                  setLunchTimeSetting({ default: '13:00', friday: '13:00' });
              }
          } else if (rawValue && typeof rawValue === 'string' && rawValue.trim() !== '') {
              setLunchTimeSetting({ default: rawValue, friday: rawValue });
          } else if (rawValue && typeof rawValue === 'object') {
              setLunchTimeSetting(rawValue);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [supabase, hasMounted]);

  useEffect(() => {
    if (!attendanceRecord?.id) return;

    const channel = supabase
      .channel('realtime-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `id=eq.${attendanceRecord.id}` }, (payload) => {
        if (payload.new) {
          setAttendanceRecord(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attendanceRecord?.id]);

  useEffect(() => {
    if (!attendanceRecord?.check_in) {
      setElapsedSeconds(0);
      return;
    }

    const calculateWorkedSeconds = () => {
      const checkInTime = new Date(attendanceRecord.check_in);
      const now = new Date();

      let totalElapsed = differenceInSeconds(now, checkInTime);

      if (attendanceRecord.lunch_out && attendanceRecord.lunch_in) {
        const lunchOutTime = new Date(attendanceRecord.lunch_out);
        const lunchInTime = new Date(attendanceRecord.lunch_in);
        totalElapsed -= differenceInSeconds(lunchInTime, lunchOutTime);
      } else if (attendanceRecord.lunch_out && !attendanceRecord.lunch_in) {
        const lunchOutTime = new Date(attendanceRecord.lunch_out);
        totalElapsed = differenceInSeconds(lunchOutTime, checkInTime);
      } else if (attendanceRecord.check_out) {
        const checkOutTime = new Date(attendanceRecord.check_out);
        totalElapsed = differenceInSeconds(checkOutTime, checkInTime);
        if (attendanceRecord.lunch_out && attendanceRecord.lunch_in) {
          const lunchOutTime = new Date(attendanceRecord.lunch_out);
          const lunchInTime = new Date(attendanceRecord.lunch_in);
          totalElapsed -= differenceInSeconds(lunchInTime, lunchOutTime);
        }
      }

      return Math.max(0, totalElapsed);
    };

    setElapsedSeconds(calculateWorkedSeconds());

    let interval: NodeJS.Timeout | null = null;

    if (isTimerRunning && !attendanceRecord.check_out) {
      interval = setInterval(() => {
        setElapsedSeconds(calculateWorkedSeconds());
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    isTimerRunning,
    attendanceRecord?.check_in,
    attendanceRecord?.lunch_out,
    attendanceRecord?.lunch_in,
    attendanceRecord?.check_out
  ]);

  useEffect(() => {
    if (isLoading || !hasMounted) return;

    const checkTime = () => {
      const now = new Date();
      const isFriday = now.getDay() === 5;
      const targetTimeStr = isFriday ? (lunchTimeSetting.friday || '13:00') : (lunchTimeSetting.default || '13:00');
      
      const [hours, minutes] = targetTimeStr.split(':').map(Number);
      setShowLunchButton(now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes));
    };

    checkTime();
    const interval = setInterval(checkTime, 30000);
    return () => clearInterval(interval);
  }, [isLoading, lunchTimeSetting, hasMounted]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const playTone = (type: 'in' | 'out') => {
    if (typeof window === 'undefined') return;
    const audio = new Audio(type === 'in' ? '/checkin-tone.mp3' : '/checkout-tone.mp3');
    audio.play().catch(e => console.warn("Tone play blocked:", e));
  };

  const playAIGreeting = useCallback(async (text: string, name: string) => {
    const fullText = `${text}, ${name}`;
    const { data: audioUri, error } = await getVoiceGreeting(fullText);
    
    if (audioUri) {
      const audio = new Audio(audioUri);
      audio.play().catch(e => console.warn("AI Voice play blocked:", e));
    } else if (error) {
      console.warn("AI Voice generation failed, using fallback speech synthesis.");
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const triggerGreeting = (name: string) => {
    const greeting = getGreeting();
    setGreetingText(greeting);
    setGreetingType('in');
    setShowGreeting(true);
    playTone('in');
    playAIGreeting(greeting, name);
    
    setTimeout(() => {
      setShowGreeting(false);
    }, 4500);
  };

  const triggerCheckoutGreeting = (name: string) => {
    setGreetingText('See you Next Day');
    setGreetingType('out');
    setShowGreeting(true);
    playTone('out');
    playAIGreeting('See you next day', name);
    
    setTimeout(() => {
      setShowGreeting(false);
    }, 4500);
  };

  const handleAction = async (action: 'checkIn' | 'checkOut' | 'lunchOut' | 'lunchIn', reason?: string) => {
    setIsAlertOpen(false);
    setIsLateReasonOpen(false);

    // Instant Feedback UI
    const firstName = userProfile?.full_name?.split(' ')[0] || '';
    if (action === 'checkIn') {
      triggerGreeting(firstName);
    } else if (action === 'checkOut') {
      triggerCheckoutGreeting(firstName);
    }

    const optimisticStateMap = {
      checkIn: 'checked-in',
      lunchOut: 'on-lunch',
      lunchIn: 'lunch-complete',
      checkOut: 'session-complete',
    } as const;

    const originalStatus = status;
    setIsTimerRunning(action === 'checkIn' || action === 'lunchIn');
    setStatus(optimisticStateMap[action]);

    // Handle background logic
    let result;
    if (action === 'checkIn') {
        result = await checkIn(reason);
    } else if (action === 'checkOut') {
        result = await checkOut();
    } else if (action === 'lunchOut') {
        result = await lunchOut();
    } else {
        result = await lunchIn();
    }

    const { error, data } = result;

    if (error) {
      setStatus(originalStatus);
      setIsTimerRunning(originalStatus === 'checked-in' || originalStatus === 'lunch-complete');
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else if (data) {
      setAttendanceRecord((prev: any) => ({ ...prev, ...data }));
    }
  };

  const handleMainButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (status === 'checked-in' && showLunchButton) {
      setAlertType('lunch');
      setIsAlertOpen(true);
    } else if (status === 'checked-in' || status === 'lunch-complete') {
      setAlertType('checkout');
      setIsAlertOpen(true);
    } else if (status === 'checked-out') {
      if (userProfile?.work_start_time) {
          const now = new Date();
          const scheduledStart = parse(userProfile.work_start_time, 'HH:mm:ss', now);
          if (isAfter(now, scheduledStart)) {
              setIsLateReasonOpen(true);
              return;
          }
      }
      handleAction('checkIn');
    } else if (status === 'on-lunch') {
      handleAction('lunchIn');
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'checked-out':
        return { text: 'Check In', icon: <CheckInIcon className="ml-2 h-4 w-4 rotate-180 text-green-600" />, color: '#16a34a' };
      case 'checked-in':
        return { text: showLunchButton ? 'Lunch Out' : 'Check Out', icon: <CheckOutIcon className="ml-2 h-4 w-4 text-yellow-600" />, color: showLunchButton ? '#ca8a04' : '#dc2626' };
      case 'on-lunch':
        return { text: 'Lunch In', icon: <CheckInIcon className="ml-2 h-4 w-4 rotate-180 text-blue-600" />, color: '#3b82f6' };
      case 'lunch-complete':
        return { text: 'Check Out', icon: <CheckOutIcon className="ml-2 h-4 w-4 text-red-600" />, color: '#dc2626' };
      default:
        return null;
    }
  };

  if (!hasMounted) return <header className="bg-background h-20 flex items-center p-4 md:p-6" />;

  const buttonContent = getButtonContent();

  if (isLoading) {
    return (
      <header className="bg-background p-4 md:p-6 h-20 flex justify-center items-center">
        <Skeleton className="h-10 w-36 rounded-full" />
      </header>
    );
  }

  if (status === 'session-complete' && !showGreeting) {
    return <header className="bg-background h-20 flex items-center" />;
  }

  const headerHeight = isExpanded ? '5rem' : '10px';

  return (
    <>
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.8, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 1.1, y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="text-center p-12"
            >
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 border border-white/20 shadow-2xl mb-8"
              >
                {greetingMode === 'out' ? (
                  <span className="text-5xl">👋</span>
                ) : greetingText === 'Good Morning' ? (
                  <span className="text-5xl">☀️</span>
                ) : greetingText === 'Good Afternoon' ? (
                  <span className="text-5xl">⛅</span>
                ) : (
                  <span className="text-5xl">🌙</span>
                )}
              </motion.div>
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-4">
                {greetingText}
              </h1>
              <p className="text-3xl md:text-4xl font-semibold text-white/80 tracking-tight">
                {userProfile?.full_name}
              </p>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 4.5 }}
                className="h-1 bg-white/20 rounded-full mt-12 mx-auto max-w-[200px] overflow-hidden"
              >
                <motion.div className="h-full bg-white w-full" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        animate={{ height: headerHeight }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className={cn(
          "w-full flex items-center overflow-hidden transition-all duration-500 ease-in-out",
          isExpanded && "backdrop-blur-md"
        )}
        style={{
          backgroundColor: buttonContent?.color || 'var(--background)',
          boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        <AnimatePresence mode="wait">
          {isExpanded && buttonContent && (
            <motion.div
              key="header-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="px-4 md:px-6 flex justify-center items-center w-full"
            >
              <div className="flex-1 flex justify-start">
                <div className="bg-white/20 rounded-full px-4 py-1 text-white font-mono text-lg tracking-wider">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              <div className="flex-1 flex justify-center">
                <Button
                  onClick={handleMainButtonClick}
                  className="relative overflow-hidden rounded-full px-6 py-2 font-medium transition-all duration-500 bg-white hover:bg-gray-100 w-36 shadow-lg"
                >
                  <span
                    className="flex items-center justify-center gap-2"
                    style={{ color: buttonContent.color }}
                  >
                    {buttonContent.text}
                    {buttonContent.icon}
                  </span>
                </Button>
              </div>
              <div className="flex-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <AlertDialog open={isLateReasonOpen} onOpenChange={setIsLateReasonOpen}>
        <AlertDialogContent className="rounded-3xl border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Late Check-In Detected</AlertDialogTitle>
            <AlertDialogDescription>
              It looks like you're checking in after your scheduled start time ({userProfile?.work_start_time?.slice(0, 5)}). Please provide a reason for the delay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="late-reason" className="text-sm font-semibold text-slate-700">Reason for delay</Label>
            <Textarea 
                id="late-reason" 
                placeholder="e.g., Traffic, Personal emergency, Technical issues..." 
                className="rounded-xl min-h-[100px]"
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" onClick={() => { setIsLateReasonOpen(false); setLateReason(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                className="rounded-xl bg-primary shadow-lg"
                onClick={() => handleAction('checkIn', lateReason)}
                disabled={!lateReason.trim()}
            >
              Submit & Check In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="rounded-3xl border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              {alertType === 'checkout' ? 'End your work day?' : 'Ready for lunch?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertType === 'checkout'
                ? 'This will finalize your attendance for today. Make sure all your tasks are updated!'
                : 'You can either start your lunch break or end your work day entirely.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Wait, go back</AlertDialogCancel>
            {alertType === 'lunch' && (
              <AlertDialogAction onClick={() => handleAction('lunchOut')} className="bg-yellow-500 hover:bg-yellow-600 rounded-xl text-white shadow-lg">
                Start Lunch Out
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => handleAction('checkOut')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-lg"
            >
              Check Out Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
