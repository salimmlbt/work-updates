'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import { createClient } from '@/lib/supabase/client';
import { logout } from './login/actions';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .single();

          if (profile?.status === 'Archived') {
            await logout();
            router.push('/login');
          }
        }
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', session.user.id)
          .single();

        if (profile?.status === 'Archived') {
          await logout();
        }
      }
      if (event === "SIGNED_OUT") {
          router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const showNav = isAuthenticated && pathname !== '/login';

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
      <body className={cn("min-h-screen bg-background font-body font-sans antialiased")}>
        <div className="flex min-h-screen w-full bg-background">
          {showNav && (
            <Sidebar />
          )}
          <div className={cn(
              "flex flex-1 flex-col transition-all duration-300",
              showNav && "ml-64"
            )}>
            {showNav && <Header />}
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

    