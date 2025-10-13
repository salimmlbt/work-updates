
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { LogOut } from 'lucide-react';
import type { Profile, RoleWithPermissions } from '@/lib/types';

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
}

export default function Sidebar({ profile }: SidebarProps) {
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
    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-4 rounded-lg px-4 py-2 transition-all',
          {
            'bg-sidebar-accent font-semibold': isActive,
            'hover:bg-sidebar-accent/50': !isActive,
          }
        )}
      >
        <item.icon className={cn(
            "h-5 w-5 shrink-0",
            isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-icon-muted'
          )} />
        <span className="truncate text-sidebar-foreground">{item.label}</span>
      </Link>
    );
  };

  return (
    <div
      className={cn(
        'hidden bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col transition-all duration-300 z-40 w-64'
      )}
    >
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-20 items-center px-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <div className="bg-primary text-primary-foreground h-10 w-10 rounded-lg flex items-center justify-center">
              <Logo className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
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
            <form action={logout}>
              <button className={cn(
                'flex w-full items-center gap-4 rounded-lg px-4 py-2 transition-all',
                'hover:bg-sidebar-accent/50'
              )}>
                <LogOut className="h-5 w-5 shrink-0 text-sidebar-icon-muted" />
                <span className="text-white">Log out</span>
              </button>
            </form>
          </nav>
          <div className="border-t border-sidebar-border pt-4">
            <div className={cn("flex items-center gap-3 px-3")}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
                <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <div className={cn("flex flex-col")}>
                <span className="text-sm font-bold text-sidebar-foreground">{profile?.full_name}</span>
                <span className="text-xs text-sidebar-foreground/80">{profile?.email}</span>
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
    </div>
  );
}
