'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
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

export default function Header() {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'checked-out' | 'checked-in' | 'on-lunch' | 'lunch-complete' | 'session-complete'>('checked-out');
  const [isPending, setIsPending] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertType, setAlertType] = useState<'checkout' | 'lunch'>('checkout');
  const { toast } = useToast();

  const containerRef = useRef<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [translatePx, setTranslatePx] = useState(0);
  const [showLunchButton, setShowLunchButton] = useState(false);
  const [isRightSide, setIsRightSide] = useState(false);

  const safeMargin = 12; // consistent spacing

  const measure = () => {
    const container = containerRef.current;
    const btn = btnRef.current;
    if (!container || !btn) return;

    const cs = getComputedStyle(container);
    const padLeft = parseFloat(cs.paddingLeft || '0');
    const padRight = parseFloat(cs.paddingRight || '0');
    const containerInnerWidth = container.clientWidth - padLeft - padRight;
    const btnWidth = btn.offsetWidth;
    const distance = Math.max(0, containerInnerWidth - btnWidth - safeMargin * 2);
    setTranslatePx(Math.round(distance));
  };

  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (data) {
          if (data.check_in && !data.lunch_out) {
            setStatus('checked-in');
            setIsRightSide(true);
          }
          if (data.lunch_out && !data.lunch_in) {
            setStatus('on-lunch');
            setIsRightSide(false);
          }
          if (data.lunch_in && !data.check_out) {
            setStatus('lunch-complete');
            setIsRightSide(true);
          }
          if (data.check_out) setStatus('session-complete');
        } else {
          setStatus('checked-out');
          setIsRightSide(false);
        }
      }
      setIsLoading(false);
    };

    const checkTime = () => {
      const now = new Date();
      if (now.getHours() >= 13) setShowLunchButton(true);
    };

    fetchAttendanceStatus();
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    if (!isLoading) {
      measure();
      const ro = new ResizeObserver(measure);
      if (containerRef.current) ro.observe(containerRef.current);
      window.addEventListener('resize', measure);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', measure);
      };
    }
  }, [isLoading, status]);

  const handleAction = async (action: 'checkIn' | 'checkOut' | 'lunchOut' | 'lunchIn') => {
    if (isPending) return;
    setIsPending(true);
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
    setStatus(optimisticStateMap[action]);
    const { error } = await actionMap[action]();
    setIsPending(false);

    if (error) {
      setStatus(originalStatus);
      toast({ title: 'Error performing action', description: error, variant: 'destructive' });
    } else {
      toast({ title: toastMessages[action] });
      if (action === 'checkIn' || action === 'lunchIn') {
        setIsRightSide(true);
        requestAnimationFrame(() => measure()); // ✅ proper timing
      } else if (action === 'lunchOut') {
        setIsRightSide(false);
        requestAnimationFrame(() => measure()); // ✅ proper timing
      }      
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
  const getTranslateX = () => (isRightSide ? translatePx - safeMargin : 0);

  if (isLoading) {
    return (
      <header className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center">
        <Skeleton className="h-10 w-32 rounded-full" />
      </header>
    );
  }

  if (status === 'session-complete') {
    return (
      <header ref={containerRef} className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center overflow-hidden" />
    );
  }

  return (
    <>
      <header
        ref={containerRef}
        className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center overflow-hidden"
      >
        <div
          className="absolute inset-y-0 flex items-center"
          style={{
            left: `${safeMargin}px`,
            transform: `translateX(${getTranslateX()}px)`,
            transition: 'transform 700ms cubic-bezier(.22,.9,.3,1)',
            willChange: 'transform',
          }}
        >
          {buttonContent && (
            <Button
              ref={btnRef}
              onClick={handleMainButtonClick}
              disabled={isPending}
              className="rounded-full px-6 py-2 font-medium text-white transition-colors duration-500"
              style={{ backgroundColor: buttonContent.color }}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{buttonContent.text}</span>
                  {buttonContent.icon}
                </>
              )}
            </Button>
          )}
        </div>
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
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Lunch Out'}
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => handleAction('checkOut')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Check Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
