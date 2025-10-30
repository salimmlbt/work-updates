import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';
import BillingClient from './billing-client';
import {
    startOfMonth,
    endOfMonth,
    format,
    subMonths,
    addMonths,
    eachDayOfInterval,
    getDay,
    parse,
    differenceInHours,
} from 'date-fns';

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
    const selectedDate = searchParams.month
        ? new Date(`${searchParams.month}-01T00:00:00Z`)
        : new Date();

    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const prevMonth = format(subMonths(selectedDate, 1), 'yyyy-MM');
    const nextMonth = format(addMonths(selectedDate, 1), 'yyyy-MM');

    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 🟦 Fetch data
    const [usersRes, attendanceRes, holidaysRes] = await Promise.all([
        supabase.from('profiles').select('*').neq('email', 'admin@falaq.com'),
        supabase
            .from('attendance')
            .select('*')
            .gte('date', format(monthStart, 'yyyy-MM-dd'))
            .lte('date', format(monthEnd, 'yyyy-MM-dd')),
        supabase
            .from('official_holidays')
            .select('date')
            .eq('type', 'leave')
            .eq('is_deleted', false)
            .gte('date', format(monthStart, 'yyyy-MM-dd'))
            .lte('date', format(monthEnd, 'yyyy-MM-dd')),
    ]);

    const { data: users, error: usersError } = usersRes;
    const { data: attendance, error: attendanceError } = attendanceRes;
    const { data: holidays, error: holidaysError } = holidaysRes;

    if (usersError) return <p>Error fetching users: {usersError.message}</p>;
    if (attendanceError) return <p>Error fetching attendance: {attendanceError.message}</p>;
    if (holidaysError) return <p>Error fetching holidays: {holidaysError.message}</p>;

    const leaveDates = new Set((holidays || []).map(h => h.date));

    // 🟥 Calculate working days: exclude Sundays and leave days
    const totalWorkingDays = allDaysInMonth.filter((day) => {
        const isSunday = getDay(day) === 0;
        const dayStr = format(day, 'yyyy-MM-dd');
        const isLeave = leaveDates.has(dayStr);
        return !isSunday && !isLeave;
    }).length;


    // 🧮 Build salary data
    const salaryData: SalaryData[] = users.map((user) => {
        const userAttendance = attendance.filter((a) => a.user_id === user.id);
        const presentDays = userAttendance.length;

        let fullDays = 0;
        let halfDays = 0;

        const workStartTime = user.work_start_time
            ? parse(user.work_start_time, 'HH:mm:ss', new Date())
            : null;
        const workEndTime = user.work_end_time
            ? parse(user.work_end_time, 'HH:mm:ss', new Date())
            : null;

        const expectedWorkHours =
            workStartTime && workEndTime ? differenceInHours(workEndTime, workStartTime) : 8;

        userAttendance.forEach((att) => {
            if (att.total_hours) {
                if (att.total_hours >= expectedWorkHours) {
                    fullDays++;
                } else {
                    halfDays++;
                }
            }
        });

        const absentDays = totalWorkingDays - presentDays;

        // 🟩 Salary logic (can be replaced with your real data)
        const monthlySalary = 30000;
        const perDaySalary = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
        const payableSalary = fullDays * perDaySalary + halfDays * (perDaySalary / 2);

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

    return (
        <BillingClient
            initialSalaryData={salaryData}
            selectedDate={format(selectedDate, 'yyyy-MM-dd')}
            prevMonth={prevMonth}
            nextMonth={nextMonth}
        />
    );
}
