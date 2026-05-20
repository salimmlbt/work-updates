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
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TaskWithDetails, Attachment, Profile } from '@/lib/types'
import { cn, getInitials } from '@/lib/utils'
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { RichTextEditor } from '@/components/rich-text-editor/rich-text-editor'
import { useMemo, useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { uploadAttachment } from '@/app/actions'

const typeColors: Record<string, string> = {
  Poster: 'bg-sky-900/30 text-sky-300 border-sky-800/50',
  Video: 'bg-orange-900/30 text-orange-300 border-orange-800/50',
  Story: 'bg-purple-900/30 text-purple-300 border-purple-800/50',
  'Motion Graphics': 'bg-pink-900/30 text-pink-300 border-pink-800/50',
  Animation: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/50',
  Grid: 'bg-green-900/30 text-green-300 border-green-800/50',
  Posting: 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50',
  'Account Creation': 'bg-red-900/30 text-red-300 border-red-800/50',
  Flyer: 'bg-teal-900/30 text-teal-300 border-teal-800/50',
  Profile: 'bg-cyan-900/30 text-cyan-300 border-cyan-800/50',
  Menu: 'bg-lime-900/30 text-lime-300 border-lime-800/50',
  'FB Cover': 'bg-sky-900/30 text-sky-300 border-sky-800/50',
  'Whatsapp Cover': 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50',
  'Profile Picture': 'bg-fuchsia-900/30 text-fuchsia-300 border-fuchsia-800/50',
  'Highlite Cover': 'bg-rose-900/30 text-rose-300 border-rose-800/50',
  'Ad Post': 'bg-amber-900/30 text-amber-300 border-amber-800/50',
  Shooting: 'bg-violet-900/30 text-violet-300 border-violet-800/50',
  Meeting: 'bg-zinc-800/30 text-zinc-300 border-zinc-700/50',
  Connect: 'bg-slate-800/30 text-slate-300 border-slate-700/50',
  Followup: 'bg-stone-800/30 text-stone-300 border-stone-700/50',
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
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()
  const { toast } = useToast()
  const [currentCorrectionIndex, setCurrentCorrectionIndex] = useState(0)

  const corrections = useMemo(() => {
    if (!task.corrections || !Array.isArray(task.corrections)) return []
    return task.corrections
  }, [task.corrections])

  const formatDate = (date: string | null, includeTime = false) => {
    if (!date) return 'No date'
    const d = parseISO(date)
    const dateFormat = includeTime ? 'd MMM yyyy, h:mm a' : 'd MMM yyyy';
    if (isToday(d) && !includeTime) return 'Today'
    if (isTomorrow(d) && !includeTime) return 'Tomorrow'
    if (isYesterday(d) && !includeTime) return 'Yesterday'
    return format(d, dateFormat)
  }

  const attachments = useMemo(() => {
    if (!task.attachments) return []
    try {
      if (Array.isArray(task.attachments)) {
        return task.attachments as Attachment[]
      }
      if (typeof task.attachments === 'string' && (task.attachments as string).trim() !== '') {
        return JSON.parse(task.attachments) as Attachment[]
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
        newAttachments.push(data);
      }
    }

    if (newAttachments.length > 0) {
      const updatedAttachments = [...attachments, ...newAttachments];
      
      const { error: dbError, data: updatedTask } = await supabase
        .from('tasks')
        .update({ attachments: updatedAttachments as any })
        .eq('id', task.id)
        .select()
        .single();

      if (dbError) {
        toast({ title: "Database error", description: dbError.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Files attached", 
          description: `${newAttachments.length} file(s) have been attached.` 
        });
        onTaskUpdated({ ...task, ...updatedTask });
      }
    }
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-4xl p-0 flex flex-col bg-[#0f0f0f] text-zinc-100 border-l border-white/10 shadow-2xl"
      >
        {/* HEADER */}
        <div className="p-8 border-b border-white/10 bg-white/[0.02]">
          <SheetHeader className="text-left">
            <SheetTitle className="text-3xl font-bold leading-tight text-white">
              {task.description}
            </SheetTitle>
            <SheetDescription className="text-sm text-zinc-500">
              {task.clients?.name || 'No Client'} &nbsp;•&nbsp;
              {task.projects?.name || 'No Project'}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 text-sm">
            <div>
              <p className="text-zinc-500 text-xs mb-1 uppercase tracking-widest font-bold">Responsible</p>
              {task.profiles ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 border border-white/10">
                    <AvatarImage src={task.profiles.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400">{getInitials(task.profiles.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-zinc-200">{task.profiles.full_name}</span>
                </div>
              ) : (
                <span className="text-zinc-600">-</span>
              )}
            </div>

            <div>
              <p className="text-zinc-500 text-xs mb-1 uppercase tracking-widest font-bold">Type</p>
              {task.type ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'border-0 font-medium text-xs px-2 py-0.5 rounded-md shadow-sm',
                    typeColors[task.type] || 'bg-zinc-800 text-zinc-300'
                  )}
                >
                  {task.type}
                </Badge>
              ) : (
                <span className="text-zinc-600">-</span>
              )}
            </div>

            <div>
              <p className="text-zinc-500 text-xs mb-1 uppercase tracking-widest font-bold">Due Date</p>
              <div className="flex items-center gap-2 text-zinc-200">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span>{formatDate(task.deadline)}</span>
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-xs mb-1 uppercase tracking-widest font-bold">Priority</p>
              <span className="text-zinc-400 font-medium">Medium</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-10 custom-scrollbar">
          
          {task.post_date && (
            <div className="bg-sky-950/20 border border-sky-900/30 rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <div className="h-10 w-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sky-300">Scheduled Post Time</h4>
                <p className="text-sky-400/80 text-sm">{formatDate(task.post_date, true)}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlignLeft className="h-5 w-5 text-sky-400" />
              <h3 className="font-bold text-xl text-white">Description</h3>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
                <RichTextEditor
                initialContent={task.rich_description}
                userProfile={userProfile}
                onUpdate={handleDescriptionUpdate}
                isDirty={isDescriptionDirty}
                />
            </div>
          </section>

          {corrections.length > 0 && (
            <>
              <Separator className="bg-white/5" />
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-400" />
                      <h3 className="font-bold text-xl text-white">Corrections</h3>
                    </div>
                     {corrections.length > 1 && (
                      <div className="flex items-center gap-2">
                         <span className="text-xs text-zinc-500 font-medium mr-2">
                            {currentCorrectionIndex + 1} / {corrections.length}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 text-zinc-400" onClick={handlePrevCorrection}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 text-zinc-400" onClick={handleNextCorrection}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                </div>
                <div className="bg-orange-950/20 border border-orange-900/40 rounded-xl p-5 shadow-sm">
                  <p className="text-sm text-orange-200 leading-relaxed italic">"{corrections[currentCorrectionIndex].note}"</p>
                   <p className="text-xs text-orange-500/70 mt-3 font-medium">
                      {format(parseISO(corrections[currentCorrectionIndex].created_at), 'd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </section>
            </>
          )}

          <Separator className="bg-white/5" />

          {/* Attachments */}
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-sky-400" />
              <h3 className="font-bold text-xl text-white">Attachments</h3>
              <Badge variant="secondary" className="ml-2 bg-white/10 text-zinc-300 border-0">
                {attachments.length}
              </Badge>
            </div>

            {attachments.length > 0 ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-900 hover:border-sky-500/50 transition-all shadow-lg shadow-black/20"
                  >
                    {att.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <Image
                        src={att.publicUrl}
                        alt={att.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                        <LinkIcon className="h-6 w-6 text-zinc-600 mb-2" />
                        <p
                          className="text-[10px] text-zinc-400 line-clamp-2"
                          title={att.name}
                        >
                          {att.name}
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white text-[10px] font-bold bg-sky-600/80 px-2 py-1 rounded-full uppercase tracking-wider shadow-lg">View File</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center rounded-xl border-2 border-dashed border-white/5 bg-white/[0.01]">
                <p className="text-sm text-zinc-600">No files attached to this task.</p>
              </div>
            )}

            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-full h-9 px-4 transition-all"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Attach new file
            </Button>
          </section>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
          <Button variant="secondary" onClick={() => onEdit(task)} className="bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700 rounded-full h-11 px-6">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Task Details
          </Button>

          {isDescriptionDirty && (
            <Button onClick={handleSaveDescription} disabled={isPending} className="bg-sky-600 hover:bg-sky-500 text-white rounded-full h-11 px-6 shadow-lg shadow-sky-900/20">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          )}
        </div>

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
      </SheetContent>
    </Sheet>
  )
}
