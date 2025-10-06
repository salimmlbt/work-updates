'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'

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
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import { addTask } from '@/app/actions'
import { predefinedTasks } from '@/lib/predefined-tasks'

const taskSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  deadline: z.date({ required_error: 'Deadline is required.' }),
  assigneeId: z.string().optional(),
  tags: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface AddTaskDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  projectId: string
  profiles: Profile[]
}

export function AddTaskDialog({
  isOpen,
  setIsOpen,
  projectId,
  profiles,
}: AddTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })
  
  const nonAdminProfiles = profiles.filter(p => p.email !== 'admin@falaq.com');

  const onSubmit = async (data: TaskFormData) => {
    setIsLoading(true)

    const formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('description', data.description)
    formData.append('deadline', data.deadline.toISOString())
    if (data.assigneeId) formData.append('assigneeId', data.assigneeId)
    if (data.tags) formData.append('tags', data.tags)

    const result = await addTask(formData)
    setIsLoading(false)

    if (result.error) {
      toast({
        title: 'Error adding task',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Task Added',
        description: 'The new task has been added successfully.',
      })
      setIsOpen(false)
      reset()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new task.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedTasks.map(task => (
                        <SelectItem key={task} value={task}>
                          {task}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Controller
                name="deadline"
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
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
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
              {errors.deadline && (
                <p className="text-sm text-destructive">{errors.deadline.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assigneeId">Assign To</Label>
               <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonAdminProfiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name || profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="e.g., frontend, bug, feature"
                {...register('tags')}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated tags.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
