
import { createServerClient } from '@/lib/supabase/server';
import type { Profile, OfficialHoliday } from '@/lib/types';
import BillingClient from './billing-client';
import { startOfMonth, endOfMonth, getDaysInMonth, differenceInHours, parse, format, subMonths, addMonths, eachDayOfInterval, getDay } from 'date-fns';

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
    const selectedDate = searchParams.month ? new Date(`${searchParams.month}-01T00:00:00Z`) : new Date();

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const daysInMonth = getDaysInMonth(selectedDate);
    const prevMonth = format(subMonths(selectedDate, 1), 'yyyy-MM');
    const nextMonth = format(addMonths(selectedDate, 1), 'yyyy-MM');
    
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const [
        usersRes,
        attendanceRes,
        holidaysRes
    ] = await Promise.all([
        supabase.from('profiles').select('*').neq('email', 'admin@falaq.com'),
        supabase.from('attendance').select('*').gte('date', format(monthStart, 'yyyy-MM-dd')).lte('date', format(monthEnd, 'yyyy-MM-dd')),
        supabase.from('official_holidays').select('date, type, is_deleted').gte('date', format(monthStart, 'yyyy-MM-dd')).lte('date', format(monthEnd, 'yyyy-MM-dd')),
    ]);

    const { data: users, error: usersError } = usersRes;
    const { data: attendance, error: attendanceError } = attendanceRes;
    const { data: holidays, error: holidaysError } = holidaysRes;

    if (usersError) return <p>Error fetching users: {usersError.message}</p>
    if (attendanceError) return <p>Error fetching attendance: {attendanceError.message}</p>
    if (holidaysError) return <p>Error fetching holidays: {holidaysError.message}</p>

    const nonWorkingDates = new Set<string>();
    holidays.forEach(h => {
        // A day is non-working if it's an explicit leave OR it's a weekend that has NOT been deleted.
        if (h.type === 'leave') {
            nonWorkingDates.add(h.date);
        } else if (h.type === 'weekend' && !h.is_deleted) {
            nonWorkingDates.add(h.date);
        }
    });

    const totalWorkingDays = daysInMonth - nonWorkingDates.size;

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

        const absentDays = totalWorkingDays - presentDays;

        // Placeholder salary logic
        const monthlySalary = 30000;
        const perDaySalary = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
        const payableSalary = (fullDays * perDaySalary) + (halfDays * perDaySalary / 2);

        return {
            user: user as Profile,
            totalWorkingDays,
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
