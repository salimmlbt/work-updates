
'use client'

import { useTransition } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { deleteHoliday } from '@/app/actions'
import type { OfficialHoliday } from '@/lib/types'

interface DeleteEventDialogProps {
  event: (OfficialHoliday & { type?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onEventDeleted: (eventId: number) => void;
}

export function DeleteEventDialog({ event, isOpen, onClose, onEventDeleted }: DeleteEventDialogProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleDelete = () => {
    if (!event) return;

    startTransition(async () => {
      const { error } = await deleteHoliday(event.id);
      if (error) {
        toast({ title: 'Error deleting event', description: error, variant: 'destructive' });
      } else {
        toast({ title: 'Event deleted' });
        onEventDeleted(event.id);
      }
      onClose();
    });
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the event "{event?.name}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
