
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logout } from './login/actions';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import type { Profile, Notification, RoleWithPermissions, TaskWithDetails } from '@/lib/types';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';

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
  const [isLoading, setIsLoading] = useState(true); // Start with true for initial load
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
    setIsLoading(false);
  }, [pathname]);

  useEffect(() => {
    if (!profile) return;

    const supabase = createClient();
    const isEditor = (profile.roles as RoleWithPermissions)?.permissions?.tasks === 'Editor' || profile.roles?.name === 'Falaq Admin';

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);


  useEffect(() => {
    setIsAuthenticated(initialIsAuthenticated);
    if (initialIsAuthenticated && profile?.is_archived) {
        logout().then(() => router.push('/login'));
    }
  }, [initialIsAuthenticated, profile, router]);

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
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
