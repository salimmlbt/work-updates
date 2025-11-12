
'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'
import type { Client, Project, Task } from '@/lib/types'

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
  const completedTaskStatuses: Task['status'][] = ['done', 'approved']

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 space-y-2">
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
        <Separator />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <h3 className="text-lg font-semibold text-foreground">Projects</h3>
          {clientProjects.length > 0 ? (
            clientProjects.map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id && completedTaskStatuses.includes(t.status))
              
              const tasksByType = projectTasks.reduce((acc, task) => {
                const type = task.type || 'Uncategorized'
                acc[type] = (acc[type] || 0) + 1
                return acc
              }, {} as Record<string, number>)

              return (
                <Card key={project.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(tasksByType).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                        {Object.entries(tasksByType).map(([type, count]) => (
                            <Badge key={type} variant="secondary" className="font-normal">
                            {type}: <span className="font-semibold ml-1">{count}</span>
                            </Badge>
                        ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No completed tasks for this project yet.</p>
                    )}
                  </CardContent>
                </Card>
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
