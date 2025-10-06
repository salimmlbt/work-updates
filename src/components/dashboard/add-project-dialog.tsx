'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  ChevronsUp,
  ArrowUp,
  Equal,
  ArrowDown,
  ChevronsDown,
  Calendar as CalendarIcon,
  Loader2,
  Plus,
  PauseCircle,
} from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'
import { addProject } from '@/app/actions'
import { cn } from '@/lib/utils'
import type { Client, Profile, Project } from '@/lib/types'
import { AddPeopleDialog } from './add-people-dialog'
import type { User } from '@supabase/supabase-js'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { getInitials } from '@/lib/utils'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  members: z.array(z.string()).min(1, 'At least one member is required'),
  status: z.string().min(1, 'Status is required'),
  priority: z.string().min(1, 'Priority is required'),
  start_date: z.date().optional(),
  due_date: z.date().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface AddProjectDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  clients: Client[]
  profiles: Profile[]
  currentUser: User | null
  onProjectAdded: (newProject: Project) => void
}

const priorityOptions = [
    { value: 'Critical', label: 'Critical', icon: ChevronsUp, color: 'text-red-600' },
    { value: 'High', label: 'High', icon: ArrowUp, color: 'text-orange-500' },
    { value: 'Medium', label: 'Medium', icon: Equal, color: 'text-yellow-500' },
    { value: 'Low', label: 'Low', icon: ArrowDown, color: 'text-blue-500' },
    { value: 'Lowest', label: 'Lowest', icon: ChevronsDown, color: 'text-gray-500' },
    { value: 'None', label: 'None', icon: Equal, color: 'text-gray-400' },
]

const statusOptions = [
  { value: 'New', label: 'New', icon: Plus },
  { value: 'On Hold', label: 'On Hold', icon: PauseCircle },
  { value: 'In Progress', label: 'In Progress', icon: Loader2 },
  { value: 'Done', label: 'Done', icon: ChevronsUp },
]

export function AddProjectDialog({
  isOpen,
  setIsOpen,
  clients,
  profiles,
  currentUser,
  onProjectAdded,
}: AddProjectDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [isAddPeopleOpen, setAddPeopleOpen] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      members: currentUser ? [currentUser.id] : [],
      priority: 'None',
      status: 'New',
    },
  })

  const selectedMembers = watch('members', [])

  const onSubmit = async (data: ProjectFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('members', data.members.join(','))
      formData.append('status', data.status)
      formData.append('priority', data.priority)
      if (data.start_date) formData.append('start_date', data.start_date.toISOString())
      if (data.due_date) formData.append('due_date', data.due_date.toISOString())
      
      const result = await addProject(formData)

      if (result.error) {
        toast({
          title: 'Error creating project',
          description: result.error,
          variant: 'destructive',
        })
      } else if (result.data) {
        toast({
          title: 'Project Created',
          description: `The project "${result.data.name}" has been created successfully.`,
        })
        onProjectAdded(result.data as Project)
        setIsOpen(false)
        reset()
      }
    })
  }

  const handleSaveMembers = (newMembers: string[]) => {
    setValue('members', newMembers, { shouldValidate: true })
    setAddPeopleOpen(false)
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'No due date';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, "d MMM");
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-[2fr_1fr] min-h-[500px]">
              <div className="flex flex-col">
                 <div className="p-6 space-y-6">
                   <Input
                        id="name"
                        placeholder="Project name"
                        {...register('name')}
                        className="text-2xl font-bold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
                    />
                    {errors.name && <p className="text-sm text-destructive mt-2">{errors.name.message}</p>}

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Members {selectedMembers.length}</Label>
                    <div className="flex items-center gap-2">
                         <div className="flex -space-x-2">
                           {selectedMembers.slice(0, 3).map(id => {
                            const profile = profiles.find(p => p.id === id);
                            if (!profile) return null;
                            return (
                                <Avatar key={id} className="h-8 w-8 border-2 border-background">
                                    <AvatarImage src={profile.avatar_url ?? undefined} />
                                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                                </Avatar>
                            )
                           })}
                         </div>
                         {selectedMembers.length > 3 && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground border-2 border-background">
                                +{selectedMembers.length-3}
                            </div>
                         )}
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setAddPeopleOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add people
                      </Button>
                    </div>
                    {errors.members && <p className="text-sm text-destructive">{errors.members.message}</p>}
                  </div>
                </div>
                <div className="mt-auto px-6 py-4 border-t flex justify-end gap-2">
                   <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Project
                    </Button>
                </div>
              </div>
              
              <div className="p-6 space-y-8 border-l">
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                   <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger variant="ghost" className="p-0 h-auto justify-start font-medium text-base focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className="h-4 w-4" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Priority</Label>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger variant="ghost" className="p-0 h-auto justify-start font-medium text-base focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map(option => {
                            const Icon = option.icon
                            return (
                            <SelectItem key={option.value} value={option.value}>
                               <div className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", option.color)} />
                                <span>{option.label}</span>
                               </div>
                            </SelectItem>
                          )})}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Start date</Label>
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="p-0 h-auto justify-start w-full font-medium text-base focus:ring-0">
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {field.value ? formatDate(field.value) : 'No start date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Due date</Label>
                  <Controller
                    name="due_date"
                    control={control}
                    render={({ field }) => (
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" className="p-0 h-auto justify-start w-full font-medium text-base focus:ring-0">
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {field.value ? formatDate(field.value) : 'No due date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => (watch('start_date') ? date < watch('start_date')! : false) || date < new Date('1900-01-01')}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AddPeopleDialog
        isOpen={isAddPeopleOpen}
        setIsOpen={setAddPeopleOpen}
        profiles={profiles}
        currentUser={currentUser}
        selectedMembers={selectedMembers}
        onSave={handleSaveMembers}
      />
    </>
  )
}
