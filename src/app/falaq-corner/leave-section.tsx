'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, XCircle, Loader2, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Leave } from '@/lib/types'
import { cancelLeave } from './actions'
import { useToast } from '@/hooks/use-toast'
import { ApplyLeaveDialog } from './apply-leave-dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function LeaveSection() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const { toast } = useToast()
  const supabase = createClient()

  const fetchLeaves = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    if (!error && data) setLeaves(data as Leave[])
    setIsLoading(false)
  }

  useEffect(() => { fetchLeaves() }, [])

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result = await cancelLeave(id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Cancelled', description: 'Leave cancelled successfully' })
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

  const groupedLeaves = leaves.reduce((acc, leave) => {
    const month = format(parseISO(leave.start_date), 'MMMM yyyy')
    acc[month] = acc[month] || []
    acc[month].push(leave)
    return acc
  }, {} as Record<string, Leave[]>)

  return (
    <div className="relative flex flex-col h-full rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-6 bg-white/70 backdrop-blur border-b">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Leave Management</h2>
        <p className="text-sm text-slate-500 mt-1">Track and manage your leave requests</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-slate-50 border border-dashed text-slate-400">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">No leave requests yet</p>
          </div>
        ) : (
          <div className="space-y-12">

            {Object.entries(groupedLeaves).map(([month, items]) => {
              const isCollapsed = collapsedMonths[month]

              return (
                <div key={month}>

                  {/* Month Toggle */}
                  <button
                    onClick={() =>
                      setCollapsedMonths(p => ({ ...p, [month]: !p[month] }))
                    }
                    className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-white/80 border shadow-sm hover:shadow-md transition duration-200"
                  >
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      {month}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-300", isCollapsed && "rotate-180")} />
                  </button>

                  {/* Timeline */}
                  <div
                    className={cn(
                      "mt-6 overflow-hidden transition-all duration-500 ease-in-out",
                      isCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
                    )}
                  >
                    <div className="relative pl-12 space-y-6">

                      <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400/40 to-transparent" />

                      {items.map((leave) => (
                        <div key={leave.id} className="relative">

                          <span
                            className={cn(
                              "absolute left-[-35px] top-6 w-3 h-3 rounded-full z-10",
                              statusGlow[leave.status]
                            )}
                          />

                          <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">

                            <div className="flex justify-between gap-4">

                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-slate-900">
                                    {leave.leave_type}
                                  </span>
                                  {getStatusBadge(leave.status)}
                                </div>

                                <p className="text-sm text-slate-500">
                                  {format(parseISO(leave.start_date), 'dd MMM')} – {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                                </p>

                                {leave.reason && (
                                  <p className="text-xs text-slate-400 italic line-clamp-1 max-w-md mt-2">
                                    {leave.reason}
                                  </p>
                                )}
                              </div>

                              {(leave.status === 'Pending' || leave.status === 'Approved') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-full px-4"
                                  onClick={() => handleCancel(leave.id)}
                                  disabled={isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}

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
        )}
      </div>

      {/* Floating CTA */}
      <div className="absolute bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full h-14 px-7 gap-2 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 active:scale-95"
          onClick={() => setIsApplyDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
          Apply Leave
        </Button>
      </div>

      <ApplyLeaveDialog
        isOpen={isApplyDialogOpen}
        setIsOpen={setIsApplyDialogOpen}
        onSuccess={fetchLeaves}
      />
    </div>
  )
}
