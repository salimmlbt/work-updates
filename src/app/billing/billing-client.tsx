
'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Wallet, FileText, Book, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SalaryPage from './salary-page';
import type { Profile } from '@/lib/types';

export interface SalaryData {
    user: Profile;
    totalWorkingDays: number;
    totalFullDays: number;
    totalHalfDays: number;
    totalAbsentDays: number;
    monthlySalary: number;
    payableSalary: number;
    extraHours: number;
    totalHours: number;
}

const sidebarNavItems = [
  { id: 'salary', label: 'Salary Management', icon: Wallet },
  { id: 'invoice', label: 'Client Invoices', icon: FileText },
  { id: 'petty-book', label: 'Petty Cash Book', icon: Book },
];

export default function BillingClient({ 
    initialSalaryData,
    selectedDate,
    prevMonth,
    nextMonth,
}: { 
    initialSalaryData: SalaryData[],
    selectedDate: string,
    prevMonth: string,
    nextMonth: string
}) {
  const [activeView, setActiveView] = useState('salary');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeView) {
      case 'salary':
        return <SalaryPage 
            initialData={initialSalaryData} 
            selectedDate={selectedDate}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
        />;
      case 'invoice':
        return (
          <div className="p-8">
            <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-12 text-center">
                <div className="bg-white/5 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-zinc-700" />
                </div>
                <CardTitle className="text-3xl font-black text-white tracking-tighter">Invoicing System</CardTitle>
                <p className="text-zinc-500 mt-2 font-medium max-w-sm mx-auto">Create and manage professional invoices for your studio clients. This module is currently under maintenance.</p>
            </Card>
          </div>
        );
      case 'petty-book':
        return (
          <div className="p-8">
            <Card className="border border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-12 text-center">
                <div className="bg-white/5 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <Book className="h-10 w-10 text-zinc-700" />
                </div>
                <CardTitle className="text-3xl font-black text-white tracking-tighter">Petty Cash</CardTitle>
                <p className="text-zinc-500 mt-2 font-medium max-w-sm mx-auto">Track small cash expenditures and office maintenance costs here. This module is currently under maintenance.</p>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  const NavItem = ({ item }: { item: typeof sidebarNavItems[0] }) => {
    const isActive = activeView === item.id;
    
    const linkContent = (
      <button
        onClick={() => setActiveView(item.id)}
        className={cn(
          'w-full flex items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-500 border',
          isActive
            ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/10 border-sky-500/20 text-white font-bold shadow-[0_0_25px_rgba(56,189,248,0.15)]'
            : 'border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
        )}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-sky-400' : 'text-zinc-600')} />
        <span className={cn('truncate transition-all duration-500 text-sm tracking-tight', isCollapsed ? 'opacity-0 w-0' : 'opacity-100')}>
            {item.label}
        </span>
        {isActive && !isCollapsed && <ChevronRight className="ml-auto h-4 w-4 text-sky-400" />}
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-white text-[10px] font-black uppercase tracking-widest">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return linkContent;
  };


  return (
    <div className="flex flex-1 h-full bg-[#0f0f0f]">
       <div className="relative border-r border-white/10 bg-white/[0.01]">
        <aside className={cn("transition-all duration-500 group z-10 h-full p-4", isCollapsed ? 'w-20' : 'w-72')}>
           <Button
              variant="ghost"
              size="icon"
              className="absolute -right-4 top-10 rounded-full border border-white/10 bg-[#0f0f0f] h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-800 text-white shadow-xl z-20"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft
                className={cn('h-4 w-4 transition-transform duration-500', isCollapsed && 'rotate-180')}
              />
            </Button>
          <h2 className={cn("text-2xl font-black text-white tracking-tighter mb-8 px-4 uppercase", isCollapsed && "hidden")}>Finance</h2>
          <TooltipProvider>
            <nav className={cn("space-y-2", isCollapsed && "flex flex-col items-center")}>
              {sidebarNavItems.map(item => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>
          </TooltipProvider>
        </aside>
       </div>
        <main className="flex-1 overflow-auto custom-scrollbar">
            {renderContent()}
        </main>
        
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
    </div>
  );
}
