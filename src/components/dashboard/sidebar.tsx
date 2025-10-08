'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  WorkUpdatesIcon,
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
            'flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all relative',
            {
              'bg-sidebar-accent text-sidebar-accent-foreground font-semibold': pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard'),
              'text-sidebar-icon-unselected hover:bg-sidebar-accent/50': !(pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')),
              'justify-center': isCollapsed,
            }
          )}
        >
            <span className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn('truncate text-sidebar-foreground', { 'sr-only': isCollapsed })}>{item.label}</span>
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
      <div className="fixed left-0 top-0 z-20 h-full">
        <div
          className={cn(
            'relative h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out transform',
            {
              'w-52 translate-x-0': !isCollapsed,
              'w-0 -translate-x-full': isCollapsed,
            }
          )}
        >
          <div className="absolute right-0 top-0 h-full w-full flex flex-col">
            <div className="flex h-16 items-center px-4 lg:px-6">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                <WorkUpdatesIcon className="h-6 w-6" />
                <span className="text-lg text-sidebar-foreground whitespace-nowrap">Work Updates</span>
              </Link>
            </div>

            <div className="flex-1 overflow-auto py-2">
              <nav className="grid items-start gap-1 px-0 text-sm font-medium lg:px-4">
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
                      <button
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all',
                          'hover:bg-sidebar-accent/50'
                        )}
                      >
                        <LogOut className="h-5 w-5 shrink-0" />
                        <span>Log out</span>
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
                    <div className="flex items-center gap-3 px-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.user_metadata.avatar_url} alt={user?.user_metadata.full_name} />
                        <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-sidebar-foreground">{user?.user_metadata.full_name}</span>
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

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "fixed top-1/2 h-10 w-10 -translate-y-1/2 z-30 bg-background hover:bg-background rounded-full transition-all duration-300 ease-in-out shadow-md",
            {
              "left-48 -translate-x-1/2 opacity-0 group-hover:opacity-100": !isCollapsed,
              "left-2 opacity-100": isCollapsed,
            }
          )}
          onClick={() => setCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
          )}
        </Button>
      </div>
    </TooltipProvider>
  );
}
