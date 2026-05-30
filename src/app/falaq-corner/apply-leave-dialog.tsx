'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { Loader2, Send } from 'lucide-react'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { applyLeave } from './actions'
import { cn } from '@/lib/utils'
import type { Leave } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'

type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Maternity leave'
type DayType = 'Full Day' | 'Half Day'

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!leaveType || !startDate || !reason.trim()) {
      setShowError(true)
      setTimeout(() => setShowError(false), 400)
      toast({ title: 'Validation Error', description: 'Mandatory fields missing.', variant: 'destructive' })
      return
    }

    const finalEndDate = endDate || startDate

    const hasOverlap = existingLeaves.some((leave) => {
      if (leave.status === 'Cancelled' || leave.status === 'Rejected') return false
      return startDate <= leave.end_date && finalEndDate >= leave.start_date
    })

    if (hasOverlap) {
      toast({ title: 'Date Conflict', description: 'Request overlaps with an existing record.', variant: 'destructive' })
      return
    }

    const formData = new FormData()
    formData.set('leave_type', leaveType)
    formData.set('start_date', startDate)
    formData.set('end_date', finalEndDate)
    formData.set('day_type', dayType)
    formData.set('reason', reason.trim())

    startTransition(async () => {
      const result = await applyLeave(formData)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: 'Leave statement submitted successfully.' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  const duration = startDate ? (endDate ? (differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1) : (dayType === 'Half Day' ? 0.5 : 1)) : 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-zinc-950 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-3xl text-zinc-100 flex flex-col p-0 overflow-visible">
        <DialogHeader className="p-8 pb-5 border-b border-white/5 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight text-white uppercase">New Statement</DialogTitle>
          <DialogDescription className="text-zinc-500 font-medium">Log a new absence request in the studio ledger.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-8 py-6">
          <form id="apply-leave-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Type *</Label>
              <Select name="leave_type" value={leaveType} onValueChange={(val: LeaveType) => setLeaveType(val)}>
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
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">From *</Label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className={cn(
                    "w-full h-12 rounded-2xl bg-white/5 border border-white/10 px-4 font-bold text-white [color-scheme:dark] transition-all",
                    showError && !startDate && "border-rose-500 animate-shake"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">To</Label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 px-4 font-bold text-white [color-scheme:dark]"
                />
              </div>
            </div>

            {startDate && !endDate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Session</Label>
                <Select value={dayType} onValueChange={(val: DayType) => setDayType(val)}>
                  <SelectTrigger className="rounded-2xl h-12 bg-sky-500/10 border-sky-500/20 text-sky-400 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl bg-zinc-900 border-white/10 text-white shadow-2xl">
                    <SelectItem value="Full Day">Full Day</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className={cn("text-[10px] font-black uppercase tracking-[0.2em] ml-1", showError && !reason.trim() ? "text-rose-500" : "text-zinc-500")}>Audit Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly state the reason..."
                className={cn("rounded-2xl min-h-[110px] bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-sky-500/50 transition-all", showError && !reason.trim() && "border-rose-500 animate-shake")}
              />
            </div>

            {duration > 0 && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
                    Total: {duration} Day{duration !== 1 ? 's' : ''} Statement
                </div>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="p-8 border-t border-white/5 flex justify-end gap-4 bg-black/20 shrink-0">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-12 px-8 text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-[10px]">Discard</Button>
          <Button onClick={handleSubmit} form="apply-leave-form" disabled={isPending} className="rounded-full h-12 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-xs px-10 shadow-2xl shadow-sky-900/40">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Submit Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
