'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Inbox, Send, ChevronRight } from 'lucide-react';
import { LeaveSection } from './leave-section';
import type { Profile } from '@/lib/types';

type Section = 'leave' | 'request-center' | 'inbox';

export default function FalaqCornerClient({ profile }: { profile: Profile }) {
  const [activeSection, setActiveSection] = useState<Section>('leave');

  const navigationItems = [
    { id: 'leave', label: 'Leave Center', icon: FileText },
    { id: 'request-center', label: 'Request Hub', icon: Send },
    { id: 'inbox', label: 'Studio Inbox', icon: Inbox },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'leave':
        return <LeaveSection profile={profile} />;
      case 'request-center':
        return (
          <Card className="border-0 shadow-none bg-transparent h-full">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase">Request Hub</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Submit and track official studio requests through our digital portal.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <Button variant="outline" className="h-44 flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-sky-500/30 transition-all group shadow-2xl backdrop-blur-xl">
                    <div className="h-16 w-16 rounded-2xl bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(56,189,248,0.2)]">
                        <Send className="h-8 w-8 text-sky-400" />
                    </div>
                    <span className="font-black text-white uppercase tracking-widest text-[10px]">Log General Request</span>
                </Button>
                <Button variant="outline" className="h-44 flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all group shadow-2xl backdrop-blur-xl">
                    <div className="h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                        <FileText className="h-8 w-8 text-purple-400" />
                    </div>
                    <span className="font-black text-white uppercase tracking-widest text-[10px]">Asset Requisition</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      case 'inbox':
        return (
          <Card className="border-0 shadow-none bg-transparent h-full">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase">Studio Inbox</CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Internal announcements and secure messages for your eyes only.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.01] rounded-[3rem] border-2 border-dashed border-white/5 mt-8">
                <div className="bg-white/5 p-12 rounded-full mb-8 shadow-[0_0_50px_rgba(255,255,255,0.02)]">
                    <Inbox className="h-16 w-16 text-zinc-800" />
                </div>
                <p className="text-zinc-600 font-black uppercase tracking-[0.4em] text-[9px]">Awaiting new communications</p>
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
      <aside className="w-full md:w-72 shrink-0">
        <h2 className="text-3xl font-black mb-10 px-2 text-white tracking-tighter uppercase">Falaq Corner</h2>
        <nav className="space-y-3">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as Section)}
              className={cn(
                'w-full flex items-center gap-5 h-14 px-5 rounded-2xl transition-all duration-500 border backdrop-blur-md relative overflow-hidden group',
                activeSection === item.id
                  ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-white font-black shadow-[0_0_30px_rgba(56,189,248,0.15)]'
                  : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              )}
            >
              <item.icon className={cn('h-5 w-5 transition-colors duration-500', activeSection === item.id ? 'text-sky-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
              <span className="text-xs uppercase tracking-widest">{item.label}</span>
              {activeSection === item.id && (
                <div className="absolute right-4">
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                </div>
              )}
            </button>
          ))}
        </nav>
      </aside>
      
      <main className="flex-1 min-h-[750px] bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.7)] relative overflow-hidden">
         {/* Glass Overlay with Dynamic Wash */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-sky-500/5 blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 h-full flex flex-col">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
