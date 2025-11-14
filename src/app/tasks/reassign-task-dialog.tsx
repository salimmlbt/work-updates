
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, isToday, isTomorrow, subDays, startOfDay } from 'date-fns'
import { Calendar, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'
import type { TaskWithDetails, Profile, Team } from '@/lib/types'
import { createTask } from '@/app/teams/actions'

const reassignSchema = z.object({
  assignee_id: z.string().min(1, 'Assignee is required.'),
  type: z.string().min(1, 'Type is required.'),
  post_date: z.date({ required_error: 'Post date is required.' }),
  post_time: z.string({ required_error: 'Post time is required.' }).min(1, 'Post time is required.'),
  deadline: z.date({ required_error: 'Due date is required.' }),
})

type ReassignFormData = z.infer<typeof reassignSchema>

interface ReassignTaskDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  task: TaskWithDetails
  profiles: Profile[]
  onTaskCreated: (newTask: any) => void
}

export function ReassignTaskDialog({
  isOpen,
  setIsOpen,
  task,
  profiles,
  onTaskCreated,
}: ReassignTaskDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ReassignFormData>({
    resolver: zodResolver(reassignSchema),
    mode: 'onChange',
  })

  const postDate = watch('post_date');

  useEffect(() => {
    if (isOpen) {
        const today = startOfDay(new Date());
        reset({
            assignee_id: '',
            type: 'Posting',
            post_date: today,
            post_time: format(new Date(), 'HH:mm'),
            deadline: today,
        });
    }
  }, [isOpen, reset]);

  useEffect(() => {
    if (postDate) {
      const today = startOfDay(new Date());
      const normalizedPostDate = startOfDay(postDate);

      if (isToday(normalizedPostDate) || isTomorrow(normalizedPostDate)) {
        setValue('deadline', today, { shouldValidate: true });
      } else {
        setValue('deadline', subDays(normalizedPostDate, 1), { shouldValidate: true });
      }
    }
  }, [postDate, setValue]);


  const assigneeId = watch('assignee_id')
  const selectedAssignee = profiles.find(p => p.id === assigneeId)
  const assigneeTeams = selectedAssignee?.teams?.map(t => t.teams).filter(Boolean) as Team[] || []
  const availableTaskTypes = [...new Set(assigneeTeams.flatMap(t => t.default_tasks || []))]

  const onSubmit = async (data: ReassignFormData) => {
    startTransition(async () => {
      const [hours, minutes] = data.post_time.split(':').map(Number);
      const combinedDateTime = new Date(data.post_date);
      combinedDateTime.setHours(hours, minutes);

      const result = await createTask({
        description: `Post: ${task.description}`,
        project_id: task.project_id,
        client_id: task.client_id,
        deadline: data.deadline.toISOString(),
        post_date: combinedDateTime.toISOString(),
        assignee_id: data.assignee_id,
        type: data.type,
        parent_task_id: task.id,
      })

      if (result.error) {
        toast({ title: 'Error creating task', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Task Re-assigned', description: 'A new posting task has been created.' })
        onTaskCreated(result.data)
        setIsOpen(false)
      }
    })
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return <span>Pick a date</span>
    return format(date, "dd MMM")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Re-assign Task for Posting</DialogTitle>
          <DialogDescription>
            Create a new posting task for '{task.description}'.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <label>Responsible</label>
            <Controller
              name="assignee_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assignee_id && <p className="text-sm text-destructive">{errors.assignee_id.message}</p>}
          </div>

          <div className="grid gap-2">
            <label>Type</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!assigneeId || availableTaskTypes.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {availableTaskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <label>Schedule/Post Date</label>
                <Controller
                  name="post_date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                          <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.post_date && <p className="text-sm text-destructive">{errors.post_date.message}</p>}
            </div>
            <div className="grid gap-2">
                <label>Schedule Time</label>
                <Controller
                    name="post_time"
                    control={control}
                    render={({ field }) => <Input type="time" {...field} />}
                />
                {errors.post_time && <p className="text-sm text-destructive">{errors.post_time.message}</p>}
            </div>
          </div>
          
          <div className="grid gap-2">
              <label>Due Date</label>
              <Controller
                name="deadline"
                control={control}
                render={({ field }) => (
                   <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {formatDate(field.value)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={{ after: postDate }}
                        />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !isValid}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Posting Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

    