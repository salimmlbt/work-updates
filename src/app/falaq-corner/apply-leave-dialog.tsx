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

  // Reset form when opened
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

  // Reset Day Type if an End Date is selected
  useEffect(() => {
    if (endDate) {
      setDayType('Full Day');
    }
  }, [endDate]);

  // Logic for disabled dates based on leave type
  const disabledDates = useMemo(() => {
    const today = startOfToday();
    if (!leaveType) return { before: today }; // Default to preventing past dates

    switch (leaveType) {
      case 'Casual Leave':
        // 2 days after present date
        return { before: addDays(today, 2) };
      case 'Maternity leave':
        // One week after present date
        return { before: addDays(today, 7) };
      case 'Sick Leave':
      case 'Emergency Leave':
      default:
        // Present date and future
        return { before: today };
    }
  }, [leaveType]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validation: Start date and Reason are mandatory.
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

    // Special Rule: End Date is strictly mandatory for Maternity leave
    if (leaveType === 'Maternity leave' && !endDate) {
      setShowError(true)
      toast({
        title: "End date required",
        description: "Maternity leave requires a return date (End Date).",
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

    // Overlap Validation (Client Side)
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
      <DialogContent className="sm:max-w-md rounded-3xl bg-gradient-to-br from-white to-slate-50 border shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Apply for Leave
            </DialogTitle>
            <DialogDescription>
              First select the type, then choose your dates.
            </DialogDescription>
          </DialogHeader>

          {/* Leave Type */}
          <div className="space-y-2">
            <Label>Leave Type <span className="text-rose-500">*</span></Label>
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
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Choose leave type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                <SelectItem value="Maternity leave">Maternity leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Pickers - Only enabled if type is selected */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start */}
            <div className="space-y-2">
              <Label>From <span className="text-rose-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={!leaveType}
                    className={cn(
                      'w-full justify-start rounded-xl text-left font-normal transition-all duration-300',
                      !startDate && 'text-slate-400',
                      showError && !startDate && 'ring-2 ring-rose-400 animate-shake',
                      !leaveType && 'opacity-50 grayscale'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl shadow-lg">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={disabledDates}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End */}
            <div className="space-y-2">
              <Label>
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
                        'w-full justify-start rounded-xl text-left font-normal transition-all duration-300',
                        !endDate && 'text-slate-400',
                        !startDate && 'opacity-50 grayscale',
                        showError && leaveType === 'Maternity leave' && !endDate && 'ring-2 ring-rose-400 animate-shake'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : leaveType === 'Maternity leave' ? 'Pick end date' : 'Add end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 rounded-xl shadow-lg">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Conditional Day Type Option */}
          {startDate && !endDate && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label>Day Type</Label>
              <Select value={dayType} onValueChange={(val: DayType) => setDayType(val)}>
                <SelectTrigger className="rounded-xl bg-blue-50/50 border-blue-100">
                  <SelectValue placeholder="Full or Half Day?" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Full Day">Full Day</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview Chip */}
          {startDate && (
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium w-fit">
              {format(startDate, 'MMM dd')} {endDate ? `→ ${format(endDate, 'MMM dd')}` : `(${dayType === 'Half Day' ? 'Half Day' : 'One Day'})`} • {totalDays} day{totalDays !== 1 ? 's' : ''}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label className={cn(showError && !reason.trim() && "text-rose-500")}>
              Reason <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you taking leave?"
              className={cn(
                "rounded-xl min-h-[90px] transition-all duration-300",
                showError && !reason.trim() && "ring-2 ring-rose-400 animate-shake"
              )}
              required
            />
          </div>

          <DialogFooter className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg px-8"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
