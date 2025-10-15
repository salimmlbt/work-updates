
'use client'

import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'
import {
  MoreVertical,
  Link as LinkIconLucide,
  Calendar,
  User,
  Tag,
  Paperclip,
  Clock,
  CheckSquare,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TaskWithDetails } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface TaskDetailSheetProps {
  task: TaskWithDetails
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onEdit: (task: TaskWithDetails) => void
}

const statusLabels = {
    'todo': 'To Do',
    'inprogress': 'In Progress',
    'done': 'Done'
}

export function TaskDetailSheet({ task, isOpen, onOpenChange, onEdit }: TaskDetailSheetProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'todo': return 'bg-gray-200 text-gray-800';
        case 'inprogress': return 'bg-purple-200 text-purple-800';
        case 'done': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-200 text-gray-800';
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'No due date';
    const d = parseISO(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, "d MMM yyyy");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[500px] sm:w-[540px] p-0 flex flex-col"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <SheetHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{task.clients?.name || 'No Client'}</span>
                    <span>/</span>
                    <span>{task.projects?.name || 'No Project'}</span>
                </div>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon"><LinkIconLucide className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </div>
            </div>
            <SheetTitle className="text-2xl font-bold pt-4">{task.description}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-20">Status</span>
                    <Badge className={cn('font-medium', getStatusColor(task.status))}>{statusLabels[task.status]}</Badge>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-20">Type</span>
                    {task.type ? <Badge variant="outline">{task.type}</Badge> : <span>-</span>}
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-20">Due date</span>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(task.deadline)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-20">Assignee</span>
                    {task.profiles ? (
                        <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={task.profiles.avatar_url ?? undefined} />
                            <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
                        </Avatar>
                        <span>{task.profiles.full_name}</span>
                        </div>
                    ) : (
                        <span>-</span>
                    )}
                </div>
                 <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-20">Priority</span>
                    <span>-</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"><CheckSquare className="mr-2 h-4 w-4" /> Add subtask</Button>
                <Button variant="outline" size="sm"><Paperclip className="mr-2 h-4 w-4" /> Attach file</Button>
                <Button variant="outline" size="sm"><Clock className="mr-2 h-4 w-4" /> Start timer</Button>
            </div>
            
            <Separator />
            
            <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <div 
                    className="text-muted-foreground text-sm"
                    dangerouslySetInnerHTML={{ __html: 'No description provided.' }}
                />
            </div>

        </div>
        <div className="p-4 border-t bg-background">
            <Button onClick={() => onEdit(task)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Task
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
