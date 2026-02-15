
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { checkIn, checkOut, lunchIn, lunchOut } from '@/app/actions';
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
      if (typeof rawValue === 'string') {
          try {
              setLunchTimeSetting(JSON.parse(rawValue));
          } catch {
              setLunchTimeSetting({ default: rawValue, friday: rawValue });
          }
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
          if (typeof rawValue === 'string') {
              try {
                  setLunchTimeSetting(JSON.parse(rawValue));
              } catch {
                  setLunchTimeSetting({ default: rawValue, friday: rawValue });
              }
          } else if (rawValue && typeof rawValue === 'object') {
              setLunchTimeSetting(rawValue);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [supabase, hasMounted]);

  // ✅ Real-time attendance listener
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

  // ✅ Timer Logic
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

  // Check lunch time visibility
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

  // Action handler
  const handleAction = async (action: 'checkIn' | 'checkOut' | 'lunchOut' | 'lunchIn', reason?: string) => {
    setIsAlertOpen(false);
    setIsLateReasonOpen(false);

    const optimisticStateMap = {
      checkIn: 'checked-in',
      lunchOut: 'on-lunch',
      lunchIn: 'lunch-complete',
      checkOut: 'session-complete',
    } as const;

    const originalStatus = status;
    setIsTimerRunning(action === 'checkIn' || action === 'lunchIn');
    setStatus(optimisticStateMap[action]);

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
    } else {
      const toastMessages = {
        checkIn: 'Successfully checked in',
        checkOut: 'Successfully checked out',
        lunchOut: 'Lunch started',
        lunchIn: 'Lunch ended',
      };
      toast({ title: toastMessages[action] });
      if (data) {
        setAttendanceRecord((prev: any) => ({ ...prev, ...data }));
      }
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
      // Late check-in detection
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

  if (status === 'session-complete') {
    return <header className="bg-background h-20 flex items-center" />;
  }

  const headerHeight = isExpanded ? '5rem' : '10px';

  return (
    <>
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
                  className="relative overflow-hidden rounded-full px-6 py-2 font-medium transition-all duration-500 bg-white hover:bg-gray-100 w-36"
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

      {/* Late Reason Dialog */}
      <AlertDialog open={isLateReasonOpen} onOpenChange={setIsLateReasonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Late Check-In Detected</AlertDialogTitle>
            <AlertDialogDescription>
              It looks like you're checking in after your scheduled start time ({userProfile?.work_start_time?.slice(0, 5)}). Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="late-reason">Reason for delay</Label>
            <Textarea 
                id="late-reason" 
                placeholder="e.g., Traffic, Personal emergency..." 
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsLateReasonOpen(false); setLateReason(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => handleAction('checkIn', lateReason)}
                disabled={!lateReason.trim()}
            >
              Submit & Check In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertType === 'checkout' ? 'Are you sure you want to check out?' : 'What would you like to do?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertType === 'checkout'
                ? 'This will end your current work session for today.'
                : 'You can either start your lunch break or end your work day.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {alertType === 'lunch' && (
              <AlertDialogAction onClick={() => handleAction('lunchOut')} className="bg-yellow-500 hover:bg-yellow-600">
                Lunch Out
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => handleAction('checkOut')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Check Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
