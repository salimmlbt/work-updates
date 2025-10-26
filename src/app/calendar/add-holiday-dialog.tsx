
'use client'

import { useState, useTransition } from 'react'
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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { addHoliday } from '@/app/actions'
import type { OfficialHoliday } from '@/lib/types'

interface AddHolidayDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onHolidayAdded: (newHoliday: OfficialHoliday) => void
}

export function AddHolidayDialog({ isOpen, setIsOpen, onHolidayAdded }: AddHolidayDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const result = await addHoliday(formData);
      if (result.error) {
        toast({
          title: "Error adding holiday",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Holiday Added",
          description: "The new holiday has been added successfully.",
        })
        onHolidayAdded(result.data as OfficialHoliday)
        setIsOpen(false)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Official Holiday</DialogTitle>
            <DialogDescription>
              Mark a new official leave day for the team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Holiday Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Company Off-site"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Briefly describe the holiday or event."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Holiday
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
