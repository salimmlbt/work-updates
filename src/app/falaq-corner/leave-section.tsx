'use client'

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, XCircle, Loader2, ChevronDown, CheckCircle2, X, RefreshCcw, Trash2 } from 'lucide-react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import type { Leave, Profile, RoleWithPermissions } from '@/lib/types'
import { cancelLeave, updateLeaveStatus, reopenLeave, deleteLeavePermanently } from './actions'
import { useToast } from '@/hooks/use-toast'
import { ApplyLeaveDialog } from './apply-leave-dialog'
import { ApproveLeaveDialog } from './approve-leave-dialog'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSearchParams } from 'next/navigation'

export function LeaveSection({ profile }: { profile: Profile }) {
  const searchParams = useSearchParams()
  const [leaves, setLeaves] = useState<(Leave & { profiles?: Profile })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)
  const [leaveToApprove, setLeaveToApprove] = useState<Leave & { profiles?: Profile } | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'my-leaves')
  const [isPending, startTransition] = useTransition()

  const { toast } = useToast()
  const supabase = createClient()

  const permissions = (profile.roles as RoleWithPermissions)?.permissions || {}
  const isEditor = permissions.falaq_corner === 'Editor' || profile.roles?.name === 'Falaq Admin'

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && (tab === 'my-leaves' || tab === 'team-requests')) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const fetchLeaves = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    let query = supabase.from('leaves').select('*, profiles(*)').order('start_date', { ascending: false })

    if (!isEditor || activeTab === 'my-leaves') {
      query = query.eq('user_id', profile.id)
    }

    const { data, error } = await query
    if (!error && data) setLeaves(data as any)
    if (showLoading) setIsLoading(false)
  }, [supabase, isEditor, activeTab, profile.id])

  useEffect(() => { 
    fetchLeaves();
    const channel = supabase
      .channel('realtime-leaves-corner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchLeaves(false))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchLeaves, supabase])

  const handleAction = (id: string, action: Leave['status'] | 'reopen' | 'delete') => {
    startTransition(async () => {
      let result;
      if (action === 'Cancelled') result = await cancelLeave(id);
      else if (action === 'reopen') result = await reopenLeave(id);
      else if (action === 'delete') result = await deleteLeavePermanently(id);
      else result = await updateLeaveStatus(id, action as Leave['status']);

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        const msg = action === 'reopen' ? 'reopened' : action === 'delete' ? 'deleted' : (action as string).toLowerCase();
        toast({ title: 'Success', description: `Leave ${msg} successfully.`, variant: 'success' })
        fetchLeaves(false);
      }
    })
  }

  const getStatusBadge = (status: Leave['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] px-3 h-6 shadow-[0_0_15px_rgba(16,185,129,0.1)]">Approved</Badge>
      case 'Rejected': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-black uppercase tracking-widest text-[9px] px-3 h-6">Rejected</Badge>
      case 'Cancelled': return <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-black uppercase tracking-widest text-[9px] px-3 h-6">Cancelled</Badge>
      default: return <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 font-black uppercase tracking-widest text-[9px] px-3 h-6 shadow-[0_0_15px_rgba(56,189,248,0.1)]">Pending</Badge>
    }
  }

  const statusGlow: Record<Leave['status'], string> = {
    Approved: 'bg-emerald-500 shadow-[0_0_15px_#10b981]',
    Pending: 'bg-sky-500 shadow-[0_0_15px_#0ea5e9]',
    Rejected: 'bg-rose-500 shadow-[0_0_15px_#f43f5e]',
    Cancelled: 'bg-zinc-600 shadow-none',
  }

  const groupedLeaves = useMemo(() => {
    return leaves.reduce((acc, leave) => {
      const month = format(parseISO(leave.start_date), 'MMMM yyyy')
      acc[month] = acc[month] || []
      acc[month].push(leave)
      return acc
    }, {} as Record<string, typeof leaves>)
  }, [leaves])

  const renderTimeline = () => (
    <div className="space-y-16 pb-32">
      {Object.entries(groupedLeaves).map(([month, items]) => {
        const isCollapsed = collapsedMonths[month]
        return (
          <div key={month}>
            <button
              onClick={() => setCollapsedMonths(p => ({ ...p, [month]: !p[month] }))}
              className="w-full flex justify-between items-center px-8 py-5 rounded-[2rem] bg-white/[0.03] border border-white/10 shadow-2xl hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 group backdrop-blur-md"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 group-hover:text-sky-400 transition-colors">{month}</span>
              <ChevronDown className={cn("h-4 w-4 text-zinc-600 transition-transform duration-700", isCollapsed && "rotate-180")} />
            </button>

            <div className={cn("mt-10 transition-all duration-700", isCollapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[8000px] opacity-100")}>
              <div className="relative pl-14 space-y-10">
                <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-gradient-to-b from-sky-400/40 via-purple-400/20 to-transparent" />
                {items.map((leave) => {
                  const isApproved = leave.status === 'Approved';
                  const isHalfDay = leave.day_type === 'Half Day';
                  let duration = 1;
                  if (isApproved && leave.approved_days) duration = leave.approved_days.length;
                  else if (leave.start_date && leave.end_date) duration = differenceInCalendarDays(parseISO(leave.end_date), parseISO(leave.start_date)) + 1;
                  if (!leave.end_date && isHalfDay) duration = 0.5;
                  
                  return (
                    <div key={leave.id} className="relative group">
                      <span className={cn("absolute left-[-42px] top-8 w-3 h-3 rounded-full z-10 ring-4 ring-[#0a0a0f]", statusGlow[leave.status])} />
                      <div className={cn(
                        "bg-white/[0.02] backdrop-blur-2xl rounded-[3rem] p-10 border transition-all duration-700 hover:-translate-y-1 shadow-2xl group-hover:bg-white/[0.04]",
                        leave.status === 'Approved' ? "border-emerald-500/20 shadow-emerald-500/5" : 
                        leave.status === 'Pending' ? "border-sky-500/20 shadow-sky-500/5" : "border-white/10"
                      )}>
                        <div className="flex flex-col xl:flex-row justify-between gap-10">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-5 mb-6">
                              {activeTab === 'team-requests' && leave.profiles && (
                                <Avatar className="h-12 w-12 border-2 border-white/10 ring-4 ring-white/5 shadow-2xl">
                                  <AvatarImage src={leave.profiles.avatar_url ?? undefined} />
                                  <AvatarFallback className="text-xs bg-zinc-800 text-zinc-400 font-black">{getInitials(leave.profiles.full_name)}</AvatarFallback>
                                </Avatar>
                              )}
                              <span className="font-black text-white tracking-tighter text-3xl uppercase">
                                {activeTab === 'team-requests' ? leave.profiles?.full_name : leave.leave_type}
                              </span>
                              <div className="flex items-center gap-3">
                                {getStatusBadge(leave.status)}
                                {isHalfDay && <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-black uppercase tracking-widest text-[9px] h-6">Half Session</Badge>}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-8 mt-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                    {isApproved ? 'Approved Statement Period' : 'Requested Range'}
                                </p>
                                <p className="text-zinc-100 font-black text-lg tracking-tight">
                                  {isApproved && leave.approved_days && leave.approved_days.length > 0
                                    ? leave.approved_days.map(d => format(parseISO(d), 'dd MMM')).join(', ')
                                    : `${format(parseISO(leave.start_date), 'dd MMM')} ${leave.start_date !== leave.end_date ? `– ${format(parseISO(leave.end_date), 'dd MMM yyyy')}` : format(parseISO(leave.start_date), 'yyyy')}`
                                  }
                                </p>
                              </div>
                              <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />
                              <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 shadow-inner">
                                <span className="text-sky-400 font-black uppercase tracking-widest text-xs">
                                    {duration} {duration === 1 || duration === 0.5 ? 'Day' : 'Days'} Statement
                                </span>
                              </div>
                            </div>

                            {leave.reason && (
                              <div className="mt-8 flex items-start gap-5 text-sm text-zinc-400 bg-black/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                                <FileText className="h-5 w-5 mt-0.5 shrink-0 text-zinc-700" />
                                <p className="italic font-medium leading-relaxed">"{leave.reason}"</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {activeTab === 'team-requests' ? (
                              leave.status === 'Pending' && (
                                <div className="flex xl:flex-col gap-4 w-full sm:w-auto">
                                  <Button size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] h-14 px-8 font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-900/40 border border-emerald-500/30" onClick={() => setLeaveToApprove(leave)}>
                                    <CheckCircle2 className="h-5 w-5 mr-3" /> Approve
                                  </Button>
                                  <Button size="lg" variant="ghost" className="flex-1 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-[1.5rem] h-14 px-8 border border-rose-500/20 font-black uppercase text-xs tracking-widest" onClick={() => handleAction(leave.id, 'Rejected')}>
                                    <X className="h-5 w-5 mr-3" /> Reject
                                  </Button>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-500">
                                {(leave.status === 'Pending' || leave.status === 'Approved') && (
                                  <Button variant="ghost" size="lg" className="text-rose-400 hover:bg-rose-500/10 rounded-full h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] border border-rose-500/10 shadow-2xl" onClick={() => handleAction(leave.id, 'Cancelled')}>
                                    <XCircle className="h-5 w-5 mr-3" /> Cancel Application
                                  </Button>
                                )}
                                {leave.status === 'Cancelled' && (
                                  <Button variant="ghost" size="lg" className="text-sky-400 hover:bg-sky-500/10 rounded-full h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] border border-sky-500/10 shadow-2xl" onClick={() => handleAction(leave.id, 'reopen')}>
                                    <RefreshCcw className="h-5 w-5 mr-3" /> Re-Apply
                                  </Button>
                                )}
                                {(leave.status === 'Cancelled' || leave.status === 'Rejected') && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-full h-14 w-14 transition-all">
                                        <Trash2 className="h-6 w-6" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[3rem] bg-zinc-950 border-white/10 text-white shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl p-10">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase">Purge Statement?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-500 font-medium text-base mt-2">
                                          This will permanently remove this leave request from the studio infrastructure. This action is irreversible.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="gap-4 mt-10">
                                        <AlertDialogCancel className="rounded-2xl h-14 bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300 font-black uppercase tracking-widest text-[10px] px-10">Discard</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction(leave.id, 'delete')} className="bg-rose-600 hover:bg-rose-500 rounded-2xl h-14 text-white font-black uppercase tracking-widest text-[10px] px-10 shadow-2xl shadow-rose-950/40">Confirm Purge</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="relative flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-8 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/5 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Leave Center</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">Audit and manage studio presence statements.</p>
        </div>
        {isEditor && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1.5 rounded-full border border-white/10 backdrop-blur-2xl shadow-2xl">
            <TabsList className="bg-transparent border-0 h-11 gap-2">
              <TabsTrigger value="my-leaves" className="rounded-full px-10 h-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-700 shadow-xl">Personal</TabsTrigger>
              <TabsTrigger value="team-requests" className="rounded-full px-10 h-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-700 shadow-xl">Global Review</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-48 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700">Syncing Statements</span>
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-48 text-center bg-white/[0.01] rounded-[3.5rem] border-2 border-dashed border-white/5 text-zinc-700">
            <div className="bg-white/5 p-14 rounded-full mb-10 shadow-2xl ring-1 ring-white/5">
                <FileText className="h-20 w-20 opacity-10" />
            </div>
            <p className="font-black uppercase tracking-[0.4em] text-[10px]">No active leave statements found</p>
          </div>
        ) : renderTimeline()}
      </div>

      {/* FIXED ACTION BUTTON - DARK GLOW STYLE */}
      <div className="absolute bottom-10 right-10 z-[150]">
          <Button 
              size="lg" 
              onClick={() => setIsApplyDialogOpen(true)}
              className="rounded-full h-20 px-12 gap-5 shadow-[0_25px_60px_rgba(56,189,248,0.4)] bg-gradient-to-br from-sky-600 to-blue-800 hover:from-sky-500 hover:to-blue-600 transition-all active:scale-95 text-white font-black uppercase tracking-[0.2em] text-xs border-2 border-white/20 ring-4 ring-sky-500/10 group"
          >
              <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                  <Plus className="h-6 w-6" />
              </div>
              Apply for Leave
          </Button>
      </div>

      <ApplyLeaveDialog isOpen={isApplyDialogOpen} setIsOpen={setIsApplyDialogOpen} onSuccess={() => fetchLeaves(false)} existingLeaves={leaves} />
      {leaveToApprove && (
        <ApproveLeaveDialog isOpen={!!leaveToApprove} setIsOpen={() => setLeaveToApprove(null)} leave={leaveToApprove} onSuccess={() => fetchLeaves(false)} />
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  )
}
