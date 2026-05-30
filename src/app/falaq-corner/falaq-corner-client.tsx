'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Inbox, Send } from 'lucide-react';
import { LeaveSection } from './leave-section';
import type { Profile } from '@/lib/types';

export default function FalaqCornerClient({ profile }: { profile: Profile }) {
  const [activeSection, setActiveSection] = useState<'leave' | 'request-center' | 'inbox'>('leave');

  const nav = [
    { id: 'leave', label: 'Leave Center', icon: FileText },
    { id: 'request-center', label: 'Request Hub', icon: Send },
    { id: 'inbox', label: 'Studio Inbox', icon: Inbox },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-10">
      <aside className="w-full md:w-72 shrink-0">
        <h2 className="text-3xl font-black mb-10 px-2 text-white tracking-tighter uppercase">Falaq Corner</h2>
        <nav className="space-y-3">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={cn(
                'w-full flex items-center gap-5 h-14 px-5 rounded-2xl transition-all duration-500 border backdrop-blur-md relative group',
                activeSection === item.id
                  ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-white font-black shadow-[0_0_30px_rgba(56,189,248,0.15)]'
                  : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              )}
            >
              <item.icon className={cn('h-5 w-5', activeSection === item.id ? 'text-sky-400' : 'text-zinc-600')} />
              <span className="text-xs uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      
      <main className="flex-1 min-h-[750px] bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.7)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
        <div className="relative z-10 h-full flex flex-col">
            {activeSection === 'leave' ? <LeaveSection profile={profile} /> : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="bg-white/5 p-12 rounded-[3rem] mb-8 border border-white/5 shadow-2xl">
                    <Inbox className="h-16 w-16 text-zinc-800" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Section Under Maintenance</h3>
                <p className="text-zinc-500 mt-2 font-medium">This module will be online in the next studio update.</p>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
