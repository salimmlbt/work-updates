
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
import { updateHoliday } from '@/app/actions'
import type { OfficialHoliday } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CalendarEvent } from './calendar-client'

type FalaqEventType = 'leave' | 'event' | 'meeting';

interface EditHolidayDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onEventUpdated: (updatedEvent: OfficialHoliday) => void
  event: CalendarEvent
}

export function EditHolidayDialog({ isOpen, setIsOpen, onEventUpdated, event }: EditHolidayDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    name: event.name,
    date: format(parseISO(event.date), 'yyyy-MM-dd'),
    description: event.description || '',
    falaqEventType: event.falaq_event_type || ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: event.name,
        date: format(parseISO(event.date), 'yyyy-MM-dd'),
        description: event.description || '',
        falaqEventType: event.falaq_event_type || ''
      });
    }
  }, [isOpen, event]);
  
  const isPersonalEvent = event.type === 'personal';
  const isFalaqCalendarEvent = event.type === 'official' || event.falaq_event_type;
  
  const title = `Edit ${isPersonalEvent ? 'Personal Event' : 'Event'}`;
  const description = `Update the details for your event.`;


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isFalaqCalendarEvent && !formData.falaqEventType) {
      toast({
        title: "Type is required",
        description: "Please select a type for the Falaq Calendar event.",
        variant: "destructive",
      });
      return;
    }
    
    const form = new FormData(e.currentTarget);
    const numericId = typeof event.id === 'string' ? parseInt(event.id.split('-').pop() || '0') : event.id;

    if (!numericId) {
        toast({ title: "Error", description: "Invalid event ID", variant: "destructive" });
        return;
    }
    
    startTransition(async () => {
      const result = await updateHoliday(numericId, form);
      if (result.error) {
        toast({
          title: "Error updating event",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Event Updated",
          description: "The event has been updated successfully.",
        })
        onEventUpdated(result.data as OfficialHoliday)
        setIsOpen(false)
      }
    })
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value }));
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
             {isFalaqCalendarEvent && (
                <div className="grid gap-2">
                    <Label htmlFor="falaq-event-type">Type</Label>
                    <Select name="falaq_event_type" onValueChange={handleTypeChange} value={formData.falaqEventType || undefined} required>
                        <SelectTrigger id="falaq-event-type">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="leave">Leave</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Event Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Briefly describe the event." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
