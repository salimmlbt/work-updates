'use client';

import { useState, FormEvent, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, FileText, Send, Sparkles, AlertCircle } from 'lucide-react';
import type { Profile, LeaveTypeConfig } from '@/lib/types';
import { cn, differenceInDays } from './utils';
import { addDays, format, startOfToday } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  currentProfile: Profile;
  leaveTypesConfig: LeaveTypeConfig[];
}

export default function ApplyLeaveDialog({ isOpen, onClose, onSubmit, currentProfile, leaveTypesConfig }: Props) {
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypesConfig[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedConfig = useMemo(() => 
    leaveTypesConfig.find(c => c.id === leaveTypeId) || leaveTypesConfig[0]
  , [leaveTypeId, leaveTypesConfig]);

  const minStartDate = useMemo(() => {
    const today = startOfToday();
    const leadTime = selectedConfig?.leadTime || 0;
    return format(addDays(today, leadTime), 'yyyy-MM-dd');
  }, [selectedConfig]);

  const applyPreset = (daysOffset: number) => {
    const minDateObj = new Date(minStartDate);
    const end = new Date(minDateObj);
    end.setDate(minDateObj.getDate() + (daysOffset - 1));

    setStartDate(minStartDate);
    setEndDate(end.toISOString().split('T')[0]);
    setErrorMsg('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!startDate || !endDate) {
      setErrorMsg('Please specify active start and end dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start date cannot fall after the end date.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Please specify a brief justification or reason for audit purposes.');
      return;
    }

    onSubmit({
      user_id: currentProfile.id,
      leave_type: selectedConfig.label,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
      day_type: 'Full Day'
    });

    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const calculatedDays = startDate && endDate && new Date(startDate) <= new Date(endDate)
    ? differenceInDays(startDate, endDate)
    : 0;

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
            className={`relative w-full max-w-lg overflow-visible rounded-[2.5rem] bg-[#0c0c14] border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.15)] z-10`}
          >
            <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-white/[0.02] to-transparent">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                  <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">
                    New Leave Statement
                  </h3>
                </div>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.25em] mt-1">
                  Enforcing Category-Specific Policies
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer hover:rotate-90 duration-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-bounce">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  Select Leave Category
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {leaveTypesConfig.map((t) => {
                    const isSelected = leaveTypeId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setLeaveTypeId(t.id);
                          setStartDate(''); // Reset date on type change due to new rules
                          setEndDate('');
                        }}
                        className={cn(
                          "px-4 py-3.5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer",
                          isSelected
                            ? "bg-white/[0.04] border-sky-500/40 text-white shadow-[0_0_20px_rgba(14,165,233,0.15)]"
                            : "bg-white/[0.01] border-white/5 text-zinc-400 hover:border-white/15 hover:bg-white/[0.02]"
                        )}
                      >
                        <p className="text-xs font-black tracking-wide uppercase group-hover:text-white transition-colors">{t.label}</p>
                        <p className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">
                           {t.leadTime > 0 ? `${t.leadTime} Day Notice` : 'Instant Application'}
                        </p>
                        {isSelected && (
                          <div className={`absolute right-3 top-3.5 w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                  Quick Date Range Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyPreset(1)} className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer">1 Day</button>
                  <button type="button" onClick={() => applyPreset(3)} className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer">3 Days</button>
                  <button type="button" onClick={() => applyPreset(5)} className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer">5 Days</button>
                  <button type="button" onClick={() => applyPreset(10)} className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] uppercase font-black tracking-widest transition-all cursor-pointer">10 Days</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Start Date</span>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      min={minStartDate}
                      onChange={(e) => { setStartDate(e.target.value); setErrorMsg(''); }}
                      className="w-full bg-[#141420] border border-white/5 focus:border-sky-500/40 text-white rounded-2xl h-12 pl-12 pr-4 text-xs font-black uppercase tracking-widest outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">End Date</span>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || minStartDate}
                      onChange={(e) => { setEndDate(e.target.value); setErrorMsg(''); }}
                      className="w-full bg-[#141420] border border-white/5 focus:border-sky-500/40 text-white rounded-2xl h-12 pl-12 pr-4 text-xs font-black uppercase tracking-widest outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Justification Statement</span>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 h-4 w-4 text-zinc-500 pointer-events-none" />
                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setErrorMsg(''); }}
                    rows={3}
                    placeholder="Provide a professional note explaining your absence context..."
                    className="w-full bg-[#141420] border border-white/5 focus:border-sky-500/40 text-white rounded-2xl p-4 pl-12 text-xs font-medium outline-none transition-all resize-none leading-relaxed placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Calculated duration</span>
                  <p className="text-white font-extrabold text-sm tracking-tight">{calculatedDays} {calculatedDays === 1 ? 'Day Off' : 'Days Off'}</p>
                </div>
                <button type="submit" className="rounded-2xl h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-[10px] uppercase tracking-[0.15em] flex items-center gap-2.5 shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 cursor-pointer">
                  <Send className="h-3.5 w-3.5" />
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
