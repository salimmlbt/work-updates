
'use client'

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Wallet, FileText, Book } from 'lucide-react';

const sidebarNavItems = [
  { id: 'salary', label: 'Salary', icon: Wallet },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'petty-book', label: 'Petty Book', icon: Book },
];

export default function BillingPage() {
  const [activeView, setActiveView] = useState('salary');

  const renderContent = () => {
    switch (activeView) {
      case 'salary':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Salary</CardTitle>
              <CardDescription>Manage employee salaries and payments.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Salary management content will be displayed here.</p>
            </CardContent>
          </Card>
        );
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

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        <aside className="md:col-span-1">
          <nav className="space-y-1">
            {sidebarNavItems.map(item => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => setActiveView(item.id)}
                className={cn(
                  'w-full justify-start',
                  activeView === item.id
                    ? 'bg-muted font-semibold text-primary'
                    : 'hover:bg-accent'
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>
        <main className="md:col-span-4">
            {renderContent()}
        </main>
      </div>
    </div>
  );
}
