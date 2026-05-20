
'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Plus,
  Table,
  Search,
  MoreVertical,
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
  Filter,
  Check,
  Globe,
  X as XIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getInitials, cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO, differenceInDays, isPast, isWithinInterval } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Project, Client, Profile, Team, Task, TaskWithDetails, RoleWithPermissions, Attachment, WorkTypeStatusConfig } from '@/lib/types';
import { updateTaskStatus, deleteTask, restoreTask, deleteTaskPermanently, uploadAttachment, updateTaskPostingStatus, deleteTasks, restoreTasks, deleteTasksPermanently } from '@/app/actions';
import { createTask } from '@/app/teams/actions';
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
import { AnimatePresence, motion } from 'framer-motion';
import { EditTaskDialog } from './edit-task-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusIcons: Record<string, React.ReactNode> = {
  'todo': <AlertCircle className="h-4 w-4 text-gray-400" />,
  'inprogress': <Rocket className="h-4 w-4 text-purple-600" />,
  'review': <Eye className="h-4 w-4 text-yellow-600" />,
  'corrections': <MessageSquare className="h-4 w-4 text-orange-600" />,
  'recreate': <Repeat className="h-4 w-4 text-blue-600" />,
  'approved': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'done': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'under-review': <Eye className="h-4 w-4 text-yellow-600" />,
  'planned': <AlertCircle className="h-4 w-4 text-gray-400" />,
  'scheduled': <CalendarIcon className="h-4 w-4 text-blue-500" />,
  'posted': <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

const statusLabels: Record<string, string> = {
    'planned': 'Planned',
    'todo': 'New task',
    'inprogress': 'In progress',
    'review': 'Review',
    'corrections': 'Corrections',
    'recreate': 'Recreate',
    'approved': 'Approved',
    'scheduled': 'Scheduled',
    'posted': 'Posted',
    'done': 'Completed',
    'under-review': 'Under Review'
}

const typeColors: { [key: string]: string } = {
  "Poster": "bg-blue-900/30 text-blue-300 border-blue-800/50",
  "Video": "bg-orange-900/30 text-orange-300 border-orange-800/50",
  "Story": "bg-purple-900/30 text-purple-300 border-purple-800/50",
  "Motion Graphics": "bg-pink-900/30 text-pink-300 border-pink-800/50",
  "Animation": "bg-indigo-900/30 text-indigo-300 border-indigo-800/50",
  "Grid": "bg-green-900/30 text-green-300 border-green-800/50",
  "Posting": "bg-yellow-900/30 text-yellow-300 border-yellow-800/50",
  "Account Creation": "bg-red-900/30 text-red-300 border-red-800/50",
  "Flyer": "bg-teal-900/30 text-teal-300 border-teal-800/50",
  "Profile": "bg-cyan-900/30 text-cyan-300 border-cyan-800/50",
  "Menu": "bg-lime-900/30 text-lime-300 border-lime-800/50",
  "FB Cover": "bg-sky-900/30 text-sky-300 border-sky-800/50",
  "Whatsapp Cover": "bg-emerald-900/30 text-emerald-300 border-emerald-800/50",
  "Profile Picture": "bg-fuchsia-900/30 text-fuchsia-300 border-fuchsia-800/50",
  "Highlite Cover": "bg-rose-900/30 text-rose-300 border-rose-800/50",
  "Ad Post": "bg-amber-900/30 text-amber-300 border-amber-800/50",
  "Shooting": "bg-violet-900/30 text-violet-300 border-violet-800/50",
  "Meeting": "bg-zinc-800/30 text-zinc-300 border-zinc-700/50",
  "Connect": "bg-slate-800/30 text-slate-300 border-slate-700/50",
  "Followup": "bg-stone-800/30 text-stone-300 border-stone-700/50",
};

const getResponsibleAvatar = (profile: Profile | null) => {
  return profile?.avatar_url ?? undefined;
}

interface SearchableDropdownProps {
  items: { id: string; name: string; avatar?: string | null }[];
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  onNextField?: () => void;
}

