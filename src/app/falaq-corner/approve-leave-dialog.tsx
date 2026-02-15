
'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react'
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { updateLeaveStatus } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, cn } from '@/lib/utils'
import type { Leave, Profile } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

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

  // 🗓 Calculate individual dates in the requested range
  const allRequestedDates = useMemo(() => {
    try {
      if (!leave.start_date || !leave.end_date) return []
      return eachDayOfInterval({
        start: parseISO(leave.start_date),
        end: parseISO(leave.end_date),
      })
    } catch (e) {
      return []
    }
  }, [leave.start_date, leave.end_date])

  const [selectedDates, setSelectedDates] = useState<Date[]>([])

  useEffect(() => {
    if (isOpen) {
      setSelectedDates(allRequestedDates)
    }
  }, [isOpen, allRequestedDates])

  const toggleDate = (date: Date) => {
    setSelectedDates(prev => 
      prev.some(d => isSameDay(d, date))
        ? prev.filter(d => !isSameDay(d, date))
        : [...prev, date].sort((a, b) => a.getTime() - b.getTime())
    )
  }

  const isAllSelected = selectedDates.length === allRequestedDates.length && allRequestedDates.length > 0;

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedDates(allRequestedDates);
    } else {
      setSelectedDates([]);
    }
  }

  const handleApprove = () => {
    if (selectedDates.length === 0) return

    // Find min and max of selected dates to define the approved contiguous range
    const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())
    const approvedRange = {
      start: format(sorted[0], 'yyyy-MM-dd'),
      end: format(sorted[sorted.length - 1], 'yyyy-MM-dd'),
      days: sorted.map(d => format(d, 'yyyy-MM-dd')),
    }

    startTransition(async () => {
      const result = await updateLeaveStatus(leave.id, 'Approved', approvedRange)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Leave Approved', description: 'The leave request has been marked as approved.' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl border shadow-2xl overflow-hidden p-0">
        
        <div className="h-2 w-full bg-emerald-500" />

        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              Verify & Approve
            </DialogTitle>
            <DialogDescription>
              Select the specific dates you want to approve for this request.
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

          {/* Granular Date Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Approved Days
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">
                  {selectedDates.length} of {allRequestedDates.length} selected
                </span>
                <div 
                  role="button"
                  onClick={() => handleToggleAll(!isAllSelected)}
                  className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={handleToggleAll}
                    className="h-3.5 w-3.5"
                  />
                  <span>Select All</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-100 bg-slate-50/30 overflow-hidden">
              <ScrollArea className="h-[280px] w-full p-2">
                <div className="space-y-1 pr-3">
                  {allRequestedDates.map((date) => {
                    const isSelected = selectedDates.some(d => isSameDay(d, date))
                    return (
                      <div 
                        key={date.toISOString()}
                        onClick={() => toggleDate(date)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200",
                          isSelected ? "bg-white shadow-sm ring-1 ring-emerald-100" : "hover:bg-slate-100/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleDate(date)}
                            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-slate-900" : "text-slate-400"
                          )}>
                            {format(date, 'EEEE, dd MMM yyyy')}
                          </span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 border-2 border-emerald-100 border-dashed">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CalendarIcon className="h-4 w-4" />
                <span>Approved Duration</span>
              </div>
              <span className="text-lg font-black text-emerald-600">
                {selectedDates.length} Day{selectedDates.length !== 1 ? 's' : ''}
              </span>
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

          <DialogFooter className="flex gap-3 pt-4 border-t px-6 pb-6">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isPending || selectedDates.length === 0}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white font-bold"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve {selectedDates.length} {selectedDates.length === 1 ? 'Day' : 'Days'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
