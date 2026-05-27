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
import { Loader2, Calendar as CalendarIcon, X, CheckCircle2 } from 'lucide-react'
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

    const finalEndDateStr = endDateStr || startDateStr

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
      <DialogContent className="sm:max-w-xl rounded-[3rem] bg-zinc-950 border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl text-zinc-100 flex flex-col p-0 h-[85vh] md:h-auto md:max-h-[90vh] overflow-visible md:overflow-hidden">
        <DialogHeader className="p-10 pb-6 border-b border-white/5 shrink-0">
          <DialogTitle className="text-3xl font-black tracking-tight text-white uppercase">
            Create Leave Statement
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium text-sm mt-1">
            Specify the type and schedule for your upcoming studio leave.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-10 py-8">
          <form id="apply-leave-form" onSubmit={handleSubmit} className="space-y-10 pb-6">
            
            {/* Type Selection */}
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">Protocol Type</Label>
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
                <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-white font-bold transition-all focus:ring-sky-500/50 shadow-xl">
                  <SelectValue placeholder="Select leave archetype" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white shadow-2xl">
                  <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                  <SelectItem value="Maternity leave">Maternity leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">From Date</Label>
                <div className="relative group">
                  <Input 
                    type="date"
                    value={startDateStr}
                    min={minDate}
                    disabled={!leaveType}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className={cn(
                      "h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold px-4 focus-visible:ring-sky-500/50 [color-scheme:dark] shadow-xl group-hover:border-white/20 transition-all",
                      showError && !startDateStr && "ring-2 ring-rose-400 animate-shake"
                    )}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <CalendarIcon className="h-4 w-4 text-sky-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">
                  To Date <span className="text-[9px] opacity-40">(Optional)</span>
                </Label>
                <div className="relative group">
                  <Input 
                    type="date"
                    value={endDateStr}
                    min={startDateStr || minDate}
                    disabled={!startDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className={cn(
                      "h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold px-4 focus-visible:ring-sky-500/50 [color-scheme:dark] shadow-xl group-hover:border-white/20 transition-all",
                      showError && leaveType === 'Maternity leave' && !endDateStr && "ring-2 ring-rose-400 animate-shake"
                    )}
                  />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <CalendarIcon className="h-4 w-4 text-sky-400" />
                  </div>
                  {endDateStr && (
                    <button 
                      type="button"
                      onClick={() => setEndDateStr('')}
                      className="absolute right-12 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Session Type (Only for 1 day) */}
            {startDateStr && !endDateStr && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 ml-1">Statement Density</Label>
                <Select value={dayType} onValueChange={(val: DayType) => setDayType(val)}>
                  <SelectTrigger className="rounded-2xl h-14 bg-sky-500/10 border-sky-500/20 text-sky-400 font-black uppercase tracking-widest text-[10px]">
                    <SelectValue placeholder="Full or Half Day?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white shadow-2xl">
                    <SelectItem value="Full Day">Full Shift</SelectItem>
                    <SelectItem value="Half Day">Half Shift Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Live Counter Badge */}
            {startDateStr && (
              <div className="flex items-center justify-between p-6 rounded-[2.5rem] bg-sky-500/5 border border-sky-500/20 shadow-[0_0_30px_rgba(56,189,248,0.05)]">
                <div className="flex items-center gap-4 text-sky-400 font-black uppercase tracking-[0.2em] text-[10px]">
                    <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
                    Computed Duration
                </div>
                <span className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    {totalDays} {totalDays === 1 || totalDays === 0.5 ? 'Day' : 'Days'}
                </span>
              </div>
            )}

            {/* Official Reason */}
            <div className="space-y-4">
              <Label className={cn("text-[10px] font-black uppercase tracking-[0.3em] ml-1", showError && !reason.trim() ? "text-rose-500" : "text-zinc-600")}>
                Protocol Justification
              </Label>
              <Textarea
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail the circumstances of this leave application..."
                className={cn(
                  "rounded-[2rem] min-h-[140px] bg-white/[0.02] border-white/10 text-white placeholder:text-zinc-700 focus-visible:ring-sky-500/50 transition-all duration-500 font-medium leading-relaxed p-6 shadow-xl",
                  showError && !reason.trim() && "ring-2 ring-rose-400 animate-shake"
                )}
                required
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-10 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-5 bg-black/40 backdrop-blur-3xl shrink-0">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-14 px-10 text-zinc-500 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]">
            Discard
          </Button>
          <Button
            type="submit"
            form="apply-leave-form"
            disabled={isPending}
            className="flex-1 rounded-2xl h-14 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black uppercase tracking-[0.2em] text-[10px] px-12 shadow-2xl shadow-sky-900/40 border border-white/10 active:scale-95 transition-all"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
            Commit Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
