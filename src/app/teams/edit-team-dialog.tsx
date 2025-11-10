
'use client'

import { useState, useTransition, useEffect } from 'react'
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
import { Loader2, X, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Team, WorkType } from '@/lib/types'
import { updateTeam } from './actions'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

interface EditTeamDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  team: Team
  onTeamUpdated: (updatedTeam: Team) => void;
  workTypes: WorkType[];
}

const taskColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#8A2BE2', '#FF7F50',
  '#20B2AA', '#9370DB', '#3CB371', '#FFA07A', '#00CED1', '#DA70D6',
  '#6A5ACD', '#FFC0CB', '#7B68EE', '#F08080', '#2E8B57', '#ADFF2F',
  '#FFD700', '#6495ED', '#DC143C'
];

export function EditTeamDialog({ isOpen, setIsOpen, team, onTeamUpdated, workTypes }: EditTeamDialogProps) {
  const [teamName, setTeamName] = useState(team.name);
  const [selectedTasks, setSelectedTasks] = useState<string[]>(team.default_tasks || []);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setTeamName(team.name);
      setSelectedTasks(team.default_tasks || []);
    }
  }, [team, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  }
  
  const handleSelectTask = (task: string) => {
    setSelectedTasks(prev => 
      prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]
    )
  }

  const handleEditTeam = () => {
    const isNameChanged = teamName.trim() !== team.name;
    const areTasksChanged = JSON.stringify(selectedTasks.sort()) !== JSON.stringify((team.default_tasks || []).sort());
    
    if (!teamName.trim() || (!isNameChanged && !areTasksChanged)) {
        handleClose();
        return;
    }
    
    startTransition(async () => {
      const { data, error } = await updateTeam(team.id, teamName.trim(), selectedTasks);
      if (error) {
        toast({ title: "Error updating team", description: error, variant: "destructive" });
      } else if (data) {
        toast({ title: "Team updated", description: `Team "${data.name}" has been updated.` });
        onTeamUpdated(data as Team)
        handleClose();
      }
    });
  }
  
  const isChanged = teamName.trim() !== team.name || JSON.stringify(selectedTasks.sort()) !== JSON.stringify((team.default_tasks || []).sort());

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Edit team</DialogTitle>
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
            onClick={handleEditTeam}
            disabled={!teamName.trim() || !isChanged || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
