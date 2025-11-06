
'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Calendar,
  Pencil,
  AlignLeft,
  Plus,
  Save,
  Loader2,
  Link as LinkIcon,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TaskWithDetails, Attachment, Profile } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/rich-text-editor/rich-text-editor'
import { useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

const typeColors: Record<string, string> = {
  Poster: 'bg-pink-100 text-pink-800',
  Video: 'bg-orange-100 text-orange-800',
  Story: 'bg-purple-100 text-purple-800',
  'Motion Graphics': 'bg-pink-100 text-pink-800',
  Animation: 'bg-indigo-100 text-indigo-800',
  Grid: 'bg-green-100 text-green-800',
  Posting: 'bg-yellow-100 text-yellow-800',
  'Account Creation': 'bg-red-100 text-red-800',
  Flyer: 'bg-teal-100 text-teal-800',
  Profile: 'bg-cyan-100 text-cyan-800',
  Menu: 'bg-lime-100 text-lime-800',
  'FB Cover': 'bg-sky-100 text-sky-800',
  'Whatsapp Cover': 'bg-emerald-100 text-emerald-800',
  'Profile Picture': 'bg-fuchsia-100 text-fuchsia-800',
  'Highlite Cover': 'bg-rose-100 text-rose-800',
  'Ad Post': 'bg-amber-100 text-amber-800',
  Shooting: 'bg-violet-100 text-violet-800',
  Meeting: 'bg-gray-100 text-gray-800',
  Connect: 'bg-slate-100 text-slate-800',
  Followup: 'bg-stone-100 text-stone-800',
}

interface TaskDetailSheetProps {
  task: TaskWithDetails
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onEdit: (task: TaskWithDetails) => void
  onTaskUpdated: (task: TaskWithDetails) => void
  userProfile: Profile | null
}

export function TaskDetailSheet({
  task,
  isOpen,
  onOpenChange,
  onEdit,
  onTaskUpdated,
  userProfile,
}: TaskDetailSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [descriptionContent, setDescriptionContent] = useState(task.rich_description)
  const [isDescriptionDirty, setIsDescriptionDirty] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const [currentCorrectionIndex, setCurrentCorrectionIndex] = useState(0)

  const corrections = useMemo(() => {
    if (!task.corrections || !Array.isArray(task.corrections)) return []
    return task.corrections
  }, [task.corrections])

  const formatDate = (date: string | null) => {
    if (!date) return 'No due date'
    const d = parseISO(date)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    if (isYesterday(d)) return 'Yesterday'
    return format(d, 'd MMM yyyy')
  }

  const attachments = useMemo(() => {
    if (!task.attachments) return []
    try {
      if (typeof task.attachments === 'string') {
        return JSON.parse(task.attachments) as Attachment[]
      }
      if (Array.isArray(task.attachments)) {
        return task.attachments
      }
    } catch (e) {
      console.error('Failed to parse attachments:', e)
    }
    return []
  }, [task.attachments])

  const handleDescriptionUpdate = (newContent: any) => {
    setDescriptionContent(newContent)
    if (!isDescriptionDirty) setIsDescriptionDirty(true)
  }

  const handleSaveDescription = () => {
    startTransition(async () => {
      const { error, data } = await supabase
        .from('tasks')
        .update({ rich_description: descriptionContent })
        .eq('id', task.id)
        .select()
        .single()

      if (error) {
        toast({
          title: 'Error saving description',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Description saved successfully!' })
        setIsDescriptionDirty(false)
        onTaskUpdated({ ...task, ...data })
      }
    })
  }
  
  const handlePrevCorrection = () => {
    setCurrentCorrectionIndex(prev => (prev > 0 ? prev - 1 : corrections.length - 1));
  };
  
  const handleNextCorrection = () => {
    setCurrentCorrectionIndex(prev => (prev < corrections.length - 1 ? prev + 1 : 0));
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-4xl p-0 flex flex-col bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800"
      >
        {/* HEADER */}
        <div className="p-8 border-b bg-gray-50/50 dark:bg-neutral-900/40">
          <SheetHeader className="text-left">
            <SheetTitle className="text-3xl font-bold leading-tight">
              {task.description}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {task.clients?.name || 'No Client'} &nbsp;•&nbsp;
              {task.projects?.name || 'No Project'}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Responsible</p>
              {task.profiles ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={task.profiles.avatar_url ?? undefined} />
                    <AvatarFallback>{getInitials(task.profiles.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{task.profiles.full_name}</span>
                </div>
              ) : (
                <span>-</span>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Type</p>
              {task.type ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'border-0 font-medium text-xs px-2 py-0.5 rounded-md',
                    typeColors[task.type] || 'bg-gray-100 text-gray-800'
                  )}
                >
                  {task.type}
                </Badge>
              ) : (
                <span>-</span>
              )}
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(task.deadline)}</span>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-xs mb-1">Priority</p>
              <span className="text-muted-foreground">None</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
          {/* Description */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlignLeft className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-xl">Description</h3>
            </div>
            <RichTextEditor
              initialContent={task.rich_description}
              userProfile={userProfile}
              onUpdate={handleDescriptionUpdate}
              isDirty={isDescriptionDirty}
            />
          </section>

          {corrections.length > 0 && (
            <>
              <Separator />
              <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-xl">Corrections</h3>
                    </div>
                     {corrections.length > 1 && (
                      <div className="flex items-center gap-2">
                         <span className="text-sm text-muted-foreground">
                            {currentCorrectionIndex + 1} of {corrections.length}
                        </span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevCorrection}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextCorrection}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-4">
                  <p className="text-sm text-orange-900 dark:text-orange-200">{corrections[currentCorrectionIndex].note}</p>
                   <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                      {format(parseISO(corrections[currentCorrectionIndex].created_at), 'd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Attachments */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <LinkIcon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-xl">Attachments</h3>
              <Badge variant="secondary" className="ml-1">
                {attachments.length}
              </Badge>
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-6">
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-800 hover:shadow-lg transition-all"
                  >
                    {att.name.match(/\.(jpeg|jpg|gif|png)$/) ? (
                      <img
                        src={att.publicUrl}
                        alt={att.name}
                        className="object-cover h-40 w-full"
                      />
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-3">
                        <p
                          className="text-xs text-muted-foreground text-center truncate w-full mt-2"
                          title={att.name}
                        >
                          {att.name}
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No files attached.</p>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-primary hover:text-primary hover:bg-primary/5"
            >
              <Plus className="mr-2 h-4 w-4" />
              Attach file
            </Button>
          </section>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t bg-gray-50/50 dark:bg-neutral-900/50 flex justify-between items-center">
          <Button variant="secondary" onClick={() => onEdit(task)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Task
          </Button>

          {isDescriptionDirty && (
            <Button onClick={handleSaveDescription} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Description
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
