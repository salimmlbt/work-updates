
'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, CheckCircle2, Calendar as CalendarIcon, User } from 'lucide-react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { updateLeaveStatus } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Leave, Profile } from '@/lib/types'

interface ApproveLeaveDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  leave: Leave & { profiles?: Profile }
  onSuccess: () => void
}

export function ApproveLeaveDialog({
  isOpen,
  setIsOpen,
  leave,
  onSuccess,
}: ApproveLeaveDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleApprove = () => {
    startTransition(async () => {
      const result = await updateLeaveStatus(leave.id, 'Approved')
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Leave Approved', description: 'The leave request has been marked as approved.' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  const start = parseISO(leave.start_date)
  const end = parseISO(leave.end_date)
  const totalDays = differenceInCalendarDays(end, start) + 1

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl border shadow-2xl overflow-hidden p-0">
        
        {/* Top Header Accent */}
        <div className="h-2 w-full bg-emerald-500" />

        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              Verify & Approve
            </DialogTitle>
            <DialogDescription>
              Please verify the leave dates and employee details before approving.
            </DialogDescription>
          </DialogHeader>

          {/* Employee Info */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
              <AvatarImage src={leave.profiles?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(leave.profiles?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-slate-900">{leave.profiles?.full_name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{leave.leave_type}</p>
            </div>
          </div>

          {/* Date Verification Card */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Applied Schedule</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Starts On</p>
                <p className="text-sm font-bold text-slate-900">{format(start, 'EEE, dd MMM yyyy')}</p>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Ends On</p>
                <p className="text-sm font-bold text-slate-900">{format(end, 'EEE, dd MMM yyyy')}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border-2 border-emerald-100 border-dashed">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CalendarIcon className="h-4 w-4" />
                <span>Total Duration</span>
              </div>
              <span className="text-lg font-black text-emerald-600">{totalDays} Day{totalDays !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Employee Reason */}
          {leave.reason && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Reason Provided</label>
              <p className="text-sm text-slate-600 italic bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                "{leave.reason}"
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white font-bold"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
