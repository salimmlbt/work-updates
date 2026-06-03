'use client';

import React, { useState, useTransition, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Loader2, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Leave, Profile, RoleWithPermissions } from '@/lib/types';
import { cancelLeave, updateLeaveStatus, reopenLeave, deleteLeavePermanently, applyLeave } from './actions';
import { useToast } from '@/hooks/use-toast';
import ApproveLeaveDialog from './approve-leave-dialog';
import ApplyLeaveDialog from './apply-leave-dialog';
import { createClient } from '@/lib/supabase/client';
import { cn } from './utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardStats from './dashboard-stats';
import LeaveCard from './leave-card';

interface LeaveSectionProps {
  profile: Profile;
  annualAllowance: number;
  isApplyDialogOpen: boolean;
  setIsApplyDialogOpen: (open: boolean) => void;
}

export function LeaveSection({ profile, annualAllowance, isApplyDialogOpen, setIsApplyDialogOpen }: LeaveSectionProps) {
  const [leaves, setLeaves] = useState<(Leave & { profiles?: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leaveToApprove, setLeaveToApprove] = useState<Leave & { profiles?: Profile } | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('my-leaves');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const supabase = createClient();

  const isEditor = (profile.roles as RoleWithPermissions)?.permissions?.falaq_corner === 'Editor' || profile.roles?.name === 'Falaq Admin';

  const fetchLeaves = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    let q = supabase.from('leaves').select('*, profiles(*, roles(*))').order('start_date', { ascending: false });
    if (!isEditor || activeTab === 'my-leaves') q = q.eq('user_id', profile.id);
    const { data, error } = await q;
    if (!error && data) setLeaves(data as any);
    if (showLoading) setIsLoading(false);
  }, [supabase, isEditor, activeTab, profile.id]);

  useEffect(() => { 
    fetchLeaves();
    const ch = supabase.channel('realtime-leaves-center').on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchLeaves(false)).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchLeaves, supabase]);

  const handleAction = (id: string, action: string) => {
    startTransition(async () => {
      let r;
      if (action === 'Cancelled') r = await cancelLeave(id);
      else if (action === 'reopen') r = await reopenLeave(id);
      else if (action === 'delete') r = await deleteLeavePermanently(id);
      else if (action === 'Approved') r = await updateLeaveStatus(id, 'Approved');
      else if (action === 'Rejected') r = await updateLeaveStatus(id, 'Rejected');

      if (r?.error) toast({ title: 'Error', description: r.error, variant: 'destructive' });
      else {
        toast({ title: 'System Updated' });
        fetchLeaves(false);
      }
    });
  };

  const handleApplySubmit = (data: any) => {
    startTransition(async () => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value as string));
        
        const result = await applyLeave(formData);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Statement submitted to ledger.' });
            setIsApplyDialogOpen(false);
            fetchLeaves(false);
        }
    });
  };

  const grouped = useMemo(() => {
    return leaves.reduce((acc, l) => {
      if (!l.start_date) return acc;
      const m = format(parseISO(l.start_date), 'MMMM yyyy');
      acc[m] = acc[m] || [];
      acc[m].push(l);
      return acc;
    }, {} as Record<string, typeof leaves>);
  }, [leaves]);

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* 🔮 HEADER - REMAINS FIXED AT TOP OF MAIN AREA */}
      <header className="shrink-0 p-6 md:p-8 space-y-8 border-b border-white/5 bg-zinc-950/20 backdrop-blur-3xl rounded-t-[3.5rem] border border-white/10 mx-1">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-1">
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Leave Center</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.5em] mt-1">Audit studio presence statements.</p>
            </div>
            
            {isEditor && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-3xl">
                    <TabsList className="bg-transparent border-0 h-9 gap-1">
                        <TabsTrigger value="my-leaves" className="rounded-full px-6 h-7 text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-500">Personal</TabsTrigger>
                        <TabsTrigger value="team-requests" className="rounded-full px-6 h-7 text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-500">Review</TabsTrigger>
                    </TabsList>
                </Tabs>
            )}
        </div>
        <DashboardStats 
          leaves={leaves} 
          currentProfile={profile} 
          annualAllowance={annualAllowance}
        />
      </header>

      {/* 🔮 FULL-WIDTH SCROLLABLE TIMELINE */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-10 custom-scrollbar relative">
        <div className="space-y-12 pb-40 w-full">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-4 opacity-40">
                    <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Syncing Statements</span>
                </div>
            ) : leaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center bg-white/[0.01] rounded-[3.5rem] border-2 border-dashed border-white/5">
                    <div className="bg-white/5 p-12 rounded-full mb-10 border border-white/5 shadow-2xl">
                      <Plus className="h-16 w-16 text-zinc-800" />
                    </div>
                    <p className="font-black uppercase tracking-[0.5em] text-[10px] text-zinc-700">No active statements found</p>
                </div>
            ) : (
                Object.entries(grouped).map(([m, items]) => {
                    const open = !collapsedMonths[m];
                    return (
                        <div key={m} className="space-y-8">
                            <button onClick={() => setCollapsedMonths(p => ({ ...p, [m]: !p[m] }))} className="w-full flex justify-between items-center px-10 py-5 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl hover:bg-white/[0.05] transition-all duration-500 group">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 group-hover:text-sky-400 transition-colors">{m}</span>
                                <ChevronDown className={cn("h-4 w-4 text-zinc-700 transition-transform duration-500", !open && "rotate-180")} />
                            </button>
                            <div className={cn("space-y-6 relative pl-4 md:pl-10", !open && "hidden")}>
                                <div className="absolute left-0 md:left-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-sky-400/30 via-purple-400/10 to-transparent" />
                                {items.map(l => (
                                    <LeaveCard 
                                        key={l.id}
                                        leave={l}
                                        activeTab={activeTab}
                                        isEditor={isEditor}
                                        onApproveClick={setLeaveToApprove}
                                        onRejectClick={(id) => handleAction(id, 'Rejected')}
                                        onCancelClick={(id) => handleAction(id, 'Cancelled')}
                                        onReopenClick={(id) => handleAction(id, 'reopen')}
                                        onDeleteClick={(id) => handleAction(id, 'delete')}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      <ApplyLeaveDialog 
        isOpen={isApplyDialogOpen} 
        onClose={() => setIsApplyDialogOpen(false)} 
        onSubmit={handleApplySubmit}
        currentProfile={profile}
      />

      {leaveToApprove && (
        <ApproveLeaveDialog 
            isOpen={!!leaveToApprove} 
            onClose={() => setLeaveToApprove(null)} 
            leave={leaveToApprove}
            onApprove={(id) => handleAction(id, 'Approved')}
            onReject={(id) => handleAction(id, 'Rejected')}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}