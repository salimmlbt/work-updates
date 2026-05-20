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

export function LeaveSection({ profile }: { profile: Profile }) {
  const [leaves, setLeaves] = useState<(Leave & { profiles?: Profile })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)
  const [leaveToApprove, setLeaveToApprove] = useState<Leave & { profiles?: Profile } | null>(null)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState('my-leaves')
  const [isPending, startTransition] = useTransition()

  const { toast } = useToast()
  const supabase = createClient()

  const permissions = (profile.roles as RoleWithPermissions)?.permissions || {}
  const isEditor = permissions.falaq_corner === 'Editor' || profile.roles?.name === 'Falaq Admin'

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

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-leaves-corner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => {
          // Re-fetch when any change occurs to ensure joins are up to date
          fetchLeaves(false);
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
        const msg = action === 'reopen' ? 'reopened' : action === 'delete' ? 'deleted' : action.toLowerCase();
        toast({ title: 'Success', description: `Leave ${msg} successfully.` })
        // fetchLeaves is handled by real-time subscription now, but we keep it for immediate feedback
        fetchLeaves(false);
      }
    })
  }

  const getStatusBadge = (status: Leave['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] px-2 h-5">Approved</Badge>
      case 'Rejected': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-black uppercase tracking-widest text-[9px] px-2 h-5">Rejected</Badge>
      case 'Cancelled': return <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 font-black uppercase tracking-widest text-[9px] px-2 h-5">Cancelled</Badge>
      default: return <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 font-black uppercase tracking-widest text-[9px] px-2 h-5">Pending</Badge>
    }
  }

  const statusGlow: Record<Leave['status'], string> = {
    Approved: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.8)]',
    Pending: 'bg-sky-500 shadow-[0_0_12px_rgba(56,189,248,.8)]',
    Rejected: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,.8)]',
    Cancelled: 'bg-zinc-500 shadow-[0_0_10px_rgba(113,113,122,.6)]',
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
    <div className="space-y-16">
      {Object.entries(groupedLeaves).map(([month, items]) => {
        const isCollapsed = collapsedMonths[month]
        return (
          <div key={month}>
            <button
              onClick={() => setCollapsedMonths(p => ({ ...p, [month]: !p[month] }))}
              className="w-full flex justify-between items-center px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300 group backdrop-blur-md"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-300 transition-colors">{month}</span>
              <ChevronDown className={cn("h-4 w-4 text-zinc-600 transition-transform duration-500", isCollapsed && "rotate-180")} />
            </button>

            <div className={cn("mt-10 transition-all duration-700", isCollapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[8000px] opacity-100")}>
              <div className="relative pl-14 space-y-10">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-sky-400/40 via-purple-400/20 to-transparent" />
                {items.map((leave) => {
                  const isApproved = leave.status === 'Approved';
                  const isHalfDay = leave.day_type === 'Half Day';
                  
                  let duration = 1;
                  if (isApproved && leave.approved_days) {
                    duration = leave.approved_days.length;
                  } else if (leave.start_date && leave.end_date) {
                    duration = differenceInCalendarDays(parseISO(leave.end_date), parseISO(leave.start_date)) + 1;
                  }

                  if (!leave.end_date && isHalfDay) duration = 0.5;
                  
                  return (
                    <div key={leave.id} className="relative group">
                      <span className={cn("absolute left-[-42px] top-6 w-3 h-3 rounded-full z-10 ring-4 ring-[#0f0f0f]", statusGlow[leave.status])} />
                      <div className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl hover:shadow-[0_0_30px_rgba(56,189,248,0.05)] transition-all duration-500 hover:-translate-y-1 group-hover:bg-white/[0.05]">
                        <div className="flex justify-between gap-6">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              {activeTab === 'team-requests' && leave.profiles && (
                                <Avatar className="h-8 w-8 border border-white/10 ring-2 ring-white/5 shadow-lg">
                                  <AvatarImage src={leave.profiles.avatar_url ?? undefined} />
                                  <AvatarFallback className="text-[9px] bg-zinc-800 text-zinc-400 font-black">{getInitials(leave.profiles.full_name)}</AvatarFallback>
                                </Avatar>
                              )}
                              <span className="font-black text-white tracking-tight text-xl uppercase">
                                {activeTab === 'team-requests' ? leave.profiles?.full_name : leave.leave_type}
                              </span>
                              {getStatusBadge(leave.status)}
                              {isHalfDay && <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-black uppercase tracking-widest text-[9px] h-5">Half Day</Badge>}
                            </div>
                            
                            <div className="flex items-center gap-4 mt-3">
                              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                {isApproved ? 'Approved Period:' : 'Applied Range:'}
                                <span className="ml-3 text-zinc-100 font-black">
                                  {isApproved && leave.approved_days && leave.approved_days.length > 0
                                    ? leave.approved_days.map(d => format(parseISO(d), 'dd MMM')).join(', ')
                                    : `${format(parseISO(leave.start_date), 'dd MMM')} ${leave.start_date !== leave.end_date ? `– ${format(parseISO(leave.end_date), 'dd MMM yyyy')}` : format(parseISO(leave.start_date), 'yyyy')}`
                                  }
                                </span>
                              </p>
                              <div className="h-4 w-px bg-white/10" />
                              <Badge variant="outline" className="text-[10px] h-6 rounded-full px-4 border-white/10 bg-white/5 text-sky-400 font-black uppercase tracking-widest">
                                {duration} {duration === 1 || duration === 0.5 ? 'Day' : 'Days'} {isApproved ? 'Approved' : ''}
                              </Badge>
                            </div>

                            {leave.reason && (
                              <div className="mt-5 flex items-start gap-3 text-sm text-zinc-400 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
                                <FileText className="h-4 w-4 mt-0.5 shrink-0 text-zinc-700" />
                                <p className="italic font-medium leading-relaxed">"{leave.reason}"</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {activeTab === 'team-requests' ? (
                              leave.status === 'Pending' && (
                                <div className="flex flex-col gap-2">
                                  <Button size="sm" variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-xl px-5 border border-emerald-500/20 font-bold uppercase text-[10px] tracking-widest" onClick={() => setLeaveToApprove(leave)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl px-5 border border-rose-500/20 font-bold uppercase text-[10px] tracking-widest" onClick={() => handleAction(leave.id, 'Rejected')}>
                                    <X className="h-4 w-4 mr-2" /> Reject
                                  </Button>
                                </div>
                              )
                            ) : (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                {(leave.status === 'Pending' || leave.status === 'Approved') && (
                                  <Button variant="ghost" size="sm" className="text-rose-400 hover:bg-rose-500/10 rounded-full px-5 h-9 font-black uppercase text-[10px] tracking-widest border border-rose-500/10" onClick={() => handleAction(leave.id, 'Cancelled')}>
                                    <XCircle className="h-4 w-4 mr-2" /> Cancel
                                  </Button>
                                )}
                                {leave.status === 'Cancelled' && (
                                  <Button variant="ghost" size="sm" className="text-sky-400 hover:bg-sky-500/10 rounded-full px-5 h-9 font-black uppercase text-[10px] tracking-widest border border-sky-500/10" onClick={() => handleAction(leave.id, 'reopen')}>
                                    <RefreshCcw className="h-4 w-4 mr-2" /> Reopen
                                  </Button>
                                )}
                                {(leave.status === 'Cancelled' || leave.status === 'Rejected') && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-full h-10 w-10 transition-colors">
                                        <Trash2 className="h-5 w-5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2.5rem] bg-zinc-950 border-white/10 text-white shadow-2xl backdrop-blur-3xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase">Delete request?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-zinc-500 font-medium">
                                          This will remove the leave request record from the studio database permanently. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="gap-3 mt-4">
                                        <AlertDialogCancel className="rounded-2xl bg-zinc-900 border-white/10 hover:bg-zinc-800 text-zinc-300 font-bold px-6">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleAction(leave.id, 'delete')} className="bg-rose-600 hover:bg-rose-700 rounded-2xl text-white font-black uppercase tracking-widest text-xs px-8">Permanently Delete</AlertDialogAction>
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
    <div className="relative flex flex-col h-full bg-transparent">
      <div className="p-8 flex justify-between items-center border-b border-white/5">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Leave Management</h2>
          <p className="text-sm text-zinc-500 font-medium mt-1">Track history and manage upcoming studio leaves.</p>
        </div>
        {isEditor && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-xl">
            <TabsList className="bg-transparent border-0 h-9 gap-1">
              <TabsTrigger value="my-leaves" className="rounded-full px-6 h-7 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-300">My Leaves</TabsTrigger>
              <TabsTrigger value="team-requests" className="rounded-full px-6 h-7 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-300">Team View</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 pb-32 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-zinc-800" /></div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.01] rounded-[3rem] border-2 border-dashed border-white/5 text-zinc-700">
            <div className="bg-white/5 p-10 rounded-full mb-6">
                <FileText className="h-14 w-14 opacity-20" />
            </div>
            <p className="font-black uppercase tracking-widest text-[10px]">No leave history recorded yet</p>
          </div>
        ) : renderTimeline()}
      </div>

      <div className="absolute bottom-10 right-10">
        <Button size="lg" className="rounded-full h-16 px-10 gap-3 shadow-[0_20px_50px_rgba(56,189,248,0.3)] bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 transition-all active:scale-95 text-white font-black uppercase tracking-widest text-xs border border-sky-400/20" onClick={() => setIsApplyDialogOpen(true)}>
          <Plus className="h-6 w-6" /> Apply for Leave
        </Button>
      </div>

      <ApplyLeaveDialog isOpen={isApplyDialogOpen} setIsOpen={setIsApplyDialogOpen} onSuccess={() => fetchLeaves(false)} existingLeaves={leaves} />
      {leaveToApprove && (
        <ApproveLeaveDialog isOpen={!!leaveToApprove} setIsOpen={() => setLeaveToApprove(null)} leave={leaveToApprove} onSuccess={() => fetchLeaves(false)} />
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  )
}
