'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wand2, Loader2, PlusCircle, Settings2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { Project, Profile, TaskWithAssignee, TaskWithPriority, Client } from '@/lib/types'
import { AddTaskDialog } from './add-task-dialog'
import { prioritizeTasks } from '@/app/actions'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TaskCard } from './task-card'
import type { User } from '@supabase/supabase-js'

interface ProjectViewProps {
  projects: Project[]
  initialTasks: TaskWithAssignee[]
  currentProjectId?: string
  profiles: Profile[]
  clients: Client[]
}

const statusColumns: { id: "todo" | "inprogress" | "done"; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'inprogress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
]

export default function ProjectView({
  projects,
  initialTasks,
  currentProjectId,
  profiles,
  clients
}: ProjectViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<TaskWithPriority[]>(initialTasks)
  const [isAddTaskOpen, setAddTaskOpen] = useState(false)
  const [isAiLoading, setAiLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const [view, setView] = useState('table');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
    }
    fetchUser();
  }, [supabase]);

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    if (!currentProjectId) return;

    const channel = supabase
      .channel(`realtime-tasks:${currentProjectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${currentProjectId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newTask, error } = await supabase.from('tasks').select('*, profiles(*)').eq('id', payload.new.id).single()
            if (error) console.error(error)
            else setTasks(current => [newTask as TaskWithAssignee, ...current])
          }
          if (payload.eventType === 'UPDATE') {
             const { data: updatedTask, error } = await supabase.from('tasks').select('*, profiles(*)').eq('id', payload.new.id).single()
            if (error) console.error(error)
            else setTasks(current => current.map(t => (t.id === payload.new.id ? updatedTask as TaskWithAssignee : t)))
          }
          if (payload.eventType === 'DELETE') {
            setTasks(current => current.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, currentProjectId])

  const handleProjectChange = (projectId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('project', projectId)
    router.push(`/dashboard?${params.toString()}`)
  }

  const handlePrioritizeTasks = async () => {
    setAiLoading(true);
    const { data, error } = await prioritizeTasks(tasks);
    setAiLoading(false);

    if (error) {
      toast({ title: "AI Prioritization Failed", description: error, variant: "destructive" });
      return;
    }
    
    if (data) {
      const prioritizedTasksMap = new Map(data.map(p => [p.id, p]));
      const newTasks = tasks.map(task => {
        const priorityInfo = prioritizedTasksMap.get(task.id);
        if (priorityInfo) {
          return { ...task, priority: priorityInfo.priority as "High" | "Medium" | "Low", reason: priorityInfo.reason };
        }
        return task;
      });

      const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
      newTasks.sort((a, b) => {
        const priorityA = a.priority ? priorityOrder[a.priority] : 4;
        const priorityB = b.priority ? priorityOrder[b.priority] : 4;
        return priorityA - priorityB;
      });

      setTasks(newTasks);
      toast({ title: "Tasks Prioritized", description: "AI has reordered and tagged your tasks." });
    }
  };
  
  const nonAdminProfiles = profiles.filter(p => p.email !== 'admin@falaq.com');


  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-10 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">No projects found.</h2>
          <p className="text-muted-foreground">Go to the projects page to create a project.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background">
        <header className="bg-background border-b p-4 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
              <Select value={currentProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-[180px] bg-transparent border-0 shadow-none">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setAddTaskOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New
              </Button>
               <Tabs value={view} onValueChange={setView}>
                <TabsList>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="ghost" size="icon">
                <Settings2 className="h-5 w-5" />
              </Button>
              <Button onClick={handlePrioritizeTasks} disabled={isAiLoading} variant="outline">
                {isAiLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Prioritize with AI
              </Button>
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8">
            <Tabs defaultValue="table" value={view}>
              <TabsContent value="table">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {statusColumns.map(column => (
                        <div key={column.id} className="bg-muted/30 rounded-lg p-4 h-full">
                        <h2 className="text-lg font-semibold mb-4 text-foreground">{column.title}</h2>
                        <div className="space-y-4">
                            {tasks.filter(task => task.status === column.id).map(task => (
                            <TaskCard key={task.id} task={task} />
                            ))}
                            {tasks.filter(task => task.status === column.id).length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">No tasks here.</div>
                            )}
                        </div>
                        </div>
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="kanban">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {statusColumns.map(column => (
                        <div key={column.id} className="bg-muted/30 rounded-lg p-4 h-full">
                        <h2 className="text-lg font-semibold mb-4 text-foreground">{column.title}</h2>
                        <div className="space-y-4">
                            {tasks.filter(task => task.status === column.id).map(task => (
                            <TaskCard key={task.id} task={task} />
                            ))}
                            {tasks.filter(task => task.status === column.id).length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">No tasks here.</div>
                            )}
                        </div>
                        </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
        </div>
      </div>
      <AddTaskDialog
        isOpen={isAddTaskOpen}
        setIsOpen={setAddTaskOpen}
        projectId={currentProjectId!}
        profiles={nonAdminProfiles}
      />
    </TooltipProvider>
  )
}
