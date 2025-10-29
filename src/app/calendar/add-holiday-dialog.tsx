
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DialogMode = 'holiday' | 'event' | 'special_day';
type FalaqEventType = 'holiday' | 'event' | 'meeting';

interface AddHolidayDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onEventAdded: (newEvent: OfficialHoliday) => void
  userId?: string | null
  dialogType: DialogMode
  selectedDate: Date | null
}

export function AddHolidayDialog({ isOpen, setIsOpen, onEventAdded, userId, dialogType, selectedDate }: AddHolidayDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [formData, setFormData] = useState<{name: string, date: string, description: string, falaqEventType: FalaqEventType | ''}>({ name: '', date: '', description: '', falaqEventType: '' });

  const titleMap: Record<DialogMode, string> = {
    holiday: 'Add to Falaq Calendar',
    event: 'Add Personal Event',
    special_day: 'Add Special Day'
  };

  const descriptionMap: Record<DialogMode, string> = {
    holiday: 'Mark a new holiday, event, or meeting for the team.',
    event: 'Add a personal event to your calendar.',
    special_day: 'Mark a new special day for the team.'
  };
  
  const title = titleMap[dialogType];
  const description = descriptionMap[dialogType];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        description: '',
        falaqEventType: dialogType === 'holiday' ? 'holiday' : ''
      });
    }
  }, [isOpen, selectedDate, dialogType]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialogType === 'holiday' && !formData.falaqEventType) {
      toast({
        title: "Type is required",
        description: "Please select a type for the Falaq Calendar event.",
        variant: "destructive",
      });
      return;
    }
    
    const form = new FormData(event.currentTarget);
    if (userId) {
      form.append('user_id', userId);
    }
    
    let type: OfficialHoliday['type'];
    if (dialogType === 'holiday') {
      type = 'official';
      if (formData.falaqEventType) {
        form.append('falaq_event_type', formData.falaqEventType);
      }
    } else if (dialogType === 'event') {
      type = 'personal';
    } else {
      type = 'special_day';
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

  const handleTypeChange = (value: FalaqEventType) => {
    setFormData(prev => ({ ...prev, falaqEventType: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {dialogType === 'holiday' && (
                <div className="grid gap-2">
                    <Label htmlFor="falaq-type">Type</Label>
                    <Select onValueChange={handleTypeChange} value={formData.falaqEventType || undefined} required>
                        <SelectTrigger id="falaq-type">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="holiday">Holiday</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
