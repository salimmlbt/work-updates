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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, Calendar as CalendarIcon, X } from 'lucide-react'
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
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [dayType, setDayType] = useState<DayType>('Full Day')
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLeaveType('')
      setStartDate(undefined)
      setEndDate(undefined)
      setDayType('Full Day')
      setReason('')
      setShowError(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (endDate) {
      setDayType('Full Day');
    }
  }, [endDate]);

  const disabledDates = useMemo(() => {
    const today = startOfToday();
    if (!leaveType) return { before: today };

    switch (leaveType) {
      case 'Casual Leave':
        return { before: addDays(today, 2) };
      case 'Maternity leave':
        return { before: addDays(today, 7) };
      case 'Sick Leave':
      case 'Emergency Leave':
      default:
        return { before: today };
    }
  }, [leaveType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!leaveType || !startDate || !reason.trim()) {
      setShowError(true)
      setTimeout(() => setShowError(false), 400)
      toast({
        title: "Validation Error",
        description: "Please select leave type, start date, and provide a reason.",
        variant: "destructive"
      })
      return
    }

    const finalEndDate = endDate || startDate;

    if (endDate && endDate < startDate) {
      toast({
        title: "Invalid Range",
        description: "End date cannot be before start date.",
        variant: "destructive"
      })
      return
    }

    const hasOverlap = existingLeaves.some(leave => {
      if (leave.status === 'Cancelled' || leave.status === 'Rejected') return false
      const exStart = parseISO(leave.start_date)
      const exEnd = parseISO(leave.end_date)
      return (startDate <= exEnd) && (finalEndDate >= exStart)
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
    formData.set('start_date', format(startDate, 'yyyy-MM-dd'))
    if (endDate) {
      formData.set('end_date', format(endDate, 'yyyy-MM-dd'))
    }
    formData.set('day_type', dayType)
    formData.set('reason', reason.trim())

    startTransition(async () => {
      const result = await applyLeave(formData)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Leave request submitted successfully.' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  const totalDays = startDate 
    ? (endDate 
        ? differenceInCalendarDays(endDate, startDate) + 1 
        : (dayType === 'Half Day' ? 0.5 : 1)) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-zinc-950 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-3xl text-zinc-100 flex flex-col p-0 h-[85vh] md:h-auto md:max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-8 pb-5 border-b border-white/5 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight text-white uppercase">
            Apply for Leave
          </DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">
            First select the type, then choose your dates.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 py-6">
          <form id="apply-leave-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Leave Type <span className="text-rose-500">*</span></Label>
              <Select 
                name="leave_type" 
                value={leaveType} 
                onValueChange={(val: LeaveType) => {
                  setLeaveType(val);
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setDayType('Full Day');
                }}
              >
                <SelectTrigger className="rounded-2xl h-12 bg-white/5 border-white/10 text-white font-bold transition-all focus:ring-sky-500/50">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">From <span className="text-rose-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={!leaveType}
                      className={cn(
                        'w-full justify-start rounded-2xl h-12 text-left font-bold transition-all duration-300 bg-white/5 border-white/10 hover:bg-white/10',
                        !startDate && 'text-zinc-500',
                        showError && !startDate && 'ring-2 ring-rose-400 animate-shake',
                        !leaveType && 'opacity-50'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-sky-400" />
                      {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 rounded-2xl bg-zinc-950 border-white/10 shadow-2xl" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => { setStartDate(d); }}
                      disabled={disabledDates}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">
                  To {leaveType === 'Maternity leave' ? <span className="text-rose-500">*</span> : '(Optional)'}
                </Label>
                <div className="relative group">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        disabled={!startDate}
                        className={cn(
                          'w-full justify-start rounded-2xl h-12 text-left font-bold transition-all duration-300 bg-white/5 border-white/10 hover:bg-white/10',
                          !endDate && 'text-zinc-500',
                          !startDate && 'opacity-50',
                          showError && leaveType === 'Maternity leave' && !endDate && 'ring-2 ring-rose-400 animate-shake'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-sky-400" />
                        {endDate ? format(endDate, 'PPP') : leaveType === 'Maternity leave' ? 'Pick end date' : 'Add end date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 rounded-2xl bg-zinc-950 border-white/10 shadow-2xl" align="end">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => { setEndDate(d); }}
                        disabled={[
                          disabledDates,
                          { before: startDate || new Date() }
                        ]}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {endDate && (
                    <button 
                      type="button"
                      onClick={() => setEndDate(undefined)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {startDate && !endDate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Day Type</Label>
                <Select value={dayType} onValueChange={(val: DayType) => setDayType(val)}>
                  <SelectTrigger className="rounded-2xl h-12 bg-sky-500/10 border-sky-500/20 text-sky-400 font-bold">
                    <SelectValue placeholder="Full or Half Day?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white shadow-2xl">
                    <SelectItem value="Full Day">Full Day</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {startDate && (
              <div className="inline-flex items-center px-5 py-2 rounded-full bg-sky-500/10 text-sky-400 text-xs font-black uppercase tracking-widest w-fit border border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
                {format(startDate, 'MMM dd')} {endDate ? `→ ${format(endDate, 'MMM dd')}` : `(${dayType === 'Half Day' ? 'Half Day' : 'One Day'})`} • {totalDays} day{totalDays !== 1 ? 's' : ''}
              </div>
            )}

            <div className="space-y-2">
              <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em] ml-1", showError && !reason.trim() ? "text-rose-500" : "text-zinc-500")}>
                Reason <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you taking leave?"
                className={cn(
                  "rounded-2xl min-h-[110px] bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-sky-500/50 transition-all duration-300",
                  showError && !reason.trim() && "ring-2 ring-rose-400 animate-shake"
                )}
                required
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-white/5 flex justify-end gap-4 bg-black/20 shrink-0">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-12 px-8 text-zinc-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]">
            Cancel
          </Button>
          <Button
            type="submit"
            form="apply-leave-form"
            disabled={isPending}
            className="rounded-full h-12 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-black uppercase tracking-widest text-xs px-10 shadow-2xl shadow-sky-900/40"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
