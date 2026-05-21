'use client';

import React, { useState, useEffect } from 'react';
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
  ReportIcon,
  CornerIcon,
} from '@/components/icons';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/app/login/actions';
import { LogOut, ChevronLeft, ShieldQuestion } from 'lucide-react';
import type { Profile, RoleWithPermissions, Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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

interface SidebarProps {
  profile: Profile | null;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

export default function Sidebar({ profile, isCollapsed, setIsCollapsed, setIsLoading, notifications, setNotifications }: SidebarProps) {
  const pathname = usePathname();
  const [clickedItem, setClickedItem] = useState<string | null>(null);

  useEffect(() => {
    if (clickedItem) {
      setClickedItem(null);
    }
  }, [pathname, clickedItem]);

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

  const NavLink = ({ item }: { item: typeof navItems[0] | typeof bottomNavItems[0] }) => {
    const isBasePathActive = (pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard'));
    const isClicked = clickedItem === item.href;
    const isActive = isClicked || (clickedItem === null && isBasePathActive);

    const handleClick = () => {
      if (pathname === item.href) return;
      setIsLoading(true);
      setClickedItem(item.href);
    };

    const linkContent = (
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 border relative group/nav',
          {
            'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.12)]': isActive,
            'border-transparent hover:bg-white/[0.04] hover:border-white/10': !isActive,
          }
        )}
      >
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          <item.icon
            className={cn(
              'h-5 w-5 transition-all duration-300',
              isActive
                ? 'text-sky-300'
                : 'text-slate-500 group-hover/nav:text-slate-300'
            )}
          />
        </span>
        <span
          className={cn(
            'truncate overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-in-out',
            isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto',
            isActive ? 'text-white font-semibold' : 'text-slate-300 group-hover/nav:text-white'
          )}
        >
          {item.label}
        </span>
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-r-full" />
        )}
      </div>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
             <Link href={item.href} onClick={handleClick}>
              {linkContent}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="border-white/10 bg-[#111827] text-white">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <Link href={item.href} onClick={handleClick}>{linkContent}</Link>;
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'hidden md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col transition-all duration-300 z-40 group overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#050816] via-[#0b1120] to-[#111827] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)]',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Glass Overlay Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent)]" />

        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-[#111827] text-white h-7 w-7 opacity-0 group-hover:opacity-100 transition-all hover:bg-[#1e293b] hover:border-sky-500/30 hover:text-sky-300 shadow-lg z-50"
          onClick={(e) => {
            e.currentTarget.blur();
            setIsCollapsed(!isCollapsed);
          }}
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')}
          />
        </Button>

        <div className="flex h-full max-h-screen flex-col gap-2 relative z-10">
          <div className="flex h-20 items-center px-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-500 to-blue-700 shadow-[0_0_20px_rgba(56,189,248,0.35)]">
                <Logo className="h-7 w-7 text-white" />
              </div>
              <div
                className={cn(
                  'text-left overflow-hidden transition-[opacity,width] duration-300 ease-in-out whitespace-nowrap',
                  isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'
                )}
              >
                <div className="text-xl font-bold tracking-wider text-white">
                  FALAQ
                </div>
                <div className="text-xs text-slate-400 leading-tight">
                  Work Updates
                </div>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
            <nav className={cn('grid items-start gap-1 text-base font-medium px-4')}>
              {filteredNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 space-y-4">
            <nav className="grid items-start gap-1 text-base font-medium">
              <NotificationPopover 
                isCollapsed={isCollapsed} 
                notifications={notifications} 
                setNotifications={setNotifications}
              />
              {filteredBottomNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}

              <form action={logout} suppressHydrationWarning>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="submit" className="flex w-full items-center gap-4 rounded-xl px-4 py-2 transition-all duration-300 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 group/logout">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                        <LogOut className="h-5 w-5 text-slate-500 transition-all duration-300 group-hover/logout:text-red-400" />
                      </span>
                      <span
                        className={cn(
                          'truncate overflow-hidden transition-[opacity,width] duration-300',
                          isCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto text-slate-300 group-hover/logout:text-white'
                        )}
                      >
                        Log out
                      </span>
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right" className="border-white/10 bg-[#111827] text-white">Log out</TooltipContent>}
                </Tooltip>
              </form>
            </nav>

            <div className="border-t border-white/10 pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center px-3 transition-all duration-300 rounded-xl py-2 hover:bg-white/[0.04] cursor-pointer',
                      isCollapsed ? 'justify-center' : 'gap-3'
                    )}
                  >
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? ''} />
                      <AvatarFallback className="bg-sky-500/20 text-sky-300">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate">{profile?.full_name}</span>
                        <span className="text-xs text-slate-400 truncate">{profile?.email}</span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>

                {isCollapsed && (
                  <TooltipContent side="right" className="border-white/10 bg-[#111827] text-white">
                    <p className="font-bold">{profile?.full_name}</p>
                    <p>{profile?.email}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </TooltipProvider>
  );
}