const SearchableDropdown = ({ items, value, onSelect, placeholder, disabled, triggerRef, onNextField }: SearchableDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    return items
      .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  useEffect(() => {
    if (open) {
      setHighlightedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        const selectedId = filteredItems[highlightedIndex].id;
        onSelect(selectedId);
        setOpen(false);
        setSearch("");
        setTimeout(() => onNextField?.(), 50);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const selectedItem = items.find(i => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          ref={triggerRef}
          variant="ghost"
          className="w-full justify-between font-normal bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/[0.05] px-2 text-zinc-100"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedItem?.avatar && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedItem.avatar} />
                <AvatarFallback className="text-[8px]">{getInitials(selectedItem.name)}</AvatarFallback>
              </Avatar>
            )}
            <span className={cn("truncate", !selectedItem && "text-zinc-500")}>
              {selectedItem ? selectedItem.name : placeholder}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[250px] bg-zinc-900 border-zinc-800" align="start" onKeyDown={handleKeyDown}>
        <div className="flex items-center border-b border-zinc-800 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-zinc-400" />
          <Input
            ref={inputRef}
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none shadow-none ring-0 ring-offset-0 text-zinc-100"
          />
        </div>
        <ScrollArea className="h-60">
          <div className="p-1">
            {filteredItems.length === 0 && (
              <div className="py-6 text-center text-sm text-zinc-500">No items found.</div>
            )}
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                role="button"
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                  highlightedIndex === index ? "bg-zinc-800 text-zinc-100" : "hover:bg-zinc-800/50 text-zinc-300",
                  value === item.id && "bg-zinc-800/70"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                  setSearch("");
                  setTimeout(() => onNextField?.(), 50);
                }}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  {item.avatar && (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={item.avatar} />
                      <AvatarFallback className="text-[8px]">{getInitials(item.name)}</AvatarFallback>
                    </Avatar>
                  )}
                  <span className="truncate">{item.name}</span>
                </div>
                {value === item.id && <Check className="ml-2 h-4 w-4 shrink-0 text-sky-400" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const AddTaskRow = ({ 
  onSave, 
  onCancel,
  projects,
  clients,
  profiles,
  status,
  initialData,
}: { 
  onSave: (task: any) => void; 
  onCancel: () => void; 
  projects: Project[],
  clients: Client[],
  profiles: Profile[],
  status: Task['status'],
  initialData?: Partial<TaskWithDetails> | null;
}) => {
  const [taskName, setTaskName] = useState(initialData?.description || '');
  const [projectId, setProjectId] = useState(initialData?.project_id || '');
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.deadline ? parseISO(initialData.deadline) : undefined);
  const [assigneeId, setAssigneeId] = useState(initialData?.assignee_id || '');
  const [taskType, setTaskType] = useState(initialData?.type || '');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

  const { toast } = useToast();

  const selectedAssignee = profiles.find(p => p.id === assigneeId);
  const assigneeTeams = selectedAssignee?.teams?.map(t => t.teams).filter(Boolean) as Team[] || [];
  
  const availableTaskTypes = useMemo(() => {
    const types = [...new Set(assigneeTeams.flatMap(t => t.default_tasks || []))];
    return types.sort((a, b) => a.localeCompare(b));
  }, [assigneeTeams]);

  const filteredProjects = useMemo(() => {
    const list = clientId ? projects.filter(p => String(p.client_id) === String(clientId)) : [];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [clientId, projects]);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const sortedProfiles = useMemo(() => {
    return profiles.filter(p => !p.is_archived).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [profiles]);

  const taskInputRef = useRef<HTMLInputElement>(null);
  const clientTriggerRef = useRef<HTMLButtonElement>(null);
  const projectTriggerRef = useRef<HTMLButtonElement>(null);
  const assigneeTriggerRef = useRef<HTMLButtonElement>(null);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const dueDateTriggerRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    taskInputRef.current?.focus();
  }, []);

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setProjectId(''); 
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const selectedFiles = Array.from(files);
    const newAttachments: Attachment[] = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      const { data, error } = await uploadAttachment(formData);
      if (error) {
        toast({ title: `Upload failed for ${file.name}`, description: error, variant: "destructive" });
      } else if (data) {
        newAttachments.push({ ...data, type: 'file' });
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
      toast({ 
        title: "Files attached", 
        description: `${newAttachments.length} file(s) have been attached.` 
      });
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkName.trim()) {
      toast({ title: "Link name and URL are required", variant: "destructive" });
      return;
    }
    
    let formattedUrl = linkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const newLink: Attachment = {
      name: linkName.trim(),
      publicUrl: formattedUrl,
      type: 'link'
    };

    setAttachments(prev => [...prev, newLink]);
    setLinkName('');
    setLinkUrl('');
    setIsLinkPopoverOpen(false);
    toast({ title: "Link added" });
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

  const handleTaskNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clientTriggerRef.current?.click();
    }
  };

  const handleDueDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!calendarOpen) {
        saveButtonRef.current?.focus();
        handleSave();
      }
    }
  };

  return (
    <tr className="border-b border-white/5 bg-white/[0.02]">
      <td></td>
      <td className="px-4 py-3 border-r border-white/5">
        <Input 
          placeholder="Type Task Details" 
          value={taskName} 
          ref={taskInputRef}
          onChange={(e) => setTaskName(e.target.value)} 
          onKeyDown={handleTaskNameKeyDown}
          className="bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:outline-none text-zinc-100"
        />
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((att, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {att.type === 'link' ? <Globe className="h-3 w-3 text-sky-400" /> : <LinkIcon className="h-3 w-3 text-emerald-400" fill="currentColor" />}
                <a href={att.publicUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline truncate" title={att.name}>{att.name}</a>
              </div>
            ))}
          </div>
        )}
      </td>

      <td className="px-4 py-3 border-r border-white/5">
        <SearchableDropdown
          items={sortedClients.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))}
          value={clientId}
          onSelect={handleClientChange}
          placeholder="Select client"
          triggerRef={clientTriggerRef}
          onNextField={() => projectTriggerRef.current?.click()}
        />
      </td>

      <td className="px-4 py-3 border-r border-white/5">
        <SearchableDropdown
          items={[
            { id: 'no-project', name: 'No project' },
            ...filteredProjects.map(p => ({ id: p.id, name: p.name }))
          ]}
          value={projectId}
          onSelect={setProjectId}
          placeholder="Select project"
          disabled={!clientId}
          triggerRef={projectTriggerRef}
          onNextField={() => assigneeTriggerRef.current?.click()}
        />
      </td>

      <td className="px-4 py-3 border-r border-white/5">
        <SearchableDropdown
          items={sortedProfiles.map(p => ({ id: p.id, name: p.full_name || "", avatar: p.avatar_url }))}
          value={assigneeId}
          onSelect={setAssigneeId}
          placeholder="Select assignee"
          triggerRef={assigneeTriggerRef}
          onNextField={() => typeTriggerRef.current?.click()}
        />
      </td>

      <td className="px-4 py-3 border-r border-white/5">
        <SearchableDropdown
          items={availableTaskTypes.map(t => ({ id: t, name: t }))}
          value={taskType}
          onSelect={setTaskType}
          placeholder="Select type"
          disabled={!assigneeId || availableTaskTypes.length === 0}
          triggerRef={typeTriggerRef}
          onNextField={() => dueDateTriggerRef.current?.click()}
        />
      </td>

      <td className="px-4 py-3 border-r border-white/5">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              ref={dueDateTriggerRef}
              variant="ghost" 
              className="w-full justify-start text-left font-normal bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-white/[0.05] text-zinc-100"
              onKeyDown={handleDueDateKeyDown}
            >
              {formatDate(dueDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800">
            <CalendarComponent 
              mode="single" 
              selected={dueDate} 
              onSelect={(date) => {
                setDueDate(date);
                setCalendarOpen(false);
                setTimeout(() => saveButtonRef.current?.focus(), 50);
              }}
              initialFocus 
            />
          </PopoverContent>
        </Popover>
      </td>
       <td className="px-4 py-3 border-r border-white/5"></td>
      <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {statusIcons[status] || <AlertCircle className="h-4 w-4 text-zinc-500" />}
          <span>{statusLabels[status] || status}</span>
        </div>
      </td>

      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 w-8 hover:bg-white/[0.05]"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 bg-zinc-900 border-zinc-800 text-white" align="end">
              <div className="space-y-4">
                <h4 className="font-black uppercase tracking-widest text-[10px] text-zinc-500">Add Web Link</h4>
                <div className="space-y-2">
                  <Label htmlFor="link-name" className="text-[10px] font-bold uppercase text-zinc-400">Link Name</Label>
                  <Input id="link-name" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="e.g. Reference Folder" className="h-8 bg-zinc-950 border-zinc-800 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-url" className="text-[10px] font-bold uppercase text-zinc-400">URL</Label>
                  <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="h-8 bg-zinc-950 border-zinc-800 text-sm" />
                </div>
                <Button size="sm" onClick={handleAddLink} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold uppercase tracking-widest text-[10px]">Add Link</Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 w-8 hover:bg-white/[0.05]"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AttachIcon className="h-4 w-4" fill="currentColor"/>}
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving} className="focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-400">Cancel</Button>
          <Button 
            ref={saveButtonRef}
            size="sm"
            onClick={handleSave} 
            disabled={isSaving || isUploading} 
            className="focus-visible:ring-0 focus-visible:ring-offset-0 bg-sky-600 hover:bg-sky-500 text-white"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </td>
    </tr>
  );
};

