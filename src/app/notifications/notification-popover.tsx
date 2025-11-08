
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BellIcon, TasksIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const notifications = [
    {
        id: 1,
        title: 'New task assigned',
        description: 'You have been assigned a new task: "Create new ad campaign".',
        icon: <TasksIcon className="h-5 w-5 text-blue-500" />,
    },
    {
        id: 2,
        title: 'Project Deadline',
        description: 'Project "Website Redesign" is due tomorrow.',
        icon: <BellIcon className="h-5 w-5 text-red-500" />,
    },
    {
        id: 3,
        title: 'New Message',
        description: 'You have a new message from John Doe.',
        icon: <BellIcon className="h-5 w-5 text-green-500" />,
    },
];

export function NotificationPopover({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start p-0 h-auto',
                'data-[state=open]:bg-sidebar-accent'
              )}
            >
              <span
                className={cn(
                  'flex items-center gap-4 rounded-lg px-4 py-2 transition-all duration-300',
                   'group-data-[state=open]:font-semibold group-hover:bg-sidebar-accent/50'
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
              </span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {isCollapsed && <TooltipContent side="right">Notifications</TooltipContent>}
      </Tooltip>
      <PopoverContent className="w-80 mr-4" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Notifications</h4>
            <p className="text-sm text-muted-foreground">
              You have {notifications.length} unread messages.
            </p>
          </div>
          <div className="grid gap-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-4 p-2 rounded-lg hover:bg-accent"
              >
                <div className="mt-1">
                    {notification.icon}
                </div>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
