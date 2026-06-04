'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logout } from './login/actions';
import { cn, getInitials } from '@/lib/utils';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import MobileNav from '@/components/dashboard/mobile-nav';
import type { Profile, Notification, RoleWithPermissions, TaskWithDetails, Leave } from '@/lib/types';
import { Toaster } from "@/components/ui/toaster";
import { PageSkeleton } from '@/components/dashboard/page-skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Calendar as CalendarIcon, Clock, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TooltipProvider } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';
import { AttendanceWarning } from '@/components/dashboard/attendance-warning';

const PageLoader = dynamic(() => import('@/components/page-loader').then(mod => mod.PageLoader), { 
  ssr: false 
});

export default function ClientLayout({
  children,
  isAuthenticated: initialIsAuthenticated,
  profile,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  profile: Profile | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeLeaveNotif, setActiveLeaveNotif] = useState<Leave | null>(null);
  const [newLeaveToReview, setNewLeaveToReview] = useState<(Leave & { profiles?: Profile }) | null>(null);

  const approvedAudioRef = useRef<HTMLAudioElement | null>(null);
  const correctionAudioRef = useRef<HTMLAudioElement | null>(null);
  const recreateAudioRef = useRef<HTMLAudioElement | null>(null);
  const newTaskAudioRef = useRef<HTMLAudioElement | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 2.5 second delay to clear the initial cinematic PageLoader
    const timer = setTimeout(() => setIsInitialMount(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Initialize audio on the client
    approvedAudioRef.current = new Audio('/approved.mp3');
    correctionAudioRef.current = new Audio('/correction.mp3');
    recreateAudioRef.current = new Audio('/recreate.mp3');
    newTaskAudioRef.current = new Audio('/new-task.mp3');
    reviewAudioRef.current = new Audio('/review.mp3');

    [approvedAudioRef, correctionAudioRef, recreateAudioRef, newTaskAudioRef, reviewAudioRef].forEach(ref => {
        if (ref.current) {
            ref.current.preload = 'auto';
        }
    });

  }, []);

  useEffect(() => {
    if (!profile) return;

    const supabase = createClient();
    const isTaskEditor = (profile.roles as RoleWithPermissions)?.permissions?.tasks === 'Editor' || profile.roles?.name === 'Falaq Admin';
    const isFalaqCornerEditor = (profile.roles as RoleWithPermissions)?.permissions?.falaq_corner === 'Editor' || profile.roles?.name === 'Falaq Admin';

    // 1. Task Notifications
    const taskChannel = supabase
      .channel('realtime-notifications-new')
      .on<TaskWithDetails>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const task = payload.new as TaskWithDetails;
          const oldTask = payload.old as TaskWithDetails;
          let notification: Notification | null = null;
          
          const playSound = (type: Notification['type']) => {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') return;

            const audioMap = {
              'new': newTaskAudioRef,
              'review': reviewAudioRef,
              'approved': approvedAudioRef,
              'correction': correctionAudioRef,
              'recreate': recreateAudioRef,
              'deadline': null,
              'leave_approved': approvedAudioRef,
              'leave_rejected': recreateAudioRef,
            };
            
            const audioToPlayRef = audioMap[type as keyof typeof audioMap];
            audioToPlayRef?.current?.play().catch(e => console.error(`Audio play failed: ${e.message}`));
          };

          const showBrowserNotification = (notif: Notification) => {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(notif.title, {
                body: notif.description,
                icon: '/icon.svg',
                silent: true,
              });
            }
            playSound(notif.type);
          };

          if (payload.eventType === 'INSERT') {
            if (task.assignee_id === profile.id && task.created_by !== profile.id) {
              notification = {
                id: `new-${task.id}`,
                type: 'new',
                title: 'New task assigned',
                description: `You have been assigned a new task: "${task.description}".`,
              };
            }
          } else if (payload.eventType === 'UPDATE' && oldTask && task) {
             if (task.status !== oldTask.status) {
                // To assignee
                if (task.assignee_id === profile.id && task.status_updated_by !== profile.id) {
                    if (task.status === 'approved' && oldTask.status !== 'approved') {
                        notification = { id: `approved-${task.id}-${task.status_updated_at}`, type: 'approved', title: 'Task Approved!', description: `Your task "${task.description}" has been approved.` };
                    } else if (task.status === 'corrections' && oldTask.status !== 'corrections') {
                        notification = { id: `correction-${task.id}-${task.status_updated_at}`, type: 'correction', title: 'Corrections Required', description: `Corrections are required for your task: "${task.description}".` };
                    } else if (task.status === 'recreate' && oldTask.status !== 'recreate') {
                        notification = { id: `recreate-${task.id}-${task.status_updated_at}`, type: 'recreate', title: 'Task Needs Recreation', description: `Task "${task.description}" needs to be recreated.` };
                    }
                }

                // To reviewers
                if (isTaskEditor && task.status === 'review' && oldTask.status !== 'review' && task.status_updated_by !== profile.id) {
                    notification = { id: `review-${task.id}-${task.status_updated_at}`, type: 'review', title: 'Task ready for review', description: `Task "${task.description}" is now ready for your review.` };
                }
             }
          }

          if (notification) {
            setNotifications(prev => [notification!, ...prev.filter(n => n.id !== notification!.id)]);
            showBrowserNotification(notification);
          }
        }
      )
      .subscribe();

    // 2. Leave Status & Review Notifications
    const leaveChannel = supabase
      .channel('realtime-leave-global')
      .on<Leave>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        async (payload) => {
          const newLeave = payload.new as Leave;
          const oldLeave = payload.old as Leave;

          // A. To Employee (Status Updates: Approve/Reject)
          if (payload.eventType === 'UPDATE' && newLeave.user_id === profile.id) {
            if (newLeave.status !== oldLeave?.status) {
              if (newLeave.status === 'Approved' || newLeave.status === 'Rejected') {
                setActiveLeaveNotif(newLeave);
                
                const trayNotif: Notification = {
                  id: `leave-${newLeave.id}-${Date.now()}`,
                  type: newLeave.status === 'Approved' ? 'leave_approved' : 'leave_rejected',
                  title: `Leave Request ${newLeave.status}`,
                  description: `Your ${newLeave.leave_type} request for ${newLeave.start_date} has been ${newLeave.status.toLowerCase()}.`,
                };
                setNotifications(prev => [trayNotif, ...prev]);
                
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(trayNotif.title, { body: trayNotif.description, icon: '/icon.svg' });
                }
                const audioToPlay = newLeave.status === 'Approved' ? approvedAudioRef : recreateAudioRef;
                audioToPlay.current?.play().catch(() => {});
              }
            }
          }

          // B. To Editors (New Applications)
          if (payload.eventType === 'INSERT' && isFalaqCornerEditor && newLeave.user_id !== profile.id) {
            // Fetch profile for the popup name
            const { data: requesterProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newLeave.user_id)
              .single();

            const leaveWithProfile = { ...newLeave, profiles: requesterProfile as Profile };
            setNewLeaveToReview(leaveWithProfile);
            
            // Audio alert for review
            reviewAudioRef.current?.play().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(leaveChannel);
    };
  }, [profile]);


  useEffect(() => {
    setIsAuthenticated(initialIsAuthenticated);
    if (initialIsAuthenticated && profile?.is_archived) {
        logout().then(() => router.push('/login'));
    }
  }, [initialIsAuthenticated, profile, router]);

  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  useEffect(() => {
    const createSupabaseClient = () => createClient();
    const supabase = createSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const newIsAuthenticated = !!session;
      setIsAuthenticated(newIsAuthenticated);
      
      if (event === "SIGNED_OUT") {
        router.push('/login');
      }

      if (event === 'USER_UPDATED' && session?.user) {
         (async () => {
            const {data} = await supabase.from('profiles').select('is_archived').eq('id', session.user.id).single()
            if (data?.is_archived) {
                await logout();
                router.push('/login');
            }
         })();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);
  
  const showNav = isAuthenticated && pathname !== '/login';

  const getLeaveDuration = (leave: Leave) => {
    if (leave.status === 'Approved' && leave.approved_days) {
      return leave.approved_days.length;
    }
    const days = differenceInCalendarDays(parseISO(leave.end_date), parseISO(leave.start_date)) + 1;
    return leave.day_type === 'Half Day' ? 0.5 : days;
  }

  const getLeaveDateString = (leave: Leave) => {
    const start = format(parseISO(leave.start_date), 'dd MMM');
    const end = format(parseISO(leave.end_date), 'dd MMM yyyy');
    return leave.start_date === leave.end_date ? format(parseISO(leave.start_date), 'dd MMM yyyy') : `${start} - ${end}`;
  }

  const handleReviewLeave = () => {
    setNewLeaveToReview(null);
    router.push('/falaq-corner?tab=team-requests');
  };

  return (
    <TooltipProvider>
      <PageLoader />
      <div className="flex min-h-screen w-full bg-background">
        {showNav && (
          <>
            <Sidebar 
                profile={profile} 
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setSidebarCollapsed}
                setIsLoading={setIsLoading}
                notifications={notifications}
                setNotifications={setNotifications}
            />
            <MobileNav
              profile={profile}
              notifications={notifications}
              setNotifications={setNotifications}
              setIsLoading={setIsLoading}
            />
          </>
        )}
        <div className={cn(
            "flex flex-1 flex-col transition-all duration-300",
            showNav && "pt-16 md:pt-0",
            showNav && (isSidebarCollapsed ? "md:ml-20" : "md:ml-64")
          )}>
          {showNav && <Header />}
          <main className="flex-1 overflow-y-auto">
            {isLoading ? <PageSkeleton /> : children}
          </main>
        </div>

        {/* 🚨 Attendance Guard - Only render when app is fully initialized */}
        {isAuthenticated && !isInitialMount && !isLoading && <AttendanceWarning profile={profile} />}

        {/* Leave Status Sticky Popup (For Applicant) */}
        <AnimatePresence>
          {activeLeaveNotif && !isInitialMount && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
              className={cn(
                "fixed bottom-8 right-8 z-[200] p-6 rounded-[2.5rem] border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-5 min-w-[320px] max-w-[400px]",
                activeLeaveNotif.status === 'Approved' 
                  ? "bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10" 
                  : "bg-rose-500/10 border-rose-500/20 shadow-rose-500/10"
              )}
            >
              <div className="flex items-center gap-5">
                <div className={cn(
                  "h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl",
                  activeLeaveNotif.status === 'Approved' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                )}>
                  {activeLeaveNotif.status === 'Approved' ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                </div>
                <div className="space-y-1">
                  <h3 className="font-black uppercase tracking-tight text-white text-xl">
                    Leave {activeLeaveNotif.status}!
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    {activeLeaveNotif.leave_type}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 bg-white/[0.03] p-4 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-3">
                      <CalendarIcon className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm font-bold text-zinc-200">{getLeaveDateString(activeLeaveNotif)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm font-black text-sky-400 uppercase tracking-tight">
                          {getLeaveDuration(activeLeaveNotif)} Day{getLeaveDuration(activeLeaveNotif) !== 1 ? 's' : ''} {activeLeaveNotif.status === 'Approved' ? 'Approved' : 'Requested'}
                      </span>
                  </div>
              </div>

              <p className="text-xs text-zinc-500 font-medium leading-relaxed px-1">
                {activeLeaveNotif.status === 'Approved' 
                  ? "Your leave application has been processed and approved by the studio management." 
                  : "Your leave application was not approved at this time. Please check Falaq Corner for details."}
              </p>

              <Button 
                onClick={() => setActiveLeaveNotif(null)}
                className={cn(
                  "w-full rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 transition-all active:scale-95 shadow-2xl",
                  activeLeaveNotif.status === 'Approved' 
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40" 
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
                )}
              >
                OK, Understood
              </Button>
              
              <div className={cn(
                "absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full opacity-30 pointer-events-none",
                activeLeaveNotif.status === 'Approved' ? "bg-emerald-400" : "bg-rose-400"
              )} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Leave Review Popup (For Editors) */}
        <AnimatePresence>
          {newLeaveToReview && !isInitialMount && (
             <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9, x: 50 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.9, x: 20 }}
              className="fixed bottom-8 right-8 z-[200] p-6 rounded-[2.5rem] border border-amber-500/20 bg-zinc-950/80 backdrop-blur-3xl shadow-[0_20px_50px_rgba(245,158,11,0.15)] flex flex-col gap-5 min-w-[320px] max-w-[400px]"
            >
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-2xl ring-1 ring-amber-500/30">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black uppercase tracking-tight text-white text-xl">
                    New Leave!
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    Awaiting your decision
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/5 shadow-inner">
                  <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={newLeaveToReview.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-amber-500/10 text-amber-400 font-black">{getInitials(newLeaveToReview.profiles?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                      <p className="text-sm font-black text-white">{newLeaveToReview.profiles?.full_name}</p>
                      <p className="text-[10px] font-bold text-sky-400 uppercase tracking-tight">
                          {newLeaveToReview.leave_type} • {getLeaveDuration(newLeaveToReview)} Day{getLeaveDuration(newLeaveToReview) !== 1 ? 's' : ''}
                      </p>
                  </div>
              </div>

              <div className="flex gap-3">
                 <Button 
                  variant="ghost"
                  onClick={() => setNewLeaveToReview(null)}
                  className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 text-zinc-500 hover:text-white hover:bg-white/5"
                >
                  Later
                </Button>
                <Button 
                  onClick={handleReviewLeave}
                  className="flex-[2] rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 bg-amber-600 hover:bg-amber-500 text-white shadow-2xl shadow-amber-900/40"
                >
                  <Eye className="h-4 w-4 mr-2" /> Review Now
                </Button>
              </div>

              {/* Golden Glow Effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full bg-amber-500 opacity-20 pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
