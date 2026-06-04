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
  Globe,
  Trash2,
  X as XIcon,
  AlertCircle,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)

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

  const allAttachments = useMemo(() => {
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

  const links = useMemo(() => allAttachments.filter(a => a.type === 'link'), [allAttachments])
  const files = useMemo(() => allAttachments.filter(a => a.type === 'file' || !a.type), [allAttachments])

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
    const filesList = event.target.files;
    if (!filesList || filesList.length === 0) return;

    setIsUploading(true);
    const selectedFiles = Array.from(filesList);
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
      const updatedAttachments = [...allAttachments, ...newAttachments];
      
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

  const handleAddLink = async () => {
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

    const updatedAttachments = [...allAttachments, newLink];

    const { error, data } = await supabase
      .from('tasks')
      .update({ attachments: updatedAttachments as any })
      .eq('id', task.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Error adding link", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Link added successfully!" });
      setLinkName('');
      setLinkUrl('');
      setIsLinkPopoverOpen(false);
      onTaskUpdated({ ...task, ...data });
    }
  };

  const removeAttachment = async (attachmentToRemove: Attachment) => {
    const updatedAttachments = allAttachments.filter(a => 
      !(a.name === attachmentToRemove.name && a.publicUrl === attachmentToRemove.publicUrl)
    );

    const { error, data } = await supabase
      .from('tasks')
      .update({ attachments: updatedAttachments as any })
      .eq('id', task.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Error removing item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item removed" });
      onTaskUpdated({ ...task, ...data });
    }
  }


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-4xl p-0 flex flex-col bg-[#05050a] text-zinc-100 border-l border-white/10 shadow-2xl"
      >
        {/* HEADER */}
        <div className="p-8 border-b border-white/10 bg-white/[0.02]">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-bold leading-tight text-white">
              {task.description}
            </SheetTitle>
            <SheetDescription className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
              {task.clients?.name || 'No Client'} &nbsp;•&nbsp;
              {task.projects?.name || 'No Project'}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 text-sm">
            <div>
              <p className="text-zinc-500 text-[9px] mb-1.5 uppercase tracking-[0.2em] font-black">Responsible</p>
              {task.profiles ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 border border-white/10 shadow-lg">
                    <AvatarImage src={task.profiles.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-zinc-900 text-zinc-400 font-bold text-[10px]">{getInitials(task.profiles.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-zinc-200 text-sm tracking-tight">{task.profiles.full_name}</span>
                </div>
              ) : (
                <span className="text-zinc-700">-</span>
              )}
            </div>

            <div>
              <p className="text-zinc-500 text-[9px] mb-1.5 uppercase tracking-[0.2em] font-black">Type</p>
              {task.type ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'border-0 font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm',
                    typeColors[task.type] || 'bg-zinc-800 text-zinc-300'
                  )}
                >
                  {task.type}
                </Badge>
              ) : (
                <span className="text-zinc-700">-</span>
              )}
            </div>

            <div>
              <p className="text-zinc-500 text-[9px] mb-1.5 uppercase tracking-[0.2em] font-black">Due Date</p>
              <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm tracking-tight">
                <Calendar className="h-3.5 w-3.5 text-sky-400" />
                <span>{formatDate(task.deadline)}</span>
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-[9px] mb-1.5 uppercase tracking-[0.2em] font-black">Priority</p>
              <span className="text-zinc-400 font-bold text-sm">Medium</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-10 custom-scrollbar">
          
          {task.post_date && (
            <div className="bg-sky-950/20 border border-sky-900/30 rounded-2xl p-5 flex items-center gap-4 shadow-[0_10px_30px_rgba(14,165,233,0.1)] transition-transform hover:scale-[1.01]">
              <div className="h-11 w-11 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-inner">
                <Send className="h-5 w-5 text-sky-400" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-500/70 mb-0.5">Scheduled Post Window</h4>
                <p className="text-sky-300 font-bold text-base tracking-tight">{formatDate(task.post_date, true)}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <AlignLeft className="h-4 w-4 text-sky-400" />
              <h3 className="font-bold text-lg text-white uppercase tracking-tight">Requirement Statement</h3>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl">
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
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-orange-400" />
                      <h3 className="font-bold text-lg text-white uppercase tracking-tight">Audit Context / Late Justification</h3>
                    </div>
                     {corrections.length > 1 && (
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mr-2">
                            {currentCorrectionIndex + 1} / {corrections.length}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 text-zinc-400 rounded-full" onClick={handlePrevCorrection}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 text-zinc-400 rounded-full" onClick={handleNextCorrection}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                </div>
                <div className="bg-orange-950/20 border border-orange-900/40 rounded-[2rem] p-8 shadow-[0_15px_40px_rgba(249,115,22,0.1)] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500/50" />
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-orange-400 shrink-0 mt-1" />
                    <div className="space-y-4">
                        {/* BIG SIZE LATE REASON */}
                        <p className="text-xl md:text-2xl font-semibold text-orange-100 leading-tight italic tracking-tight">
                          "{corrections[currentCorrectionIndex].note}"
                        </p>
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">Official Log Entry</span>
                            <span className="text-[10px] text-orange-400/80 font-bold uppercase tracking-widest">
                                {format(parseISO(corrections[currentCorrectionIndex].created_at), 'd MMM yyyy, h:mm a')}
                            </span>
                        </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <Separator className="bg-white/5" />

          {/* Web Links */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-lg text-white uppercase tracking-tight">Cloud Assets</h3>
                <Badge variant="secondary" className="ml-2 bg-white/5 text-zinc-400 border border-white/5 text-[10px] h-5">
                  {links.length}
                </Badge>
              </div>
              <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest h-8 px-4">
                    <Plus className="h-3 w-3 mr-2" /> Add Link
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-5 bg-zinc-950 border-white/10 text-white rounded-[1.5rem] shadow-2xl" align="end">
                  <div className="space-y-4">
                    <h4 className="font-black uppercase tracking-widest text-[9px] text-zinc-500">Attach Cloud Resource</h4>
                    <div className="space-y-2">
                      <Label htmlFor="sheet-link-name" className="text-[9px] font-bold uppercase text-zinc-400 ml-1">Asset Label</Label>
                      <Input id="sheet-link-name" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="e.g. Figma Source" className="h-10 bg-white/5 border-white/5 text-sm rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sheet-link-url" className="text-[9px] font-bold uppercase text-zinc-400 ml-1">URL Path</Label>
                      <Input id="sheet-link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="h-10 bg-white/5 border-white/5 text-sm rounded-xl" />
                    </div>
                    <Button size="sm" onClick={handleAddLink} className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl shadow-lg">Commit Link</Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {links.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {links.map((link, i) => (
                  <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] transition-all duration-300 shadow-lg">
                    <a
                      href={link.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 border border-sky-500/10 group-hover:scale-110 transition-transform">
                        <Globe className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-sm text-zinc-100 truncate group-hover:text-sky-300 transition-colors">{link.name}</p>
                        <p className="text-[10px] text-zinc-600 truncate font-mono mt-0.5">{link.publicUrl}</p>
                      </div>
                    </a>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeAttachment(link)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 transition-all rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.01]">
                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No Cloud Assets Available</p>
              </div>
            )}
          </section>

          <Separator className="bg-white/5" />

          {/* Attachments (Files) */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-lg text-white uppercase tracking-tight">Studio Artifacts</h3>
                <Badge variant="secondary" className="ml-2 bg-white/5 text-zinc-400 border border-white/5 text-[10px] h-5">
                  {files.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-full text-[10px] font-bold uppercase tracking-widest h-8 px-4"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-2" />
                )}
                Ingest File
              </Button>
            </div>

            {files.length > 0 ? (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-5">
                {files.map((att, i) => (
                  <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 hover:border-sky-500/40 transition-all shadow-2xl shadow-black/60">
                    <a
                      href={att.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-full w-full block"
                    >
                      {att.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                        <Image
                          src={att.publicUrl}
                          alt={att.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                          <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                             <LinkIcon className="h-6 w-6 text-zinc-500" />
                          </div>
                          <p
                            className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter line-clamp-2"
                            title={att.name}
                          >
                            {att.name}
                          </p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[4px]">
                        <span className="text-white text-[9px] font-black bg-sky-600 px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-2xl">Analyze</span>
                      </div>
                    </a>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={(e) => { e.preventDefault(); removeAttachment(att); }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-2xl bg-rose-600/90 hover:bg-rose-500 scale-90 group-hover:scale-100"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center rounded-[2rem] border-2 border-dashed border-white/5 bg-white/[0.01]">
                <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">No Artifacts Ingested</p>
              </div>
            )}

            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
          </section>
        </div>

        {/* FOOTER */}
        <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-3xl flex justify-between items-center shrink-0">
          <Button variant="secondary" onClick={() => onEdit(task)} className="bg-zinc-900 text-zinc-300 border-white/10 hover:bg-zinc-800 rounded-full h-12 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Modify Statement
          </Button>

          {isDescriptionDirty && (
            <Button onClick={handleSaveDescription} disabled={isPending} className="bg-sky-600 hover:bg-sky-500 text-white rounded-full h-12 px-10 text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(14,165,233,0.3)] hover:scale-105 active:scale-95 transition-all">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Authorize Changes
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
            background: rgba(255, 255, 255, 0.08);
            border-radius: 99px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.18);
          }
        `}</style>
      </SheetContent>
    </Sheet>
  )
}
