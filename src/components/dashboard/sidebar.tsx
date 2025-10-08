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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/app/login/actions';
import { LogOut } from 'lucide-react';
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

export default function Sidebar() {
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

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
    return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-4 rounded-lg px-4 py-2 text-sidebar-foreground transition-all',
        {
          'bg-sidebar-accent text-sidebar-accent-foreground font-semibold': isActive,
          'hover:bg-sidebar-accent/50 text-white': !isActive,
        }
      )}
    >
      <item.icon className={cn('h-5 w-5 shrink-0', !isActive && 'text-sidebar-icon-muted')} />
      <span className={cn('truncate')}>{item.label}</span>
    </Link>
  )};

  return (
    <div
      className={cn(
        'hidden bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col transition-all duration-300 z-40 w-64'
      )}
    >
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-20 items-center px-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <Logo className="h-7 w-7 text-sidebar-foreground" />
            <span className={cn('text-xl font-bold text-sidebar-foreground')}>Work Updates</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className={cn('grid items-start gap-1 px-4 text-base font-medium')}>
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 space-y-4">
          <nav className="grid items-start gap-1 text-base font-medium">
            {bottomNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
            <form action={logout}>
              <button className={cn(
                'flex w-full items-center gap-4 rounded-lg px-4 py-2 text-sidebar-foreground transition-all',
                'hover:bg-sidebar-accent/50'
              )}>
                <LogOut className="h-5 w-5 shrink-0 text-sidebar-icon-muted" />
                <span>Log out</span>
              </button>
            </form>
          </nav>
          <div className="border-t border-sidebar-border pt-4">
            <div className={cn("flex items-center gap-3 px-3")}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.user_metadata.avatar_url} alt={user?.user_metadata.full_name} />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={cn("flex flex-col")}>
                <span className="text-sm font-bold text-sidebar-foreground">{user?.user_metadata.full_name}</span>
                <span className="text-xs text-sidebar-foreground/80">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
