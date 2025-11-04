'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';

export function PageLoader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client side, after initial hydration.
    // It sets a timeout to start the fade-out animation.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 200); // A small delay to ensure content is ready

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ease-out',
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary text-primary-foreground h-20 w-20 rounded-2xl flex items-center justify-center animate-pulse">
          <Logo className="h-12 w-12 text-white" />
        </div>
      </div>
    </div>
  );
}
