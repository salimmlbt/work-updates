
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
import type { Notification, RoleWithPermissions, TaskWithDetails, Profile } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { FilePlus2, Eye, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isAfter, parseISO, subDays, isTomorrow } from 'date-fns';

const notificationIcons = {
  new: <FilePlus2 className="h-5 w-5 text-blue-500" />,
  deadline: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  review: <Eye className="h-5 w-5 text-purple-500" />,
};

export function NotificationPopover({ isCollapsed, profile }: { isCollapsed: boolean, profile: Profile | null }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [readNotifications, setReadNotifications] = useState<string[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const storedRead = localStorage.getItem('readNotifications');
        if (storedRead) {
            setReadNotifications(JSON.parse(storedRead));
        }
    }, []);

    useEffect(() => {
        if (!profile) return;

        const supabase = createClient();
        const userPermissions = (profile.roles as RoleWithPermissions)?.permissions || {};
        const isEditor = userPermissions.tasks === 'Editor' || profile.roles?.name === 'Falaq Admin';
        const twentyFourHoursAgo = subDays(new Date(), 1).toISOString();

        const fetchInitialNotifications = async () => {
            const { data: assignedTasksData } = await supabase
                .from('tasks')
                .select('id, description, deadline, created_at')
                .eq('assignee_id', profile.id)
                .eq('is_deleted', false)
                .or('status.neq.done,status.is.null');

            const assignedTasks = assignedTasksData as Pick<TaskWithDetails, 'id' | 'description' | 'deadline' | 'created_at'>[] || [];
                
            const deadlineNotifications: Notification[] = assignedTasks
                .filter(task => task.deadline && isTomorrow(parseISO(task.deadline)))
                .map(task => ({
                    id: `due-${task.id}`,
                    type: 'deadline',
                    title: 'Project Deadline',
                    description: `Task "${task.description}" is due tomorrow.`,
                }));

            const newNotifications: Notification[] = assignedTasks
                .filter(task => task.created_at && isAfter(parseISO(task.created_at), new Date(twentyFourHoursAgo)))
                .map(task => ({
                  id: `new-${task.id}`,
                  type: 'new',
                  title: 'New task assigned',
                  description: `You have been assigned a new task: "${task.description}".`,
                }));

            let reviewNotifications: Notification[] = [];
            if (isEditor) {
                const { data: reviewTasksData } = await supabase
                    .from('tasks')
                    .select('id, description, status_updated_at')
                    .eq('status', 'review')
                    .eq('is_deleted', false)
                    .filter('status_updated_at', 'gte', twentyFourHoursAgo);
                
                const reviewTasks = reviewTasksData as Pick<TaskWithDetails, 'id' | 'description' | 'status_updated_at'>[] || [];

                reviewNotifications = reviewTasks.map(task => ({
                        id: `review-${task.id}`,
                        type: 'review',
                        title: 'Task ready for review',
                        description: `Task "${task.description}" is now ready for your review.`,
                    }));
            }

            setNotifications([...deadlineNotifications, ...newNotifications, ...reviewNotifications]);
        };

        fetchInitialNotifications();
        
        const channel = supabase
          .channel('realtime-notifications-popover')
          .on<TaskWithDetails>(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
              const newTask = payload.new as TaskWithDetails;
              const oldTask = payload.old as TaskWithDetails;

              if (payload.eventType === 'INSERT' && newTask.assignee_id === profile.id) {
                const newNotification: Notification = {
                  id: `new-${newTask.id}`,
                  type: 'new',
                  title: 'New task assigned',
                  description: `You have been assigned a new task: "${newTask.description}".`,
                };
                setNotifications(prev => [newNotification, ...prev.filter(n => n.id !== newNotification.id)]);
              }

              if (
                isEditor &&
                payload.eventType === 'UPDATE' &&
                newTask.status === 'review' &&
                oldTask.status !== 'review'
              ) {
                 const reviewNotification: Notification = {
                    id: `review-${newTask.id}`,
                    type: 'review',
                    title: 'Task ready for review',
                    description: `Task "${newTask.description}" is now ready for your review.`,
                  };
                 setNotifications(prev => [reviewNotification, ...prev.filter(n => n.id !== reviewNotification.id)]);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }, [profile]);


    const unreadNotifications = notifications.filter(n => !readNotifications.includes(n.id));

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
