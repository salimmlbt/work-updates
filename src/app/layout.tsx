
import './globals.css';
import { cn } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import ClientLayout from './client-layout';
import type { Profile } from '@/lib/types';
import { type Metadata } from 'next';
import { PageLoader } from '@/components/page-loader';
import { ClientCacheProvider } from './client-cache';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Falaq - Work Updates',
  description: 'The official project and team management portal for Falaq Branding.',
  metadataBase: new URL('https://falaq.com'),
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
  
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, roles(*), teams:profile_teams(teams(*))')
      .eq('id', user.id)
      .single();
    profile = profileData as Profile;
  }

  const isAuthenticated = !!user;

  return (
    <html lang="en" className={cn("dark", inter.variable)} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" sizes="any" />
      </head>
      <body className={cn("min-h-screen bg-background font-body font-sans antialiased text-foreground")} suppressHydrationWarning>
        <PageLoader />
        <ClientCacheProvider>
          <ClientLayout
            isAuthenticated={isAuthenticated}
            profile={profile}
          >
            {children}
          </ClientLayout>
        </ClientCacheProvider>
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
