
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addSchedule } from '@/app/actions';
import { format } from 'date-fns';
import type { ContentSchedule } from '@/lib/types';
import { cn } from '@/lib/utils';

const scheduleSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  content_type: z.string().optional(),
  scheduled_date: z.date({ required_error: 'A date is required.' }),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface AddScheduleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  clientId: string | null;
  onScheduleAdded: (schedule: ContentSchedule) => void;
}

export function AddScheduleDialog({
  isOpen,
  setIsOpen,
  clientId,
  onScheduleAdded,
}: AddScheduleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: '',
        content_type: '',
        scheduled_date: new Date(),
        notes: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = (data: ScheduleFormData) => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No client selected.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('client_id', clientId);
      formData.append('title', data.title);
      if (data.content_type) formData.append('content_type', data.content_type);
      formData.append('scheduled_date', format(data.scheduled_date, 'yyyy-MM-dd'));
      if (data.notes) formData.append('notes', data.notes);

      const result = await addSchedule(formData);

      if (result.error) {
        toast({
          title: 'Error adding schedule',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.data) {
        toast({
          title: 'Schedule Added',
          description: 'The new schedule has been added successfully.',
        });
        onScheduleAdded(result.data);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <DialogDescription>
            Schedule a new piece of content for your client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Controller
                    name="scheduled_date"
                    control={control}
                    render={({ field }) => (
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    )}
                />
                 {errors.scheduled_date && <p className="text-sm text-destructive">{errors.scheduled_date.message}</p>}
            </div>
             <div className="space-y-2">
                <Label htmlFor="content_type">Content Type</Label>
                <Input id="content_type" {...register('content_type')} placeholder="e.g., Blog Post, Video" />
              </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
