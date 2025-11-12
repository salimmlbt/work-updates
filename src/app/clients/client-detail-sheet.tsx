
'use client'

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Client, Project, Task } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, parseISO } from 'date-fns'

interface ClientDetailSheetProps {
  client: Client
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  projects: Project[]
  tasks: Task[]
}

export function ClientDetailSheet({
  client,
  isOpen,
  onOpenChange,
  projects,
  tasks,
}: ClientDetailSheetProps) {
  const clientProjects = projects.filter(p => p.client_id === client.id)
  const completedTaskStatuses: (Task['status'])[] = ['done', 'approved']

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 space-y-2 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={client.avatar} alt={client.name} />
              <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-2xl">{client.name}</SheetTitle>
              <SheetDescription>{client.industry}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {clientProjects.length > 0 ? (
            clientProjects.map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id && completedTaskStatuses.includes(t.status))
              
              const tasksByType = projectTasks.reduce((acc, task) => {
                const type = task.type || 'Uncategorized'
                if (!acc[type]) {
                  acc[type] = []
                }
                acc[type].push(task)
                return acc
              }, {} as Record<string, Task[]>)

              return (
                <div key={project.id}>
                    <h3 className="text-lg font-semibold text-foreground mb-3">{project.name}</h3>
                    {Object.keys(tasksByType).length > 0 ? (
                        <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Task Type</TableHead>
                                    <TableHead>Task Description</TableHead>
                                    <TableHead className="text-right">Completed Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(tasksByType).map(([type, tasksOfType]) => (
                                    <React.Fragment key={type}>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableCell colSpan={3} className="font-semibold">
                                                {type} ({tasksOfType.length} task{tasksOfType.length > 1 ? 's' : ''})
                                            </TableCell>
                                        </TableRow>
                                        {tasksOfType.map(task => (
                                            <TableRow key={task.id}>
                                                <TableCell></TableCell>
                                                <TableCell>{task.description}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {task.status_updated_at ? format(parseISO(task.status_updated_at), 'dd MMM yyyy') : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No completed tasks for this project.</p>
                    )}
                </div>
              )
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No projects found for this client.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
