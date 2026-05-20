
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
          <Card className="border-0 shadow-none bg-transparent h-full">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-3xl font-black text-white tracking-tighter">Request Center</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Submit and manage various office requests through the studio portal.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Button variant="outline" className="h-32 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-white/10 bg-white/5 hover:bg-white/10 hover:border-sky-500/30 transition-all group shadow-xl">
                    <div className="h-12 w-12 rounded-2xl bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Send className="h-6 w-6 text-sky-400" />
                    </div>
                    <span className="font-bold text-white uppercase tracking-widest text-[10px]">General Request</span>
                </Button>
                <Button variant="outline" className="h-32 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all group shadow-xl">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                    <span className="font-bold text-white uppercase tracking-widest text-[10px]">Asset Request</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case 'inbox':
        return (
          <Card className="border-0 shadow-none bg-transparent h-full">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-3xl font-black text-white tracking-tighter">Inbox</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Your personal messages and announcements from the studio.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white/[0.01] rounded-[2.5rem] border-2 border-dashed border-white/5 mt-8">
                <div className="bg-white/5 p-8 rounded-full mb-6">
                    <Inbox className="h-12 w-12 text-zinc-800" />
                </div>
                <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Your inbox is currently empty</p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-10">
      <aside className="w-full md:w-64">
        <h2 className="text-2xl font-black mb-8 px-2 text-white tracking-tighter uppercase">Falaq Corner</h2>
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={cn(
                'w-full flex items-center gap-4 h-12 px-4 rounded-2xl transition-all duration-500 border',
                activeSection === item.id
                  ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-white font-bold shadow-[0_0_25px_rgba(56,189,248,0.15)]'
                  : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              )}
            >
              <item.icon className={cn('h-5 w-5', activeSection === item.id ? 'text-sky-400' : 'text-zinc-600')} />
              <span className="text-sm tracking-tight">{item.label}</span>
              {activeSection === item.id && <ChevronRight className="ml-auto h-4 w-4 text-sky-400" />}
            </button>
          ))}
        </nav>
      </aside>
      
      <main className="flex-1 min-h-[700px] bg-white/[0.03] backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
         {/* Glass Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)] pointer-events-none" />
        <div className="relative z-10 h-full">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
