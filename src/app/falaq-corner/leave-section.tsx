
'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, XCircle, Loader2, ChevronDown, CheckCircle2, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Leave, Profile, RoleWithPermissions } from '@/lib/types'
import { cancelLeave, updateLeaveStatus } from './actions'
import { useToast } from '@/hooks/use-toast'
import { ApplyLeaveDialog } from './apply-leave-dialog'
import { ApproveLeaveDialog } from './approve-leave-dialog'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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

  const fetchLeaves = async () => {
    setIsLoading(true)
    let query = supabase.from('leaves').select('*, profiles(*)').order('start_date', { ascending: false })

    if (!isEditor || activeTab === 'my-leaves') {
      query = query.eq('user_id', profile.id)
    }

    const { data, error } = await query
    if (!error && data) setLeaves(data as any)
    setIsLoading(false)
  }

  useEffect(() => { fetchLeaves() }, [activeTab])

  const handleAction = (id: string, status: Leave['status']) => {
    startTransition(async () => {
      const result = status === 'Cancelled' ? await cancelLeave(id) : await updateLeaveStatus(id, status)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: `Leave ${status.toLowerCase()} successfully.` })
        fetchLeaves()
      }
    })
  }

  const getStatusBadge = (status: Leave['status']) => {
    switch (status) {
      case 'Approved': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>
      case 'Cancelled': return <Badge variant="secondary">Cancelled</Badge>
      default: return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>
    }
  }

  const statusGlow: Record<Leave['status'], string> = {
    Approved: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,.8)]',
    Pending: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,.8)]',
    Rejected: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,.8)]',
    Cancelled: 'bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,.6)]',
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
    <div className="space-y-12">
      {Object.entries(groupedLeaves).map(([month, items]) => {
        const isCollapsed = collapsedMonths[month]
        return (
          <div key={month}>
            <button
              onClick={() => setCollapsedMonths(p => ({ ...p, [month]: !p[month] }))}
              className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-white/80 border shadow-sm hover:shadow-md transition duration-200"
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">{month}</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-300", isCollapsed && "rotate-180")} />
            </button>

            <div className={cn("mt-6 transition-all duration-500", isCollapsed ? "max-h-0 opacity-0 overflow-hidden" : "max-h-[5000px] opacity-100")}>
              <div className="relative pl-12 space-y-6">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400/40 to-transparent" />
                {items.map((leave) => (
                  <div key={leave.id} className="relative group">
                    <span className={cn("absolute left-[-35px] top-6 w-3 h-3 rounded-full z-10", statusGlow[leave.status])} />
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            {activeTab === 'team-requests' && leave.profiles && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={leave.profiles.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">{getInitials(leave.profiles.full_name)}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="font-semibold text-slate-900 truncate">
                              {activeTab === 'team-requests' ? leave.profiles?.full_name : leave.leave_type}
                            </span>
                            {getStatusBadge(leave.status)}
                          </div>
                          <p className="text-sm text-slate-500">
                            {activeTab === 'team-requests' ? leave.leave_type : ''} {format(parseISO(leave.start_date), 'dd MMM')} – {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                          </p>
                          {leave.reason && <p className="text-xs text-slate-400 italic line-clamp-2 mt-2">"{leave.reason}"</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          {leave.status === 'Pending' && (
                            <>
                              {activeTab === 'team-requests' ? (
                                <>
                                  <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 rounded-full" onClick={() => setLeaveToApprove(leave)}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 rounded-full" onClick={() => handleAction(leave.id, 'Rejected')}>
                                    <X className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </>
                              ) : (
                                <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 rounded-full px-4 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleAction(leave.id, 'Cancelled')}>
                                  <XCircle className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="relative flex flex-col h-full rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
      <div className="p-6 bg-white/70 backdrop-blur border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Leave Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track and manage leave requests</p>
        </div>
        {isEditor && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-slate-100 p-1 rounded-full">
            <TabsList className="bg-transparent border-0 h-8 gap-1">
              <TabsTrigger value="my-leaves" className="rounded-full px-4 h-6 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">My Leaves</TabsTrigger>
              <TabsTrigger value="team-requests" className="rounded-full px-4 h-6 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">Team Requests</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-slate-50 border border-dashed text-slate-400">
            <FileText className="h-12 w-12 mb-4 opacity-30" /><p className="font-medium">No leave requests found</p>
          </div>
        ) : renderTimeline()}
      </div>

      <div className="absolute bottom-6 right-6">
        <Button size="lg" className="rounded-full h-14 px-7 gap-2 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all active:scale-95" onClick={() => setIsApplyDialogOpen(true)}>
          <Plus className="h-5 w-5" /> Apply Leave
        </Button>
      </div>

      <ApplyLeaveDialog isOpen={isApplyDialogOpen} setIsOpen={setIsApplyDialogOpen} onSuccess={fetchLeaves} existingLeaves={leaves} />
      {leaveToApprove && (
        <ApproveLeaveDialog isOpen={!!leaveToApprove} setIsOpen={() => setLeaveToApprove(null)} leave={leaveToApprove} onSuccess={fetchLeaves} />
      )}
    </div>
  )
}
