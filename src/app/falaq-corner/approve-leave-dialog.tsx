
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
      <DialogContent className="sm:max-w-md rounded-[3rem] bg-zinc-950 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-3xl text-zinc-100 overflow-hidden p-0">
        
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />

        <div className="p-8 space-y-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3 text-white uppercase">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              Verify & Approve
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium">
              Select the specific dates you want to approve for this request.
            </DialogDescription>
          </DialogHeader>

          {/* Employee Info */}
          <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/[0.03] border border-white/10 shadow-2xl">
            <Avatar className="h-14 w-14 border-2 border-white/10 shadow-lg">
              <AvatarImage src={leave.profiles?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-400 font-black">{getInitials(leave.profiles?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-white text-lg tracking-tight">{leave.profiles?.full_name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mt-0.5">{leave.leave_type}</p>
            </div>
          </div>

          {/* Granular Date Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                Approved Days
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {selectedDates.length} of {allRequestedDates.length} selected
                </span>
                <div 
                  role="button"
                  onClick={() => handleToggleAll(!isAllSelected)}
                  className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-white hover:text-sky-400 transition-colors uppercase tracking-widest"
                >
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={handleToggleAll}
                    className="h-4 w-4 border-white/20 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                  />
                  <span>Select All</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.01] overflow-hidden">
              <ScrollArea className="h-[280px] w-full p-2">
                <div className="space-y-1.5 pr-4 pl-2 py-2">
                  {allRequestedDates.map((date) => {
                    const isSelected = selectedDates.some(d => isSameDay(d, date))
                    return (
                      <div 
                        key={date.toISOString()}
                        onClick={() => toggleDate(date)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300",
                          isSelected ? "bg-emerald-500/10 shadow-lg ring-1 ring-emerald-500/20" : "hover:bg-white/5 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleDate(date)}
                            className="h-4 w-4 border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                          />
                          <span className={cn(
                            "text-sm font-bold uppercase tracking-tight",
                            isSelected ? "text-emerald-400" : "text-zinc-500"
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

            <div className="flex items-center justify-between p-5 rounded-[2rem] bg-emerald-500/[0.03] border-2 border-emerald-500/20 border-dashed">
              <div className="flex items-center gap-3 text-emerald-400 font-black uppercase tracking-widest text-[10px]">
                <CalendarIcon className="h-4 w-4" />
                <span>Approved Duration</span>
              </div>
              <span className="text-2xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                {selectedDates.length} Day{selectedDates.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Employee Reason */}
          {leave.reason && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-2">Official Reason</label>
              <p className="text-sm text-zinc-400 italic bg-white/[0.02] p-5 rounded-[2rem] border border-white/5 leading-relaxed font-medium">
                "{leave.reason}"
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-4 pt-6 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-14 px-8 text-zinc-400 hover:text-white hover:bg-white/5 font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isPending || selectedDates.length === 0}
              className="flex-1 rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-500 shadow-2xl shadow-emerald-900/40 text-white font-black uppercase tracking-widest text-xs"
            >
              {isPending ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
              Approve {selectedDates.length} {selectedDates.length === 1 ? 'Day' : 'Days'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
