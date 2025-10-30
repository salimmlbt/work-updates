
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logout } from './login/actions';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import type { Profile } from '@/lib/types';
import { Toaster } from "@/components/ui/toaster";

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
        <Sidebar 
            profile={profile} 
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setSidebarCollapsed}
        />
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
