
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
import { format } from 'date-fns'

interface AddHolidayDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onEventAdded: (newEvent: OfficialHoliday) => void
  userId?: string | null
  dialogType: 'holiday' | 'event' | 'special_day'
  selectedDate: Date | null
}

export function AddHolidayDialog({ isOpen, setIsOpen, onEventAdded, userId, dialogType, selectedDate }: AddHolidayDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [formData, setFormData] = useState({ name: '', date: '', description: '' });

  const titleMap = {
    holiday: 'Add Holiday or Event',
    event: 'Add Personal Event',
    special_day: 'Add Special Day'
  };

  const descriptionMap = {
    holiday: 'Mark a new official leave day or event for the team.',
    event: 'Add a personal event to your calendar.',
    special_day: 'Mark a new special day for the team.'
  };

  const buttonTextMap = {
    holiday: 'Create Event',
    event: 'Add Event',
    special_day: 'Add Special Day'
  };
  
  const title = titleMap[dialogType];
  const description = descriptionMap[dialogType];
  const buttonText = buttonTextMap[dialogType];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        description: ''
      });
    }
  }, [isOpen, selectedDate]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (userId) {
      form.append('user_id', userId);
    }
    
    // Determine type based on dialogType and userId
    let type: 'official' | 'personal' | 'special_day';
    if (userId) {
        type = 'personal';
    } else if (dialogType === 'special_day') {
        type = 'special_day';
    } else {
        type = 'official';
    }
    form.append('type', type);
    
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({...prev, date: e.target.value }));
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
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleDateChange} required />
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
