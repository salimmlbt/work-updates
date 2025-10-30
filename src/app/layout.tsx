
import './globals.css';
import { cn } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import ClientLayout from './client-layout';
import type { Profile } from '@/lib/types';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*, roles(*), teams:profile_teams(teams(*))')
      .eq('id', user.id)
      .single();
    profile = data as Profile;
  }

  const isAuthenticated = !!user;

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
      </body>
    </html>
  );
}
