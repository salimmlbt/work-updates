'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logout } from './login/actions';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import type { Profile, Notification, RoleWithPermissions, TaskWithDetails, Leave } from '@/lib/types';
import { Toaster } from "@/components/ui/toaster";
import { PageSkeleton } from '@/components/dashboard/page-skeleton';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeLeaveNotif, setActiveLeaveNotif] = useState<{ id: string; status: string; type: string } | null>(null);

  const approvedAudioRef = useRef<HTMLAudioElement | null>(null);
  const correctionAudioRef = useRef<HTMLAudioElement | null>(null);
  const recreateAudioRef = useRef<HTMLAudioElement | null>(null);
  const newTaskAudioRef = useRef<HTMLAudioElement | null>(null);
  const reviewAudioRef = useRef<HTMLAudioElement | null>(null);

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
    const isEditor = (profile.roles as RoleWithPermissions)?.permissions?.tasks === 'Editor' || profile.roles?.name === 'Falaq Admin';

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
              'deadline': null, // No sound for deadline
            };
            
            const audioToPlayRef = audioMap[type];
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
                if (isEditor && task.status === 'review' && oldTask.status !== 'review' && task.status_updated_by !== profile.id) {
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

    // 2. Leave Status Notifications (Popup)
    const leaveChannel = supabase
      .channel('realtime-leave-updates')
      .on<Leave>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leaves', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          const newLeave = payload.new;
          const oldLeave = payload.old;

          if (newLeave.status !== oldLeave?.status) {
            if (newLeave.status === 'Approved' || newLeave.status === 'Rejected') {
              setActiveLeaveNotif({
                id: newLeave.id,
                status: newLeave.status,
                type: newLeave.leave_type
              });
            }
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
    // When the path changes, the new page has loaded.
    setIsLoading(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const newIsAuthenticated = !!session;
      setIsAuthenticated(newIsAuthenticated);
      
      if (event === "SIGNED_OUT") {
        router.push('/login');
      }

      if (event === 'USER_UPDATED' && session?.user) {
         // If user is archived, log them out
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

  return (
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
        </>
      )}
      <div className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          showNav && (isSidebarCollapsed ? "ml-20" : "ml-64")
        )}>
        {showNav && <Header />}
        <main className="flex-1 overflow-y-auto">
          {isLoading ? <PageSkeleton /> : children}
        </main>
      </div>

      {/* Leave Status Sticky Popup */}
      <AnimatePresence>
        {activeLeaveNotif && (
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
                  {activeLeaveNotif.type}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
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
            
            {/* Glow Orb */}
            <div className={cn(
              "absolute -top-10 -right-10 w-32 h-32 blur-[60px] rounded-full opacity-30 pointer-events-none",
              activeLeaveNotif.status === 'Approved' ? "bg-emerald-400" : "bg-rose-400"
            )} />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster />
    </div>
  );
}
