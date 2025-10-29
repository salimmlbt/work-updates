
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import BillingClient from './billing-client';
import { startOfMonth, endOfMonth, getDaysInMonth, differenceInHours, parse, format, subMonths, addMonths } from 'date-fns';

interface SalaryData {
    user: Profile;
    totalWorkingDays: number;
    totalFullDays: number;
    totalHalfDays: number;
    totalAbsentDays: number;
    monthlySalary: number;
    payableSalary: number;
}

export default async function BillingPage({ searchParams }: { searchParams: { month?: string } }) {
    const supabase = await createServerClient();
    const selectedDate = searchParams.month ? new Date(searchParams.month) : new Date();

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const daysInMonth = getDaysInMonth(selectedDate);
    const prevMonth = format(subMonths(selectedDate, 1), 'yyyy-MM');
    const nextMonth = format(addMonths(selectedDate, 1), 'yyyy-MM');

    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .neq('email', 'admin@falaq.com');

    if (usersError) {
        return <p>Error fetching users: {usersError.message}</p>
    }

    const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString());

    if (attendanceError) {
        return <p>Error fetching attendance: {attendanceError.message}</p>
    }

    const salaryData: SalaryData[] = users.map(user => {
        const userAttendance = attendance.filter(a => a.user_id === user.id);
        const presentDays = userAttendance.length;
        
        let fullDays = 0;
        let halfDays = 0;

        const workStartTime = user.work_start_time ? parse(user.work_start_time, 'HH:mm:ss', new Date()) : null;
        const workEndTime = user.work_end_time ? parse(user.work_end_time, 'HH:mm:ss', new Date()) : null;
        const expectedWorkHours = workStartTime && workEndTime ? differenceInHours(workEndTime, workStartTime) : 8;

        userAttendance.forEach(att => {
            if (att.total_hours) {
                if (att.total_hours >= expectedWorkHours) {
                    fullDays++;
                } else {
                    halfDays++;
                }
            }
        });

        const absentDays = daysInMonth - presentDays;

        // Placeholder salary logic
        const monthlySalary = 30000;
        const perDaySalary = monthlySalary / daysInMonth;
        const payableSalary = (fullDays * perDaySalary) + (halfDays * perDaySalary / 2);

        return {
            user: user as Profile,
            totalWorkingDays: daysInMonth,
            totalFullDays: fullDays,
            totalHalfDays: halfDays,
            totalAbsentDays: absentDays,
            monthlySalary,
            payableSalary,
        };
    });

    return <BillingClient 
        initialSalaryData={salaryData} 
        selectedDate={format(selectedDate, 'yyyy-MM-dd')}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
    />;
}
