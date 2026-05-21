'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, ShieldQuestion } from 'lucide-react';
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
  ReportIcon,
  CornerIcon,
} from '@/components/icons';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/app/login/actions';
import type { Profile, RoleWithPermissions, Notification } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationPopover } from '@/app/notifications/notification-popover';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon, id: 'dashboard' },
  { href: '/projects', label: 'Projects', icon: ProjectsIcon, id: 'projects' },
  { href: '/tasks', label: 'Tasks', icon: TasksIcon, id: 'tasks' },
  { href: '/clients', label: 'Clients', icon: ClientsIcon, id: 'clients' },
  { href: '/calendar', label: 'Calendar', icon: CalendarIconSvg, id: 'calendar' },
  { href: '/scheduler', label: 'Scheduler', icon: SchedulerIcon, id: 'scheduler' },
  { href: '/report', label: 'Report', icon: ReportIcon, id: 'report' },
  { href: '/falaq-corner', label: 'Falaq Corner', icon: CornerIcon, id: 'falaq_corner' },
  { href: '/chat', label: 'Chat', icon: ChatIcon, id: 'chat' },
  { href: '/attendance', label: 'Attendance', icon: AttendanceIcon, id: 'attendance' },
  { href: '/billing', label: 'Billing', icon: BillingIcon, id: 'billing' },
];

const bottomNavItems = [
  { href: '/teams', label: 'Team & Users', icon: TeamUsersIcon, id: 'teams' },
  { href: '/settings', label: 'Settings', icon: SettingsIcon, id: 'settings' },
];

interface MobileNavProps {
  profile: Profile | null;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setIsLoading: (isLoading: boolean) => void;
}

export default function MobileNav({ profile, notifications, setNotifications, setIsLoading }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isFalaqAdmin = profile?.roles?.name === 'Falaq Admin';
  const userPermissions = (profile?.roles as RoleWithPermissions)?.permissions || {};

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

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');

    return (
      <Link
        href={item.href}
        onClick={() => {
          setOpen(false);
          if (pathname !== item.href) setIsLoading(true);
        }}
        className={cn(
          'flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 border',
          isActive
            ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
            : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-white'
        )}
      >
        <item.icon className={cn('h-5 w-5', isActive ? 'text-sky-300' : 'text-slate-500')} />
        <span className={cn('text-sm font-medium', isActive ? 'text-white' : 'text-slate-300')}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-[100] h-16 px-4 flex items-center justify-between bg-[#050816]/80 backdrop-blur-xl border-b border-white/10">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg">
          <Logo className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-black tracking-widest text-white uppercase">Falaq</span>
      </Link>

      <div className="flex items-center gap-2">
        <NotificationPopover 
          isCollapsed={true} 
          notifications={notifications} 
          setNotifications={setNotifications} 
        />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] bg-[#0b1120] border-r border-white/10 p-0 flex flex-col">
            <SheetHeader className="p-6 border-b border-white/10">
              <SheetTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700 shadow-lg">
                  <Logo className="h-7 w-7 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold tracking-wider text-white">FALAQ</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Work Updates</div>
                </div>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4 py-4">
              <nav className="grid gap-1">
                {filteredNavItems.map(item => (
                  <NavLink key={item.href} item={item} />
                ))}
              </nav>
              <div className="my-4 border-t border-white/5" />
              <nav className="grid gap-1">
                {filteredBottomNavItems.map(item => (
                  <NavLink key={item.href} item={item} />
                ))}
                <form action={logout}>
                  <button className="w-full flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-white">
                    <LogOut className="h-5 w-5 text-slate-500" />
                    <span className="text-sm font-medium">Log out</span>
                  </button>
                </form>
              </nav>
            </ScrollArea>

            <div className="p-6 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/10">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-sky-500/20 text-sky-300">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white truncate">{profile?.full_name}</span>
                  <span className="text-xs text-slate-500 truncate">{profile?.email}</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
