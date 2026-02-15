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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { applyLeave } from './actions'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'

interface ApplyLeaveDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onSuccess: () => void
}

export function ApplyLeaveDialog({
  isOpen,
  setIsOpen,
  onSuccess,
}: ApplyLeaveDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showError, setShowError] = useState(false)

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

    if (!startDate || !endDate || endDate < startDate) {
      setShowError(true)
      setTimeout(() => setShowError(false), 500)
      return
    }

    const formData = new FormData(e.currentTarget)

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
  const totalDays = showPreview
    ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-gradient-to-br from-white to-slate-50 border shadow-2xl">

        <form onSubmit={handleSubmit} className="space-y-6">

          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Apply for Leave
            </DialogTitle>
            <DialogDescription>
              Select your dates and submit request
            </DialogDescription>
          </DialogHeader>

          {/* Leave type */}
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select name="leave_type" defaultValue="Casual Leave">
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                <SelectItem value="Planned Leave">Planned Leave</SelectItem>
                <SelectItem value="Maternity/Paternity Leave">
                  Maternity / Paternity Leave
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                name="start_date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={`rounded-xl transition-all ${showError ? 'animate-shake ring-2 ring-rose-400' : ''}`}
                required
              />
            </div>

            <div>
              <Label>To</Label>
              <Input
                type="date"
                name="end_date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={`rounded-xl transition-all ${showError ? 'animate-shake ring-2 ring-rose-400' : ''}`}
                required
              />
            </div>
          </div>

          {/* Preview chip */}
          {showPreview && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium w-fit">
              {format(parseISO(startDate), 'MMM dd')} → {format(parseISO(endDate), 'MMM dd')} • {totalDays} day{totalDays !== 1 ? 's' : ''}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              name="reason"
              placeholder="Briefly explain your leave..."
              className="rounded-xl min-h-[100px]"
            />
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-2">

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
