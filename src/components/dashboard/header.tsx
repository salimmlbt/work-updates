
'use client';

import { useState, useEffect, useTransition, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { checkIn, checkOut } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { Attendance } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isPending, startTransition] = useTransition();
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
        
        if (data && data.check_in && !data.check_out) {
          setIsCheckedIn(true);
        } else {
          setIsCheckedIn(false);
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

  const handleCheckInToggle = () => {
    startTransition(async () => {
      const action = isCheckedIn ? checkOut : checkIn;
      const { data, error } = await action();
      if (error) {
        toast({
          title: `Error ${isCheckedIn ? 'checking out' : 'checking in'}`,
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: `Successfully ${isCheckedIn ? 'checked out' : 'checked in'}`,
        });
        setIsCheckedIn(!isCheckedIn);
      }
    });
  };

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

  return (
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
  );
}
