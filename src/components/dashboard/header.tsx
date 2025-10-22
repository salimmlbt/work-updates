
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export default function Header() {
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCheckInToggle = () => {
    setIsCheckedIn(!isCheckedIn);
  };

  if (!isMounted) {
    // Render a placeholder or null on the server to avoid hydration mismatch
    return (
      <header
        className={cn(
          "bg-background border-b p-4 md:p-6 flex items-center transition-all duration-500 ease-in-out",
          'justify-start'
        )}
      >
         <Button
            variant={'success'}
            className="transition-all duration-300 rounded-full"
            disabled
         >
            <span>Check in</span>
            <CheckInIcon className="ml-2 h-4 w-4 rotate-180" />
        </Button>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "bg-background border-b p-4 md:p-6 flex items-center transition-all duration-500 ease-in-out",
        isCheckedIn ? 'justify-end' : 'justify-start'
      )}
    >
      <Button
        onClick={handleCheckInToggle}
        variant={isCheckedIn ? 'destructive' : 'success'}
        className="transition-all duration-300 rounded-full"
      >
        {isCheckedIn ? (
          <>
            <span>Check Out</span>
            <CheckOutIcon className="ml-2 h-4 w-4" />
          </>
        ) : (
          <>
            <span>Check in</span>
            <CheckInIcon className="ml-2 h-4 w-4 rotate-180" />
          </>
        )}
      </Button>
    </header>
  );
}
