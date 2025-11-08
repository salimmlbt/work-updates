
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardIcon,
  ProjectsIcon,
  TasksIcon,
  ClientsIcon,
  CalendarIconSvg,
  ChatIcon,
  AttendanceIcon,
  BillingIcon,
  TeamUsersIcon,
  SettingsIcon,
  Logo,
  SchedulerIcon,
} from '@/components/icons';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/app/login/actions';
import { LogOut, ChevronLeft, ShieldQuestion } from 'lucide-react';
import type { Profile, RoleWithPermissions, Notification, TaskWithDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { NotificationPopover } from '@/app/notifications/notification-popover';
import { createClient } from '@/lib/supabase/client';
import { isAfter, parseISO, subDays, isTomorrow } from 'date-fns';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, id: 'dashboard' },
  { href: '/projects', label: 'Projects', icon: ProjectsIcon, id: 'projects' },
  { href: '/tasks', label: 'Tasks', icon: TasksIcon, id: 'tasks' },
  { href: '/clients', label: 'Clients', icon: ClientsIcon, id: 'clients' },
  { href: '/calendar', label: 'Calendar', icon: CalendarIconSvg, id: 'calendar' },
  { href: '/scheduler', label: 'Scheduler', icon: SchedulerIcon, id: 'scheduler' },
  { href: '/chat', label: 'Chat', icon: ChatIcon, id: 'chat' },
  { href: '/attendance', label: 'Attendance', icon: AttendanceIcon, id: 'attendance' },
  { href: '/billing', label: 'Billing', icon: BillingIcon, id: 'billing' },
];

const bottomNavItems = [
  { href: '/teams', label: 'Team & Users', icon: TeamUsersIcon, id: 'teams' },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, id: 'settings' },
];

interface SidebarProps {
  profile: Profile | null;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

export default function Sidebar({ profile, isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';
  const userPermissions = (profile?.roles as RoleWithPermissions)?.permissions || {};

  useEffect(() => {
    if (!hasMounted) return;

    const initializeNotifications = async () => {
      if (!profile) return;
      const supabase = createClient();
      const isEditor = (profile.roles as RoleWithPermissions)?.permissions?.tasks === 'Editor' || profile.roles?.name === 'Falaq Admin';
      const twentyFourHoursAgo = subDays(new Date(), 1).toISOString();

      const { data: assignedTasksData } = await supabase
        .from('tasks')
        .select('id, description, deadline, created_at, status, status_updated_at')
        .eq('assignee_id', profile.id)
        .eq('is_deleted', false);
      
      const assignedTasks = (assignedTasksData as TaskWithDetails[]) || [];

      const deadlineNotifications: Notification[] = assignedTasks
        .filter(task => task.deadline && task.status !== 'done' && isTomorrow(parseISO(task.deadline)))
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
          .gte('status_updated_at', twentyFourHoursAgo);

        reviewNotifications = ((reviewTasksData as TaskWithDetails[]) || []).map(task => ({
          id: `review-${task.id}-${task.status_updated_at}`,
          type: 'review',
          title: 'Task ready for review',
          description: `Task "${task.description}" is now ready for your review.`,
        }));
      }

      setNotifications([...deadlineNotifications, ...newNotifications, ...reviewNotifications]);

      const channel = supabase
        .channel('realtime-notifications-sidebar')
        .on<TaskWithDetails>(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            const newTask = payload.new as TaskWithDetails;
            const oldTask = payload.old as TaskWithDetails;

            let notification: Notification | null = null;

            if (payload.eventType === 'INSERT' && newTask.assignee_id === profile.id) {
              notification = {
                id: `new-${newTask.id}`,
                type: 'new',
                title: 'New task assigned',
                description: `You have been assigned a new task: "${newTask.description}".`,
              };
            }

            if (
              isEditor &&
              payload.eventType === 'UPDATE' &&
              newTask.status === 'review' &&
              oldTask.status !== 'review'
            ) {
              notification = {
                id: `review-${newTask.id}-${newTask.status_updated_at}`,
                type: 'review',
                title: 'Task ready for review',
                description: `Task "${newTask.description}" is now ready for your review.`,
              };
            }
            
            if (notification) {
                setNotifications(prev => [notification!, ...prev.filter(n => n.id !== notification!.id)]);
                if (Notification.permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.description,
                        icon: '/icon.svg',
                        silent: true
                    });
                    audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
                }
            }
          }
        )
        .subscribe();
      
      return channel;
    };
    
    let channel: ReturnType<typeof createClient>['channel'] | undefined;
    
    initializeNotifications().then(ch => {
      if (ch) channel = ch;
    });

