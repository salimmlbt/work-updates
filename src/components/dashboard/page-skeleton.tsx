
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePathname } from 'next/navigation';
import { DashboardSkeleton } from '@/app/dashboard/dashboard-skeleton';

export function PageSkeleton() {
    const pathname = usePathname();

    if (pathname === '/dashboard') {
        return <DashboardSkeleton />;
    }

  return (
    <div className="p-4 md:p-8 lg:p-10 h-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>
      <div className="space-y-8 mt-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <div className="border rounded-lg">
            <Skeleton className="h-12 w-full rounded-t-lg" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
