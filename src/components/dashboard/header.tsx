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
import { differenceInSeconds, parse, isAfter, addMinutes } from 'date-fns';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2, MapPinOff } from 'lucide-react';
import type { Profile, PermittedLocation } from '@/lib/types';

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
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [greetingMode, setGreetingType] = useState<'in' | 'out'>('in');

  const { toast } = useToast();

  const [showLunchButton, setShowLunchButton] = useState(false);
  const [lunchTimeSetting, setLunchTimeSetting] = useState<any>({ default: '13:00', friday: '13:00' });
  const [lateGracePeriodSetting, setLateGracePeriodSetting] = useState<number>(0);
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
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (attendanceRecord?.check_in) {
        const start = new Date(attendanceRecord.check_in).getTime();
        const now = new Date().getTime();
        setElapsedSeconds(Math.floor((now - start) / 1000));
    }
  }, [attendanceRecord]);


  useEffect(() => {
    if (!hasMounted) return;

    let profileChannel: any;

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [attendanceRes, settingsRes, graceRes, geofenceRes, profileRes] = await Promise.all([
        supabase.from('attendance').select('*')
          .eq('user_id', user.id)
          .eq('date', new Date().toISOString().split('T')[0])
          .maybeSingle(),
        supabase.from('app_settings').select('value')
          .eq('key', 'lunch_start_time')
          .single(),
        supabase.from('app_settings').select('value')
          .eq('key', 'late_check_in_grace_period')
          .single(),
        supabase.from('app_settings').select('value')
          .eq('key', 'global_geofencing_enabled')
          .single(),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      if (profileRes.data) {
        setUserProfile(profileRes.data as Profile);
      }

      // Sync Profile
      profileChannel = supabase
        .channel(`header-profile-sync-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
            setUserProfile(prev => ({ ...prev, ...payload.new } as Profile));
        })
        .subscribe();

      setGlobalGeofencingEnabled(geofenceRes.data?.value === true);
      setLateGracePeriodSetting((graceRes.data?.value as number) || 0);

      const attendanceData = attendanceRes.data;
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

      const rawValue = settingsRes.data?.value;
      if (rawValue && typeof rawValue === 'string' && rawValue.trim().startsWith('{')) {
          try {
              setLunchTimeSetting(JSON.parse(rawValue));
          } catch (e) {
              setLunchTimeSetting({ default: '13:00', friday: '13:00' });
          }
      } else if (rawValue && typeof rawValue === 'string' && rawValue.trim() !== '') {
          setLunchTimeSetting({ default: rawValue, friday: rawValue });
      }
      
      setIsLoading(false);
    };

    fetchInitialData();

    return () => {
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [supabase, hasMounted]);

  useEffect(() => {
    if (!hasMounted || !lunchTimeSetting) return;

    const checkLunchTime = () => {
      const now = new Date();
      const isFriday = now.getDay() === 5;
      const targetTimeStr = isFriday ? lunchTimeSetting.friday : lunchTimeSetting.default;
      
      if (!targetTimeStr) return;

      const [hours, minutes] = targetTimeStr.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);

      setShowLunchButton(now >= targetDate);
    };

    checkLunchTime();
    const interval = setInterval(checkLunchTime, 30000);
    return () => clearInterval(interval);
  }, [lunchTimeSetting, hasMounted]);

  const verifyLocation = async (): Promise<boolean> => {
    const isGeofenceActive = globalGeofencingEnabled || userProfile?.geofencing_enabled;
    if (!isGeofenceActive) return true;

    const permittedZones: PermittedLocation[] = [...(userProfile?.permitted_locations || [])];
    
    if (userProfile?.latitude && userProfile?.longitude) {
        permittedZones.push({
            name: 'Assigned Site',
            latitude: userProfile.latitude,
            longitude: userProfile.longitude,
            radius: userProfile.radius || 100
        });
    }

    if (permittedZones.length === 0) return true;

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({ title: "Hardware Error", description: "GPS services not available on this device.", variant: "destructive" });
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: userLat, longitude: userLng } = position.coords;
          let isWithinAnyZone = false;
          let minDistance = Infinity;

          for (const zone of permittedZones) {
              const distance = calculateDistance(userLat, userLng, zone.latitude, zone.longitude);
              if (distance <= zone.radius) {
                  isWithinAnyZone = true;
                  break;
              }
              minDistance = Math.min(minDistance, distance);
          }

          if (isWithinAnyZone) resolve(true);
          else {
            toast({ title: "Access Denied", description: `You are outside your permitted zones (Nearest: ${Math.round(minDistance)}m).`, variant: "destructive" });
            resolve(false);
          }
        },
        () => {
          toast({ title: "Location Error", description: "Proximity validation failed. Please enable location access.", variant: "destructive" });
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

    if (action === 'checkIn') triggerGreeting(firstName, audioUri);
    else if (action === 'checkOut') triggerCheckoutGreeting(firstName, audioUri);

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
    if (action === 'checkIn') result = await checkIn(reason);
    else if (action === 'checkOut') result = await checkOut();
    else if (action === 'lunchOut') result = await lunchOut();
    else result = await lunchIn();

    if (result.error) {
      setStatus(originalStatus);
      setIsTimerRunning(originalStatus === 'checked-in' || originalStatus === 'lunch-complete');
      toast({ title: 'System Error', description: result.error, variant: 'destructive' });
    } else if (result.data) {
      setAttendanceRecord((prev: any) => ({ ...prev, ...result.data }));
    }
    
    setIsActionPending(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const triggerGreeting = (name: string, audioUri?: string | null) => {
    const greeting = getGreeting();
    setGreetingText(greeting);
    setGreetingType('in');
    setShowGreeting(true);
    if (audioUri) new Audio(audioUri).play().catch(() => {});
    setTimeout(() => setShowGreeting(false), 4500);
  };

  const triggerCheckoutGreeting = (name: string, audioUri?: string | null) => {
    setGreetingText('See you Next Day');
    setGreetingType('out');
    setShowGreeting(true);
    if (audioUri) new Audio(audioUri).play().catch(() => {});
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
          // Apply Grace Period
          const lateThreshold = addMinutes(scheduledStart, lateGracePeriodSetting);
          
          if (isAfter(now, lateThreshold)) {
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

  if (status === 'session-complete' && !showGreeting) return null;

  return (
    <>
      <AnimatePresence>
        {showGreeting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-2xl">
            <motion.div initial={{ scale: 0.8, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 1.1, y: -20, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="text-center p-12">
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 border border-white/20 shadow-2xl mb-8">
                {greetingMode === 'out' ? <span className="text-5xl">👋</span> : greetingText === 'Good Morning' ? <span className="text-5xl">☀️</span> : <span className="text-5xl">⛅</span>}
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-4">{greetingText}</h1>
              <p className="text-3xl md:text-4xl font-semibold text-white/80 tracking-tight">{userProfile?.full_name}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        animate={{ height: isExpanded ? '5rem' : '10px' }}
        className="w-full flex items-center overflow-hidden transition-all"
        style={{ backgroundColor: buttonContent?.color || 'var(--background)' }}
      >
        {isExpanded && buttonContent && (
            <div className="px-4 md:px-6 flex justify-center items-center w-full">
              <div className="flex-1 flex justify-start">
                <div className="bg-white/20 rounded-full px-4 py-1 text-white font-mono text-lg tracking-wider">{formatTime(elapsedSeconds)}</div>
              </div>
              <div className="flex-1 flex justify-center">
                <Button onClick={handleMainButtonClick} disabled={isActionPending} className="rounded-full px-6 py-2 font-medium transition-all bg-white hover:bg-gray-100 w-36 shadow-lg">
                  {isActionPending ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: buttonContent.color }} /> : <span className="flex items-center gap-2" style={{ color: buttonContent.color }}>{buttonContent.text}{buttonContent.icon}</span>}
                </Button>
              </div>
              <div className="flex-1" />
            </div>
        )}
      </motion.header>

      <AlertDialog open={isLateReasonOpen} onOpenChange={setIsLateReasonOpen}>
        <AlertDialogContent className="rounded-3xl border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Late Check-In Alert</AlertDialogTitle>
            <AlertDialogDescription>
              A reason is required after the allowed {lateGracePeriodSetting} min grace period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="late-reason" className="text-sm font-semibold text-slate-700">Reason Statement</Label>
            <Textarea id="late-reason" placeholder="Traffic, emergency, or other cause..." className="rounded-xl min-h-[100px]" value={lateReason} onChange={(e) => setLateReason(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => setIsLateReasonOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-primary" onClick={() => handleAction('checkIn', lateReason)} disabled={!lateReason.trim()}>Submit & Check In</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="rounded-3xl border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">{alertType === 'checkout' ? 'Commit your work day?' : 'Initiate break period?'}</AlertDialogTitle>
            <AlertDialogDescription>{alertType === 'checkout' ? 'Finalizing your attendance. Proximity check will be performed immediately.' : 'Proximity check will be performed to start your lunch break.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Wait, go back</AlertDialogCancel>
            {alertType === 'lunch' && <AlertDialogAction onClick={() => handleAction('lunchOut')} className="bg-yellow-500 hover:bg-yellow-600 rounded-xl text-white shadow-lg">Start Lunch Out</AlertDialogAction>}
            <AlertDialogAction onClick={() => handleAction('checkOut')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-lg">Check Out Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
