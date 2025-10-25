
'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { checkIn, checkOut, lunchIn, lunchOut } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
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
import type { AppSettings } from '@/lib/types';

export default function Header() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'checked-out' | 'checked-in' | 'on-lunch' | 'lunch-complete' | 'session-complete'>('checked-out');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'checkout' | 'lunch'>('checkout');
  const { toast } = useToast();
  
  const [showLunchButton, setShowLunchButton] = useState(false);
  const [isRightSide, setIsRightSide] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Fetch attendance and settings in parallel
      const [attendanceRes, settingsRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('user_id', user.id).eq('date', new Date().toISOString().split('T')[0]).single(),
        supabase.from('app_settings').select('value').eq('key', 'lunch_start_time').single()
      ]);

      // Process attendance
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
          setIsRightSide(true);
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

      // Process settings
      const { data: settingsData } = settingsRes;
      const lunchTimeSetting = (settingsData?.value as string | undefined) || '13:00';
      const [hours, minutes] = lunchTimeSetting.split(':').map(Number);
      
      const checkTime = () => {
          const now = new Date();
          if (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)) {
              setShowLunchButton(true);
          }
      };
      
      checkTime();
      const interval = setInterval(checkTime, 60000);
      
      setIsLoading(false);
      
      return () => clearInterval(interval);
    };

    fetchInitialData();
  }, []);
  
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
      lunchOut: 'Successfully started lunch',
      lunchIn: 'Successfully ended lunch',
    };

    const originalStatus = status;
    const originalIsRightSide = isRightSide;
    
    // Optimistic update
    setStatus(optimisticStateMap[action]);
    if (action === 'checkIn') setIsRightSide(false);
    if (action === 'lunchOut') setIsRightSide(true);
    if (action === 'lunchIn') setIsRightSide(false);
    if (action === 'checkOut') setIsRightSide(true);

    const { error } = await actionMap[action]();
    
    if (error) {
      // Revert UI on error
      setStatus(originalStatus);
      setIsRightSide(originalIsRightSide);
      toast({ title: 'Error performing action', description: error, variant: 'destructive' });
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

  const getButtonContent = () => {
    switch (status) {
      case 'checked-out':
        return { text: 'Check In', icon: <CheckInIcon className="ml-2 h-4 w-4 rotate-180" />, color: '#16a34a' };
      case 'checked-in':
        return { text: showLunchButton ? 'Lunch Out' : 'Check Out', icon: <CheckOutIcon className="ml-2 h-4 w-4" />, color: showLunchButton ? '#ca8a04' : '#dc2626' };
      case 'on-lunch':
        return { text: 'Lunch In', icon: <CheckInIcon className="ml-2 h-4 w-4 rotate-180" />, color: '#16a34a' };
      case 'lunch-complete':
        return { text: 'Check Out', icon: <CheckOutIcon className="ml-2 h-4 w-4" />, color: '#dc2626' };
      default:
        return null;
    }
  };

  const buttonContent = getButtonContent();

  if (isLoading) {
    return (
      <header className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center">
        <Skeleton className="h-10 w-32 rounded-full" />
      </header>
    );
  }

  if (status === 'session-complete') {
    return (
      <header className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center overflow-hidden" />
    );
  }

  return (
    <>
      <header
        className={cn(
            "bg-background border-b p-4 md:p-6 relative h-20 flex items-center transition-all duration-700",
            isRightSide ? "justify-end" : "justify-start"
        )}
      >
          {buttonContent && (
            <Button
              onClick={handleMainButtonClick}
              className="rounded-full px-6 py-2 font-medium text-white transition-colors duration-500"
              style={{ backgroundColor: buttonContent.color }}
            >
              <span>{buttonContent.text}</span>
              {buttonContent.icon}
            </Button>
          )}
      </header>

      {/* Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alertType === 'checkout' ? 'Are you sure you want to check out?' : 'What would you like to do?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertType === 'checkout'
                ? 'This will end your current work session for today. You will not be able to check in again until tomorrow.'
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
