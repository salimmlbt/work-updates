
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckInIcon, CheckOutIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export default function Header() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const handleCheckInToggle = () => {
    setIsCheckedIn(!isCheckedIn);
  };

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
