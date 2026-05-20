'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export function PageSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8 lg:p-10 h-full bg-[#0f0f0f]"
    >
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-8 mb-8 border-b border-white/5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-4 w-64 bg-white/5" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24 rounded-full bg-white/5" />
          <Skeleton className="h-10 w-40 rounded-full bg-white/5" />
        </div>
      </div>
      
      {/* Grid Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Skeleton className="h-40 rounded-[2rem] bg-white/[0.03] border border-white/5" />
        <Skeleton className="h-40 rounded-[2rem] bg-white/[0.03] border border-white/5" />
        <Skeleton className="h-40 rounded-[2rem] bg-white/[0.03] border border-white/5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-80 rounded-[2rem] bg-white/[0.03] border border-white/5" />
          <Skeleton className="h-80 rounded-[2rem] bg-white/[0.03] border border-white/5" />
        </div>

        {/* Sidebar/Side-column Area */}
        <div className="lg:col-span-1 space-y-8">
          <Skeleton className="h-[500px] rounded-[2rem] bg-white/[0.03] border border-white/5" />
          <Skeleton className="h-64 rounded-[2rem] bg-white/[0.03] border border-white/5" />
        </div>
      </div>
    </motion.div>
  );
}
