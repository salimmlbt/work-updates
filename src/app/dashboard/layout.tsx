'use client';

import { useState } from 'react';
import Sidebar from '@/components/dashboard/sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isCollapsed={isCollapsed} setCollapsed={setCollapsed} />
      <main
        className={cn(
          'flex-1 transition-all duration-300 bg-background',
          {
            'pl-[0.5rem]': !isCollapsed,
            'pl-[0.25rem]': isCollapsed,
          }
        )}
      >
        {children}
      </main>
    </div>
  );
}