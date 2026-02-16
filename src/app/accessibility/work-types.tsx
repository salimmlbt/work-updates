
'use client'

import { useState, useTransition, useMemo } from 'react'
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus, MoreVertical, Pencil, Trash2, Loader2, Settings2 } from 'lucide-react'
import type { WorkType, WorkTypeStatusConfig } from '@/lib/types'
import { addWorkType, renameWorkType, deleteWorkType, updateSetting } from '../actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

const ALL_STATUS_OPTIONS = [
  { id: 'planned', label: 'Planned' },
  { id: 'todo', label: 'New task (To do)' },
  { id: 'inprogress', label: 'In progress' },
  { id: 'review', label: 'Review' },
  { id: 'corrections', label: 'Corrections' },
  { id: 'recreate', label: 'Recreate' },
  { id: 'approved', label: 'Approved' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'posted', label: 'Posted' },
  { id: 'done', label: 'Completed' },
];

export default function WorkTypes({ initialWorkTypes, initialStatusConfig }: { initialWorkTypes: WorkType[], initialStatusConfig: WorkTypeStatusConfig }) {
  const [workTypes, setWorkTypes] = useState(initialWorkTypes)
  const [statusConfig, setStatusConfig] = useState<WorkTypeStatusConfig>(initialStatusConfig)
  const [isAddDialogOpen, setAddDialogOpen] = useState(false)
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false)
  const [isStatusDialogOpen, setStatusDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentWorkType, setCurrentWorkType] = useState<WorkType | null>(null)
  const [newWorkTypeName, setNewWorkTypeName] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleAdd = () => {
    if (!newWorkTypeName.trim()) return;
    startTransition(async () => {
      const { data, error } = await addWorkType(newWorkTypeName.trim());
      if (error) {
        toast({ title: "Error adding work type", description: error, variant: "destructive" });
      } else if (data) {
        setWorkTypes(prev => [...prev, data]);
        toast({ title: "Work type added" });
        setAddDialogOpen(false);
        setNewWorkTypeName('');
      }
    });
  }

  const handleRename = () => {
    if (!newWorkTypeName.trim() || !currentWorkType) return;
    startTransition(async () => {
      const { data, error } = await renameWorkType(currentWorkType.id, newWorkTypeName.trim());
      if (error) {
        toast({ title: "Error renaming work type", description: error, variant: "destructive" });
      } else if (data) {
        setWorkTypes(prev => prev.map(wt => wt.id === data.id ? data : wt));
        
        // Update config key if name changed
        const newConfig = { ...statusConfig };
        if (currentWorkType.name !== data.name) {
            newConfig[data.name] = newConfig[currentWorkType.name] || [];
            delete newConfig[currentWorkType.name];
            await updateSetting('work_type_status_config', newConfig);
            setStatusConfig(newConfig);
        }

        toast({ title: "Work type renamed" });
        setRenameDialogOpen(false);
        setNewWorkTypeName('');
        setCurrentWorkType(null);
      }
    });
  }
  
  const handleSaveStatuses = () => {
    if (!currentWorkType) return;
    startTransition(async () => {
        const newConfig = {
            ...statusConfig,
            [currentWorkType.name]: selectedStatuses
        };
        const result = await updateSetting('work_type_status_config', newConfig);
        if (result.error) {
            toast({ title: "Error saving configuration", description: result.error, variant: "destructive" });
        } else {
            setStatusConfig(newConfig);
            toast({ title: "Status configuration saved" });
            setStatusDialogOpen(false);
            setCurrentWorkType(null);
        }
    });
  }

  const handleDelete = () => {
    if (!currentWorkType) return;
    startTransition(async () => {
        const { error } = await deleteWorkType(currentWorkType.id);
        if (error) {
            toast({ title: "Error deleting work type", description: error, variant: "destructive" });
        } else {
            setWorkTypes(prev => prev.filter(wt => wt.id !== currentWorkType.id));
            
            const newConfig = { ...statusConfig };
            delete newConfig[currentWorkType.name];
            await updateSetting('work_type_status_config', newConfig);
            setStatusConfig(newConfig);

            toast({ title: "Work type deleted" });
        }
        setDeleteDialogOpen(false);
        setCurrentWorkType(null);
    });
  }

  const toggleStatus = (statusId: string) => {
    setSelectedStatuses(prev => 
        prev.includes(statusId) 
            ? prev.filter(id => id !== statusId) 
            : [...prev, statusId]
    );
  }


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Work Types</CardTitle>
              <CardDescription>
                Manage the default work types and their allowed task statuses.
              </CardDescription>
            </div>
            <Button onClick={() => { setNewWorkTypeName(''); setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Work Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Type Name</TableHead>
                  <TableHead>Enabled Statuses</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workTypes.map(workType => {
                  const enabled = statusConfig[workType.name] || [];
                  return (
                    <TableRow key={workType.id}>
                      <TableCell className="font-medium">{workType.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {enabled.length > 0 ? (
                                enabled.map(id => {
                                    const label = ALL_STATUS_OPTIONS.find(opt => opt.id === id)?.label;
                                    return <Badge key={id} variant="secondary" className="text-[10px]">{label}</Badge>
                                })
                            ) : (
                                <span className="text-xs text-muted-foreground italic">None configured</span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => {setCurrentWorkType(workType); setSelectedStatuses(statusConfig[workType.name] || []); setStatusDialogOpen(true);}}>
                                      <Settings2 className="mr-2 h-4 w-4" /> Configure Statuses
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {setCurrentWorkType(workType); setNewWorkTypeName(workType.name); setRenameDialogOpen(true);}}>
                                      <Pencil className="mr-2 h-4 w-4" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => {setCurrentWorkType(workType); setDeleteDialogOpen(true)}}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Work Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="work-type-name">Work Type Name</Label>
              <Input id="work-type-name" value={newWorkTypeName} onChange={e => setNewWorkTypeName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending || !newWorkTypeName.trim()}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Work Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-work-type-name">Work Type Name</Label>
              <Input id="rename-work-type-name" value={newWorkTypeName} onChange={e => setNewWorkTypeName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={isPending || !newWorkTypeName.trim()}>
                 {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Statuses Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Statuses</DialogTitle>
            <CardDescription>Select which statuses apply to "{currentWorkType?.name}".</CardDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4 py-4">
                {ALL_STATUS_OPTIONS.map(status => (
                    <div key={status.id} className="flex items-center space-x-3 space-y-0">
                        <Checkbox 
                            id={`status-${status.id}`} 
                            checked={selectedStatuses.includes(status.id)}
                            onCheckedChange={() => toggleStatus(status.id)}
                        />
                        <Label 
                            htmlFor={`status-${status.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                        >
                            {status.label}
                        </Label>
                    </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStatuses} disabled={isPending}>
                 {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the work type "{currentWorkType?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCurrentWorkType(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                    {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
