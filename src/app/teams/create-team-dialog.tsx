
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createTeam } from './actions'
import { useToast } from '@/hooks/use-toast'
import type { Team, WorkType } from '@/lib/types'

interface CreateTeamDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onTeamCreated: (newTeam: Team) => void;
  workTypes: WorkType[];
}

const taskColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#8A2BE2', '#FF7F50',
  '#20B2AA', '#9370DB', '#3CB371', '#FFA07A', '#00CED1', '#DA70D6',
  '#6A5ACD', '#FFC0CB', '#7B68EE', '#F08080', '#2E8B57', '#ADFF2F',
  '#FFD700', '#6495ED', '#DC143C'
];

export function CreateTeamDialog({ isOpen, setIsOpen, onTeamCreated, workTypes }: CreateTeamDialogProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [teamName, setTeamName] = useState('')
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSelectTask = (task: string) => {
    setSelectedTasks(prev => 
      prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]
    )
  }

  const handleClose = () => {
    setSelectedTasks([]);
    setTeamName('');
    setIsOpen(false);
  }

  const handleCreateTeam = () => {
    startTransition(async () => {
      const { data, error } = await createTeam(teamName, selectedTasks);
      if (error) {
        toast({ title: "Error creating team", description: error, variant: "destructive" });
      } else if (data) {
        toast({ title: "Team created", description: `Team "${data.name}" has been created.` });
        onTeamCreated(data as Team)
        handleClose();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create team</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input 
              id="team-name"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Default type for tasks</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto min-h-10">
                  <div className="flex gap-1 flex-wrap">
                    {selectedTasks.length > 0 ? (
                      selectedTasks.map(task => {
                        const taskIndex = workTypes.findIndex(t => t.name === task);
                        const color = taskColors[taskIndex % taskColors.length];
                        return (
                          <Badge 
                            key={task} 
                            variant="secondary" 
                            className="group flex items-center gap-2 hover:bg-muted-foreground/20"
                          >
                             <span 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: color }}
                            />
                            {task}
                             <div
                              role="button"
                              aria-label={`Remove ${task}`}
                              className="ml-1 rounded-full outline-none opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectTask(task);
                              }}
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </div>
                          </Badge>
                        )
                      })
                    ) : (
                      "Select default task types"
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <ScrollArea className="h-60">
                  {workTypes.map((task, index) => (
                    <DropdownMenuCheckboxItem
                      key={task.id}
                      checked={selectedTasks.includes(task.name)}
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => handleSelectTask(task.name)}
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: taskColors[index % taskColors.length] }}
                        />
                        {task.name}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <DialogFooter className="justify-end sm:justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleCreateTeam}
            disabled={selectedTasks.length === 0 || !teamName.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
