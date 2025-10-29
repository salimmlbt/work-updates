
import type { Profile } from '@/lib/types';
import SalaryClient from './salary-client';
import type { SalaryData } from './billing-client';

interface SalaryPageProps {
    initialData: SalaryData[];
    selectedDate: string;
    prevMonth: string;
    nextMonth: string;
}

export default function SalaryPage({ initialData, selectedDate, prevMonth, nextMonth }: SalaryPageProps) {
    return <SalaryClient 
        initialData={initialData} 
        selectedDate={selectedDate}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
    />;
}
