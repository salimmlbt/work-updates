
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  DashboardIcon,
  ProjectsIcon,
  TasksIcon,
  ClientsIcon,
  CalendarIconSvg,
  ChatIcon,
  BillingIcon,
  TeamUsersIcon,
  SettingsIcon,
  Logo,
} from '@/components/icons';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/app/login/actions';
import { LogOut, ChevronLeft } from 'lucide-react';
import type { Profile, RoleWithPermissions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, id: 'dashboard' },
  { href: '/projects', label: 'Projects', icon: ProjectsIcon, id: 'projects' },
  { href: '/tasks', label: 'Tasks', icon: TasksIcon, id: 'tasks' },
  { href: '/clients', label: 'Clients', icon: ClientsIcon, id: 'clients' },
  { href: '/calendar', label: 'Calendar', icon: CalendarIconSvg, id: 'calendar' },
  { href: '/chat', label: 'Chat', icon: ChatIcon, id: 'chat' },
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
  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';
  const userPermissions = (profile?.roles as RoleWithPermissions)?.permissions || {};

  const hasAccess = (itemId: string) => {
    if (isFalaqAdmin) {
      return true;
    }
    return userPermissions[itemId] !== 'Restricted';
  };

  const filteredNavItems = navItems.filter(item => hasAccess(item.id));
  const filteredBottomNavItems = bottomNavItems.filter(item => hasAccess(item.id));

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
    const linkContent = (
         <span
            className={cn(
            'flex items-center gap-4 rounded-lg px-4 py-2 transition-all',
            {
                'bg-sidebar-accent font-semibold': isActive,
                'hover:bg-sidebar-accent/50': !isActive,
                'justify-center': isCollapsed,
            }
            )}
        >
            <item.icon className={cn(
                "h-5 w-5 shrink-0",
                isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-icon-muted'
            )} />
            <span className={cn("truncate text-sidebar-foreground", isCollapsed && "hidden")}>{item.label}</span>
        </span>
    );
    
    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={item.href}>{linkContent}</Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    }
    
    return <Link href={item.href}>{linkContent}</Link>;
  };

  return (
    <TooltipProvider>
        <div
        className={cn(
            'hidden bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col transition-all duration-300 z-40 group',
            isCollapsed ? 'w-20' : 'w-64'
        )}
        >
        <Button
            variant="ghost"
            size="icon"
            className="absolute -right-5 top-1/2 -translate-y-1/2 rounded-full bg-sidebar-accent text-sidebar-accent-foreground h-7 w-7 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100 hover:bg-sidebar-primary"
            onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
        </Button>

        <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-20 items-center px-6 border-b border-sidebar-border">
            <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
                <div className="bg-primary text-primary-foreground h-10 w-10 rounded-lg flex items-center justify-center shrink-0">
                <Logo className="h-7 w-7 text-white" />
                </div>
                <div className={cn("text-left", isCollapsed && "hidden")}>
                    <div className="text-xl font-bold tracking-wider text-sidebar-foreground">FALAQ</div>
                    <div className="text-xs text-sidebar-foreground/80">Work Updates</div>
                </div>
            </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
            <nav className={cn('grid items-start gap-1 px-4 text-base font-medium')}>
                {filteredNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
                ))}
            </nav>
            </div>
            <div className="mt-auto p-4 space-y-4">
            <nav className="grid items-start gap-1 text-base font-medium">
                {filteredBottomNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
                ))}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <form action={logout}>
                        <button className={cn(
                            'flex w-full items-center gap-4 rounded-lg px-4 py-2 transition-all',
                            'hover:bg-sidebar-accent/50',
                            isCollapsed && 'justify-center'
                        )}>
                            <LogOut className="h-5 w-5 shrink-0 text-sidebar-icon-muted" />
                            <span className={cn("text-white", isCollapsed && "hidden")}>Log out</span>
                        </button>
                        </form>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">Log out</TooltipContent>}
                </Tooltip>
            </nav>
            <div className="border-t border-sidebar-border pt-4">
                <Tooltip>
                     <TooltipTrigger>
                        <div className={cn("flex items-center gap-3 px-3", isCollapsed && "justify-center")}>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
                            <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className={cn("flex flex-col", isCollapsed && "hidden")}>
                            <span className="text-sm font-bold text-sidebar-foreground">{profile?.full_name}</span>
                            <span className="text-xs text-sidebar-foreground/80">{profile?.email}</span>
                        </div>
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
