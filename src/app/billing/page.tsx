
'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Wallet, FileText, Book, ChevronLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SalaryPage from './salary-page';

const sidebarNavItems = [
  { id: 'salary', label: 'Salary', icon: Wallet },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'petty-book', label: 'Petty Book', icon: Book },
];

export default function BillingPage() {
  const [activeView, setActiveView] = useState('salary');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeView) {
      case 'salary':
        return <SalaryPage />;
      case 'invoice':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
              <CardDescription>Create and manage client invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Invoice management content will be displayed here.</p>
            </CardContent>
          </Card>
        );
      case 'petty-book':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Petty Book</CardTitle>
              <CardDescription>Track small cash expenditures.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Petty book content will be displayed here.</p>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const NavItem = ({ item }: { item: typeof sidebarNavItems[0] }) => {
    const linkContent = (
      <Button
        variant="ghost"
        onClick={() => setActiveView(item.id)}
        className={cn(
          'w-full justify-start gap-2',
          activeView === item.id
            ? 'bg-muted font-semibold text-primary'
            : 'hover:bg-accent'
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span className={cn('truncate transition-opacity duration-300', isCollapsed && 'opacity-0 hidden')}>{item.label}</span>
      </Button>
    );

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return linkContent;
  };


  return (
    <div className="flex h-full">
       <div className="relative">
        <aside className={cn("bg-background transition-all duration-300 group z-10 border-r", isCollapsed ? 'w-20' : 'w-64')}>
           <Button
              variant="ghost"
              size="icon"
              className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full border bg-background h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-muted"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft
                className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')}
              />
            </Button>
          <TooltipProvider>
            <nav className={cn("space-y-1 p-2", isCollapsed && "flex flex-col items-center")}>
              {sidebarNavItems.map(item => (
                <NavItem key={item.id} item={item} />
              ))}
            </nav>
          </TooltipProvider>
        </aside>
       </div>
        <main className="flex-1 p-4 md:p-8 lg:p-10">
            {renderContent()}
        </main>
    </div>
  );
}