    return () => {
      if (channel) {
        createClient().removeChannel(channel);
      }
    };
  }, [profile, hasMounted]);


  const hasAccess = (itemId: string) => {
    if (isFalaqAdmin) return true;
    return userPermissions[itemId] !== 'Restricted';
  };
  
  const accessibilityItem = { href: '/accessibility', label: 'Accessibility', icon: ShieldQuestion, id: 'accessibility' };

  const filteredNavItems = navItems.filter(item => hasAccess(item.id));
  const filteredBottomNavItems = [
    ...bottomNavItems.filter(item => hasAccess(item.id)),
    ...(hasAccess(accessibilityItem.id) ? [accessibilityItem] : [])
  ];

  const NavLink = ({ item }: { item: typeof navItems[0] | typeof bottomNavItems[0] }) => {
    const isActive =
      pathname.startsWith(item.href) &&
      (item.href !== '/dashboard' || pathname === '/dashboard');

    const linkContent = (
      <span
        className={cn(
          'flex items-center gap-4 rounded-lg px-4 py-2 transition-all duration-300',
          {
            'bg-sidebar-accent font-semibold': isActive,
            'hover:bg-sidebar-accent/50': !isActive,
          }
        )}
      >
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          <item.icon
            className={cn(
              'h-5 w-5 transition-all duration-300',
              isActive
                ? 'text-sidebar-accent-foreground'
                : 'text-sidebar-icon-muted'
            )}
          />
        </span>

        <span
          className={cn(
            'text-sidebar-foreground truncate overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-in-out',
            isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
          )}
        >
          {item.label}
        </span>
      </span>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>{linkContent}</Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return <Link href={item.href}>{linkContent}</Link>;
  };

  const handleNotificationClick = async () => {
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        audioRef.current?.play().catch(() => {});
        audioRef.current?.pause();
      }
    }
  };


  return (
    <TooltipProvider>
      <div
        className={cn(
          'hidden bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col transition-all duration-300 z-40 group',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {hasMounted && <audio id="notification-sound" src="/notification.mp3" preload="auto" ref={audioRef}></audio>}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#0e1944] text-sidebar-accent-foreground h-7 w-7 opacity-0 group-hover:opacity-100 transition-all hover:bg-sidebar-primary"
          onClick={(e) => {
            e.currentTarget.blur();
            setIsCollapsed(!isCollapsed);
          }}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')}
          />
        </Button>

        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-20 items-center px-6 border-b border-sidebar-border">
            <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
              <div className="bg-primary text-primary-foreground h-10 w-10 rounded-lg flex items-center justify-center shrink-0">
                <Logo className="h-7 w-7 text-white" />
              </div>
              <div
                className={cn(
                  'text-left overflow-hidden transition-[opacity,width] duration-300 ease-in-out whitespace-nowrap',
                  isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
                )}
              >
                <div className="text-xl font-bold tracking-wider text-sidebar-foreground">
                  FALAQ
                </div>
                <div className="text-xs text-sidebar-foreground/80 leading-tight">
                  Work Updates
                </div>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
            <nav className={cn('grid items-start gap-1 text-base font-medium px-4')}>
              {filteredNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 space-y-4">
            <nav className="grid items-start gap-1 text-base font-medium">
              {hasMounted && (
                <div onClick={handleNotificationClick}>
                    <NotificationPopover 
                      isCollapsed={isCollapsed} 
                      notifications={notifications} 
                      setNotifications={setNotifications}
                    />
                </div>
              )}
              {filteredBottomNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}

              <Tooltip>
                <TooltipTrigger asChild>
                  <form action={logout}>
                    <button className="flex w-full items-center gap-4 rounded-lg px-4 py-2 transition-all duration-300 hover:bg-sidebar-accent/50">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        <LogOut className="h-5 w-5 text-sidebar-icon-muted transition-all duration-300" />
                      </span>
                      <span
                        className={cn(
                          'text-white truncate overflow-hidden transition-[opacity,width] duration-300',
                          isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
                        )}
                      >
                        Log out
                      </span>
                    </button>
                  </form>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Log out</TooltipContent>}
              </Tooltip>
            </nav>

            <div className="border-t border-sidebar-border pt-4">
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className={cn(
                      'flex items-center px-3 transition-all duration-300',
                      isCollapsed ? 'justify-center' : 'gap-3'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
                      <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                    </Avatar>

                    {!isCollapsed && (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-sidebar-foreground">{profile?.full_name}</span>
                        <span className="text-xs text-sidebar-foreground/80">{profile?.email}</span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>

                {isCollapsed && (
                  <TooltipContent side="right">
                    <p className="font-bold">{profile?.full_name}</p>
                    <p>{profile?.email}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
