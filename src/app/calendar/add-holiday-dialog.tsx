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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { addHoliday } from '@/app/actions'
import type { OfficialHoliday } from '@/lib/types'

interface AddHolidayDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onEventAdded: (newEvent: OfficialHoliday) => void
  userId?: string | null
  dialogType: 'holiday' | 'event'
}

export function AddHolidayDialog({ isOpen, setIsOpen, onEventAdded, userId, dialogType }: AddHolidayDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [formData, setFormData] = useState({ name: '', date: '', description: '' });

  const title = dialogType === 'holiday' ? 'Create Holiday/Event' : 'Add Personal Event';
  const description = dialogType === 'holiday' 
    ? 'Mark a new official leave day or event for the team.'
    : 'Add a personal event to your calendar.';
  const buttonText = dialogType === 'holiday' ? 'Create Event' : 'Add Event';

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', date: '', description: '' });
    }
  }, [isOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (userId) {
      form.append('user_id', userId);
    }
    
    startTransition(async () => {
      const result = await addHoliday(form);
      if (result.error) {
        toast({
          title: "Error adding event",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Event Added",
          description: "The new event has been added successfully.",
        })
        onEventAdded(result.data as OfficialHoliday)
        setIsOpen(false)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Event Name</Label>
              <Input id="name" name="name" placeholder="e.g., Company Off-site" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" placeholder="Briefly describe the event." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
