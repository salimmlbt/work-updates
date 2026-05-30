'use client'

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  FileText, 
  XCircle, 
  Loader2, 
  ChevronDown, 
  CheckCircle2, 
  X, 
  RefreshCcw, 
  Trash2,
  ChevronUp,
  ShieldCheck,
  Send,
  Calendar as CalendarIcon
} from 'lucide-react'
import { format, parseISO, differenceInCalendarDays, startOfToday } from 'date-fns'
import type { Leave, Profile, RoleWithPermissions } from '@/lib/types'
import { cancelLeave, updateLeaveStatus, reopenLeave, deleteLeavePermanently, applyLeave } from './actions'
import { useToast } from '@/hooks/use-toast'
import { ApproveLeaveDialog } from './approve-leave-dialog'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ApplyLeaveDialog } from './apply-leave-dialog'

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

  const isEditor = (profile.roles as RoleWithPermissions)?.permissions?.falaq_corner === 'Editor' || profile.roles?.name === 'Falaq Admin'

  const fetchLeaves = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    let q = supabase.from('leaves').select('*, profiles(*)').order('start_date', { ascending: false })
    if (!isEditor || activeTab === 'my-leaves') q = q.eq('user_id', profile.id)
    const { data, error } = await q
    if (!error && data) setLeaves(data as any)
    if (showLoading) setIsLoading(false)
  }, [supabase, isEditor, activeTab, profile.id])

  useEffect(() => { 
    fetchLeaves();
    const ch = supabase.channel('realtime-leaves-center').on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => fetchLeaves(false)).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchLeaves, supabase])

  const handleAction = (id: string, action: Leave['status'] | 'reopen' | 'delete') => {
    startTransition(async () => {
      let r;
      if (action === 'Cancelled') r = await cancelLeave(id);
      else if (action === 'reopen') r = await reopenLeave(id);
      else if (action === 'delete') r = await deleteLeavePermanently(id);
      else r = await updateLeaveStatus(id, action as any);

      if (r.error) toast({ title: 'Error', description: r.error, variant: 'destructive' })
      else {
        toast({ title: 'Status Updated', variant: 'success' })
        fetchLeaves(false);
      }
    })
  }

  const grouped = useMemo(() => {
    return leaves.reduce((acc, l) => {
      const m = format(parseISO(l.start_date), 'MMMM yyyy')
      acc[m] = acc[m] || []; acc[m].push(l); return acc
    }, {} as Record<string, typeof leaves>)
  }, [leaves])

  const getStatusBadge = (s: Leave['status']) => {
    const base = "font-black uppercase tracking-widest text-[9px] px-3 h-6 border-0 shadow-lg"
    if (s === 'Approved') return <Badge className={cn(base, "bg-emerald-500/10 text-emerald-400 shadow-emerald-500/10")}>Approved</Badge>
    if (s === 'Rejected') return <Badge className={cn(base, "bg-rose-500/10 text-rose-400")}>Rejected</Badge>
    if (s === 'Cancelled') return <Badge className={cn(base, "bg-zinc-800 text-zinc-500")}>Cancelled</Badge>
    return <Badge className={cn(base, "bg-sky-500/10 text-sky-400 shadow-sky-500/10")}>Pending</Badge>
  }

  const statusGlow = {
    Approved: 'bg-emerald-500 shadow-[0_0_15px_#10b981]',
    Pending: 'bg-sky-500 shadow-[0_0_15px_#0ea5e9]',
    Rejected: 'bg-rose-500 shadow-[0_0_15px_#f43f5e]',
    Cancelled: 'bg-zinc-700 shadow-none',
  }

  return (
    <div className="relative flex flex-col h-full bg-[#0a0a0f] min-h-screen">
      {/* Mesh Background */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.05),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.05),transparent_50%)] pointer-events-none" />
      
      <header className="p-8 md:p-10 flex flex-col lg:flex-row justify-between items-center gap-8 border-b border-white/5 relative z-10 shrink-0 backdrop-blur-xl bg-black/20">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Leave Center</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.5em] mt-2">Audit and manage studio presence statements.</p>
        </div>
        
        {isEditor && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-3xl shadow-2xl">
            <TabsList className="bg-transparent border-0 h-10 gap-2">
              <TabsTrigger value="my-leaves" className="rounded-full px-8 h-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-500">Personal</TabsTrigger>
              <TabsTrigger value="team-requests" className="rounded-full px-8 h-8 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-zinc-950 transition-all duration-500">Review Hub</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-10 custom-scrollbar relative z-10 space-y-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-48 gap-4 opacity-40">
              <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Syncing Statements</span>
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-center bg-white/[0.01] rounded-[3.5rem] border-2 border-dashed border-white/5">
            <div className="bg-white/5 p-12 rounded-full mb-10 border border-white/5 shadow-2xl"><FileText className="h-16 w-16 text-zinc-800" /></div>
            <p className="font-black uppercase tracking-[0.5em] text-[10px] text-zinc-700">No active statements found</p>
          </div>
        ) : (
          <div className="space-y-16 pb-48">
            {Object.entries(grouped).map(([m, items]) => {
              const open = !collapsedMonths[m]
              return (
                <div key={m}>
                  <button onClick={() => setCollapsedMonths(p => ({ ...p, [m]: !p[m] }))} className="w-full flex justify-between items-center px-10 py-5 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl hover:bg-white/[0.05] transition-all duration-500 group">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 group-hover:text-sky-400 transition-colors">{m}</span>
                    <ChevronDown className={cn("h-4 w-4 text-zinc-700 transition-transform duration-500", !open && "rotate-180")} />
                  </button>
                  <div className={cn("mt-10 space-y-10 pl-14 relative transition-all duration-500", !open && "hidden")}>
                    <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-gradient-to-b from-sky-400/30 via-purple-400/10 to-transparent" />
                    {items.map(l => {
                      const isApproved = l.status === 'Approved'
                      const duration = isApproved && l.approved_days ? l.approved_days.length : (differenceInCalendarDays(parseISO(l.end_date), parseISO(l.start_date)) + 1)
                      return (
                        <div key={l.id} className="relative group">
                          <span className={cn("absolute left-[-42px] top-10 w-3 h-3 rounded-full z-10 ring-4 ring-zinc-950", statusGlow[l.status as keyof typeof statusGlow])} />
                          <div className={cn("bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] p-10 border border-white/5 transition-all duration-500 hover:-translate-y-1 shadow-2xl group-hover:bg-white/[0.04]", isApproved && "border-emerald-500/20")}>
                            <div className="flex flex-col lg:flex-row justify-between gap-10">
                              <div className="flex-1 space-y-6">
                                <div className="flex items-center gap-5">
                                  {activeTab === 'team-requests' && l.profiles && (
                                    <Avatar className="h-12 w-12 border border-white/10 shadow-xl ring-4 ring-white/5">
                                      <AvatarImage src={l.profiles.avatar_url ?? undefined} />
                                      <AvatarFallback className="bg-zinc-900 text-zinc-500 font-bold">{getInitials(l.profiles.full_name)}</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <span className="font-black text-white text-3xl tracking-tighter uppercase">{activeTab === 'team-requests' ? l.profiles?.full_name : l.leave_type}</span>
                                  {getStatusBadge(l.status)}
                                </div>
                                <div className="flex flex-wrap items-center gap-8">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{isApproved ? 'Authorized Period' : 'Requested Range'}</p>
                                    <p className="text-zinc-100 font-black text-lg tracking-tight">
                                        {format(parseISO(l.start_date), 'dd MMM')} {l.start_date !== l.end_date ? `– ${format(parseISO(l.end_date), 'dd MMM yyyy')}` : format(parseISO(l.start_date), 'yyyy')}
                                    </p>
                                  </div>
                                  <div className="h-10 w-px bg-white/10 hidden sm:block" />
                                  <div className="bg-white/5 border border-white/5 rounded-2xl px-6 py-3 shadow-inner">
                                    <span className="text-sky-400 font-black uppercase tracking-widest text-xs">{duration} {duration === 1 ? 'Day' : 'Days'} Statement</span>
                                  </div>
                                </div>
                                {l.reason && <div className="p-6 rounded-[2.5rem] bg-black/40 border border-white/5 text-zinc-400 text-sm italic font-medium leading-relaxed shadow-inner">"{l.reason}"</div>}
                              </div>
                              <div className="flex flex-col gap-4 shrink-0">
                                {activeTab === 'team-requests' && l.status === 'Pending' ? (
                                    <>
                                      <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-emerald-950/40" onClick={() => setLeaveToApprove(l)}><CheckCircle2 className="h-5 w-5 mr-3" /> Authorize</Button>
                                      <Button variant="ghost" className="text-rose-400 hover:bg-rose-500/10 rounded-2xl h-14 font-black uppercase tracking-widest text-[10px]" onClick={() => handleAction(l.id, 'Rejected')}>Reject</Button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                        {(l.status === 'Pending' || l.status === 'Approved') && (
                                            <Button variant="ghost" className="text-rose-400 hover:bg-rose-500/10 rounded-full h-14 px-8 font-black uppercase text-[10px] tracking-widest border border-rose-500/10" onClick={() => handleAction(l.id, 'Cancelled')}><XCircle className="h-5 w-5 mr-2" /> Cancel</Button>
                                        )}
                                        {l.status === 'Cancelled' && (
                                            <Button variant="ghost" className="text-sky-400 hover:bg-sky-500/10 rounded-full h-14 px-8 font-black uppercase text-[10px] tracking-widest border border-sky-500/10" onClick={() => handleAction(l.id, 'reopen')}><RefreshCcw className="h-5 w-5 mr-2" /> Re-apply</Button>
                                        )}
                                    </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[9999]">
        <Button
          size="lg"
          onClick={() => setIsApplyDialogOpen(true)}
          className="
            h-16 md:h-18
            rounded-full
            px-6 md:px-8
            bg-gradient-to-r
            from-sky-500
            via-blue-500
            to-indigo-600
            hover:scale-105
            active:scale-95
            transition-all
            duration-300
            shadow-[0_20px_50px_rgba(59,130,246,0.45)]
            border
            border-white/20
            backdrop-blur-xl
            text-white
            font-bold
            tracking-wide
            gap-3
          "
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">
            Apply for Leave
          </span>
        </Button>
      </div>

      <ApplyLeaveDialog isOpen={isApplyDialogOpen} setIsOpen={setIsApplyDialogOpen} onSuccess={() => fetchLeaves(false)} existingLeaves={leaves} />
      {leaveToApprove && <ApproveLeaveDialog isOpen={!!leaveToApprove} setIsOpen={() => setLeaveToApprove(null)} leave={leaveToApprove} onSuccess={() => fetchLeaves(false)} />}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  )
}
