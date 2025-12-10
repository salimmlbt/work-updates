
'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Plus,
  Table,
  LayoutGrid,
  Search,
  Users,
  Filter,
  MoreVertical,
  Save,
  X,
  Rocket,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Trash2,
  RefreshCcw,
  Loader2,
  Share2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  MessageSquare,
  Repeat,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO, differenceInDays, isFuture, isPast, startOfMonth, endOfMonth, isWithinInterval, getMonth, getYear } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Project, Client, Profile, Team, Task, TaskWithDetails, RoleWithPermissions, Attachment, Correction, Revisions } from '@/lib/types';
import { createTask } from '@/app/teams/actions';
import { updateTaskStatus, deleteTask, restoreTask, deleteTaskPermanently, uploadAttachment, updateTaskPostingStatus, deleteTasks, restoreTasks, deleteTasksPermanently } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AttachIcon, LinkIcon } from '@/components/icons';
import { TaskDetailSheet } from './task-detail-sheet';
import { ReassignTaskDialog } from './reassign-task-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { EditTaskDialog } from './edit-task-dialog';
import { Checkbox } from '@/components/ui/checkbox';


const statusIcons = {
  'todo': <AlertCircle className="h-4 w-4 text-gray-400" />,
  'inprogress': <Rocket className="h-4 w-4 text-purple-600" />,
  'review': <Eye className="h-4 w-4 text-yellow-600" />,
  'corrections': <MessageSquare className="h-4 w-4 text-orange-600" />,
  'recreate': <Repeat className="h-4 w-4 text-blue-600" />,
  'approved': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'done': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'under-review': <Eye className="h-4 w-4 text-yellow-600" />,
};

const statusLabels: Record<Task['status'], string> = {
    'todo': 'New task',
    'inprogress': 'In progress',
    'review': 'Review',
    'corrections': 'Corrections',
    'recreate': 'Recreate',
    'approved': 'Approved',
    'done': 'Completed',
    'under-review': 'Under Review'
}

const mainStatusOptions: Task['status'][] = ['todo', 'inprogress', 'review'];
const reviewStatusOptions: Task['status'][] = ['review', 'corrections', 'recreate', 'approved'];

const postingStatusOptions: ('Planned' | 'Scheduled' | 'Posted')[] = ['Planned', 'Scheduled', 'Posted'];
const postingStatusLabels = {
  'Planned': 'Planned',
  'Scheduled': 'Scheduled',
  'Posted': 'Posted',
};


const typeColors: { [key: string]: string } = {
  "Poster": "bg-blue-100 text-blue-800",
  "Video": "bg-orange-100 text-orange-800",
  "Story": "bg-purple-100 text-purple-800",
  "Motion Graphics": "bg-pink-100 text-pink-800",
  "Animation": "bg-indigo-100 text-indigo-800",
  "Grid": "bg-green-100 text-green-800",
  "Posting": "bg-yellow-100 text-yellow-800",
  "Account Creation": "bg-red-100 text-red-800",
  "Flyer": "bg-teal-100 text-teal-800",
  "Profile": "bg-cyan-100 text-cyan-800",
  "Menu": "bg-lime-100 text-lime-800",
  "FB Cover": "bg-sky-100 text-sky-800",
  "Whatsapp Cover": "bg-emerald-100 text-emerald-800",
  "Profile Picture": "bg-fuchsia-100 text-fuchsia-800",
  "Highlite Cover": "bg-rose-100 text-rose-800",
  "Ad Post": "bg-amber-100 text-amber-800",
  "Shooting": "bg-violet-100 text-violet-800",
  "Meeting": "bg-gray-100 text-gray-800",
  "Connect": "bg-slate-100 text-slate-800",
  "Followup": "bg-stone-100 text-stone-800",
};


const getResponsibleAvatar = (profile: Profile | null) => {
  return profile?.avatar_url ?? undefined;
}

const AddTaskRow = ({ 
  onSave, 
  onCancel,
  projects,
  clients,
  profiles,
  status,
}: { 
  onSave: (task: any) => void; 
  onCancel: () => void; 
  projects: Project[],
  clients: Client[],
  profiles: Profile[],
  status: Task['status'],
}) => {
  const [taskName, setTaskName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [assigneeId, setAssigneeId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const assigneeTeams = selectedAssignee?.teams?.map(t => t.teams).filter(Boolean) as Team[] || [];
  const availableTaskTypes = [...new Set(assigneeTeams.flatMap(t => t.default_tasks || []))];

  const filteredProjects = useMemo(() => {
    if (!clientId) {
      return projects;
    }
    return projects.filter(p => String(p.client_id) === String(clientId));
  }, [clientId, projects]);

  const taskInputRef = React.useRef<HTMLInputElement>(null);
  const clientRef = React.useRef<HTMLButtonElement>(null);
  const projectRef = React.useRef<HTMLButtonElement>(null);
  const dueDateRef = React.useRef<HTMLButtonElement>(null);
  const assigneeRef = React.useRef<HTMLButtonElement>(null);
  const typeRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    taskInputRef.current?.focus();
  }, []);

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setProjectId(''); // Reset project when client changes
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await uploadAttachment(formData);
    
    setIsUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error, variant: "destructive" });
    } else if (data) {
      setAttachments(prev => [...prev, data]);
      toast({ title: "File attached", description: `${file.name} has been attached.` });
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!taskName || !clientId || !dueDate || !assigneeId || !taskType) {
      toast({ 
        title: "Missing fields", 
        description: "Task Details, Client, Due Date, Assignee, and Type are all required.", 
        variant: "destructive" 
      });
      return;
    }
    setIsSaving(true);
    try {
      const result = await createTask({
        description: taskName,
        project_id: projectId === 'no-project' ? null : projectId,
        client_id: clientId || null,
        deadline: dueDate.toISOString(),
        assignee_id: assigneeId,
        type: taskType || null,
        attachments: attachments.length > 0 ? attachments : null,
        status: status,
      });

      if (result.error) {
        toast({ title: "Error creating task", description: result.error, variant: 'destructive'});
      } else if (result.data) {
        onCancel();
        toast({ title: 'Task created', description: `Task "${result.data.description}" has been successfully created.`});
      }
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return <span>Pick a date</span>;
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, "dd MMM");
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
        nextRef.current.click?.(); // Open dropdowns
      } else {
        handleSave();
      }
    }
  };

  const handleDueDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!calendarOpen) {
        handleSave();
      }
    }
  };

  return (
    <tr className="border-b bg-gray-50">
      <td></td>
      <td className="px-4 py-3 border-r">
        <Input 
          placeholder="Type Task Details" 
          value={taskName} 
          ref={taskInputRef}
          onChange={(e) => setTaskName(e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, clientRef)}
          className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((att, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <LinkIcon className="h-3 w-3" fill="currentColor" />
                <a href={att.publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" title={att.name}>{att.name}</a>
              </div>
            ))}
          </div>
        )}
      </td>

      <td className="px-4 py-3 border-r">
        <Select onValueChange={handleClientChange} value={clientId}>
          <SelectTrigger 
            className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            ref={clientRef} 
            onKeyDown={(e) => handleKeyDown(e, projectRef)}
          >
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>

      <td className="px-4 py-3 border-r">
        <Select 
          onValueChange={setProjectId} 
          value={projectId} 
          key={clientId} // Force re-render when client changes
        >
          <SelectTrigger 
            className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            ref={projectRef} 
            onKeyDown={(e) => handleKeyDown(e, assigneeRef)}
          >
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no-project">No project</SelectItem>
            {filteredProjects.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Assignee */}
      <td className="px-4 py-3 border-r">
        <Select onValueChange={setAssigneeId} value={assigneeId}>
          <SelectTrigger 
            className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            ref={assigneeRef} 
            onKeyDown={(e) => handleKeyDown(e, typeRef)}
          >
            <SelectValue placeholder="Select assignee" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>

      {/* Task Type */}
      <td className="px-4 py-3 border-r">
        <Select 
          onValueChange={setTaskType} 
          value={taskType} 
          disabled={!assigneeId || availableTaskTypes.length === 0}
        >
          <SelectTrigger 
            className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            ref={typeRef} 
            onKeyDown={(e) => handleKeyDown(e, dueDateRef)}
          >
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {availableTaskTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>

      {/* Due Date */}
      <td className="px-4 py-3 border-r">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-left font-normal bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent"
              ref={dueDateRef} 
              onKeyDown={handleDueDateKeyDown}
            >
              {formatDate(dueDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <CalendarComponent 
              mode="single" 
              selected={dueDate} 
              onSelect={(date) => {
                setDueDate(date);
                setCalendarOpen(false);
                dueDateRef.current?.focus();
              }}
              initialFocus 
            />
          </PopoverContent>
        </Popover>
      </td>
       {/* New column placeholder */}
       <td className="px-4 py-3 border-r"></td>
      {/* Status */}
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {statusIcons[status]}
          <span>{statusLabels[status]}</span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <AttachIcon className="h-5 w-5" fill="currentColor"/>}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={isSaving} className="focus-visible:ring-0 focus-visible:ring-offset-0">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading} className="focus-visible:ring-0 focus-visible:ring-offset-0">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </td>
    </tr>
  );
};


