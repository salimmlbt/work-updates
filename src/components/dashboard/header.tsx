'use client';

import { useState, useEffect, useTransition, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { checkIn, checkOut } from '@/app/actions';
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
import { cn } from '@/lib/utils';

export default function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const { toast } = useToast();

  const containerRef = useRef<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [translatePx, setTranslatePx] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const fetchAttendanceStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();
        
        if (data) {
          if (data.check_in && !data.check_out) {
            setIsCheckedIn(true);
            setIsSessionComplete(false);
          } else if (data.check_in && data.check_out) {
            setIsCheckedIn(false);
            setIsSessionComplete(true);
          } else {
            setIsCheckedIn(false);
            setIsSessionComplete(false);
          }
        } else {
            setIsCheckedIn(false);
            setIsSessionComplete(false);
        }
      }
    };
    fetchAttendanceStatus();
  }, []);

  const measure = () => {
    const container = containerRef.current;
    const btn = btnRef.current;
    if (!container || !btn) return;

    const cs = getComputedStyle(container);
    const padLeft = parseFloat(cs.paddingLeft || '0');
    const padRight = parseFloat(cs.paddingRight || '0');
    const containerInnerWidth = container.clientWidth - padLeft - padRight;
    const btnWidth = btn.offsetWidth;
    const distance = Math.max(0, containerInnerWidth - btnWidth);
    setTranslatePx(Math.round(distance));
  };

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const handleCheckIn = () => {
     startTransition(async () => {
      const { data, error } = await checkIn();
      if (error) {
        toast({
          title: 'Error checking in',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Successfully checked in',
        });
        setIsCheckedIn(true);
      }
    });
  }

  const handleCheckOut = () => {
     startTransition(async () => {
      const { data, error } = await checkOut();
       setIsAlertOpen(false);
      if (error) {
        toast({
          title: 'Error checking out',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Successfully checked out',
        });
        setIsCheckedIn(false);
        setIsSessionComplete(true);
      }
    });
  };

  const handleCheckInToggle = () => {
    if (isCheckedIn) {
        setIsAlertOpen(true);
    } else {
        handleCheckIn();
    }
  }

  if (!isMounted) {
    return (
      <header
        ref={containerRef}
        className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center"
      >
        <Button variant="success" className="rounded-full px-6 py-2" disabled>
          <span>Check In</span>
          <CheckInIcon className="ml-2 h-4 w-4 rotate-180" />
        </Button>
      </header>
    );
  }

  if (isSessionComplete) {
    return (
      <header
        ref={containerRef}
        className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center overflow-hidden"
      >
        {/* Render nothing if session is complete */}
      </header>
    );
  }

  return (
    <>
      <header
        ref={containerRef}
        className="bg-background border-b p-4 md:p-6 relative h-20 flex items-center overflow-hidden"
      >
        <div
          aria-hidden="false"
          className="absolute left-4 inset-y-0 flex items-center"
          style={{
            transform: `translateX(${isCheckedIn ? translatePx : 0}px)`,
            transition: 'transform 500ms cubic-bezier(.22,.9,.3,1)',
            willChange: 'transform',
          }}
        >
          <Button
            ref={btnRef}
            onClick={handleCheckInToggle}
            disabled={isPending}
            className="rounded-full px-6 py-2 font-medium text-white transition-colors duration-500"
            style={{
              backgroundColor: isCheckedIn ? '#dc2626' : '#16a34a', // red-600 / green-600
            }}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 
              isCheckedIn ? (
                <>
                  <span>Check Out</span>
                  <CheckOutIcon className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Check In</span>
                  <CheckInIcon className="ml-2 h-4 w-4 rotate-180" />
                </>
              )
            }
          </Button>
        </div>
      </header>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to check out?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end your current work session for today. You will not be able to check in again until tomorrow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCheckOut}
              className={cn(
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
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
