'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, CheckCircle2, Ban, Calendar } from 'lucide-react';
import type { Leave, Profile } from '@/lib/types';
import { cn, differenceInDays, formatDate, getInitials } from './utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leave: Leave & { profiles?: Profile };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ApproveLeaveDialog({ isOpen, onClose, leave, onApprove, onReject }: Props) {
  const duration = differenceInDays(leave.start_date, leave.end_date);
  const applicantName = leave.profiles?.full_name || 'Anonymous User';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
          />

          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-[#0c0c14] border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.15)] z-10"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-400 via-emerald-500 to-indigo-500 animate-pulse" />

            <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-white/[0.02] to-transparent">
              <div>
                <div className="flex items-center gap-2 text-teal-400">
                  <ShieldAlert className="h-5 w-5" />
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">
                    Audit Review
                  </h3>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.25em] mt-1">
                  Leave Authorization Ledger
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer hover:rotate-90 duration-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-6">
              <div className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-3xl border border-white/5">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm tracking-tight shadow-inner">
                  {getInitials(applicantName)}
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em]">Applicant Profile</span>
                  <p className="text-white font-extrabold text-base tracking-tight">{applicantName}</p>
                  <p className="text-[9px] text-zinc-400 font-black uppercase tracking-wide mt-0.5">
                    {leave.profiles?.roles?.name || 'Staff Member'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider block">Category</span>
                  <span className="text-white font-extrabold text-xs tracking-tight uppercase block mt-1.5">{leave.leave_type}</span>
                </div>
                <div className="bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider block">Total Period</span>
                  <span className="text-teal-400 font-black text-xs uppercase tracking-wider block mt-1.5">
                    {duration} {duration === 1 ? 'Day' : 'Days'} Request
                  </span>
                </div>
              </div>

              <div className="bg-[#141420] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block">Calendar Span</span>
                  <span className="text-white font-extrabold text-xs tracking-tight block mt-0.5">
                    {formatDate(leave.start_date, 'dd MMM')} – {formatDate(leave.end_date, 'dd MMM yyyy')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block">Applicant Note</span>
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-zinc-400 text-xs italic leading-relaxed">
                  "{leave.reason || 'No written context provided by applicant.'}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    onReject(leave.id);
                    onClose();
                  }}
                  className="rounded-2xl h-12 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Decline Request
                </button>
                <button
                  onClick={() => {
                    onApprove(leave.id);
                    onClose();
                  }}
                  className="rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(16,185,129,0.3)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Authorize Leave
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
