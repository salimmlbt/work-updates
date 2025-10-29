
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

export default function Header() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'checked-out' | 'checked-in' | 'on-lunch' | 'lunch-complete' | 'session-complete'>('checked-out');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'checkout' | 'lunch'>('checkout');
  const { toast } = useToast();

  const [showLunchButton, setShowLunchButton] = useState(false);
  const [isRightSide, setIsRightSide] = useState(false);
  const [lunchTimeSetting, setLunchTimeSetting] = useState('13:00');
  const [isExpanded, setIsExpanded] = useState(false);

  const supabase = createClient();
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch & subscribe
  useEffect(() => {
    if (!hasMounted) return;
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [attendanceRes, settingsRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', new Date().toISOString().split('T')[0]).single(),
        supabase.from('app_settings').select('value').eq('key', 'lunch_start_time').single()
      ]);

      const { data: attendanceData } = attendanceRes;
      if (attendanceData) {
        if (attendanceData.check_in && !attendanceData.lunch_out && !attendanceData.check_out) {
          setStatus('checked-in');
          setIsRightSide(false);
        } else if (attendanceData.lunch_out && !attendanceData.lunch_in) {
          setStatus('on-lunch');
          setIsRightSide(true);
        } else if (attendanceData.lunch_in && !attendanceData.check_out) {
          setStatus('lunch-complete');
          setIsRightSide(false);
        } else if (attendanceData.check_out) {
          setStatus('session-complete');
        } else {
          setStatus('checked-out');
          setIsRightSide(false);
        }
      } else {
        setStatus('checked-out');
        setIsRightSide(false);
      }

      const { data: settingsData } = settingsRes;
      const fetchedLunchTime = (settingsData?.value as string | undefined) || '13:00';
      setLunchTimeSetting(fetchedLunchTime);
      setIsLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel('app-settings-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.lunch_start_time` },
        (payload) => {
          const newTime = (payload.new.value as string | undefined) || '13:00';
          setLunchTimeSetting(newTime);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [supabase, hasMounted]);

  // Check time
  useEffect(() => {
    if (isLoading || !hasMounted) return;

    const checkTime = () => {
      const [hours, minutes] = lunchTimeSetting.split(':').map(Number);
      const now = new Date();
      setShowLunchButton(now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes));
    };

    checkTime();
    const interval = setInterval(checkTime, 30000);
    return () => clearInterval(interval);
  }, [isLoading, lunchTimeSetting, hasMounted]);

  // Actions
  const handleAction = async (action: 'checkIn' | 'checkOut' | 'lunchOut' | 'lunchIn') => {
    setIsAlertOpen(false);
    const optimisticStateMap = {
      checkIn: 'checked-in',
      lunchOut: 'on-lunch',
      lunchIn: 'lunch-complete',
      checkOut: 'session-complete',
    } as const;

    const actionMap = { checkIn, checkOut, lunchOut, lunchIn };
    const toastMessages = {
      checkIn: 'Successfully checked in',
      checkOut: 'Successfully checked out',
      lunchOut: 'Lunch started',
      lunchIn: 'Lunch ended',
    };

    const originalStatus = status;
    const originalIsRightSide = isRightSide;

    setStatus(optimisticStateMap[action]);
    if (action === 'checkIn') setIsRightSide(false);
    if (action === 'lunchOut') setIsRightSide(true);
    if (action === 'lunchIn') setIsRightSide(false);
    if (action === 'checkOut') setIsRightSide(true);

    const { error } = await actionMap[action]();
    if (error) {
      setStatus(originalStatus);
      setIsRightSide(originalIsRightSide);
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: toastMessages[action] });
    }
  };

  const handleMainButtonClick = () => {
    if (status === 'checked-in' && showLunchButton) {
      setAlertType('lunch');
      setIsAlertOpen(true);
    } else if (status === 'checked-in' || status === 'lunch-complete') {
      setAlertType('checkout');
      setIsAlertOpen(true);
    } else if (status === 'checked-out') {
      handleAction('checkIn');
    } else if (status === 'on-lunch') {
      handleAction('lunchIn');
    }
  };

  // Button content
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

  if (!hasMounted) {
    return <header className="bg-background border-b h-20 flex items-center p-4 md:p-6" />;
  }

  const buttonContent = getButtonContent();

  if (isLoading) {
    return (
      <header className="bg-background border-b p-4 md:p-6 h-20 flex items-center">
        <Skeleton className="h-10 w-32 rounded-full" />
      </header>
    );
  }

  if (status === 'session-complete') {
    return <header className="bg-background border-b h-20 flex items-center" />;
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
          "border-b w-full flex items-center overflow-hidden transition-all duration-500 ease-in-out",
          isRightSide ? "justify-end" : "justify-start",
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
              key={buttonContent.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="px-4 md:px-6"
            >
              <Button
                onClick={handleMainButtonClick}
                className="rounded-full px-6 py-2 font-medium transition-all duration-500 bg-white hover:bg-gray-100"
              >
                <span
                  className="flex items-center gap-2"
                  style={{ color: buttonContent.color }}
                >
                  {buttonContent.text}
                  {buttonContent.icon}
                </span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

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
