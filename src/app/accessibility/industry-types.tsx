
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
  DialogDescription,
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
import type { Industry } from '@/lib/types'
import { addIndustry, renameIndustry, deleteIndustry } from '../actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function IndustryTypes({ initialIndustries }: { initialIndustries: Industry[] }) {
  const [industries, setIndustries] = useState(initialIndustries)
  const [isAddDialogOpen, setAddDialogOpen] = useState(false)
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentIndustry, setCurrentIndustry] = useState<Industry | null>(null)
  const [newIndustryName, setNewIndustryName] = useState('')
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleAdd = () => {
    if (!newIndustryName.trim()) return;
    startTransition(async () => {
      const { data, error } = await addIndustry(newIndustryName.trim());
      if (error) {
        toast({ title: "Error adding industry", description: error, variant: "destructive" });
      } else if (data) {
        setIndustries(prev => [...prev, data]);
        toast({ title: "Industry added" });
        setAddDialogOpen(false);
        setNewIndustryName('');
      }
    });
  }

  const handleRename = () => {
    if (!newIndustryName.trim() || !currentIndustry) return;
    startTransition(async () => {
      const { data, error } = await renameIndustry(currentIndustry.id, newIndustryName.trim());
      if (error) {
        toast({ title: "Error renaming industry", description: error, variant: "destructive" });
      } else if (data) {
        setIndustries(prev => prev.map(ind => ind.id === data.id ? data : ind));
        toast({ title: "Industry renamed" });
        setRenameDialogOpen(false);
        setNewIndustryName('');
        setCurrentIndustry(null);
      }
    });
  }
  
  const handleDelete = () => {
    if (!currentIndustry) return;
    startTransition(async () => {
        const { error } = await deleteIndustry(currentIndustry.id);
        if (error) {
            toast({ title: "Error deleting industry", description: error, variant: "destructive" });
        } else {
            setIndustries(prev => prev.filter(ind => ind.id !== currentIndustry.id));
            toast({ title: "Industry deleted" });
        }
        setDeleteDialogOpen(false);
        setCurrentIndustry(null);
    });
  }


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Industry Types</CardTitle>
              <CardDescription>
                Manage the types of industries for clients.
              </CardDescription>
            </div>
            <Button onClick={() => { setNewIndustryName(''); setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Industry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Industry Name</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {industries.map(industry => (
                  <TableRow key={industry.id}>
                    <TableCell>{industry.name}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {setCurrentIndustry(industry); setNewIndustryName(industry.name); setRenameDialogOpen(true);}}>
                                    <Pencil className="mr-2 h-4 w-4" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => {setCurrentIndustry(industry); setDeleteDialogOpen(true)}}>
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
            <DialogTitle>Add Industry Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="industry-name">Industry Name</Label>
              <Input id="industry-name" value={newIndustryName} onChange={e => setNewIndustryName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending || !newIndustryName.trim()}>
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
            <DialogTitle>Rename Industry Type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-industry-name">Industry Name</Label>
              <Input id="rename-industry-name" value={newIndustryName} onChange={e => setNewIndustryName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRename} disabled={isPending || !newIndustryName.trim()}>
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
                    This will permanently delete the industry "{currentIndustry?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCurrentIndustry(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                    {isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
