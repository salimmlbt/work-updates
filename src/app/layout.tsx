
import './globals.css';
import { cn } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import ClientLayout from './client-layout';
import type { Profile, TaskWithDetails, Notification, RoleWithPermissions } from '@/lib/types';
import { type Metadata } from 'next';
import { PageLoader } from '@/components/page-loader';
import { isToday, isTomorrow, isAfter, subDays, parseISO } from 'date-fns';

export const metadata: Metadata = {
  title: 'Falaq - Work Updates',
  description: 'A comprehensive platform for managing work updates, projects, and teams.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile: Profile | null = null;
  let notifications: Notification[] = [];

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, roles(*), teams:profile_teams(teams(*))')
      .eq('id', user.id)
      .single();
    profile = profileData as Profile;
    
    if (profile) {
        const now = new Date();
        const twentyFourHoursAgo = subDays(now, 1);

        // Fetch tasks assigned to the user
        const { data: assignedTasksData } = await supabase
            .from('tasks')
            .select('*, projects(name)')
            .eq('assignee_id', user.id)
            .eq('is_deleted', false)
            .or('status.neq.done,status.is.null');

        const assignedTasks = assignedTasksData as TaskWithDetails[] || [];

        const newTasks = assignedTasks
            .filter(task => isAfter(parseISO(task.created_at), twentyFourHoursAgo))
            .map(task => ({
                id: `new-${task.id}`,
                type: 'new' as const,
                title: 'New task assigned',
                description: `You have been assigned a new task: "${task.description}".`,
            }));
            
        const dueTomorrowTasks = assignedTasks
            .filter(task => task.deadline && isTomorrow(parseISO(task.deadline)))
            .map(task => ({
                id: `due-${task.id}`,
                type: 'deadline' as const,
                title: 'Project Deadline',
                description: `Task "${task.description}" is due tomorrow.`,
            }));
        
        notifications = [...newTasks, ...dueTomorrowTasks];

        // Fetch tasks for review if user has editor permissions
        const userPermissions = (profile.roles as RoleWithPermissions)?.permissions || {};
        const isEditor = userPermissions.tasks === 'Editor' || profile.roles?.name === 'Falaq Admin';

        if (isEditor) {
            const { data: reviewTasksData } = await supabase
                .from('tasks')
                .select('*, projects(name)')
                .eq('status', 'review')
                .eq('is_deleted', false)
                .gte('status_updated_at', twentyFourHoursAgo.toISOString());
            
            const reviewTasks = reviewTasksData as TaskWithDetails[] || [];

            const reviewNotifications = reviewTasks
                .filter(task => task.assignee_id !== user.id) // Don't notify on your own tasks
                .map(task => ({
                    id: `review-${task.id}`,
                    type: 'review' as const,
                    title: 'Task ready for review',
                    description: `Task "${task.description}" is now ready for your review.`,
                }));
            
            notifications = [...notifications, ...reviewNotifications];
        }
    }
  }

  const isAuthenticated = !!user;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <link rel="icon" href="/icon.svg" sizes="any" />
      </head>
      <body className={cn("min-h-screen bg-background font-body font-sans antialiased")}>
        <PageLoader />
        <ClientLayout
          isAuthenticated={isAuthenticated}
          profile={profile}
          notifications={notifications}
        >
          {children}
        </ClientLayout>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                  }).catch(error => {
                    console.error('Service Worker registration failed:', error);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
