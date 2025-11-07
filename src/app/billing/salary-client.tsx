

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SalaryData {
    user: Profile;
    totalWorkingDays: number;
    totalFullDays: number;
    totalHalfDays: number;
    totalAbsentDays: number;
    monthlySalary: number;
    payableSalary: number;
    extraHours: number;
}

interface SalaryClientProps {
  initialData: SalaryData[];
  selectedDate: string;
  prevMonth: string;
  nextMonth: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
};

const formatHours = (hours: number): string => {
  if (hours === null || typeof hours === 'undefined') return '0.00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function SalaryClient({ initialData, selectedDate, prevMonth, nextMonth }: SalaryClientProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));

  useEffect(() => {
    setCurrentDate(new Date(selectedDate));
  }, [selectedDate]);

  const handlePrevMonth = () => {
    router.push(`/billing?month=${prevMonth}`);
  };

  const handleNextMonth = () => {
    router.push(`/billing?month=${nextMonth}`);
  };

  return (
    <div>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Salary</CardTitle>
                <CardDescription>Manage employee salaries and payments.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold w-32 text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[200px]">User</TableHead>
                    <TableHead className="text-center">Total Working Days</TableHead>
                    <TableHead className="text-center">Full Days</TableHead>
                    <TableHead className="text-center">Half Days</TableHead>
                    <TableHead className="text-center">Absent Days</TableHead>
                    <TableHead className="text-center">Extra Hours</TableHead>
                    <TableHead className="text-right">Monthly Salary</TableHead>
                    <TableHead className="text-right">Payable Salary</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {initialData.map((data) => (
                <TableRow key={data.user.id} className="group">
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={data.user.avatar_url ?? undefined} alt={data.user.full_name ?? ''} />
                                <AvatarFallback>{getInitials(data.user.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <p className="font-semibold truncate" title={data.user.full_name || ''}>{data.user.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate" title={data.user.email || ''}>{data.user.email}</p>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-center">{data.totalWorkingDays}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{data.totalFullDays}</TableCell>
                    <TableCell className="text-center text-yellow-600 font-medium">{data.totalHalfDays}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{data.totalAbsentDays}</TableCell>
                    <TableCell className="text-center text-blue-600 font-medium">{formatHours(data.extraHours)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.monthlySalary)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(data.payableSalary)}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </div>
  );
}
