
'use client'

import { format, isPast, parseISO } from 'date-fns'
import { CalendarIcon, UserCircle, Tag, ChevronDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from '@/components/ui/button'
import { cn, getInitials } from '@/lib/utils'
import type { TaskWithPriority } from '@/lib/types'
import { updateTaskStatus } from '@/app/actions'
import { useToast } from '@/hooks/use-toast'

interface TaskCardProps {
  task: TaskWithPriority
}

const priorityColors = {
  High: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
  Medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  Low: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
}

export function TaskCard({ task }: TaskCardProps) {
  const { toast } = useToast();
  
  // The deadline is a string like "2024-08-15T05:00:00.000Z".
  // parseISO correctly handles this as a UTC date.
  const deadline = parseISO(task.deadline);
  const isOverdue = isPast(deadline) && task.status !== 'done';

  const handleStatusChange = async (status: 'todo' | 'inprogress' | 'done') => {
    const { error } = await updateTaskStatus(task.id, status)
    if (error) {
      toast({
        title: 'Error updating status',
        description: error,
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-base font-medium">{task.description}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          <span className={cn(isOverdue && 'text-destructive font-semibold')}>
            {format(deadline, 'MMM d, yyyy')}
            {isOverdue && " (Overdue)"}
          </span>
        </div>
        {task.profiles && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.profiles.avatar_url ?? ''} />
              <AvatarFallback>
                {getInitials(task.profiles.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-foreground">{task.profiles.full_name}</span>
          </div>
        )}
        {task.tags && task.tags.length > 0 && (
           <div className="flex items-center gap-2 flex-wrap">
             <Tag className="h-4 w-4 text-muted-foreground" />
             {task.tags.map((tag, i) => (
                <Badge key={i} variant="secondary">{tag}</Badge>
             ))}
           </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          {task.priority && (
            <Tooltip>
              <TooltipTrigger>
                <Badge className={cn("text-xs", priorityColors[task.priority])}>
                  {task.priority} Priority
                </Badge>
              </TooltipTrigger>
              {task.reason && (
                <TooltipContent>
                  <p className="max-w-[250px]">{task.reason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex gap-1">
                    <span>Change Status</span>
                    <ChevronDown className="h-4 w-4"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange('todo')} disabled={task.status === 'todo'}>
                    To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('inprogress')} disabled={task.status === 'inprogress'}>
                    In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('done')} disabled={task.status === 'done'}>
                    Done
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}
