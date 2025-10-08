'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import { createClient } from '@/lib/supabase/client';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: authListener } = createClient().auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const showNav = isAuthenticated && pathname !== '/login' && !pathname.startsWith('/dashboard');

  if (isAuthenticated === null) {
      return (
          <html lang="en" suppressHydrationWarning>
              <body className="min-h-screen bg-background flex items-center justify-center">
                  <div>Loading...</div>
              </body>
          </html>
      )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>
        <div className="flex min-h-screen w-full bg-background">
          {showNav && (
            <Sidebar 
              isCollapsed={isSidebarCollapsed} 
              setCollapsed={setSidebarCollapsed} 
            />
          )}
          <div className={cn(
              "flex flex-1 flex-col transition-all duration-300",
              showNav && (isSidebarCollapsed ? "md:ml-20" : "md:ml-64")
            )}>            {showNav && <Header />}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
