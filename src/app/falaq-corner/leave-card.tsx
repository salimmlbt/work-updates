'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'framer-motion';
import { Calendar, Ban, XCircle, RefreshCcw, Trash2, CheckCircle2, Clock, Check } from 'lucide-react';
import type { Leave, Profile } from '@/lib/types';
import { cn, differenceInDays, formatDate, getInitials } from './utils';

interface Props {
  leave: Leave & { profiles?: Profile };
  activeTab: string;
  isEditor: boolean;
  onApproveClick: (leave: Leave & { profiles?: Profile }) => void;
  onRejectClick: (id: string) => void;
  onCancelClick: (id: string) => void;
  onReopenClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
}

const statusThemes = {
  Approved: {
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.06)]',
    indicatorBar: 'absolute -left-[3px] top-1/2 -translate-y-1/2 w-[5px] h-14 bg-emerald-500 rounded-full shadow-[0_0_20px_#10b981] opacity-70 z-20',
    iconContainer: 'bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border-emerald-500/20 text-emerald-400',
    borderGlow: 'hover:border-emerald-500/15 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)]',
  },
  Pending: {
    badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.06)]',
    indicatorBar: 'absolute -left-[3px] top-1/2 -translate-y-1/2 w-[5px] h-14 bg-sky-500 rounded-full shadow-[0_0_20px_#0ea5e9] opacity-70 z-20',
    iconContainer: 'bg-gradient-to-br from-sky-500/10 to-sky-900/10 border-sky-500/20 text-sky-400',
    borderGlow: 'hover:border-sky-500/15 hover:shadow-[0_0_30px_rgba(14,165,233,0.05)]',
  },
  Rejected: {
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.06)]',
    indicatorBar: 'absolute -left-[3px] top-1/2 -translate-y-1/2 w-[5px] h-14 bg-rose-500 rounded-full shadow-[0_0_20px_#f43f5e] opacity-70 z-20',
    iconContainer: 'bg-gradient-to-br from-rose-500/10 to-rose-900/10 border-rose-500/20 text-rose-400',
    borderGlow: 'hover:border-rose-500/15 hover:shadow-[0_0_30px_rgba(244,63,94,0.05)]',
  },
  Cancelled: {
    badgeBg: 'bg-zinc-800 text-zinc-500 border-white/5',
    indicatorBar: 'opacity-0',
    iconContainer: 'bg-zinc-900/40 border-white/5 text-zinc-500',
    borderGlow: 'hover:border-white/10 opacity-60 grayscale hover:grayscale-0 hover:opacity-100',
  },
};

const statusIcons = {
  Approved: CheckCircle2,
  Pending: Clock,
  Rejected: Ban,
  Cancelled: XCircle,
};

export default function LeaveCard({
  leave,
  activeTab,
  onApproveClick,
  onRejectClick,
  onCancelClick,
  onReopenClick,
  onDeleteClick,
}: Props) {
  const isApproved = leave.status === 'Approved';
  const duration = differenceInDays(leave.start_date, leave.end_date);
  const applicantName = leave.profiles?.full_name || 'Anonymous User';
  const theme = statusThemes[leave.status as keyof typeof statusThemes] || statusThemes.Pending;
  const IconComponent = statusIcons[leave.status as keyof typeof statusIcons] || Clock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className={cn(
        "relative rounded-[2rem] bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-3xl p-6 md:p-8 border border-white/5 transition-all duration-500 group shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6",
        theme.borderGlow
      )}
    >
      <div className={theme.indicatorBar} />

      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full">
        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner group-hover:scale-105 transition-transform duration-500", theme.iconContainer)}>
          <IconComponent className="h-6 w-6" strokeWidth={1.5} />
        </div>

        <div className="flex-1 space-y-2 w-full">
          <div className="flex flex-wrap items-center gap-3">
            {activeTab === 'team-requests' && leave.profiles && (
              <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 font-extrabold text-[9px] tracking-tight uppercase">
                {getInitials(applicantName)}
              </div>
            )}
            
            <h3 className="font-black text-white text-xl md:text-2xl tracking-tighter uppercase">
              {activeTab === 'team-requests' && leave.profiles ? applicantName : leave.leave_type}
            </h3>

            <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border select-none transition-colors", theme.badgeBg)}>
              {leave.status}
            </span>
          </div>

          {leave.reason && (
            <p className="text-xs text-zinc-400 font-medium italic max-w-xl line-clamp-2">
              "{leave.reason}"
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 md:gap-10 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
        <div className="text-left md:text-right">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">
            {isApproved ? 'Authorized Period' : 'Requested Range'}
          </p>
          <div className="text-sm md:text-base font-bold text-zinc-150 tracking-tight flex items-center md:justify-end gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" strokeWidth={2} />
            <span>
              {formatDate(leave.start_date, 'dd MMM')} {leave.start_date !== leave.end_date ? `– ${formatDate(leave.end_date, 'dd MMM yyyy')}` : formatDate(leave.start_date, 'yyyy')}
            </span>
          </div>
        </div>

        <div className="bg-zinc-950/40 px-5 py-2.5 rounded-2xl border border-white/5 text-center min-w-[90px]">
          <span className="block text-sky-400 text-xs font-black uppercase tracking-wide">
            {duration} {duration === 1 ? 'Day' : 'Days'}
          </span>
          <span className="text-[7.5px] font-bold text-zinc-600 uppercase tracking-widest block mt-0.5">
            Statement
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto md:w-auto justify-end">
          {activeTab === 'team-requests' && leave.status === 'Pending' ? (
            <div className="flex items-center gap-2 w-full xs:w-auto">
              <button
                onClick={() => onRejectClick(leave.id)}
                className="flex-1 sm:flex-initial rounded-xl h-10 px-4 border border-rose-500/20 hover:border-rose-500/40 bg-zinc-950/80 text-rose-400 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:bg-rose-500/5 duration-300"
              >
                <Ban className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                onClick={() => onApproveClick(leave)}
                className="flex-1 sm:flex-initial rounded-xl h-10 px-5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98] duration-300"
              >
                <Check className="h-3.5 w-3.5" />
                Authorize
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500">
              {(leave.status === 'Pending' || leave.status === 'Approved') && (
                <button
                  onClick={() => onCancelClick(leave.id)}
                  className="rounded-xl h-9 px-3.5 border border-rose-500/10 hover:border-rose-500/25 bg-rose-500/5 text-rose-400 font-black uppercase text-[8.5px] tracking-widest flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}

              {leave.status === 'Cancelled' && (
                <button
                  onClick={() => onReopenClick(leave.id)}
                  className="rounded-xl h-9 px-4 border border-sky-500/20 hover:border-sky-500/35 bg-sky-500/5 text-sky-400 font-black uppercase text-[8.5px] tracking-widest flex items-center gap-1.5 transition-all duration-300 cursor-pointer"
                >
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                  Re-apply
                </button>
              )}

              {(leave.status === 'Rejected' || leave.status === 'Cancelled') && (
                <button
                  onClick={() => onDeleteClick(leave.id)}
                  title="Delete Permanently"
                  className="p-2 rounded-xl border border-white/5 hover:border-rose-500/20 bg-white/5 hover:bg-rose-500/5 text-zinc-500 hover:text-rose-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
