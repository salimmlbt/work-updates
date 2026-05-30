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
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { updateLeaveStatus } from './actions'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, cn } from '@/lib/utils'
import type { Leave, Profile } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ApproveLeaveDialog({
  isOpen,
  setIsOpen,
  leave,
  onSuccess,
}: {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  leave: Leave & { profiles?: Profile }
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const allRequestedDates = useMemo(() => {
    try {
      if (!leave.start_date || !leave.end_date) return []
      return eachDayOfInterval({ start: parseISO(leave.start_date), end: parseISO(leave.end_date) })
    } catch (e) { return [] }
  }, [leave.start_date, leave.end_date])

  const [selectedDates, setSelectedDates] = useState<Date[]>([])

  useEffect(() => {
    if (isOpen) setSelectedDates(allRequestedDates)
  }, [isOpen, allRequestedDates])

  const toggleDate = (date: Date) => {
    setSelectedDates(prev => prev.some(d => isSameDay(d, date)) ? prev.filter(d => !isSameDay(d, date)) : [...prev, date])
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
      if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' })
      else {
        toast({ title: 'Statement Approved', variant: 'success' })
        onSuccess()
        setIsOpen(false)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl rounded-[3.5rem] bg-zinc-950 border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.85)] backdrop-blur-3xl text-zinc-100 overflow-hidden p-0">
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 shadow-[0_0_40px_rgba(16,185,129,0.4)]" />
        <div className="p-10 space-y-10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-4 text-white uppercase">
              <ShieldCheck className="h-10 w-10 text-emerald-400" /> Audit & Commit
            </DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium text-sm mt-1">Verify requested period and authorize the absence statement.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-6 p-6 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-2xl">
            <Avatar className="h-16 w-16 border-2 border-white/10 shadow-2xl">
              <AvatarImage src={leave.profiles?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-emerald-500/10 text-emerald-400 font-black text-lg">{getInitials(leave.profiles?.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-white text-xl tracking-tight uppercase">{leave.profiles?.full_name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mt-1">{leave.leave_type}</p>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-black/40 overflow-hidden shadow-inner">
            <ScrollArea className="h-[280px] w-full p-4">
              <div className="space-y-2">
                {allRequestedDates.map((date) => {
                  const isSelected = selectedDates.some(d => isSameDay(d, date))
                  return (
                    <div key={date.toISOString()} onClick={() => toggleDate(date)} className={cn("flex items-center justify-between p-5 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent", isSelected ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/[0.01] opacity-50")}>
                      <div className="flex items-center gap-5">
                        <Checkbox checked={isSelected} className="h-4 w-4 border-white/10 data-[state=checked]:bg-emerald-500" />
                        <span className={cn("text-sm font-black uppercase tracking-widest", isSelected ? "text-emerald-400" : "text-zinc-500")}>{format(date, 'EEEE, dd MMMM yyyy')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-5 pt-8 border-t border-white/5 bg-black/20 mt-4 -mx-10 px-10 pb-10">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-2xl h-14 px-10 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-[10px]">Dismiss</Button>
            <Button onClick={handleApprove} disabled={isPending || selectedDates.length === 0} className="flex-1 rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-500 shadow-2xl text-white font-black uppercase tracking-[0.2em] text-[10px]">
              {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-3" />}
              Authorize {selectedDates.length} Days
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
