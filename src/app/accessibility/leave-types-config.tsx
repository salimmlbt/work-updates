'use client'

import { useState, useTransition } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Loader2, CalendarClock, Pencil, Save } from 'lucide-react'
import type { LeaveTypeConfig } from '@/lib/types'
import { updateSetting } from '@/app/actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function LeaveTypesConfig({ initialConfigs }: { initialConfigs: LeaveTypeConfig[] }) {
  const [configs, setConfigs] = useState<LeaveTypeConfig[]>(initialConfigs)
  const [isAddOpen, setAddOpen] = useState(false)
  const [isEditOpen, setEditOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<LeaveTypeConfig | null>(null)
  
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const [newLabel, setNewLabel] = useState('')
  const [newLeadTime, setNewLeadTime] = useState('0')
  const [newColor, setNewColor] = useState<LeaveTypeConfig['color']>('blue')

  const handleSaveAll = async (newConfigs: LeaveTypeConfig[]) => {
    const { error } = await updateSetting('leave_types_config', newConfigs);
    if (error) {
      toast({ title: "Update failed", description: error, variant: "destructive" });
    } else {
      setConfigs(newConfigs);
      toast({ title: "Policy Updated", description: "Leave rules have been synchronized across the studio." });
    }
  }

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const newConfig: LeaveTypeConfig = {
      id: crypto.randomUUID(),
      label: newLabel.trim(),
      leadTime: parseInt(newLeadTime) || 0,
      color: newColor
    };
    const updated = [...configs, newConfig];
    startTransition(async () => {
      await handleSaveAll(updated);
      setAddOpen(false);
      resetForm();
    });
  }

  const handleEditOpen = (config: LeaveTypeConfig) => {
    setEditingConfig(config);
    setNewLabel(config.label);
    setNewLeadTime(config.leadTime.toString());
    setNewColor(config.color);
    setEditOpen(true);
  }

  const handleUpdate = () => {
    if (!newLabel.trim() || !editingConfig) return;
    const updatedConfigs = configs.map(c => 
      c.id === editingConfig.id 
        ? { ...c, label: newLabel.trim(), leadTime: parseInt(newLeadTime) || 0, color: newColor }
        : c
    );
    startTransition(async () => {
      await handleSaveAll(updatedConfigs);
      setEditOpen(false);
      resetForm();
    });
  }

  const handleDelete = (id: string) => {
    const updated = configs.filter(c => c.id !== id);
    startTransition(async () => {
      await handleSaveAll(updated);
    });
  }

  const resetForm = () => {
    setNewLabel('');
    setNewLeadTime('0');
    setNewColor('blue');
    setEditingConfig(null);
  }

  const colorOptions: LeaveTypeConfig['color'][] = ['blue', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'cyan', 'teal'];

  return (
    <>
      <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-10">
        <CardHeader className="p-0 mb-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-black text-white tracking-tight uppercase">Leave Categories</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">
                Define available leave types and enforce "Lead Time" validation rules for submissions.
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setAddOpen(true); }} className="rounded-full bg-sky-600 hover:bg-sky-500 font-bold">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-white/10 rounded-[2rem] overflow-hidden bg-black/20">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="hover:bg-transparent border-white/10">
                  <TableHead className="text-[10px] font-black uppercase text-zinc-500 pl-8">Category Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-zinc-500">Lead Time (Days)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-zinc-500">Theme</TableHead>
                  <TableHead className="w-32 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map(config => (
                  <TableRow key={config.id} className="border-white/5 hover:bg-white/[0.02] group transition-colors">
                    <TableCell className="font-bold text-white pl-8">{config.label}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sky-400 font-mono font-bold">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {config.leadTime} Days
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "uppercase tracking-widest text-[9px] font-black h-6 border-0 shadow-lg",
                        config.color === 'blue' && "bg-blue-500/10 text-blue-400",
                        config.color === 'purple' && "bg-purple-500/10 text-purple-400",
                        config.color === 'emerald' && "bg-emerald-500/10 text-emerald-400",
                        config.color === 'amber' && "bg-amber-500/10 text-amber-400",
                        config.color === 'rose' && "bg-rose-500/10 text-rose-400",
                        config.color === 'indigo' && "bg-indigo-500/10 text-indigo-400",
                        config.color === 'cyan' && "bg-cyan-500/10 text-cyan-400",
                        config.color === 'teal' && "bg-teal-500/10 text-teal-400",
                      )}>
                        {config.color}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-sky-400 hover:bg-sky-500/10" onClick={() => handleEditOpen(config)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => handleDelete(config.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {configs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-zinc-600 italic text-sm">No leave categories defined. The system will use fallbacks.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-[3rem] bg-zinc-950 border-white/10 p-10">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Create Leave Schema</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Category Label</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Casual Leave" className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white" />
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Lead Time (Minimum Notice)</Label>
                  <Input type="number" min="0" value={newLeadTime} onChange={e => setNewLeadTime(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-black text-sky-400" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Visual Theme</Label>
                    <Select onValueChange={(val: any) => setNewColor(val)} value={newColor}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            {colorOptions.map(c => (
                                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
          <DialogFooter className="mt-10 gap-3">
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="rounded-xl h-12 px-8 text-zinc-400 hover:text-white font-bold">Discard</Button>
            <Button onClick={handleAdd} disabled={isPending || !newLabel.trim()} className="rounded-xl h-12 px-10 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-[10px]">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Commit Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[3rem] bg-zinc-950 border-white/10 p-10">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Edit Leave Schema</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Category Label</Label>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Casual Leave" className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white" />
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Lead Time (Minimum Notice)</Label>
                  <Input type="number" min="0" value={newLeadTime} onChange={e => setNewLeadTime(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl font-black text-sky-400" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Visual Theme</Label>
                    <Select onValueChange={(val: any) => setNewColor(val)} value={newColor}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                            {colorOptions.map(c => (
                                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
          <DialogFooter className="mt-10 gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl h-12 px-8 text-zinc-400 hover:text-white font-bold">Cancel</Button>
            <Button onClick={handleUpdate} disabled={isPending || !newLabel.trim()} className="rounded-xl h-12 px-10 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-[10px]">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
