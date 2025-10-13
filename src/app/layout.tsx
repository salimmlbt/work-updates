
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import ClientLayout from './client-layout';
import type { Profile } from '@/lib/types';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  let profile: Profile | null = null;
  if (session?.user) {
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(*), teams:profile_teams(teams(*))')
      .eq('id', session.user.id)
      .single();
    profile = data as Profile;
  }

  const isAuthenticated = !!session;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-body font-sans antialiased")}>
        <ClientLayout
          isAuthenticated={isAuthenticated}
          profile={profile}
        >
          {children}
        </ClientLayout>
        <Toaster />
      </body>
    </html>
  );
}
