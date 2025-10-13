
'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ProjectType } from '@/lib/types'
import { renameProjectType } from '@/app/actions'

interface RenameTypeDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  projectType: ProjectType
  onTypeRenamed: (updatedType: ProjectType, oldName: string) => void;
}

export function RenameTypeDialog({ isOpen, setIsOpen, projectType, onTypeRenamed }: RenameTypeDialogProps) {
  const [typeName, setTypeName] = useState(projectType.name)
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
        setTypeName(projectType.name);
    }
  }, [isOpen, projectType]);

  const handleClose = () => {
    setIsOpen(false);
  }

  const handleRename = () => {
    if (!typeName.trim() || typeName.trim() === projectType.name) {
        handleClose();
        return;
    }
    startTransition(async () => {
      const oldName = projectType.name;
      const { data, error } = await renameProjectType(projectType.id, oldName, typeName.trim());
      if (error) {
        toast({ title: "Error renaming type", description: error, variant: "destructive" });
      } else if (data) {
        toast({ title: "Project type renamed", description: `Type has been renamed to "${data.name}".` });
        onTypeRenamed(data as ProjectType, oldName);
        handleClose();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Rename project type</DialogTitle>
          <DialogDescription>Enter a new name for the project type.</DialogDescription>
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
            onClick={handleRename}
            disabled={!typeName.trim() || typeName.trim() === projectType.name || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
