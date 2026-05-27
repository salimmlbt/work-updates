'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, X } from 'lucide-react'
import { format, differenceInCalendarDays, parseISO, addDays, startOfToday } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { applyLeave } from './actions'
import { cn } from '@/lib/utils'
import type { Leave } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'

type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Maternity leave';
type DayType = 'Full Day' | 'Half Day';

interface ApplyLeaveDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onSuccess: () => void
  existingLeaves: Leave[]
}

export function ApplyLeaveDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  existingLeaves,
}: ApplyLeaveDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [leaveType, setLeaveType] = useState<LeaveType | ''>('')
  const [startDateStr, setStartDateStr] = useState('')
  const [endDateStr, setEndDateStr] = useState('')
  const [dayType, setDayType] = useState<DayType>('Full Day')
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLeaveType('')
      setStartDateStr('')
      setEndDateStr('')
      setDayType('Full Day')
      setReason('')
      setShowError(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (endDateStr) {
      setDayType('Full Day');
    }
  }, [endDateStr]);

  const minDate = useMemo(() => {
    const today = startOfToday();
    if (!leaveType) return format(today, 'yyyy-MM-dd');

    switch (leaveType) {
      case 'Casual Leave':
        return format(addDays(today, 2), 'yyyy-MM-dd');
      case 'Maternity leave':
        return format(addDays(today, 7), 'yyyy-MM-dd');
      default:
        return format(today, 'yyyy-MM-dd');
    }
  }, [leaveType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!leaveType || !startDateStr || !reason.trim()) {
      setShowError(true)
      setTimeout(() => setShowError(false), 400)
      toast({
        title: "Validation Error",
        description: "Please select leave type, start date, and provide a reason.",
        variant: "destructive"
      })
      return
    }

    const startDate = parseISO(startDateStr)
    const finalEndDateStr = endDateStr || startDateStr
    const endDate = parseISO(finalEndDateStr)

    if (endDateStr && endDateStr < startDateStr) {
      toast({
        title: "Invalid Range",
        description: "End date cannot be before start date.",
        variant: "destructive"
      })
      return
    }

    const hasOverlap = existingLeaves.some(leave => {
      if (leave.status === 'Cancelled' || leave.status === 'Rejected') return false
      return (startDateStr <= leave.end_date) && (finalEndDateStr >= leave.start_date)
    })

    if (hasOverlap) {
      toast({
        title: "Date Conflict",
        description: "You already have an active leave request covering these dates.",
        variant: "destructive"
      })
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('leave_type', leaveType)
    formData.set('start_date', startDateStr)
    if (endDateStr) {
      formData.set('end_date', endDateStr)
    }
    formData.set('day_type', dayType)
    formData.set('reason', reason.trim())

    startTransition(async () => {
      const result = await applyLeave(formData)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Leave request submitted successfully.', variant: 'success' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  const totalDays = useMemo(() => {
    if (!startDateStr) return 0;
    if (!endDateStr) return dayType === 'Half Day' ? 0.5 : 1;
    return differenceInCalendarDays(parseISO(endDateStr), parseISO(startDateStr)) + 1;
  }, [startDateStr, endDateStr, dayType]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-zinc-950 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-3xl text-zinc-100 flex flex-col p-0 h-[85vh] md:h-auto md:max-h-[90vh] overflow-visible md:overflow-hidden">
        <DialogHeader className="p-8 pb-5 border-b border-white/5 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight text-white uppercase">
            Apply for Leave
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">
            Select the leave type and your intended dates below.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 py-6">
          <form id="apply-leave-form" onSubmit={handleSubmit} className="space-y-8 pb-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Leave Type <span className="text-rose-500">*</span></Label>
              <Select 
                name="leave_type" 
                value={leaveType} 
                onValueChange={(val: LeaveType) => {
                  setLeaveType(val);
                  setStartDateStr('');
                  setEndDateStr('');
                  setDayType('Full Day');
                }}
              >
                <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-white font-bold transition-all focus:ring-sky-500/50">
                  <SelectValue placeholder="Choose leave type" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white shadow-2xl">
                  <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                  <SelectItem value="Maternity leave">Maternity leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">From Date <span className="text-rose-500">*</span></Label>
                <Input 
                  type="date"
                  value={startDateStr}
                  min={minDate}
                  disabled={!leaveType}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className={cn(
                    "h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold px-4 focus-visible:ring-sky-500/50 [color-scheme:dark]",
                    showError && !startDateStr && "ring-2 ring-rose-400 animate-shake"
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                  To Date {leaveType === 'Maternity leave' ? <span className="text-rose-500">*</span> : '(Optional)'}
                </Label>
                <div className="relative group">
                  <Input 
                    type="date"
                    value={endDateStr}
                    min={startDateStr || minDate}
                    disabled={!startDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className={cn(
                      "h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold px-4 focus-visible:ring-sky-500/50 [color-scheme:dark]",
                      showError && leaveType === 'Maternity leave' && !endDateStr && "ring-2 ring-rose-400 animate-shake"
                    )}
                  />
                  {endDateStr && (
                    <button 
                      type="button"
                      onClick={() => setEndDateStr('')}
                      className="absolute right-10 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {startDateStr && !endDateStr && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Day Session</Label>
                <Select value={dayType} onValueChange={(val: DayType) => setDayType(val)}>
                  <SelectTrigger className="rounded-2xl h-14 bg-sky-500/10 border-sky-500/20 text-sky-400 font-bold">
                    <SelectValue placeholder="Full or Half Day?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white shadow-2xl">
                    <SelectItem value="Full Day">Full Day Session</SelectItem>
                    <SelectItem value="Half Day">Half Day Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {startDateStr && (
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] w-fit border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                Duration: {totalDays} {totalDays === 1 || totalDays === 0.5 ? 'Day' : 'Days'} Statement
              </div>
            )}

            <div className="space-y-3">
              <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em] ml-1", showError && !reason.trim() ? "text-rose-500" : "text-zinc-500")}>
                Official Reason <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please state the precise reason for this leave request..."
                className={cn(
                  "rounded-2xl min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-sky-500/50 transition-all duration-300 font-medium leading-relaxed",
                  showError && !reason.trim() && "ring-2 ring-rose-400 animate-shake"
                )}
                required
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-white/5 flex justify-end gap-4 bg-black/20 shrink-0">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-14 px-8 text-zinc-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]">
            Discard
          </Button>
          <Button
            type="submit"
            form="apply-leave-form"
            disabled={isPending}
            className="flex-1 rounded-2xl h-14 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black uppercase tracking-widest text-xs px-10 shadow-2xl shadow-sky-900/40"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Commit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
