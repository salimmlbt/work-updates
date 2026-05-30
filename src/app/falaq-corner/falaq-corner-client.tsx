'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Inbox, Send, Calendar as CalendarIcon } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { LeaveSection } from './leave-section';

export default function FalaqCornerClient({ profile }: { profile: Profile }) {
  const [activeSection, setActiveSection] = useState<'leave-center' | 'request-center' | 'inbox'>('leave-center');

  const nav = [
    { id: 'leave-center', label: 'Leave Center', icon: CalendarIcon },
    { id: 'request-center', label: 'Request Hub', icon: Send },
    { id: 'inbox', label: 'Studio Inbox', icon: Inbox },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'leave-center':
        return <LeaveSection profile={profile} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-10 bg-[#05050a]">
            <div className="bg-white/5 p-12 rounded-[3rem] mb-8 border border-white/5 shadow-2xl">
                {activeSection === 'request-center' ? <Send className="h-16 w-16 text-zinc-800" /> : <Inbox className="h-16 w-16 text-zinc-800" />}
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Section Under Maintenance</h3>
            <p className="text-zinc-500 mt-2 font-medium">This module will be online in the next studio update.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-10 h-[calc(100vh-140px)] bg-[#05050a] items-start overflow-hidden pr-2">
      {/* 🚀 INDEPENDENT FIXED SIDEBAR */}
      <aside className="w-full md:w-72 shrink-0 z-20 transition-all duration-300">
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
              <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              {activeSection === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-r-full shadow-[0_0_10px_#0ea5e9]" />
              )}
            </button>
          ))}
        </nav>
      </aside>
      
      {/* 🔮 MAIN SCROLLABLE CONTENT */}
      <main className="flex-1 h-full bg-zinc-950/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.7)] relative overflow-y-auto custom-scrollbar">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
        <div className="relative z-10 h-full flex flex-col">
            {renderContent()}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
      `}</style>
    </div>
  );
}
