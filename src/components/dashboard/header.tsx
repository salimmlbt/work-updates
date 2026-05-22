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
import { cn, calculateDistance } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { differenceInSeconds, parse, isAfter } from 'date-fns';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, MapPinOff } from 'lucide-react';

const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function Header() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [status, setStatus] = useState<'checked-out' | 'checked-in' | 'on-lunch' | 'lunch-complete' | 'session-complete'>('checked-out');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'checkout' | 'lunch'>('checkout');
  
  const [isLateReasonOpen, setIsLateReasonOpen] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [greetingMode, setGreetingType] = useState<'in' | 'out'>('in');

  const { toast } = useToast();

  const [showLunchButton, setShowLunchButton] = useState(false);
  const [lunchTimeSetting, setLunchTimeSetting] = useState<any>({ default: '13:00', friday: '13:00' });
  const [globalGeofencingEnabled, setGlobalGeofencingEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [attendanceRes, settingsRes, geofenceRes, profileRes] = await Promise.all([
        supabase.from('attendance').select('*')
          .eq('user_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0])
          .single(),
        supabase.from('app_settings').select('value')
          .eq('key', 'lunch_start_time')
          .single(),
        supabase.from('app_settings').select('value')
          .eq('key', 'global_geofencing_enabled')
          .single(),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      if (profileRes.data) {
        setUserProfile(profileRes.data);
      }

      setGlobalGeofencingEnabled(geofenceRes.data?.value === true);

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
  }, [supabase, hasMounted]);

  const verifyLocation = async (): Promise<boolean> => {
    // Check if geofencing is enabled globally or for this specific user
    const isGeofenceActive = globalGeofencingEnabled || userProfile?.geofencing_enabled;
    
    if (!isGeofenceActive) return true;

    if (!userProfile?.latitude || !userProfile?.longitude) {
      console.warn("Geofencing enabled but no coordinates set for user.");
      return true; // Fail safe if admin hasn't set coordinates
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({ title: "Unsupported Browser", description: "Your browser doesn't support location services.", variant: "destructive" });
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            userProfile.latitude,
            userProfile.longitude
          );

          const radius = userProfile.radius || 100;

          if (distance <= radius) {
            resolve(true);
          } else {
            toast({ 
              title: "Access Denied", 
              description: `You are not within the permitted workspace boundary (${Math.round(distance)}m away).`,
              variant: "destructive" 
            });
            resolve(false);
          }
        },
        (error) => {
          toast({ title: "Location Error", description: "Please enable location services to proceed.", variant: "destructive" });
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleAction = async (action: 'checkIn' | 'checkOut' | 'lunchOut' | 'lunchIn', reason?: string) => {
    setIsAlertOpen(false);
    setIsLateReasonOpen(false);
    setIsActionPending(true);

    // Step 1: Verify Location
    const isLocationValid = await verifyLocation();
    if (!isLocationValid) {
        setIsActionPending(false);
        return;
    }

    const firstName = userProfile?.full_name?.split(' ')[0] || '';
    let audioUri = null;

    if (action === 'checkIn' || action === 'checkOut') {
      const greeting = action === 'checkIn' ? getGreeting() : 'See you next day';
      const text = `${greeting}, ${firstName}`;
      try {
        const voiceResult = await getVoiceGreeting(text);
        audioUri = voiceResult.data;
      } catch (e) {}
    }

    if (action === 'checkIn') {
      triggerGreeting(firstName, audioUri);
    } else if (action === 'checkOut') {
      triggerCheckoutGreeting(firstName, audioUri);
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
    
    setIsActionPending(false);
  };

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

  const triggerGreeting = (name: string, audioUri?: string | null) => {
    const greeting = getGreeting();
    setGreetingText(greeting);
    setGreetingType('in');
    setShowGreeting(true);
    playTone('in');
    if (audioUri) {
      const audio = new Audio(audioUri);
      audio.play().catch(e => console.warn("AI Voice play blocked:", e));
    } else {
      const utterance = new SpeechSynthesisUtterance(`${greeting}, ${name}`);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => setShowGreeting(false), 4500);
  };

  const triggerCheckoutGreeting = (name: string, audioUri?: string | null) => {
    setGreetingText('See you Next Day');
    setGreetingType('out');
    setShowGreeting(true);
    playTone('out');
    if (audioUri) {
      const audio = new Audio(audioUri);
      audio.play().catch(e => console.warn("AI Voice play blocked:", e));
    } else {
      const utterance = new SpeechSynthesisUtterance(`See you next day, ${name}`);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => setShowGreeting(false), 4500);
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
    return null;
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
                  disabled={isActionPending}
                  className="relative overflow-hidden rounded-full px-6 py-2 font-medium transition-all duration-500 bg-white hover:bg-gray-100 w-36 shadow-lg"
                >
                  {isActionPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: buttonContent.color }} />
                  ) : (
                    <span
                      className="flex items-center justify-center gap-2"
                      style={{ color: buttonContent.color }}
                    >
                      {buttonContent.text}
                      {buttonContent.icon}
                    </span>
                  )}
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
