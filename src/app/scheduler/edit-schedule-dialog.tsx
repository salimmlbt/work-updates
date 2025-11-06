
'use client'

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Client, Team, Project } from '@/lib/types';
import type { ScheduleWithDetails } from './page';
import { updateSchedule } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface EditScheduleDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  schedule: ScheduleWithDetails;
  onScheduleUpdated: (schedule: ScheduleWithDetails) => void;
  teams: Team[];
  projects: Project[];
}

export const EditScheduleDialog = ({
  isOpen,
  setIsOpen,
  schedule,
  onScheduleUpdated,
  teams,
  projects,
}: EditScheduleDialogProps) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const [title, setTitle] = useState(schedule.title);
  const [teamId, setTeamId] = useState<string | null>(schedule.team_id);
  const [projectId, setProjectId] = useState<string | null>(schedule.project_id);
  const [contentType, setContentType] = useState(schedule.content_type);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date(schedule.scheduled_date));

  useEffect(() => {
    if (isOpen) {
      setTitle(schedule.title);
      setTeamId(schedule.team_id);
      setProjectId(schedule.project_id);
      setContentType(schedule.content_type);
      setScheduledDate(new Date(schedule.scheduled_date));
    }
  }, [isOpen, schedule]);

  const availableWorkTypes = useMemo(() => {
    if (!teamId) return [];
    const selectedTeam = teams.find(t => t.id === teamId);
    return selectedTeam?.default_tasks || [];
  }, [teamId, teams]);
  
  const clientProjects = useMemo(() => {
    return projects.filter(p => p.client_id === schedule.client_id);
  }, [projects, schedule.client_id]);

  useEffect(() => {
    if (teamId !== schedule.team_id) {
      setContentType('');
    }
  }, [teamId, schedule.team_id]);

  const handleSave = () => {
    if (!title || !scheduledDate || !teamId || !contentType) {
      toast({
        title: 'Missing Fields',
        description: 'All fields are required to update a schedule.',
        variant: 'destructive',
      });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content_type', contentType);
      formData.append('scheduled_date', format(scheduledDate, 'yyyy-MM-dd'));
      formData.append('team_id', teamId);
      if (projectId) formData.append('project_id', projectId);

      const result = await updateSchedule(schedule.id, formData);

      if (result.error) {
        toast({
          title: 'Error updating schedule',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.data) {
        toast({
          title: 'Schedule Updated',
          description: 'The schedule has been updated successfully.',
        });
        const updatedSchedule: ScheduleWithDetails = {
          ...result.data,
          task: schedule.task,
          teams: teams.find(t => t.id === teamId) || null,
          projects: projects.find(p => p.id === projectId) || null,
        }
        onScheduleUpdated(updatedSchedule);
        setIsOpen(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Schedule</DialogTitle>
                <DialogDescription>Update the details for this content schedule.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content Title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="team">Team</Label>
                        <Select onValueChange={setTeamId} value={teamId ?? undefined}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map(team => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-content-type">Content Type</Label>
                        <Select onValueChange={setContentType} value={contentType || undefined} disabled={!teamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableWorkTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="project">Project</Label>
                        <Select onValueChange={setProjectId} value={projectId || 'no-project'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-project">No project</SelectItem>
                                {clientProjects.map(project => (
                                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-date">Date</Label>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full justify-start text-left font-normal',
                                !scheduledDate && 'text-muted-foreground'
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, 'PPP') : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
};
