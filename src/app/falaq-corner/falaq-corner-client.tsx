'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Inbox, Send, Calendar as CalendarIcon, Plus } from 'lucide-react';
import type { Profile } from '@/lib/types';
import { LeaveSection } from './leave-section';
import GlowBackground from './glow-background';

export default function FalaqCornerClient({ profile }: { profile: Profile }) {
  const [activeSection, setActiveSection] = useState<'leave-center' | 'request-center' | 'inbox'>('leave-center');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);

  const nav = [
    { id: 'leave-center', label: 'Leave Center', icon: CalendarIcon },
    { id: 'request-center', label: 'Request Hub', icon: Send },
    { id: 'inbox', label: 'Studio Inbox', icon: Inbox },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'leave-center':
        return <LeaveSection profile={profile} isApplyDialogOpen={isApplyDialogOpen} setIsApplyDialogOpen={setIsApplyDialogOpen} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-10 bg-[#05050a]/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 mx-1">
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
    <div className="relative h-[calc(100vh-140px)] flex flex-col md:flex-row gap-10 bg-[#05050a] items-start overflow-hidden">
      {/* 🌌 FIXED BACKGROUND - Truly locked to viewport */}
      <div className="fixed inset-0 z-0">
        <GlowBackground />
      </div>

      {/* 🚀 INDEPENDENT FIXED SIDEBAR */}
      <aside className="relative w-full md:w-72 shrink-0 z-20 transition-all duration-300">
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
      
      {/* 🔮 MAIN DYNAMIC CONTENT AREA */}
      <main className="flex-1 h-full relative z-10 min-w-0">
          {renderContent()}
      </main>

      {/* 🛠️ VIEWPORT-FIXED FAB - Locked to Bottom-Right */}
      {activeSection === 'leave-center' && (
        <div className="fixed bottom-10 right-10 z-[100]">
          <button
            onClick={() => setIsApplyDialogOpen(true)}
            className="group h-16 md:h-20 rounded-full px-8 md:px-12 bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-600 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_20px_60px_rgba(59,130,246,0.5)] border border-white/20 backdrop-blur-xl text-white font-black uppercase tracking-[0.2em] text-xs flex items-center gap-4 cursor-pointer"
          >
            <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-500" />
            <span className="hidden sm:inline">Apply for Leave</span>
          </button>
        </div>
      )}
    </div>
  );
}