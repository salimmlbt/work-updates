
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
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { applyLeave } from './actions'
import { cn } from '@/lib/utils'
import type { Leave } from '@/lib/types'

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

  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setStartDate(undefined)
      setEndDate(undefined)
      setReason('')
      setShowError(false)
    }
  }, [isOpen])

  /* Keyboard shortcuts */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, setIsOpen])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // 1. Mandatory Fields Validation
    if (!startDate || !endDate || endDate < startDate || !reason.trim()) {
      setShowError(true)
      setTimeout(() => setShowError(false), 400)
      toast({
        title: "Validation Error",
        description: "Please fill in all mandatory fields correctly.",
        variant: "destructive"
      })
      return
    }

    // 2. Overlap Validation (Client Side)
    const hasOverlap = existingLeaves.some(leave => {
      if (leave.status === 'Cancelled' || leave.status === 'Rejected') return false
      
      const exStart = parseISO(leave.start_date)
      const exEnd = parseISO(leave.end_date)
      
      // Dates overlap if (start1 <= end2) AND (end1 >= start2)
      return (startDate <= exEnd) && (endDate >= exStart)
    })

    if (hasOverlap) {
      toast({
        title: "Date Conflict",
        description: "You already have a leave request covering these dates.",
        variant: "destructive"
      })
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('start_date', startDate.toISOString().slice(0, 10))
    formData.set('end_date', endDate.toISOString().slice(0, 10))
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

  const showPreview = startDate && endDate && endDate >= startDate
  const totalDays =
    showPreview ? differenceInCalendarDays(endDate!, startDate!) + 1 : 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-gradient-to-br from-white to-slate-50 border shadow-2xl">

        <form onSubmit={handleSubmit} className="space-y-6">

          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Apply for Leave
            </DialogTitle>
            <DialogDescription>
              Choose your dates and submit your request
            </DialogDescription>
          </DialogHeader>

          {/* Leave Type */}
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select name="leave_type" defaultValue="Casual Leave">
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                <SelectItem value="Planned Leave">Planned Leave</SelectItem>
                <SelectItem value="Maternity/Paternity Leave">
                  Maternity / Paternity Leave
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-4">

            {/* Start */}
            <div className="space-y-2">
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      'w-full justify-start rounded-xl text-left font-normal transition-all duration-300',
                      !startDate && 'text-slate-400',
                      showError && !startDate && 'ring-2 ring-rose-400 animate-shake'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl shadow-lg">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End */}
            <div className="space-y-2">
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      'w-full justify-start rounded-xl text-left font-normal transition-all duration-300',
                      !endDate && 'text-slate-400',
                      showError && !endDate && 'ring-2 ring-rose-400 animate-shake'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl shadow-lg">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

          </div>

          {/* Preview Chip */}
          {showPreview && (
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium w-fit">
              {format(startDate!, 'MMM dd')} → {format(endDate!, 'MMM dd')} • {totalDays} day{totalDays !== 1 ? 's' : ''}
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
              placeholder="Please explain why you need leave (Mandatory)"
              className={cn(
                "rounded-xl min-h-[90px] transition-all duration-300",
                showError && !reason.trim() && "ring-2 ring-rose-400 animate-shake"
              )}
              required
            />
          </div>

          <DialogFooter className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel (Esc)
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg px-8"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit (Enter)
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
