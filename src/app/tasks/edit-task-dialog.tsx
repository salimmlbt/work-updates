
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
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
import { Label } from '@/components/ui/label'
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
import type { TaskWithDetails, Project, Client, Profile, Team } from '@/lib/types'
import { updateTask } from '@/app/actions'
import { cn } from '@/lib/utils'

const taskSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  client_id: z.string().min(1, 'Client is required.'),
  project_id: z.string().nullable(),
  deadline: z.date({ required_error: 'Deadline is required.' }),
  assignee_id: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  tags: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface EditTaskDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  task: TaskWithDetails
  projects: Project[]
  clients: Client[]
  profiles: Profile[]
  onTaskUpdated: (updatedTask: TaskWithDetails) => void
}

export function EditTaskDialog({
  isOpen,
  setIsOpen,
  task,
  projects,
  clients,
  profiles,
  onTaskUpdated,
}: EditTaskDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  })
  
  const clientId = watch('client_id');
  const assigneeId = watch('assignee_id');

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const assigneeTeams = selectedAssignee?.teams?.map(t => t.teams).filter(Boolean) as Team[] || [];
  const availableTaskTypes = assigneeTeams.flatMap(t => t.default_tasks || []);
  const filteredProjects = clientId ? projects.filter(p => p.client_id === clientId) : [];

  useEffect(() => {
    if (task) {
      reset({
        description: task.description,
        client_id: task.client_id || undefined,
        project_id: task.project_id,
        deadline: new Date(task.deadline),
        assignee_id: task.assignee_id,
        type: task.type,
        tags: task.tags?.join(', '),
      })
    }
  }, [task, reset])

  const onSubmit = async (data: TaskFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('description', data.description)
      formData.append('deadline', data.deadline.toISOString())
      if (data.assignee_id) formData.append('assigneeId', data.assignee_id)
      if (data.tags) formData.append('tags', data.tags)
      if (data.project_id) formData.append('project_id', data.project_id)
      if (data.client_id) formData.append('client_id', data.client_id)
      if (data.type) formData.append('type', data.type)

      const result = await updateTask(task.id, formData)

      if (result.error) {
        toast({
          title: 'Error updating task',
          description: result.error,
          variant: 'destructive',
        })
      } else if (result.data) {
        onTaskUpdated({
          ...task,
          ...result.data,
          profiles: profiles.find(p => p.id === result.data.assignee_id) || null,
          projects: projects.find(p => p.id === result.data.project_id) || null,
          clients: clients.find(c => c.id === result.data.client_id) || null,
        })
        toast({
          title: 'Task Updated',
          description: 'The task has been updated successfully.',
        })
        setIsOpen(false)
      }
    })
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return <span>Pick a date</span>;
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, "dd MMM");
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the details of your task below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Task Name</Label>
              <Input
                id="description"
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="client_id">Client</Label>
                <Controller
                    name="client_id"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                            <SelectContent>
                                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
                 {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project_id">Project</Label>
                 <Controller
                    name="project_id"
                    control={control}
                    render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value || 'no-project'} disabled={!clientId}>
                            <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-project">No project</SelectItem>
                                {filteredProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
              </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="deadline">Due Date</Label>
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
                              <CalendarComponent mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="assignee_id">Responsible</Label>
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
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
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
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" placeholder="e.g. frontend, bug" {...register('tags')} />
                </div>
             </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !isDirty}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
