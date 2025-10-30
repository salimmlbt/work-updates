
'use client'

import { X, Edit, Trash2 } from 'lucide-react';
import { type CalendarEvent } from './calendar-client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface EventPopoverProps {
  event: CalendarEvent;
  position: { top: number; left: number };
  onClose: () => void;
  onDelete: (eventId: string | number) => void;
  onEdit: (event: CalendarEvent) => void;
  isPending: boolean;
}

export function EventPopover({ event, position, onClose, onDelete, onEdit, isPending }: EventPopoverProps) {
  const isPersonalOrOfficial = event.type === 'personal' || event.type === 'official';
  const isDeletable = isPersonalOrOfficial || event.type === 'weekend';

  return (
    <div
      className="absolute z-30 w-80 rounded-lg border bg-background p-4 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{event.name}</h3>
          <p className="text-sm text-muted-foreground">{event.description}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Add attendees and notes if available in your event data */}
      
      {isDeletable && (
        <div className="mt-4 flex justify-end gap-2">
            {isPersonalOrOfficial && (
              <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
              </Button>
            )}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the event "{event.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(event.id)} className={cn(buttonVariants({ variant: "destructive" }))} disabled={isPending}>
                            {isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      )}
    </div>
  );
}
