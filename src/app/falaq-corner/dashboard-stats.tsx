'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Calendar, CheckSquare, Clock, ArrowUpRight } from 'lucide-react';
import type { Leave, Profile } from '@/lib/types';
import { differenceInDays } from './utils';

interface Props {
  leaves: Leave[];
  currentProfile: Profile;
}

export default function DashboardStats({ leaves, currentProfile }: Props) {
  const personalLeaves = useMemo(() => {
    return leaves.filter(l => l.user_id === currentProfile.id);
  }, [leaves, currentProfile]);

  const stats = useMemo(() => {
    const totalAllowance = 28;
    
    let approvedDaysCount = 0;
    let pendingDaysCount = 0;

    personalLeaves.forEach(l => {
      const days = differenceInDays(l.start_date, l.end_date);
      if (l.status === 'Approved') {
        approvedDaysCount += days;
      } else if (l.status === 'Pending') {
        pendingDaysCount += days;
      }
    });

    const remaining = totalAllowance - approvedDaysCount;

    return {
      total: totalAllowance,
      approved: approvedDaysCount,
      pending: pendingDaysCount,
      remaining: remaining >= 0 ? remaining : 0,
    };
  }, [personalLeaves]);

  const cardItems = [
    {
      title: 'Annual Allowance',
      value: `${stats.total} Days`,
      desc: 'Base studio policy allowance',
      icon: Calendar,
      color: 'from-blue-500 to-cyan-400',
      glow: 'shadow-blue-500/10 border-blue-500/20 text-blue-400',
    },
    {
      title: 'Authorized Leave',
      value: `${stats.approved} Days`,
      desc: 'Approved leaves logged to ledger',
      icon: CheckSquare,
      color: 'from-emerald-500 to-teal-400',
      glow: 'shadow-emerald-500/10 border-emerald-500/20 text-emerald-400',
    },
    {
      title: 'Awaiting Review',
      value: `${stats.pending} Days`,
      desc: 'Awaiting directory signature',
      icon: Clock,
      color: 'from-amber-500 to-orange-400',
      glow: 'shadow-amber-500/10 border-amber-500/20 text-amber-400',
    },
    {
      title: 'Available Balance',
      value: `${stats.remaining} Days`,
      desc: 'Ready for allocation requests',
      icon: ArrowUpRight,
      color: 'from-purple-500 to-pink-400',
      glow: 'shadow-purple-500/10 border-purple-500/20 text-purple-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1 md:px-2 relative z-10">
      {cardItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`group relative overflow-hidden backdrop-blur-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 rounded-3xl border border-white/5 hover:border-white/10 p-5 shadow-2xl flex flex-col justify-between hover:-translate-y-1 h-[135px]`}
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                {item.title}
              </span>
              <div className={`p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 ${item.glow} group-hover:scale-110 transition-transform duration-500`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div>
              <p className="text-2xl font-black text-white tracking-tight">
                {item.value}
              </p>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-1">
                {item.desc}
              </p>
            </div>

            <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r ${item.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
          </div>
        );
      })}
    </div>
  );
}