const TaskRow = ({ 
  task, 
  allTasks, 
  onStatusChange, 
  onPostingStatusChange, 
  onEdit, 
  onDelete, 
  openMenuId, 
  setOpenMenuId, 
  canEdit, 
  onHighlight,
  onOpenDetails, 
  onReassign, 
  isReviewer, 
  activeTab, 
  currentUserProfile, 
  isSelected, 
  onSelect, 
  isHighlighted,
  workTypeStatusConfig,
}: { 
  task: TaskWithDetails; 
  allTasks: TaskWithDetails[]; 
  onStatusChange: (taskId: string, status: Task['status'], correction?: { note: string; authorId: string }) => void; 
  onPostingStatusChange: (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => void; 
  onEdit: (task: TaskWithDetails) => void; 
  onDelete: (task: TaskWithDetails) => void; 
  openMenuId: string | null; 
  setOpenMenuId: (id: string | null) => void; 
  canEdit: boolean; 
  onHighlight: (taskId: string) => void;
  onOpenDetails: (task: TaskWithDetails) => void; 
  onReassign: (task: TaskWithDetails) => void; 
  isReviewer: boolean; 
  activeTab: string; 
  currentUserProfile: Profile | null; 
  isSelected: boolean; 
  onSelect: (taskId: string, isSelected: boolean) => void; 
  isHighlighted: boolean; 
  workTypeStatusConfig: WorkTypeStatusConfig;
}) => {
  const [dateText, setDateText] = useState('No date');
  const [isCorrectionsOpen, setIsCorrectionsOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const { toast } = useToast();
  
  const attachments = useMemo(() => {
    if (!task.attachments || !Array.isArray(task.attachments)) return [];
    return task.attachments as Attachment[];
  }, [task.attachments]);

  const hasLinks = useMemo(() => attachments.some(a => a.type === 'link'), [attachments]);
  const hasFiles = useMemo(() => attachments.some(a => a.type === 'file' || !a.type), [attachments]);

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
    if (target.closest('button, [role="menuitem"], a, [role="dialog"], label, [role="checkbox"]')) {
      return;
    }
    onHighlight(task.id);
  }

  const handleRowDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="menuitem"], a, [role="dialog"], label, [role="checkbox"]')) {
      return;
    }
    onOpenDetails(task);
  }

  const handleStatusUpdate = (val: string) => {
    const lowerVal = val.toLowerCase();
    if (['planned', 'scheduled', 'posted'].includes(lowerVal)) {
        const mappedValue = (lowerVal.charAt(0).toUpperCase() + lowerVal.slice(1)) as 'Planned' | 'Scheduled' | 'Posted';
        onPostingStatusChange(task.id, mappedValue);
    } else if (val === 'corrections') {
        setIsCorrectionsOpen(true);
    } else {
        onStatusChange(task.id, val as any);
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
  
  const currentStatus = (task.posting_status && (task.posting_status !== 'Planned' || activeTab === 'completed')) 
    ? task.posting_status.toLowerCase() 
    : task.status;

  const currentStatusLabel = statusLabels[currentStatus] || currentStatus;
  const currentStatusIcon = statusIcons[currentStatus] || <AlertCircle className="h-4 w-4 text-zinc-500" />;
  
  const allowedStatusesForType = useMemo(() => {
    if (!task.type) return Object.keys(statusLabels);
    return workTypeStatusConfig[task.type] || Object.keys(statusLabels);
  }, [task.type, workTypeStatusConfig]);

  const getStatusOptions = () => {
    let options: string[] = [];
    if (activeTab === 'active') {
        options = ['todo', 'inprogress', 'review', 'posted', 'scheduled', 'done'];
    } else if (activeTab === 'under-review') {
        const isAssignee = currentUserProfile?.id === task.assignee_id;
        if (isReviewer && isAssignee) {
            options = ['todo', 'inprogress', 'review', 'approved', 'corrections', 'recreate'];
        } else if (isReviewer) {
            options = ['review', 'approved', 'corrections', 'recreate'];
        } else if (isAssignee) {
            options = ['todo', 'inprogress', 'review'];
        }
    } else if (activeTab === 'completed') {
        options = ['posted', 'scheduled', 'approved', 'review', 'planned', 'todo', 'done'];
    }
    
    return options.filter(opt => allowedStatusesForType.includes(opt));
  };

  const statusOptions = getStatusOptions();
  
  const isStatusChangeDisabled = 
    (activeTab === 'completed' && !isReviewer) ||
    (activeTab === 'under-review' && !isReviewer && currentUserProfile?.id !== task.assignee_id) ||
    (activeTab === 'active' && currentUserProfile?.id !== task.assignee_id) ||
    statusOptions.length === 0;

  const hasChildTask = useMemo(() => allTasks.some(t => t.parent_task_id === task.id), [allTasks, task.id]);

  return (
    <>
      {canEdit && (
        <td className={cn("px-4 py-3", isHighlighted && "bg-sky-500/10")}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(task.id, !!checked)}
            aria-label="Select task"
            className="border-zinc-700 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
          />
        </td>
      )}
      <td 
        onClick={handleRowClick} 
        onDoubleClick={handleRowDoubleClick}
        className={cn("px-4 py-3 border-r border-white/5 max-w-[250px] cursor-pointer text-zinc-100", isHighlighted && "bg-sky-500/10")}
      >
        <div className="flex items-center gap-2">
          <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.description}>
            <span className="truncate shrink">{task.description}</span>
          </div>
          {hasFiles && <AttachIcon className="h-4 w-4 text-emerald-400 shrink-0 transform -rotate-30" fill="currentColor"/>}
          {hasLinks && <Globe className="h-3 w-3 text-sky-400 shrink-0" />}
          {isReassigned && <Share2 className="h-4 w-4 text-sky-400 shrink-0" />}
          {(task.revisions?.recreations ?? 0) > 0 && (
            <Badge variant="outline" className="text-sky-300 border-sky-800/50 bg-sky-950/30">
              <Repeat className="h-3 w-3 mr-1" /> {task.revisions.recreations}
            </Badge>
          )}
          {(task.revisions?.corrections ?? 0) > 0 && (
            <Badge variant="outline" className="text-orange-300 border-orange-800/50 bg-orange-950/30">
              <MessageSquare className="h-3 w-3 mr-1" /> {task.revisions.corrections}
            </Badge>
          )}
          {task.tags?.map(tag => (
            <Badge
              key={tag}
              variant="secondary"
              className={`${tag === 'ASAP' ? 'bg-red-900/40 text-red-300 border-red-800/50' : tag === 'Feedback' ? 'bg-sky-900/40 text-sky-300 border-sky-800/50' : 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50'} font-medium ml-2`}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </td>
      <td 
        onClick={handleRowClick} 
        onDoubleClick={handleRowDoubleClick}
        className={cn("px-4 py-3 border-r border-white/5 max-w-[150px] cursor-pointer text-zinc-300", isHighlighted && "bg-sky-500/10")}
      >
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.clients?.name || '-'}>{task.clients?.name || '-'}</div>
      </td>
      <td 
        onClick={handleRowClick} 
        onDoubleClick={handleRowDoubleClick}
        className={cn("px-4 py-3 border-r border-white/5 max-w-[150px] cursor-pointer text-zinc-300", isHighlighted && "bg-sky-500/10")}
      >
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.projects?.name || '-'}>{task.projects?.name || '-'}</div>
      </td>
      {canEdit && (
        <td 
          onClick={handleRowClick} 
          onDoubleClick={handleRowDoubleClick}
          className={cn("px-4 py-3 border-r border-white/5 max-w-[180px] cursor-pointer text-zinc-300", isHighlighted && "bg-sky-500/10")}
        >
          {task.profiles ? (
            <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.profiles.full_name ?? ''}>
              <Avatar className="h-6 w-6 shrink-0 border border-white/10">
                <AvatarImage src={getResponsibleAvatar(task.profiles)} />
                <AvatarFallback className="bg-zinc-800 text-zinc-400">{getInitials(task.profiles.full_name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{task.profiles.full_name}</span>
            </div>
          ) : <div className="flex justify-center">-</div>}
        </td>
      )}
      <td 
        onClick={handleRowClick} 
        onDoubleClick={handleRowDoubleClick}
        className={cn("px-4 py-3 border-r border-white/5 max-w-[120px] cursor-pointer", isHighlighted && "bg-sky-500/10")}
      >
        <div className="truncate whitespace-nowrap overflow-hidden text-ellipsis" title={task.type || ''}>
          {task.type && <Badge variant="outline" className={cn(`border shadow-sm`, typeColors[task.type] || 'bg-zinc-800/40 text-zinc-300 border-zinc-700/50')}>{task.type}</Badge>}
        </div>
      </td>
      <td 
        onClick={handleRowClick} 
        onDoubleClick={handleRowDoubleClick}
        className={cn("px-4 py-3 border-r border-white/5 max-w-[150px] cursor-pointer text-zinc-300", isHighlighted && "bg-sky-500/10")}
      >
        <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="truncate">{dateText}</span>
        </div>
      </td>
      <td 
        onClick={handleRowClick} 
        onDoubleClick={handleRowDoubleClick}
        className={cn("px-4 py-3 border-r border-white/5 max-w-[150px] cursor-pointer text-zinc-300", isHighlighted && "bg-sky-500/10")}
      >
        <div className="flex items-center gap-2 truncate whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="truncate">{dynamicDate}</span>
        </div>
      </td>
      <td className={cn(isHighlighted && "bg-sky-500/10")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={cn("group w-full h-full flex items-center justify-start px-4 py-3 text-zinc-100", !isStatusChangeDisabled && "cursor-pointer hover:bg-white/[0.05]")}>
              <div className="flex items-center gap-2 whitespace-nowrap">
                {currentStatusIcon}
                <span>{currentStatusLabel}</span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
             {statusOptions.map(opt => (
                  <DropdownMenuItem
                    key={opt}
                    disabled={currentStatus === opt}
                    onClick={() => handleStatusUpdate(opt)}
                    className={cn(currentStatus === opt && 'bg-zinc-800 text-sky-400')}
                  >
                    <div className="flex items-center gap-2">
                      {statusIcons[opt] || <AlertCircle className="h-4 w-4 text-zinc-500" />}
                      <span>{statusLabels[opt] || opt}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className={cn("px-4 py-3 text-right", isHighlighted && "bg-sky-500/10")}>
        {canEdit && (
        <DropdownMenu
          onOpenChange={(open) => setOpenMenuId(open ? task.id : null)}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.05] focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:opacity-100"
            >
              <MoreVertical
                className={cn(
                  "h-4 w-4 transition-colors",
                  openMenuId === task.id ? "text-sky-400" : "text-zinc-500 hover:text-sky-400"
                )}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={(e) => e.preventDefault()}
            className="z-50 bg-zinc-900 border-zinc-800 text-zinc-100"
          >
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {(task.status === 'done' || task.status === 'approved') && !task.parent_task_id && (
              <DropdownMenuItem onClick={() => onReassign(task)} disabled={hasChildTask}>
                <Share2 className="mr-2 h-4 w-4" /> Re-assign for Posting
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-950/30" onClick={() => onDelete(task)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </td>

      <AlertDialog open={isCorrectionsOpen} onOpenChange={setIsCorrectionsOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Request Corrections</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Please provide feedback for the task: "{task.description}". The task will be moved back to 'In Progress'.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea 
            placeholder="Type your correction notes here..."
            value={correctionNote}
            onChange={(e) => setCorrectionNote(e.target.value)}
            className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-sky-500/50"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCorrectionSubmit} disabled={!correctionNote.trim()} className="bg-sky-600 hover:bg-sky-500 text-white">
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
  onHighlight,
  onOpenDetails,
  onReassign,
  status,
  isReviewer,
  activeTab,
  currentUserProfile,
  selectedTaskIds,
  onSelectTask,
  highlightedTaskId,
  clickedTaskId,
  duplicationData,
  workTypeStatusConfig,
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
  onHighlight: (taskId: string) => void;
  onOpenDetails: (task: TaskWithDetails) => void;
  onReassign: (task: TaskWithDetails) => void;
  status: Task['status'],
  isReviewer: boolean,
  activeTab: string;
  currentUserProfile: Profile | null;
  selectedTaskIds: string[];
  onSelectTask: (taskId: string, isSelected: boolean) => void;
  highlightedTaskId: string | null;
  clickedTaskId: string | null;
  duplicationData?: Partial<TaskWithDetails> | null;
  workTypeStatusConfig: WorkTypeStatusConfig;
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
            initialData={duplicationData}
        />
      )}
      {tasks.map((task) => (
        <tr
          key={task.id}
          className={cn("border-b border-white/5 group hover:bg-white/[0.04] data-[menu-open=true]:bg-white/[0.04] transition-colors")}
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
            onHighlight={onHighlight}
            onOpenDetails={onOpenDetails}
            onReassign={onReassign}
            isReviewer={isReviewer}
            activeTab={activeTab}
            currentUserProfile={currentUserProfile}
            isSelected={selectedTaskIds.includes(task.id)}
            onSelect={onSelectTask}
            isHighlighted={highlightedTaskId === task.id || clickedTaskId === task.id}
            workTypeStatusConfig={workTypeStatusConfig}
          />
        </tr>
      ))}
    </tbody>
  )
}

interface TasksClientProps {
  initialTasks: TaskWithDetails[];
  projects: Project[];
  clients: Client[];
  profiles: Profile[];
  currentUserProfile: Profile | null;
  highlightedTaskId?: string;
  workTypeStatusConfig: WorkTypeStatusConfig;
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

type SortableKeys = 'description' | 'type' | 'deadline' | 'created_at' | 'status_updated_at' | 'client' | 'project' | 'assignee';
type SortDirection = 'ascending' | 'descending';
type FilterType = 'client' | 'responsible' | 'type' | 'dueDate' | 'createdDate' | 'dateRange';
type FilterValue = string | Date | { from: Date; to: Date } | null;
interface ActiveFilter {
  id: string;
  type: FilterType;
  value: FilterValue;
}

export default function TasksClient({ initialTasks, projects: allProjects, clients, profiles, currentUserProfile, highlightedTaskId: initialHighlightedTaskId, workTypeStatusConfig }: TasksClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [clickedTaskId, setClickedTaskId] = useState<string | null>(null);
  const [duplicationData, setDuplicationData] = useState<Partial<TaskWithDetails> | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const supabase = createClient();
  const userPermissions = (currentUserProfile?.roles as RoleWithPermissions)?.permissions;
  const canEditTasks = userPermissions?.tasks === 'Editor';
  const isReviewer = canEditTasks || currentUserProfile?.roles?.name === 'Falaq Admin';
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (canEditTasks && !showBin) {
          e.preventDefault();
          setDuplicationData(null);
          setActiveTab('active');
          setIsAddingTask(true);
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
        if (canEditTasks && !showBin && clickedTaskId) {
          e.preventDefault();
          const taskToDuplicate = tasks.find(t => t.id === clickedTaskId);
          if (taskToDuplicate) {
            setDuplicationData({
              description: taskToDuplicate.description,
              client_id: taskToDuplicate.client_id,
              project_id: taskToDuplicate.project_id,
              assignee_id: taskToDuplicate.assignee_id,
              type: taskToDuplicate.type,
              deadline: taskToDuplicate.deadline,
            });
            setActiveTab('active');
            setIsAddingTask(true);
            toast({ title: 'Duplicating Task', description: 'Auto-filled task details for duplication.' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [canEditTasks, showBin, clickedTaskId, tasks, toast]);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-tasks-client')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newFullTask = processPayload(payload, profiles, allProjects, clients);
            setTasks(current => {
              if (current.some(t => t.id === newFullTask.id)) return current;
              return [newFullTask, ...current];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedFullTask = processPayload(payload, profiles, allProjects, clients);
            setTasks(current => current.map(t => t.id === updatedFullTask.id ? updatedFullTask : t));
          } else if (payload.eventType === 'DELETE') {
            const deletedTaskId = payload.old.id;
            setTasks(current => current.filter(t => t.id !== deletedTaskId));
            setSelectedTaskIds(current => current.filter(id => id !== deletedTaskId));
            if (clickedTaskId === deletedTaskId) setClickedTaskId(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, allProjects, clients, profiles, clickedTaskId]);

  const filteredTasks = useMemo(() => {
    let tasksToDisplay = tasks;

    if (canEditTasks && taskView === 'mine') {
      tasksToDisplay = tasks.filter(task => task.assignee_id === currentUserProfile?.id);
    } else if (!canEditTasks) {
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
              if (!from || !to) return true;
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

  const activeTasks = useMemo(() => sortedTasks.filter(t => {
    if (t.is_deleted) return false;
    if (t.posting_status === 'Posted' || t.posting_status === 'Scheduled') return false;
    const isPlanned = t.posting_status === 'Planned';
    const isNormalActive = ['todo', 'inprogress', 'corrections', 'recreate'].includes(t.status);
    return isPlanned || isNormalActive;
  }), [sortedTasks]);

  const underReviewTasks = useMemo(() => sortedTasks.filter(t => {
    if (t.is_deleted) return false;
    if (t.posting_status === 'Posted' || t.posting_status === 'Scheduled') return false;
    return t.status === 'review' || t.status === 'under-review';
  }), [sortedTasks]);

  const completedTasks = useMemo(() => sortedTasks.filter(t => {
    if (t.is_deleted) return false;
    const isPostedOrScheduled = t.posting_status === 'Posted' || t.posting_status === 'Scheduled';
    const isNormalCompleted = t.status === 'approved' || t.status === 'done';
    return isPostedOrScheduled || isNormalCompleted;
  }), [sortedTasks]);

  const deletedTasks = useMemo(() => {
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
    setIsAddingTask(false);
    setDuplicationData(null);
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
            setTasks(prev => prev.map(t => t.id === taskToDelete.id ? { ...t, is_deleted: false } : t));
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
            setTasks(originalTasks);
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
            setTasks(originalTasks);
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
            setTasks(originalTasks);
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
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_deleted: true } : t));
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
            setTasks(originalTasks);
        }
    });
  }
  
  const handlePostingStatusChange = (taskId: string, status: 'Planned' | 'Scheduled' | 'Posted') => {
    const originalTasks = tasks;
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, posting_status: status } : t);
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
  
  const SortableHeader = ({ sortKey, children, className }: { sortKey: SortableKeys, children: React.ReactNode, className?: string }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
      <th className={cn("px-4 py-2 text-sm font-medium text-zinc-500", className)}>
          <Button variant="ghost" onClick={() => requestSort(sortKey)} className="p-0 h-auto hover:bg-transparent text-zinc-500 hover:text-zinc-300">
              {children}
              {isSorted ? (
                sortConfig?.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4 text-zinc-600 opacity-0 group-hover:opacity-100" />
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
      <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/50">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 group">
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
                        className="border-zinc-700 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                    />
                  </th>
               )}
              <SortableHeader sortKey="description" className="w-[250px]">Task Details</SortableHeader>
              <SortableHeader sortKey="client" className="w-[150px]">Client</SortableHeader>
              <th className="px-4 py-2 text-sm font-medium text-zinc-500" style={{ width: "150px" }}>Project</th>
              {canEditTasks && <SortableHeader sortKey="assignee" className="w-[180px]">Responsible</SortableHeader>}
              <SortableHeader sortKey="type" className="w-[120px]">Type</SortableHeader>
              <SortableHeader sortKey="deadline" className="w-[150px]">Due date</SortableHeader>
              <SortableHeader sortKey={activeTab === 'active' ? 'created_at' : 'status_updated_at'} className="w-[150px]">{getDynamicDateColumnHeader()}</SortableHeader>
              <th className="px-4 py-2 text-sm font-medium text-zinc-500" style={{ width: "120px" }}>Status</th>
              <th className="px-4 py-2" style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <TaskTableBody
            tasks={tasksToRender}
            allTasks={tasks}
            isAddingTask={canEditTasks && isAddingTask && activeTab === 'active'}
            onSaveTask={handleSaveTask}
            onCancelAddTask={() => { setIsAddingTask(false); setDuplicationData(null); }}
            projects={allProjects}
            clients={clients}
            profiles={profiles}
            onStatusChange={handleStatusChange}
            onPostingStatusChange={handlePostingStatusChange}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            canEdit={canEditTasks}
            onHighlight={setClickedTaskId}
            onOpenDetails={setSelectedTask}
            onReassign={setTaskToReassign}
            status={status}
            isReviewer={isReviewer}
            activeTab={activeTab}
            currentUserProfile={currentUserProfile}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={handleSelectTask}
            highlightedTaskId={highlightedTaskId}
            clickedTaskId={clickedTaskId}
            duplicationData={duplicationData}
            workTypeStatusConfig={workTypeStatusConfig}
          />
        </table>
      </div>
    )
  }

  const mainContent = () => {
    if (showBin) {
        const allBinTasksSelected = deletedTasks.length > 0 && deletedTasks.every(t => selectedTaskIds.includes(t.id));
        return (
            <div className="mb-4 overflow-x-auto">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100 mb-3">
                Deleted Tasks
                <span className="text-sm font-normal text-zinc-400 bg-zinc-800 rounded-full px-2 py-0.5 ml-2">{deletedTasks.length}</span>
                </h2>
            </div>
            {deletedTasks.length > 0 ? (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-xl">
                  <table className="w-full text-left">
                  <thead>
                      <tr className="border-b border-white/10 bg-white/5">
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
                              className="border-zinc-700 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                          />
                      </th>
                      <th className="px-4 py-2 text-sm font-medium text-zinc-500 w-[40%]">Task Details</th>
                      <th className="px-4 py-2 text-sm font-medium text-zinc-500 w-[20%]">Project</th>
                      <th className="px-4 py-2 text-sm font-medium text-zinc-500 w-[20%]">Assignee</th>
                      <th className="px-4 py-2 text-sm font-medium text-zinc-500 w-[20%]"></th>
                      </tr>
                  </thead>
                  <tbody>
                      {deletedTasks.map(task => (
                      <tr key={task.id} className="border-b border-white/5 group hover:bg-white/[0.04]">
                          <td className="px-4 py-3">
                              <Checkbox
                                  checked={selectedTaskIds.includes(task.id)}
                                  onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                                  className="border-zinc-700 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                              />
                          </td>
                          <td className="px-4 py-3 text-zinc-100">{task.description}</td>
                          <td className="px-4 py-3 text-zinc-400">{task.projects?.name || '-'}</td>
                          <td className="px-4 py-3 text-zinc-400">{task.profiles?.full_name || '-'}</td>
                          <td className="px-4 py-3 text-right">
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleRestoreTask(task)} className="text-sky-400 hover:bg-sky-500/10 hover:text-sky-300">
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setTaskToDeletePermanently(task)} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Button>
                            </div>
                          </td>
                      </tr>
                      ))}
                  </tbody>
                  </table>
                </div>
            ) : (
                <p className="text-zinc-500 mt-4 text-center py-16 bg-white/[0.01] rounded-xl border-2 border-dashed border-white/5">The bin is empty.</p>
            )}
            </div>
        );
    }
    
    const tabs = [
      { value: 'active', label: 'Active', count: activeTasks.length, content: renderTaskTable(activeTasks, 'todo', isReviewer, 'active') },
      { value: 'under-review', label: 'Under review', count: underReviewTasks.length, content: renderTaskTable(underReviewTasks, 'review', isReviewer, 'under-review') },
      { value: 'completed', label: 'Completed', count: completedTasks.length, content: renderTaskTable(completedTasks, 'done', isReviewer, 'completed') },
    ];
    return (
      <div className="w-full">
          <div className="flex items-center rounded-full bg-white/[0.03] border border-white/10 p-1 mb-6 max-w-lg">
            {tabs.map(tab => (
              <Button
                key={tab.value}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                    'rounded-full flex-1 transition-all duration-300', 
                    activeTab === tab.value 
                        ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.12)] border border-sky-500/20' 
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                )}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-2 bg-white/10 text-zinc-300 border-0">{tab.count}</Badge>
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
              className="mt-4 text-zinc-500 inline-flex p-0 h-auto hover:bg-transparent hover:text-sky-400 focus:ring-0 focus:ring-offset-0 px-0 transition-colors"
              onClick={() => { setIsAddingTask(true); setDuplicationData(null); }}
          >
              <Plus className="mr-2 h-4 w-4" /> Add task
          </Button>
        )}
      </div>
    )
  }
  
  const FilterManager = () => {
    const [filterType, setFilterType] = useState<FilterType | null>(null);
    const [filterValue, setFilterValue] = useState<FilterValue>(null);
    
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
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="Select Client" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          );
        case 'responsible':
          return (
            <Select onValueChange={onChange} value={value as string || undefined}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="Select User" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          );
        case 'type':
           const allTypes = [...new Set(tasks.map(t => t.type).filter(Boolean))];
          return (
            <Select onValueChange={onChange} value={value as string || undefined}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="Select Type" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">{allTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}</SelectContent>
            </Select>
          );
        case 'dueDate':
        case 'createdDate':
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-zinc-950 border-zinc-800 text-zinc-100 hover:bg-zinc-900">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(value as Date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800"><CalendarComponent mode="single" selected={value as Date} onSelect={(d) => onChange(d || null)} initialFocus /></PopoverContent>
            </Popover>
          );
        case 'dateRange':
          return (
             <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-zinc-950 border-zinc-800 text-zinc-100 hover:bg-zinc-900">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value && 'from' in value && (value as {from:Date, to?:Date}).to ? `${format((value as {from:Date}).from, "LLL dd, y")} - ${format((value as {from:Date, to:Date}).to, "LLL dd, y")}` : <span>Pick a date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800"><CalendarComponent mode="range" selected={value as { from: Date; to: Date }} onSelect={(range) => onChange(range || null)} /></PopoverContent>
            </Popover>
          );
        default:
          return null;
      }
    };
  
    return (
      <Popover>
        <PopoverTrigger asChild>
           <Button variant="outline" className="rounded-full bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/20"><Filter className="mr-2 h-4 w-4" />Filter</Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Filters</h4>
            <div className="flex gap-2">
              <Select onValueChange={(v: FilterType) => { setFilterType(v); setFilterValue(null); }}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="Select a filter" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="responsible">Responsible</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="createdDate">Created Date</SelectItem>
                  <SelectItem value="dateRange">Date Range</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addFilter} disabled={!filterType || !filterValue} className="bg-sky-600 hover:bg-sky-500">Add</Button>
            </div>
            {filterType && <div className="p-3 border border-zinc-800 rounded-xl bg-white/[0.02]">{renderFilterInput(filterType, filterValue, setFilterValue)}</div>}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-zinc-400 uppercase tracking-widest text-[10px]">Active Filters</h5>
              {activeFilters.length === 0 ? <p className="text-xs text-zinc-600 italic">No filters applied.</p> : (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map(f => (
                    <Badge key={f.id} variant="secondary" className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 border-zinc-700 py-1 pl-2 pr-1">
                      {f.type}: {renderFilterValue(f)}
                      <button onClick={() => removeFilter(f.id)} className="hover:bg-zinc-700 rounded-full p-0.5"><XIcon className="h-3 w-3" /></button>
                    </Badge>
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
    <div className="bg-[#0f0f0f] p-4 md:p-8 lg:p-10 h-full w-full flex flex-col text-zinc-100">
      <header className="flex items-center justify-between pb-6 mb-2 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">Tasks</h1>
          {selectedTaskIds.length > 0 ? (
            <div className="flex items-center gap-3 animate-in slide-in-from-left-2">
                <span className="text-sm text-zinc-500 font-medium">{selectedTaskIds.length} selected</span>
                {showBin ? (
                    <>
                        <Button variant="outline" size="sm" onClick={handleBulkRestore} className="rounded-full bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20">
                            <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="rounded-full bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-zinc-400">
                                        This will permanently delete {selectedTaskIds.length} task(s). This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleBulkDeletePermanently} className="bg-red-600 hover:bg-red-500 text-white">
                                        {isPending ? 'Deleting...' : 'Delete Permanently'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                ) : (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="rounded-full bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-zinc-400">
                                    This will move {selectedTaskIds.length} task(s) to the bin. This action can be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white">
                                    {isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          ) : (
            <>
              {canEditTasks && !isAddingTask && !showBin && activeTab === 'active' && (
                <Button onClick={() => { setIsAddingTask(true); setDuplicationData(null); }} className="rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add new
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
           <div
            className="flex items-center"
            onMouseLeave={() => { if (!searchQuery && searchInputRef.current !== document.activeElement) setIsSearchOpen(false) }}
          >
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '200px', opacity: 1 }}
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
                    className="h-10 bg-white/5 border-white/10 text-white focus-visible:ring-sky-500/50 rounded-full pl-4 pr-10"
                  />
                </motion.div>
              )}
            </AnimatePresence>
             <Button variant="ghost" size="icon" onClick={handleSearchClick} className={cn("rounded-full hover:bg-white/5 text-zinc-400", isSearchOpen && '-ml-10')}>
                <Search className="h-5 w-5" />
            </Button>
          </div>
          <FilterManager />
          {canEditTasks && !showBin && (
            <div className="flex items-center rounded-full bg-white/5 border border-white/10 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTaskView('all')}
                className={cn('rounded-full px-4 h-8 transition-all', taskView === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300')}
              >
                All Tasks
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTaskView('mine')}
                className={cn('rounded-full px-4 h-8 transition-all', taskView === 'mine' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300')}
              >
                My Tasks
              </Button>
            </div>
          )}
          {canEditTasks && (
            <Button variant="destructive" className={cn("rounded-full h-10 px-4 transition-all", showBin ? "bg-zinc-800 text-white border-zinc-700" : "bg-red-950/30 text-red-400 hover:bg-red-900/40 border-red-900/30")} onClick={() => setShowBin(!showBin)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {showBin ? 'Exit Bin' : 'Bin'}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto custom-scrollbar pt-4">
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
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will move the task "{taskToDelete?.description}" to the bin. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={!!taskToDeletePermanently} onOpenChange={(open) => !open && setTaskToDeletePermanently(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. This will permanently delete the task "{taskToDeletePermanently?.description}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
