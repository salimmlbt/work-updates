
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
  Calendar,
  User,
  Paperclip,
  Clock,
  CheckSquare,
  Pencil,
  AlignLeft,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TaskWithDetails, Attachment } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { LinkIcon } from '@/components/icons'

interface TaskDetailSheetProps {
  task: TaskWithDetails
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onEdit: (task: TaskWithDetails) => void
}

const typeColors: { [key: string]: string } = {
  "Poster": "bg-pink-100 text-pink-800",
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


export function TaskDetailSheet({ task, isOpen, onOpenChange, onEdit }: TaskDetailSheetProps) {

  const formatDate = (date: string | null) => {
    if (!date) return 'No due date';
    const d = parseISO(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, "d MMM yyyy");
  };

  let attachments: Attachment[] = [];
    if (task.attachments) {
        try {
            // attachments might be a JSON string, so we try to parse it.
            const parsed = typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments;
            if (Array.isArray(parsed)) {
                attachments = parsed;
            }
        } catch (e) {
            console.error("Failed to parse attachments:", e);
        }
    }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[800px] sm:w-[800px] p-0 flex flex-col"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <SheetHeader className="text-left">
                <SheetTitle className="text-3xl font-bold">{task.description}</SheetTitle>
                <SheetDescription>
                    {task.clients?.name || 'No Client'} / {task.projects?.name || 'No Project'}
                </SheetDescription>
            </SheetHeader>
        
            <div className="space-y-4 text-sm">
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-muted-foreground">Responsible</span>
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
                 <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-muted-foreground">Type</span>
                    {task.type ? <Badge variant="outline" className={cn(`border-0 font-medium w-fit`, typeColors[task.type] || 'bg-gray-100 text-gray-800')}>{task.type}</Badge> : <span>-</span>}
                </div>
                 <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-muted-foreground">Due Date</span>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(task.deadline)}</span>
                    </div>
                </div>
                 <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-muted-foreground">Priority</span>
                    <span>None</span>
                </div>
                 <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <div></div>
                    <Button variant="outline" size="sm" className="w-fit">
                        <Paperclip className="mr-2 h-4 w-4" /> Attach file
                    </Button>
                </div>
            </div>

            <Separator />
            
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <AlignLeft className="h-5 w-5 text-muted-foreground"/>
                    <h3 className="font-semibold text-lg">Description</h3>
                </div>
                {/* Placeholder for rich text editor */}
                <div className="p-4 border rounded-md min-h-[150px] text-muted-foreground text-sm">
                   No description provided.
                </div>
            </div>
            
             <div>
                <div className="flex items-center gap-2 mb-4">
                    <LinkIcon className="h-5 w-5 text-muted-foreground" fill="currentColor"/>
                    <h3 className="font-semibold text-lg">Files</h3>
                    <Badge variant="secondary">{attachments.length}</Badge>
                </div>
                {attachments && attachments.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                        {attachments.map((att, index) => (
                             <a key={index} href={att.publicUrl} target="_blank" rel="noopener noreferrer">
                                {att.name.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                                    <img src={att.publicUrl} alt={att.name} className="rounded-md object-cover h-32 w-full" />
                                ) : (
                                    <div className="border rounded-md h-32 flex flex-col items-center justify-center p-2">
                                        <Paperclip className="h-8 w-8 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground text-center truncate w-full mt-2" title={att.name}>{att.name}</span>
                                    </div>
                                )}
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">No files attached.</div>
                )}
                 <Button variant="ghost" className="mt-2 p-0 h-auto text-primary hover:text-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Attach file
                 </Button>
            </div>

        </div>
        <div className="p-4 border-t bg-background mt-auto">
            <Button onClick={() => onEdit(task)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Task
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
