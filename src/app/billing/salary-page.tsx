
import type { Profile } from '@/lib/types';
import SalaryClient from './salary-client';
import type { SalaryData } from './billing-client';

interface SalaryPageProps {
    initialData: SalaryData[];
}

export default function SalaryPage({ initialData }: SalaryPageProps) {
    return <SalaryClient initialData={initialData} />;
}
