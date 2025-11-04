
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
import { Plus, MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react'
import type { WorkType } from '@/lib/types'
import { addWorkType, renameWorkType, deleteWorkType } from '../actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function WorkTypes({ initialWorkTypes }: { initialWorkTypes: WorkType[] }) {
  const [workTypes, setWorkTypes] = useState(initialWorkTypes)
  const [isAddDialogOpen, setAddDialogOpen] = useState(false)
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentWorkType, setCurrentWorkType] = useState<WorkType | null>(null)
  const [newWorkTypeName, setNewWorkTypeName] = useState('')
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
        toast({ title: "Work type renamed" });
        setRenameDialogOpen(false);
        setNewWorkTypeName('');
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
            toast({ title: "Work type deleted" });
        }
        setDeleteDialogOpen(false);
        setCurrentWorkType(null);
    });
  }


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Work Types</CardTitle>
              <CardDescription>
                Manage the default work types for teams.
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
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workTypes.map(workType => (
                  <TableRow key={workType.id}>
                    <TableCell>{workType.name}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
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
                ))}
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
