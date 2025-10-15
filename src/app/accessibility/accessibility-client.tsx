
'use client';

import { useState, useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setAttachmentDeletionDelay } from '@/app/actions';
import { Loader2 } from 'lucide-react';

interface AccessibilityClientProps {
    initialDelay: number;
}

export function AccessibilityClient({ initialDelay }: AccessibilityClientProps) {
    const [delay, setDelay] = useState(initialDelay / 60); // convert seconds to minutes for display
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleSave = () => {
        startTransition(async () => {
            const delayInSeconds = delay * 60;
            const { error } = await setAttachmentDeletionDelay(delayInSeconds);
            if (error) {
                toast({
                    title: 'Error saving settings',
                    description: error,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Settings saved',
                    description: 'Your changes have been saved successfully.',
                });
            }
        });
    };

    return (
        <div className="space-y-6 max-w-md">
            <div className="space-y-2">
                <Label htmlFor="deletion-delay">
                    Attachment Deletion Delay (minutes)
                </Label>
                <p className="text-sm text-muted-foreground">
                    Set the time in minutes to wait before deleting attachments after a task is marked as &quot;Done&quot;.
                </p>
                <Input
                    id="deletion-delay"
                    type="number"
                    value={delay}
                    onChange={(e) => setDelay(Number(e.target.value))}
                    min="1"
                />
            </div>
            <Button onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
            </Button>
        </div>
    );
}
