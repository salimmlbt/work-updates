
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Inbox, Send, ChevronRight } from 'lucide-react';
import { LeaveSection } from './leave-section';
import type { Profile } from '@/lib/types';

type Section = 'leave' | 'request-center' | 'inbox';

export default function FalaqCornerClient({ profile }: { profile: Profile }) {
  const [activeSection, setActiveSection] = useState<Section>('leave');

  const navigationItems = [
    { id: 'leave', label: 'Leave', icon: FileText },
    { id: 'request-center', label: 'Request Center', icon: Send },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'leave':
        return <LeaveSection profile={profile} />;
      case 'request-center':
        return (
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Request Center</CardTitle>
              <CardDescription>Submit and manage various office requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl">
                    <Send className="h-5 w-5 text-primary" />
                    General Request
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl">
                    <FileText className="h-5 w-5 text-primary" />
                    Asset Request
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case 'inbox':
        return (
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Your personal messages and announcements.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-slate-50/50 rounded-xl border-2 border-dashed">
                <Inbox className="h-12 w-12 mb-4 opacity-20" />
                <p>Your inbox is empty.</p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64">
        <h2 className="text-xl font-bold mb-6 px-2 text-slate-900">Falaq Corner</h2>
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                'w-full justify-start gap-3 h-11 px-4 rounded-xl transition-all duration-200',
                activeSection === item.id
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'hover:bg-accent'
              )}
            >
              <item.icon className={cn('h-5 w-5', activeSection === item.id ? 'text-blue-600' : 'text-muted-foreground')} />
              <span>{item.label}</span>
              {activeSection === item.id && <ChevronRight className="ml-auto h-4 w-4" />}
            </button>
          ))}
        </nav>
      </aside>
      
      <main className="flex-1 min-h-[600px] bg-white rounded-3xl border shadow-sm overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
}
