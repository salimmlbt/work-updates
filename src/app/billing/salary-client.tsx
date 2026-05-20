
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
import { getInitials, cn } from '@/lib/utils';
import type { Profile } from '@/lib/types';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
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
    totalHours: number;
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
        minimumFractionDigits: 0,
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
    <div className="h-full flex flex-col">
      <CardHeader className="p-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                <CardTitle className="text-4xl font-black text-white tracking-tighter">Payroll Statement</CardTitle>
                <CardDescription className="text-zinc-500 font-medium text-sm mt-1">Audit and process monthly employee compensation.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full p-1.5 shadow-2xl">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-400 hover:text-white" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-black w-36 text-center text-zinc-200">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-zinc-400 hover:text-white" onClick={handleNextMonth}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
                <Button variant="outline" className="rounded-full h-12 px-6 bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 transition-all font-bold">
                    <Download className="mr-2 h-4 w-4 text-sky-400" />
                    Statement
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 flex-1">
        <div className="border border-white/10 rounded-[2.5rem] overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/50">
            <Table>
            <TableHeader className="bg-white/5">
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                    <TableHead className="w-[280px] text-[10px] font-black uppercase tracking-widest text-zinc-500 py-5 pl-8">Studio Member</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Working</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Full</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Half</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Leaves</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Hours</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Extra</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Salary</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Payable</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {initialData.map((data) => (
                <TableRow key={data.user.id} className="group border-b border-white/5 hover:bg-white/[0.04] transition-all duration-300">
                    <TableCell className="py-4 pl-8">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 border border-white/10 group-hover:scale-105 transition-transform">
                                <AvatarImage src={data.user.avatar_url ?? undefined} alt={data.user.full_name ?? ''} />
                                <AvatarFallback className="bg-zinc-800 text-zinc-400 font-bold">{getInitials(data.user.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                                <p className="font-bold text-white tracking-tight truncate" title={data.user.full_name || ''}>{data.user.full_name}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight truncate" title={data.user.email || ''}>{data.user.email}</p>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-bold text-zinc-400">{data.totalWorkingDays}</TableCell>
                    <TableCell className="text-center text-sm font-bold text-emerald-400/80">{data.totalFullDays}</TableCell>
                    <TableCell className="text-center text-sm font-bold text-amber-400/80">{data.totalHalfDays}</TableCell>
                    <TableCell className="text-center text-sm font-bold text-rose-400/80">{data.totalAbsentDays}</TableCell>
                    <TableCell className="text-center text-sm font-black text-zinc-300">{formatHours(data.totalHours)}</TableCell>
                    <TableCell className="text-center text-sm font-black text-sky-400 tracking-tighter">{formatHours(data.extraHours)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-zinc-500">{formatCurrency(data.monthlySalary)}</TableCell>
                    <TableCell className="text-right pr-8">
                        <span className="text-lg font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                            {formatCurrency(data.payableSalary)}
                        </span>
                    </TableCell>
                </TableRow>
                ))}
                
                {initialData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={9} className="h-64 text-center">
                            <div className="flex flex-col items-center gap-2 opacity-10">
                                <FileText className="h-16 w-16 text-white" />
                                <p className="text-sm font-black uppercase tracking-[0.3em]">No salary data computed</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </div>
  );
}
