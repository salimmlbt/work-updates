
'use client';

import { useState, useEffect } from 'react';
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
import { FilePlus2, Eye, AlertTriangle } from 'lucide-react';

const notificationIcons = {
  new: <FilePlus2 className="h-5 w-5 text-blue-500" />,
  deadline: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  review: <Eye className="h-5 w-5 text-purple-500" />,
};

export function NotificationPopover({ isCollapsed, notifications: initialNotifications }: { isCollapsed: boolean, notifications: Notification[] }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [readNotifications, setReadNotifications] = useState<string[]>([]);

    useEffect(() => {
        const storedRead = localStorage.getItem('readNotifications');
        if (storedRead) {
            setReadNotifications(JSON.parse(storedRead));
        }
    }, []);

    const unreadNotifications = initialNotifications.filter(n => !readNotifications.includes(n.id));

    const handleNotificationClick = (notification: Notification) => {
        const taskId = notification.id.split('-').pop();
        if (taskId) {
            router.push(`/tasks?taskId=${taskId}`);
        }
        
        const newReadNotifications = [...readNotifications, notification.id];
        setReadNotifications(newReadNotifications);
        localStorage.setItem('readNotifications', JSON.stringify(newReadNotifications));
        
        setIsOpen(false);
    }
    
    const handleClearAll = () => {
        const allNotificationIds = unreadNotifications.map(n => n.id);
        const newReadNotifications = [...new Set([...readNotifications, ...allNotificationIds])];
        setReadNotifications(newReadNotifications);
        localStorage.setItem('readNotifications', JSON.stringify(newReadNotifications));
    }

    const triggerButton = (
        <div
          role="button"
          className={cn(
            'flex w-full items-center gap-4 rounded-lg px-4 py-2 text-sidebar-foreground transition-all duration-300',
            isOpen ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
          )}
        >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center relative">
              <BellIcon className="h-5 w-5 text-sidebar-icon-muted" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </span>
            <span
              className={cn(
                'truncate overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-in-out',
                isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
              )}
            >
              Notifications
            </span>
        </div>
    );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
          <div className="flex justify-between items-center p-4 border-b">
            <div className="space-y-1">
              <h4 className="font-medium leading-none">Notifications</h4>
              <p className="text-sm text-muted-foreground">
                You have {unreadNotifications.length} unread notifications.
              </p>
            </div>
            {unreadNotifications.length > 0 && (
                <Button variant="link" size="sm" className="text-sm" onClick={handleClearAll}>
                    Clear all
                </Button>
            )}
          </div>
          <ScrollArea className="h-80">
            <div className="grid gap-1 p-2">
              {unreadNotifications.length > 0 ? (
                unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  onClick={() => handleNotificationClick(notification)}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent cursor-pointer"
                >
                  <div className="mt-1">
                      {notificationIcons[notification.type] || <BellIcon className="h-5 w-5" />}
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
