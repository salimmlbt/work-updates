
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createProjectType } from '@/app/actions'
import type { ProjectType } from '@/lib/types'

interface CreateTypeDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  onTypeCreated: (newType: ProjectType) => void;
}

export function CreateTypeDialog({ isOpen, setIsOpen, onTypeCreated }: CreateTypeDialogProps) {
  const [typeName, setTypeName] = useState('')
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setTypeName('');
    setIsOpen(false);
  }

  const handleCreateType = () => {
    startTransition(async () => {
      const { data, error } = await createProjectType(typeName);
      if (error) {
        toast({ title: "Error creating type", description: error, variant: "destructive" });
      } else if (data) {
        toast({ title: "Project type created", description: `Type "${data.name}" has been created.` });
        onTypeCreated(data as ProjectType)
        handleClose();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create project type</DialogTitle>
          <DialogDescription>Enter a name for the new project type.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <Label htmlFor="type-name" className="sr-only">Type Name</Label>
            <Input 
                id="type-name"
                placeholder="Type name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
            />
        </div>
        <DialogFooter className="justify-end sm:justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleCreateType}
            disabled={!typeName.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
