
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BellIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Notification } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

export function NotificationPopover({ isCollapsed, notifications }: { isCollapsed: boolean, notifications: Notification[] }) {
    const router = useRouter();

    const handleNotificationClick = (id: string) => {
        const taskId = id.split('-').pop();
        if (taskId) {
            router.push(`/tasks?taskId=${taskId}`);
        }
    }

    const triggerButton = (
        <div
          role="button"
          className={cn(
            'flex items-center gap-4 rounded-lg px-4 py-2 transition-all duration-300 w-full',
            'hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent'
          )}
        >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center relative">
              <BellIcon className="h-5 w-5 text-sidebar-icon-muted" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </span>
            <span
              className={cn(
                'text-sidebar-foreground truncate overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-in-out',
                isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
              )}
            >
              Notifications
            </span>
        </div>
    );

  return (
    <Popover>
        {isCollapsed ? (
             <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      {triggerButton}
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Notifications</TooltipContent>
            </Tooltip>
        ) : (
            <PopoverTrigger asChild>
              {triggerButton}
            </PopoverTrigger>
        )}
      <PopoverContent className="w-80 mr-4 p-0" align="end">
        <div className="grid">
          <div className="space-y-1 p-4">
            <h4 className="font-medium leading-none">Notifications</h4>
            <p className="text-sm text-muted-foreground">
              You have {notifications.length} unread notifications.
            </p>
          </div>
          <ScrollArea className="h-80">
            <div className="grid gap-1 p-2">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  onClick={() => handleNotificationClick(notification.id)}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent cursor-pointer"
                >
                  <div className="mt-1">
                      <BellIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="grid gap-1">
                    <p className="text-sm font-medium leading-snug">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                  </div>
                </div>
              ))) : (
                <div className="text-center text-sm text-muted-foreground py-10">
                    No new notifications.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
