'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Logo,
  DashboardIcon,
  ProjectsIcon,
  TasksIcon,
  ClientsIcon,
  CalendarIconSvg,
  ChatIcon,
  BillingIcon,
  TeamUsersIcon,
  SettingsIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/projects', label: 'Projects', icon: ProjectsIcon },
  { href: '/tasks', label: 'Tasks', icon: TasksIcon },
  { href: '/clients', label: 'Clients', icon: ClientsIcon },
  { href: '/calendar', label: 'Calendar', icon: CalendarIconSvg },
  { href: '/chat', label: 'Chat', icon: ChatIcon },
  { href: '/billing', label: 'Billing', icon: BillingIcon },
];

const bottomNavItems = [
  { href: '/teams', label: 'Team & Users', icon: TeamUsersIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

interface SidebarProps {
  isCollapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  const NavLink = ({ item }: { item: typeof navItems[0] }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all relative',
            {
              'bg-sidebar-accent text-sidebar-accent-foreground font-semibold': pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard'),
              'hover:bg-sidebar-accent/50': !(pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')),
              'justify-center': isCollapsed,
            }
          )}
        >
          {pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar-primary rounded-r-md"></div>}
          
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn('truncate', { 'sr-only': isCollapsed })}>{item.label}</span>
            </span>
          
        </Link>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right">
          <p>{item.label}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          'hidden bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col transition-all duration-300 z-40',
          { 'w-64': !isCollapsed, 'w-20': isCollapsed }
        )}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center px-4 lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
              <Logo className="h-7 w-7" />
              <span className={cn('text-lg text-foreground', { 'sr-only': isCollapsed })}>TaskFlow</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className={cn('grid items-start gap-1 px-2 text-sm font-medium lg:px-4')}>
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>
          <div className="mt-auto p-2 lg:p-4">
            <nav className="grid items-start gap-1 text-sm font-medium">
              {bottomNavItems.map((item) => (
                 <NavLink key={item.href} item={item} />
              ))}
               <Tooltip>
                <TooltipTrigger asChild>
                    <form action={logout}>
                        <button className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all',
                            'hover:bg-sidebar-accent/50',
                            { 'justify-center': isCollapsed }
                        )}>
                            <LogOut className="h-5 w-5 shrink-0" />
                            <span className={cn({ 'sr-only': isCollapsed })}>Log out</span>
                        </button>
                    </form>
                </TooltipTrigger>
                {isCollapsed && (
                    <TooltipContent side="right">
                    <p>Log out</p>
                    </TooltipContent>
                )}
                </Tooltip>
            </nav>
            <div className="mt-4 border-t border-sidebar-border pt-4">
               <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex items-center gap-3 px-3", { "justify-center": isCollapsed })}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.user_metadata.avatar_url} alt={user?.user_metadata.full_name} />
                      <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className={cn("flex flex-col", { "sr-only": isCollapsed })}>
                      <span className="text-sm font-medium text-foreground">{user?.user_metadata.full_name}</span>
                      <span className="text-xs text-sidebar-foreground">{user?.email}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{user?.user_metadata.full_name}</p>
                    <p>{user?.email}</p>
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
