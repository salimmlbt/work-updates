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
import { Input } from '@/components/ui/input'
import { Loader2, X } from 'lucide-react'
import { format, differenceInCalendarDays, parseISO, addDays, startOfToday } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { applyLeave } from './actions'
import { cn } from '@/lib/utils'
import type { Leave } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'

type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Maternity leave'
type DayType = 'Full Day' | 'Half Day'

export function ApplyLeaveDialog({
  isOpen,
  setIsOpen,
  onSuccess,
  existingLeaves,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onSuccess: () => void
  existingLeaves: Leave[]
}) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [leaveType, setLeaveType] = useState<LeaveType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dayType, setDayType] = useState<DayType>('Full Day')
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLeaveType('')
      setStartDate('')
      setEndDate('')
      setDayType('Full Day')
      setReason('')
      setShowError(false)
    }
  }, [isOpen])

  const minDateString = useMemo(() => {
    const today = startOfToday()
    let minD = today
    if (leaveType === 'Casual Leave') minD = addDays(today, 2)
    else if (leaveType === 'Maternity leave') minD = addDays(today, 7)
    return format(minD, 'yyyy-MM-dd')
  }, [leaveType])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!leaveType || !startDate || !reason.trim()) {
      setShowError(true)
      toast({ title: 'Validation Error', description: 'Fill all mandatory fields.', variant: 'destructive' })
      return
    }

    const finalEndDate = endDate || startDate
    const hasOverlap = existingLeaves.some(leave => {
        if (leave.status === 'Cancelled' || leave.status === 'Rejected') return false
        return (startDate <= leave.end_date) && (finalEndDate >= leave.start_date)
    })

    if (hasOverlap) {
      toast({ title: 'Date Conflict', description: 'Existing request found for these dates.', variant: 'destructive' })
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('start_date', startDate)
    formData.set('end_date', finalEndDate)

    startTransition(async () => {
      const result = await applyLeave(formData)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Statement submitted.' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  const totalDays = startDate
    ? endDate
      ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
      : dayType === 'Half Day' ? 0.5 : 1
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-zinc-950 border-white/10 shadow-2xl backdrop-blur-3xl text-zinc-100 flex flex-col p-0 overflow-visible">
        <DialogHeader className="p-8 pb-5 border-b border-white/5 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight text-white uppercase">Apply for Leave</DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium text-xs">Choose leave type and dates using the native selectors below.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 py-6 max-h-[60vh]">
          <form id="apply-leave-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Type *</Label>
              <Select name="leave_type" value={leaveType} onValueChange={(val: any) => setLeaveType(val)}>
                <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 text-white font-bold">
                  <SelectValue placeholder="Choose leave type" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                  <SelectItem value="Maternity leave">Maternity leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">From *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={minDateString} className="h-12 rounded-2xl bg-white/5 border-white/10 [color-scheme:dark] font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">To (Optional)</Label>
                <div className="relative group">
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || minDateString} className="h-12 rounded-2xl bg-white/5 border-white/10 [color-scheme:dark] font-bold pr-10" />
                  {endDate && <button type="button" onClick={() => setEndDate('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>}
                </div>
              </div>
            </div>

            {startDate && !endDate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Day Type</Label>
                <Select name="day_type" value={dayType} onValueChange={(val: any) => setDayType(val)}>
                  <SelectTrigger className="h-12 rounded-2xl bg-sky-500/10 border-sky-500/20 text-sky-400 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="Full Day">Full Day</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {startDate && (
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-widest border border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
                {format(parseISO(startDate), 'MMM dd')} {endDate ? `→ ${format(parseISO(endDate), 'MMM dd')}` : ''} • {totalDays} Day{totalDays !== 1 ? 's' : ''}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Reason *</Label>
              <Textarea name="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide reasoning for absence..." className="rounded-2xl min-h-[100px] bg-white/5 border-white/10 text-white transition-all duration-300 focus:ring-sky-500/50" required />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-white/5 bg-black/20 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-12 px-6 text-zinc-500 hover:text-white font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
          <Button type="submit" form="apply-leave-form" disabled={isPending} className="rounded-full h-12 bg-gradient-to-r from-sky-600 to-blue-700 hover:scale-[1.02] text-white font-black uppercase tracking-widest text-[10px] px-8 shadow-2xl shadow-sky-900/40 border border-white/10">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
