
'use client';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface SalaryData {
    user: Profile;
    totalWorkingDays: number;
    totalFullDays: number;
    totalHalfDays: number;
    totalAbsentDays: number;
    monthlySalary: number;
    payableSalary: number;
}

interface SalaryClientProps {
  initialData: SalaryData[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
};

export default function SalaryClient({ initialData }: SalaryClientProps) {

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Salary</CardTitle>
                <CardDescription>Manage employee salaries and payments for the current month.</CardDescription>
            </div>
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Data
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
            <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[250px]">User</TableHead>
                    <TableHead className="text-center">Total Working Days</TableHead>
                    <TableHead className="text-center">Total Full Days</TableHead>
                    <TableHead className="text-center">Total Half Days</TableHead>
                    <TableHead className="text-center">Total Absent Days</TableHead>
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
                    <TableCell className="text-right">{formatCurrency(data.monthlySalary)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(data.payableSalary)}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