const TaskRow = ({ task, allTasks, onStatusChange, onPostingStatusChange, onEdit, onDelete, openMenuId, setOpenMenuId, canEdit, onTaskClick, onReassign, isReviewer, activeTab, currentUserProfile, isSelected, onSelect, isHighlighted }: { task: TaskWithDetails; allTasks: TaskWithDetails[]; onStatusChange: (taskId: string, status: Task['status'], correction?: { note: string; authorId: string }) => void; onPostingStatusChange: (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => void; onEdit: (task: TaskWithDetails) => void; onDelete: (task: TaskWithDetails) => void; openMenuId: string | null; setOpenMenuId: (id: string | null) => void; canEdit: boolean; onTaskClick: (task: TaskWithDetails) => void; onReassign: (task: TaskWithDetails) => void; isReviewer: boolean; activeTab: string; currentUserProfile: Profile | null; isSelected: boolean; onSelect: (taskId: string, isSelected: boolean) => void; isHighlighted: boolean; }) => {
  const [dateText, setDateText] = useState('No date');
  const [isCorrectionsOpen, setIsCorrectionsOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const { toast } = useToast();
  
  const attachments = useMemo(() => {
    if (!task.attachments || !Array.isArray(task.attachments)) return [];
    return task.attachments as Attachment[];
  }, [task.attachments]);

  useEffect(() => {
    if (task.deadline) {
      const date = parseISO(task.deadline);
      if (isToday(date)) {
        setDateText('Today');
      } else if (isTomorrow(date)) {
        setDateText('Tomorrow');
      } else if (isYesterday(date)) {
        setDateText('Yesterday');
      } else {
        setDateText(format(date, 'dd MMM'));
      }
    } else {
      setDateText('No date');
    }
  }, [task.deadline]);
  
  const dynamicDate = useMemo(() => {
    let dateToShow: string | null = null;
    if (activeTab === 'active' || !task.status_updated_at) {
        dateToShow = task.created_at;
    } else {
        dateToShow = task.status_updated_at;
    }
    if (!dateToShow) return '-';
    return format(parseISO(dateToShow), 'MMM d, h:mm a');
  }, [activeTab, task.created_at, task.status_updated_at]);


  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Prevent sheet from opening if a button, dropdown or interactive element was clicked
    if (target.closest('button, [role="menuitem"], a, [role="dialog"], label, [role="checkbox"]')) {
      return;
    }
    onTaskClick(task);
  }

  const handleStatusChange = (status: Task['status']) => {
    if (status === 'corrections') {
      setIsCorrectionsOpen(true);
    } else {
      onStatusChange(task.id, status);
    }
  }

  const handleCorrectionSubmit = () => {
    if (!correctionNote.trim()) {
      toast({ title: 'Correction note cannot be empty', variant: 'destructive' });
      return;
    }
    onStatusChange(task.id, 'corrections', { note: correctionNote, authorId: currentUserProfile?.id || '' });
    setIsCorrectionsOpen(false);
    setCorrectionNote('');
  }

  const isReassigned = !!task.parent_task_id;
  
  const postingTaskTypes = ["Posting", "Account Creation", "Meeting", "Followup", "Connect", "Ad Post"];
  const isPostingType = task.type && postingTaskTypes.includes(task.type);

  const currentStatusLabel = isPostingType
    ? postingStatusLabels[task.posting_status || 'Planned']
    : statusLabels[task.status];
  
  const currentStatusIcon = isPostingType
    ? <CheckCircle2 className="h-4 w-4 text-blue-500" />
    : statusIcons[task.status];
  
  const getStatusOptions = () => {
    if (isPostingType) return postingStatusOptions;
    
    if (activeTab === 'under-review') {
        const isAssignee = currentUserProfile?.id === task.assignee_id;
        if (isReviewer && isAssignee) {
             return [...reviewStatusOptions, 'inprogress', 'todo'];
        }
        return isReviewer ? reviewStatusOptions : mainStatusOptions;
    }

    if (activeTab === 'completed') {
      return isReviewer ? ['approved', 'review'] : [];
    }
    
    return mainStatusOptions;
  };

  const statusOptions = getStatusOptions();
  
  const isStatusChangeDisabled = 
    // Completed tab is read-only for non-reviewers
    (activeTab === 'completed' && !isReviewer) ||
    // Under-review tab is read-only for non-reviewers/non-assignees
    (activeTab === 'under-review' && !isReviewer && !isPostingType && currentUserProfile?.id !== task.assignee_id) ||
    // Active tab is read-only for anyone who is not the assignee
    (activeTab === 'active' && currentUserProfile?.id !== task.assignee_id) ||
    statusOptions.length === 0;

  const hasChildTask = useMemo(() => allTasks.some(t => t.parent_task_id === task.id), [allTasks, task.id]);


  return (
    <>
      {canEdit && (
        <td className={cn("px-4 py-3", isHighlighted && "bg-blue-50")}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(task.id, !!checked)}
            aria-label="Select task"
          />
        </td>
      )}
      <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[250px] cursor-pointer", isHighlighted && "bg-blue-50")}>
        <div className="flex items-center gap-2">
          <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.description}>
            <span className="truncate shrink">{task.description}</span>
          </div>
          {attachments.length > 0 && <AttachIcon className="h-4 w-4 text-green-600 shrink-0 transform -rotate-30" fill="currentColor"/>}
          {isReassigned && <Share2 className="h-4 w-4 text-blue-500 shrink-0" />}
          {(task.revisions?.recreations ?? 0) > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              <Repeat className="h-3 w-3 mr-1" /> {task.revisions.recreations}
            </Badge>
          )}
          {(task.revisions?.corrections ?? 0) > 0 && (
            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
              <MessageSquare className="h-3 w-3 mr-1" /> {task.revisions.corrections}
            </Badge>
          )}
          {task.tags?.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className={`${tag === 'ASAP' ? 'bg-red-100 text-red-700' : tag === 'Feedback' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} font-medium ml-2`}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </td>
      <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[150px] cursor-pointer", isHighlighted && "bg-blue-50")}>
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.clients?.name || '-'}>{task.clients?.name || '-'}</div>
      </td>
      <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[150px] cursor-pointer", isHighlighted && "bg-blue-50")}>
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.projects?.name || '-'}>{task.projects?.name || '-'}</div>
      </td>
      {canEdit && (
        <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[180px] cursor-pointer", isHighlighted && "bg-blue-50")}>
          {task.profiles ? (
            <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.profiles.full_name ?? ''}>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={getResponsibleAvatar(task.profiles)} />
                <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{task.profiles.full_name}</span>
            </div>
          ) : <div className="flex justify-center">-</div>}
        </td>
      )}
      <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[120px] cursor-pointer", isHighlighted && "bg-blue-50")}>
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.type || ''}>
          {task.type && <Badge variant="outline" className={cn(`border-0`, typeColors[task.type] || 'bg-gray-100 text-gray-800')}>{task.type}</Badge>}
        </div>
      </td>
      <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[150px] cursor-pointer", isHighlighted && "bg-blue-50")}>
        <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="truncate">{dateText}</span>
        </div>
      </td>
      <td onClick={handleRowClick} className={cn("px-4 py-3 border-r max-w-[150px] cursor-pointer", isHighlighted && "bg-blue-50")}>
        <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="truncate">{dynamicDate}</span>
        </div>
      </td>
      <td className={cn(isHighlighted && "bg-blue-50")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isStatusChangeDisabled}>
            <div className={cn("group w-full h-full flex items-center justify-start px-4 py-3", !isStatusChangeDisabled && "cursor-pointer")}>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {currentStatusIcon}
                <span>{currentStatusLabel}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
             {isPostingType
              ? postingStatusOptions.map(status => (
                  <DropdownMenuItem
                    key={status}
                    disabled={task.posting_status === status}
                    onClick={() => onPostingStatusChange(task.id, status)}
                  >
                    {postingStatusLabels[status]}
                  </DropdownMenuItem>
                ))
              : statusOptions.map(status => (
                  <DropdownMenuItem
                    key={status}
                    disabled={task.status === status}
                    onClick={() => handleStatusChange(status as Task['status'])}
                    className={cn(task.status === status && 'bg-accent')}
                  >
                    <div className="flex items-center gap-2">
                      {statusIcons[status as keyof typeof statusIcons]}
                      <span>{statusLabels[status as keyof typeof statusLabels]}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className={cn("px-4 py-3 text-right", isHighlighted && "bg-blue-50")}>
        {canEdit && (
        <DropdownMenu
          onOpenChange={(open) => setOpenMenuId(open ? task.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:opacity-100"
            >
              <MoreVertical
                className={cn(
                  "h-4 w-4 transition-colors",
                  openMenuId === task.id ? "text-blue-500" : "text-gray-500 hover:text-blue-500"
                )}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="z-50"
          >
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {(task.status === 'done' || task.status === 'approved') && !task.parent_task_id && (
              <DropdownMenuItem onClick={() => onReassign(task)} disabled={hasChildTask}>
                <Share2 className="mr-2 h-4 w-4" /> Re-assign for Posting
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(task)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </td>

      <AlertDialog open={isCorrectionsOpen} onOpenChange={setIsCorrectionsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Corrections</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide feedback for the task: "{task.description}". The task will be moved back to 'In Progress'.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea 
            placeholder="Type your correction notes here..."
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCorrectionSubmit} disabled={!correctionNote.trim()}>
              Submit Corrections
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


const TaskTableBody = ({
  tasks,
  allTasks,
  isAddingTask,
  onSaveTask,
  onCancelAddTask,
  projects,
  clients,
  profiles,
  onStatusChange,
  onPostingStatusChange,
  onEdit,
  onDelete,
  canEdit,
  onTaskClick,
  onReassign,
  status,
  isReviewer,
  activeTab,
  currentUserProfile,
  selectedTaskIds,
  onSelectTask,
  highlightedTaskId,
}: {
  tasks: TaskWithDetails[];
  allTasks: TaskWithDetails[];
  isAddingTask?: boolean
  onSaveTask?: (task: any) => void
  onCancelAddTask?: () => void
  projects?: Project[]
  clients?: Client[]
  profiles?: Profile[]
  onStatusChange: (taskId: string, status: Task['status'], correction?: { note: string; authorId: string }) => void
  onPostingStatusChange: (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => void;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (task: TaskWithDetails) => void;
  canEdit: boolean;
  onTaskClick: (task: TaskWithDetails) => void;
  onReassign: (task: TaskWithDetails) => void;
  status: Task['status'],
  isReviewer: boolean,
  activeTab: string;
  currentUserProfile: Profile | null;
  selectedTaskIds: string[];
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  highlightedTaskId: string | null;
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  return (
    <tbody>
      {isAddingTask && onSaveTask && onCancelAddTask && projects && clients && profiles && (
        <AddTaskRow 
            onSave={onSaveTask} 
            onCancel={onCancelAddTask} 
            projects={projects} 
            clients={clients} 
            profiles={profiles}
            status={status}
        />
      )}
      {tasks.map((task) => (
        <tr
          key={task.id}
          className={cn("border-b group hover:bg-muted/50 data-[menu-open=true]:bg-muted/50 transition-colors")}
          data-menu-open={openMenuId === task.id}
        >
          <TaskRow
            task={task}
            allTasks={allTasks}
            onStatusChange={onStatusChange}
            onPostingStatusChange={onPostingStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            canEdit={canEdit}
            onTaskClick={onTaskClick}
            onReassign={onReassign}
            isReviewer={isReviewer}
            activeTab={activeTab}
            currentUserProfile={currentUserProfile}
            isSelected={selectedTaskIds.includes(task.id)}
            onSelect={onSelectTask}
            isHighlighted={highlightedTaskId === task.id}
          />
        </tr>
      ))}
    </tbody>
  )
}

const KanbanCard = ({ task, allTasks, onStatusChange, onPostingStatusChange, onEdit, onDelete, canEdit, onTaskClick, onReassign }: { task: TaskWithDetails, allTasks: TaskWithDetails[], onStatusChange: (taskId: string, status: Task['status']) => void, onPostingStatusChange: (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => void, onEdit: (task: TaskWithDetails) => void, onDelete: (task: TaskWithDetails) => void, canEdit: boolean, onTaskClick: (task: TaskWithDetails) => void, onReassign: (task: TaskWithDetails) => void; }) => {
  const cardColors: { [key: string]: string } = {
    "todo": "bg-blue-100/50",
    "inprogress": "bg-purple-100/50",
    "under-review": "bg-yellow-100/50",
    "done": "bg-gray-100",
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="menuitem"], a')) {
      return;
    }
    onTaskClick(task);
  }

  const getRemainingTime = (deadline: string) => {
    const now = new Date();
    const deadDate = parseISO(deadline);

    if (task.status === 'done') return `Completed on ${format(deadDate, 'dd MMM')}`;

    if (isToday(deadDate)) return 'Due today';
    if (isTomorrow(deadDate)) return 'Due tomorrow';
    if (isPast(deadDate)) return formatDistanceToNowStrict(deadDate, { addSuffix: true });
    
    const days = differenceInDays(deadDate, now);
    if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    return format(deadDate, 'dd MMM');
  }

  const isCompleted = task.status === 'done' || task.posting_status === 'Scheduled' || task.posting_status === 'Posted';
  const isReassigned = !!task.parent_task_id;
  const hasChildTask = useMemo(() => allTasks.some(t => t.parent_task_id === task.id), [allTasks, task.id]);


  return (
    <Card 
      className={cn("mb-4 group cursor-pointer shadow-none", cardColors[task.status] ?? 'bg-gray-100', 'border-0')} 
      onClick={handleCardClick}
    >
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium">{task.description}</CardTitle>
        <div className="flex-shrink-0">
          {task.profiles && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={getResponsibleAvatar(task.profiles)} />
              <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {task.tags && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag: string) => {
              const isBlocked = tag.toLowerCase() === 'blocked';
              const isASAP = tag.toLowerCase() === 'asap';
              const isFeedback = tag.toLowerCase() === 'feedback';
              return (
              <Badge
                key={tag}
                variant="secondary"
                className={cn('font-normal',
                  isBlocked && 'bg-gray-400 text-white',
                  isASAP && 'bg-red-500 text-white',
                  isFeedback && 'bg-green-200 text-green-800'
                )}
              >
                {tag}
              </Badge>
            )})}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs text-gray-600">
        <span>{getRemainingTime(task.deadline)}</span>
        {canEdit && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mt-2 -mr-2">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
                    {isReassigned
                      ? postingStatusOptions.map(status => (
                          <DropdownMenuItem
                            key={status}
                            disabled={task.posting_status === status}
                            onClick={() => onPostingStatusChange(task.id, status)}
                          >
                            Move to {postingStatusLabels[status]}
                          </DropdownMenuItem>
                        ))
                      : mainStatusOptions.map(status => (
                          <DropdownMenuItem
                            key={status}
                            disabled={task.status === status}
                            onClick={() => onStatusChange(task.id, status)}
                            className={cn(task.status === status && 'bg-accent')}
                          >
                            Move to {statusLabels[status as keyof typeof statusLabels]}
                          </DropdownMenuItem>
                        ))}
                     {(task.status === 'done' || task.status === 'approved') && !task.parent_task_id && (
                      <DropdownMenuItem onClick={() => onReassign(task)} disabled={hasChildTask}>
                        <Share2 className="mr-2 h-4 w-4" /> Re-assign for Posting
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(task)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};


const KanbanBoard = ({ tasks: allTasks, onStatusChange, onPostingStatusChange, onEdit, onDelete, canEdit, onTaskClick, onReassign }: { tasks: TaskWithDetails[], onStatusChange: (taskId: string, status: Task['status']) => void, onPostingStatusChange: (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => void, onEdit: (task: TaskWithDetails) => void, onDelete: (task: TaskWithDetails) => void, canEdit: boolean, onTaskClick: (task: TaskWithDetails) => void, onReassign: (task: TaskWithDetails) => void }) => {
  const statuses: ('todo' | 'inprogress' | 'review' | 'done')[] = ['todo', 'inprogress', 'review', 'done'];

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b">
        {statuses.map((status) => {
          const tasksInStatus = allTasks.filter(
            (task) => task.status === status
          );
          return (
            <div key={status} className="px-3 py-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                {statusLabels[status as keyof typeof statusLabels]}
                <Badge
                  variant="secondary"
                  className="ml-2 bg-gray-200 text-gray-700"
                >
                  {tasksInStatus.length}
                </Badge>
              </h2>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 flex-1">
        {statuses.map((status, index) => {
          const tasksInStatus = allTasks.filter(
            (task) => task.status === status
          );
          return (
            <div
              key={status}
              className={cn("px-3 h-full overflow-y-auto", index < statuses.length - 1 && "border-r")}
            >
              <div className="rounded-lg h-full pt-4">
                {tasksInStatus.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    allTasks={allTasks}
                    onStatusChange={onStatusChange}
                    onPostingStatusChange={onPostingStatusChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canEdit={canEdit}
                    onTaskClick={onTaskClick}
                    onReassign={onReassign}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TasksClientProps {
  initialTasks: TaskWithDetails[];
  projects: Project[];
  clients: Client[];
  profiles: Profile[];
  currentUserProfile: Profile | null;
  highlightedTaskId?: string;
}

const processPayload = (payload: any, profiles: Profile[], allProjects: Project[], clients: Client[]): TaskWithDetails => {
  const task = payload.new || payload.old;
  const project = allProjects.find(p => p.id === task.project_id) || null;
  const client = project?.client_id
    ? clients.find(c => c.id === project.client_id)
    : clients.find(c => c.id === task.client_id) || null;
  return {
    ...task,
    profiles: profiles.find(p => p.id === task.assignee_id) || null,
    projects: project,
    clients: client,
    attachments: task.attachments || [],
    revisions: task.revisions,
    corrections: task.corrections
  };
};

type SortableKeys = 'description' | 'client' | 'project' | 'assignee' | 'type' | 'deadline' | 'created_at' | 'status_updated_at';
type SortDirection = 'ascending' | 'descending';
type FilterType = 'client' | 'responsible' | 'type' | 'dueDate' | 'createdDate' | 'dateRange';
type FilterValue = string | Date | { from: Date; to: Date } | null;
interface ActiveFilter {
  id: string;
  type: FilterType;
  value: FilterValue;
}

export default function TasksClient({ initialTasks, projects: allProjects, clients, profiles, currentUserProfile, highlightedTaskId: initialHighlightedTaskId }: TasksClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState('table');
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [taskToEdit, setTaskToEdit] = useState<TaskWithDetails | null>(null);
  const [isEditTaskOpen, setEditTaskOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDetails | null>(null);
  const [taskToDeletePermanently, setTaskToDeletePermanently] = useState<TaskWithDetails | null>(null);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [showBin, setShowBin] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskView, setTaskView] = useState<'all' | 'mine'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [taskToReassign, setTaskToReassign] = useState<TaskWithDetails | null>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: SortDirection } | null>({ key: 'created_at', direction: 'descending' });

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') ||'active');
  
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(initialHighlightedTaskId);

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const supabase = createClient();

  const userPermissions = (currentUserProfile?.roles as RoleWithPermissions)?.permissions;
  const canEditTasks = userPermissions?.tasks === 'Editor';
  const isReviewer = canEditTasks;
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 5000); // Highlight for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tasks-client')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newFullTask = processPayload(payload, profiles, allProjects, clients);
            setTasks(current => [newFullTask, ...current.filter(t => t.id !== newFullTask.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedFullTask = processPayload(payload, profiles, allProjects, clients);
            setTasks(current => current.map(t => t.id === updatedFullTask.id ? updatedFullTask : t));
          } else if (payload.eventType === 'DELETE') {
            const deletedTaskId = payload.old.id;
            setTasks(current => current.filter(t => t.id !== deletedTaskId));
            setSelectedTaskIds(current => current.filter(id => id !== deletedTaskId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, allProjects, clients, profiles]);

  const filteredTasks = useMemo(() => {
    let tasksToDisplay = tasks;

    if (canEditTasks && taskView === 'mine') {
      tasksToDisplay = tasks.filter(task => task.assignee_id === currentUserProfile?.id);
    }
    else if (!canEditTasks) {
       tasksToDisplay = tasks.filter(task => task.assignee_id === currentUserProfile?.id);
    }

    if (searchQuery) {
        tasksToDisplay = tasksToDisplay.filter(task =>
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (activeFilters.length > 0) {
      tasksToDisplay = tasksToDisplay.filter(task => {
        return activeFilters.every(filter => {
          switch (filter.type) {
            case 'client':
              return task.client_id === filter.value;
            case 'responsible':
              return task.assignee_id === filter.value;
            case 'type':
              return task.type === filter.value;
            case 'dueDate':
              return task.deadline && format(parseISO(task.deadline), 'yyyy-MM-dd') === format(filter.value as Date, 'yyyy-MM-dd');
            case 'createdDate':
              return task.created_at && format(parseISO(task.created_at), 'yyyy-MM-dd') === format(filter.value as Date, 'yyyy-MM-dd');
            case 'dateRange': {
              const { from, to } = filter.value as { from: Date, to: Date };
              const taskDate = parseISO(task.created_at);
              return isWithinInterval(taskDate, { start: from, end: to });
            }
            default:
              return true;
          }
        });
      });
    }
    return tasksToDisplay;
  }, [tasks, canEditTasks, currentUserProfile?.id, taskView, searchQuery, activeFilters]);

  const sortedTasks = useMemo(() => {
    let sortableItems = [...filteredTasks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
            case 'client':
                aValue = a.clients?.name || '';
                bValue = b.clients?.name || '';
                break;
            case 'assignee':
                aValue = a.profiles?.full_name || '';
                bValue = b.profiles?.full_name || '';
                break;
            case 'project':
                aValue = a.projects?.name || '';
                bValue = b.projects?.name || '';
                break;
            case 'created_at':
                aValue = a.created_at ? parseISO(a.created_at).getTime() : 0;
                bValue = b.created_at ? parseISO(b.created_at).getTime() : 0;
                break;
            case 'status_updated_at':
                aValue = a.status_updated_at ? parseISO(a.status_updated_at).getTime() : parseISO(a.created_at).getTime();
                bValue = b.status_updated_at ? parseISO(b.status_updated_at).getTime() : parseISO(b.created_at).getTime();
                break;
            default:
                aValue = a[sortConfig.key] || '';
                bValue = b[sortConfig.key] || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTasks, sortConfig]);

  const activeTasks = useMemo(() => sortedTasks.filter(t => !t.is_deleted && (t.status === 'todo' || t.status === 'inprogress' || t.status === 'corrections' || t.status === 'recreate') && (t.posting_status !== 'Scheduled' && t.posting_status !== 'Posted')), [sortedTasks]);
  const underReviewTasks = useMemo(() => sortedTasks.filter(t => !t.is_deleted && (t.status === 'review' || t.status === 'under-review')), [sortedTasks]);
  const completedTasks = useMemo(() => sortedTasks.filter(t => !t.is_deleted && (t.status === 'done' || t.status === 'approved' || t.posting_status === 'Scheduled' || t.posting_status === 'Posted')), [sortedTasks]);

  const deletedTasks = useMemo(() => {
    // Deleted tasks should not be filtered by 'my tasks' view
    const allDeleted = tasks.filter(t => t.is_deleted);
    if(searchQuery){
      return allDeleted.filter(task =>
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return allDeleted;
  }, [tasks, searchQuery]);
  
  useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeTab, showBin, activeFilters]);

  const handleSaveTask = (newTask: Task) => {
    // This function is now mostly redundant due to realtime,
    // but can be kept for optimistic UI if desired.
    setIsAddingTask(false);
  }

  const handleTaskUpdated = (updatedTask: TaskWithDetails) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) {
        setSelectedTask(updatedTask);
    }
  };

  const handleEditClick = (task: TaskWithDetails) => {
    setTaskToEdit(task);
    setEditTaskOpen(true);
  }

  const handleDeleteClick = (task: TaskWithDetails) => {
    setTaskToDelete(task);
    setDeleteAlertOpen(true);
  }

  const handleDeleteTask = () => {
    if (!taskToDelete) return;
    
    setTasks(prev => prev.map(t => t.id === taskToDelete.id ? { ...t, is_deleted: true } : t));
    setDeleteAlertOpen(false);

    startTransition(async () => {
        const { error } = await deleteTask(taskToDelete.id);
        if (error) {
            toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
            setTasks(prev => prev.map(t => t.id === taskToDelete.id ? { ...t, is_deleted: false } : t)); // Revert
        } else {
            toast({ title: "Task moved to bin" });
        }
        setTaskToDelete(null);
    });
  }

  const handleBulkDelete = () => {
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, is_deleted: true } : t));
    
    startTransition(async () => {
        const { error } = await deleteTasks(selectedTaskIds);
        if (error) {
            toast({ title: "Error deleting tasks", description: error.message, variant: "destructive" });
            setTasks(originalTasks); // Revert on error
        } else {
            toast({ title: `${selectedTaskIds.length} tasks moved to bin` });
        }
        setSelectedTaskIds([]);
    });
  };

  const handleBulkRestore = () => {
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, is_deleted: false } : t));
    
    startTransition(async () => {
        const { error } = await restoreTasks(selectedTaskIds);
        if (error) {
            toast({ title: "Error restoring tasks", description: error.message, variant: "destructive" });
            setTasks(originalTasks); // Revert on error
        } else {
            toast({ title: `${selectedTaskIds.length} tasks restored` });
        }
        setSelectedTaskIds([]);
    });
  };

  const handleBulkDeletePermanently = () => {
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
    
    startTransition(async () => {
        const { error } = await deleteTasksPermanently(selectedTaskIds);
        if (error) {
            toast({ title: "Error deleting tasks", description: error.message, variant: "destructive" });
            setTasks(originalTasks); // Revert on error
        } else {
            toast({ title: `${selectedTaskIds.length} tasks permanently deleted` });
        }
        setSelectedTaskIds([]);
    });
  };
  
  const handleRestoreTask = (task: TaskWithDetails) => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_deleted: false } : t));
      
      startTransition(async () => {
          const { error } = await restoreTask(task.id);
          if (error) {
              toast({ title: "Error restoring task", description: error.message, variant: "destructive" });
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_deleted: true } : t)); // Revert
          } else {
              toast({ title: "Task restored" });
          }
      });
  }

  const handleDeletePermanently = () => {
    if (!taskToDeletePermanently) return;
    
    setTasks(prev => prev.filter(t => t.id !== taskToDeletePermanently!.id));
    setTaskToDeletePermanently(null);

    startTransition(async () => {
        const { error } = await deleteTaskPermanently(taskToDeletePermanently!.id);
        if (error) {
            toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Task permanently deleted" });
        }
    });
  }
  
  const handleStatusChange = (taskId: string, status: Task['status'], correction?: { note: string; authorId: string }) => {
    const originalTasks = tasks;
    const updatedTasks = tasks.map(t => t.id === taskId ? {...t, status, status_updated_at: new Date().toISOString()} : t);
    setTasks(updatedTasks);

    startTransition(async () => {
        const { error } = await updateTaskStatus(taskId, status, correction);
        if (error) {
            toast({ title: "Error updating status", description: error.message, variant: "destructive" });
            setTasks(originalTasks); // Revert on error
        }
    });
  }
  
  const handlePostingStatusChange = (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => {
    const originalTasks = tasks;
    const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, posting_status: status } : t
    );
    setTasks(updatedTasks);

    startTransition(async () => {
        const { error } = await updateTaskPostingStatus(taskId, status);
        if (error) {
            toast({ title: "Error updating posting status", description: error.message, variant: "destructive" });
            setTasks(originalTasks);
        }
    });
  }


  const handleSearchClick = () => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }

   const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectTask = (taskId: string, isSelected: boolean) => {
    setSelectedTaskIds(prev =>
      isSelected ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };
  
  const getTasksForCurrentTab = () => {
    switch (activeTab) {
      case 'active': return activeTasks;
      case 'under-review': return underReviewTasks;
      case 'completed': return completedTasks;
      default: return [];
    }
  };

  const handleSelectAll = (e: React.MouseEvent<HTMLButtonElement>) => {
    const tasksForCurrentTab = getTasksForCurrentTab();
    const currentTabTaskIds = tasksForCurrentTab.map(t => t.id);
    const allSelectedOnCurrentTab = currentTabTaskIds.length > 0 && currentTabTaskIds.every(id => selectedTaskIds.includes(id));

    if (allSelectedOnCurrentTab) {
      setSelectedTaskIds(prev => prev.filter(id => !currentTabTaskIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => [...new Set([...prev, ...currentTabTaskIds])]);
    }
  };
  
  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortableKeys, children: React.ReactNode, className?: string }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
      <th className={cn("px-4 py-2 text-sm font-medium text-gray-500", className)}>
          <Button variant="ghost" onClick={() => requestSort(sortKey)} className="p-0 h-auto hover:bg-transparent">
              {children}
              {isSorted ? (
                sortConfig?.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
              )}
          </Button>
      </th>
    )
  }
  
  const getDynamicDateColumnHeader = () => {
      switch(activeTab) {
          case 'under-review': return 'Submitted Date';
          case 'completed': return 'Completed Date';
          default: return 'Created at';
      }
  }

  const renderTaskTable = (tasksToRender: TaskWithDetails[], status: Task['status'], isReviewer: boolean, activeTab: string) => {
    const allVisibleTasksSelected = tasksToRender.length > 0 && tasksToRender.every(t => selectedTaskIds.includes(t.id));
    return (
      <table className="w-full text-left mt-2">
        <thead>
          <tr className="border-b border-gray-200 group">
             {canEditTasks && (
                <th className="px-4 py-2 w-12">
                  <Checkbox
                      checked={allVisibleTasksSelected}
                      onCheckedChange={(checked) => {
                      const taskIds = tasksToRender.map(t => t.id);
                      if (checked) {
                          setSelectedTaskIds(prev => [...new Set([...prev, ...taskIds])]);
                      } else {
                          setSelectedTaskIds(prev => prev.filter(id => !taskIds.includes(id)));
                      }
                      }}
                  />
                </th>
             )}
            <SortableHeader sortKey="description" className="w-[250px]">Task Details</SortableHeader>
            <SortableHeader sortKey="client" className="w-[150px]">Client</SortableHeader>
            <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{ width: "150px" }}>Project</th>
            {canEditTasks && <SortableHeader sortKey="assignee" className="w-[180px]">Responsible</SortableHeader>}
            <SortableHeader sortKey="type" className="w-[120px]">Type</SortableHeader>
            <SortableHeader sortKey="deadline" className="w-[150px]">Due date</SortableHeader>
            <SortableHeader sortKey={activeTab === 'active' ? 'created_at' : 'status_updated_at'} className="w-[150px]">{getDynamicDateColumnHeader()}</SortableHeader>
            <th className="px-4 py-2 text-sm font-medium text-gray-500" style={{ width: "120px" }}>Status</th>
            <th className="px-4 py-2" style={{ width: "50px" }}></th>
          </tr>
        </thead>
        <TaskTableBody
          tasks={tasksToRender}
          allTasks={tasks}
          isAddingTask={canEditTasks && isAddingTask && activeTab === 'active'}
          onSaveTask={handleSaveTask}
          onCancelAddTask={() => setIsAddingTask(false)}
          projects={allProjects}
          clients={clients}
          profiles={profiles}
          onStatusChange={handleStatusChange}
          onPostingStatusChange={handlePostingStatusChange}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          canEdit={canEditTasks}
          onTaskClick={setSelectedTask}
          onReassign={(task) => setTaskToReassign(task)}
          status={status}
          isReviewer={isReviewer}
          activeTab={activeTab}
          currentUserProfile={currentUserProfile}
          selectedTaskIds={selectedTaskIds}
          onSelectTask={handleSelectTask}
          highlightedTaskId={highlightedTaskId}
        />
      </table>
    )
  }

  const mainContent = () => {
    if (showBin) {
        const allBinTasksSelected = deletedTasks.length > 0 && deletedTasks.every(t => selectedTaskIds.includes(t.id));
        return (
            <div className="mb-4 overflow-x-auto">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Deleted Tasks
                <span className="text-sm font-normal text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 ml-2">{deletedTasks.length}</span>
                </h2>
            </div>
            {deletedTasks.length > 0 ? (
                <table className="w-full text-left mt-2">
                <thead>
                    <tr className="border-b">
                    <th className="px-4 py-2 w-12">
                        <Checkbox
                            checked={allBinTasksSelected}
                            onCheckedChange={(checked) => {
                                const taskIds = deletedTasks.map(t => t.id);
                                if (checked) {
                                    setSelectedTaskIds(taskIds);
                                } else {
                                    setSelectedTaskIds([]);
                                }
                            }}
                        />
                    </th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[40%]">Task Details</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Project</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]">Assignee</th>
                    <th className="px-4 py-2 text-sm font-medium text-gray-500 w-[20%]"></th>
                    </tr>
                </thead>
                <tbody>
                    {deletedTasks.map(task => (
                    <tr key={task.id} className="border-b group hover:bg-muted/50">
                        <td className="px-4 py-3">
                            <Checkbox
                                checked={selectedTaskIds.includes(task.id)}
                                onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                            />
                        </td>
                        <td className="px-4 py-3">{task.description}</td>
                        <td className="px-4 py-3">{task.projects?.name || '-'}</td>
                        <td className="px-4 py-3">{task.profiles?.full_name || '-'}</td>
                        <td className="px-4 py-3 text-right">
                           <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleRestoreTask(task)}>
                                  <RefreshCcw className="h-4 w-4 mr-2" /> Restore
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => setTaskToDeletePermanently(task)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                              </Button>
                          </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            ) : (
                <p className="text-muted-foreground mt-4 text-center py-8">The bin is empty.</p>
            )}
            </div>
        );
    }
    
    if (view === 'table') {
      const tabs = [
        { value: 'active', label: 'Active', count: activeTasks.length, content: renderTaskTable(activeTasks, 'todo', isReviewer, 'active') },
        { value: 'under-review', label: 'Under review', count: underReviewTasks.length, content: renderTaskTable(underReviewTasks, 'review', isReviewer, 'under-review') },
        { value: 'completed', label: 'Completed', count: completedTasks.length, content: renderTaskTable(completedTasks, 'done', isReviewer, 'completed') },
      ];
      return (
        <div className="w-full">
            <div className="flex items-center rounded-full bg-muted p-1 mb-4">
              {tabs.map(tab => (
                <Button
                  key={tab.value}
                  variant={activeTab === tab.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn('rounded-full flex-1', activeTab === tab.value ? 'bg-white shadow' : '')}
                >
                  {tab.label}
                  <Badge variant="secondary" className="ml-2">{tab.count}</Badge>
                </Button>
              ))}
            </div>
          {tabs.map(tab => (
            <div key={tab.value} className={activeTab === tab.value ? 'block' : 'hidden'}>
              {tab.content}
            </div>
          ))}
          
          {activeTab === 'active' && canEditTasks && !isAddingTask && (
            <Button
                variant="ghost"
                className="mt-2 text-muted-foreground inline-flex p-0 h-auto hover:bg-transparent hover:text-blue-500 focus:ring-0 focus:ring-offset-0 px-0"
                onClick={() => setIsAddingTask(true)}
            >
                <Plus className="mr-2 h-4 w-4" /> Add task
            </Button>
          )}
        </div>
      )
    } else {
      return <KanbanBoard tasks={sortedTasks} onStatusChange={handleStatusChange} onPostingStatusChange={handlePostingStatusChange} onEdit={handleEditClick} onDelete={handleDeleteClick} canEdit={canEditTasks} onTaskClick={setSelectedTask} onReassign={(task) => setTaskToReassign(task)} allTasks={tasks} />
    }
  }
  
  const FilterManager = () => {
    const [filterType, setFilterType] = useState<FilterType | null>(null);
    const [filterValue, setFilterValue] = useState<FilterValue>(null);
    const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
    
    const addFilter = () => {
      if (filterType && filterValue) {
        let finalValue = filterValue;
        if (filterType === 'dateRange' && typeof filterValue === 'object' && filterValue !== null && 'from' in filterValue && !('to' in filterValue)) {
          finalValue = { from: (filterValue as { from: Date }).from, to: (filterValue as { from: Date }).from };
        }
  
        setActiveFilters(prev => [...prev, { id: Date.now().toString(), type: filterType, value: finalValue }]);
        setFilterType(null);
        setFilterValue(null);
      }
    };
  
    const removeFilter = (id: string) => {
      setActiveFilters(prev => prev.filter(f => f.id !== id));
    };

    const updateFilter = (id: string, value: FilterValue) => {
      setActiveFilters(prev => prev.map(f => f.id === id ? {...f, value} : f));
      setEditingFilterId(null);
    };
  
    const renderFilterValue = (filter: ActiveFilter) => {
      if (filter.value === null) return 'N/A';
      switch (filter.type) {
        case 'client':
          return clients.find(c => c.id === filter.value)?.name;
        case 'responsible':
          return profiles.find(p => p.id === filter.value)?.full_name;
        case 'dueDate':
        case 'createdDate':
          return format(filter.value as Date, 'MMM d, yyyy');
        case 'dateRange':
          const { from, to } = filter.value as { from: Date, to: Date };
          return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`;
        default:
          return filter.value as string;
      }
    };
  
    const renderFilterInput = (type: FilterType | null, value: FilterValue, onChange: (v: FilterValue) => void) => {
      switch (type) {
        case 'client':
          return (
            <Select onValueChange={onChange} value={value as string || undefined}>
              <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          );
        case 'responsible':
          return (
            <Select onValueChange={onChange} value={value as string || undefined}>
              <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
              <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          );
        case 'type':
           const allTypes = [...new Set(tasks.map(t => t.type).filter(Boolean))];
          return (
            <Select onValueChange={onChange} value={value as string || undefined}>
              <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent>{allTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}</SelectContent>
            </Select>
          );
        case 'dueDate':
        case 'createdDate':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(value as Date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><CalendarComponent mode="single" selected={value as Date} onSelect={(d) => onChange(d || null)} initialFocus /></PopoverContent>
            </Popover>
          );
        case 'dateRange':
          return (
             <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value && 'from' in value && (value as {from:Date, to?:Date}).to ? `${format((value as {from:Date}).from, "LLL dd, y")} - ${format((value as {from:Date, to:Date}).to, "LLL dd, y")}` : <span>Pick a date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><CalendarComponent mode="range" selected={value as { from: Date; to: Date }} onSelect={(range) => onChange(range || null)} /></PopoverContent>
            </Popover>
          );
        default:
          return null;
      }
    };
  
    const EditFilterPopover = ({ filter }: { filter: ActiveFilter }) => {
      const [localValue, setLocalValue] = useState(filter.value);
      return (
        <Popover onOpenChange={(open) => !open && setEditingFilterId(null)}>
          <PopoverTrigger asChild>
             <Badge role="button" variant="secondary" className="flex items-center gap-1 cursor-pointer">
              {filter.type}: {renderFilterValue(filter)}
            </Badge>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm capitalize">{filter.type}</h4>
              {renderFilterInput(filter.type, localValue, setLocalValue)}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => removeFilter(filter.id)}>Remove</Button>
                <Button size="sm" onClick={() => updateFilter(filter.id, localValue)}>Save</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
           <Button variant="outline" className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"><Filter className="mr-2 h-4 w-4" />Filter</Button>
        </PopoverTrigger>
        <PopoverContent className="w-96">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Filters</h4>
            <div className="flex gap-2">
              <Select onValueChange={(v: FilterType) => { setFilterType(v); setFilterValue(null); }}>
                <SelectTrigger><SelectValue placeholder="Select a filter" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="responsible">Responsible</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="createdDate">Created Date</SelectItem>
                  <SelectItem value="dateRange">Date Range</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addFilter} disabled={!filterType || !filterValue}>Add</Button>
            </div>
            {filterType && <div className="p-2 border rounded-md">{renderFilterInput(filterType, filterValue, setFilterValue)}</div>}
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Active Filters</h5>
              {activeFilters.length === 0 ? <p className="text-xs text-muted-foreground">No filters applied.</p> : (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map(f => (
                    <EditFilterPopover key={f.id} filter={f} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  

  return (
    <div className="bg-white p-6 rounded-lg h-full w-full flex flex-col">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tasks</h1>
          {selectedTaskIds.length > 0 ? (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedTaskIds.length} selected</span>
                {showBin ? (
                    <>
                        <Button variant="outline" size="sm" onClick={handleBulkRestore}>
                            <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete {selectedTaskIds.length} task(s). This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDeletePermanently} className={cn(buttonVariants({ variant: "destructive" }))}>
                                        {isPending ? 'Deleting...' : 'Delete Permanently'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will move {selectedTaskIds.length} task(s) to the bin. This action can be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} className={cn(buttonVariants({ variant: "destructive" }))}>
                                    {isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          ) : (
            <>
              {canEditTasks && !isAddingTask && view === 'table' && !showBin && activeTab === 'active' && (
                <Button onClick={() => setIsAddingTask(true)} className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add new
                </Button>
              )}
              <div className="flex items-center rounded-full bg-gray-100 p-1">
                <Button
                  variant={view === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('table')}
                  className={cn('rounded-full', view === 'table' ? 'bg-white shadow' : '')}
                >
                  <Table className="mr-2 h-4 w-4" />
                  Table view
                </Button>
                <Button
                  variant={view === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setView('kanban')}
                  className={cn('rounded-full', view === 'kanban' ? 'bg-white shadow' : '')}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Kanban board
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
           <div
            className="flex items-center"
            onMouseLeave={() => { if (!searchQuery && searchInputRef.current !== document.activeElement) setIsSearchOpen(false) }}
          >
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {if(!searchQuery) setIsSearchOpen(false)}}
                    className="h-9 focus-visible:ring-transparent focus-visible:ring-offset-0"
                  />
                </motion.div>
              )}
            </AnimatePresence>
             <Button variant="ghost" size="icon" onClick={handleSearchClick} className={cn(isSearchOpen && 'rounded-l-none')}>
                <Search className="h-5 w-5" />
            </Button>
          </div>
          
          <FilterManager />

          {canEditTasks ? (
            <div className="flex items-center rounded-full bg-gray-100 p-1">
              <Button
                variant={taskView === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTaskView('all')}
                className={cn('rounded-full', taskView === 'all' ? 'bg-white shadow' : '')}
              >
                All Tasks
              </Button>
              <Button
                variant={taskView === 'mine' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTaskView('mine')}
                className={cn('rounded-full', taskView === 'mine' ? 'bg-white shadow' : '')}
              >
                My Tasks
              </Button>
            </div>
          ) : null}
          {canEditTasks && (
            <Button variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full" onClick={() => setShowBin(!showBin)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Bin
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="min-w-full inline-block align-middle h-full">
          {mainContent()}
        </div>
      </main>

      {selectedTask && (
        <TaskDetailSheet 
            task={selectedTask}
            isOpen={!!selectedTask}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setSelectedTask(null)
              }
            }}
            onEdit={() => {
                setEditTaskOpen(true);
                setTaskToEdit(selectedTask);
            }}
            userProfile={currentUserProfile}
            onTaskUpdated={handleTaskUpdated}
        />
      )}

      {taskToEdit && canEditTasks && (
        <EditTaskDialog
          isOpen={isEditTaskOpen}
          setIsOpen={setEditTaskOpen}
          task={taskToEdit}
          projects={allProjects}
          clients={clients}
          profiles={profiles}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
      {taskToReassign && (
        <ReassignTaskDialog
          isOpen={!!taskToReassign}
          setIsOpen={() => setTaskToReassign(null)}
          task={taskToReassign}
          profiles={profiles}
          onTaskCreated={handleSaveTask}
        />
      )}
       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the task "{taskToDelete?.description}" to the bin. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={!!taskToDeletePermanently} onOpenChange={(open) => !open && setTaskToDeletePermanently(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task "{taskToDeletePermanently?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    

    
