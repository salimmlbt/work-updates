

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
    getDaysInMonth,
    differenceInMinutes,
} from 'date-fns';

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
    const totalDaysInMonth = getDaysInMonth(selectedDate);

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
            .select('date, falaq_event_type')
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

    // 🧮 Calculate working days
    const leaveDates = new Set((holidays || []).filter(h => h.falaq_event_type === 'leave').map(h => h.date));
    const workingSundays = new Set((holidays || []).filter(h => h.falaq_event_type === 'working_sunday').map(h => h.date));
    
    let nonWorkingDaysCount = 0;
    allDaysInMonth.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const isSunday = getDay(day) === 0;

        if ((isSunday && !workingSundays.has(dayStr)) || leaveDates.has(dayStr)) {
            nonWorkingDaysCount++;
        }
    });

    const totalWorkingDays = totalDaysInMonth - nonWorkingDaysCount;

    // 🧮 Build salary data for each user
    const salaryData: SalaryData[] = (users || []).map((user) => {
        const userAttendance = (attendance || []).filter((a) => a.user_id === user.id);
        
        let fullDays = 0;
        let halfDays = 0;
        let totalExtraMinutes = 0;
        let totalMinutesWorked = 0;

        const workStartTime = user.work_start_time ? parse(user.work_start_time, 'HH:mm:ss', new Date()) : null;
        const workEndTime = user.work_end_time ? parse(user.work_end_time, 'HH:mm:ss', new Date()) : null;

        const expectedWorkHours = workStartTime && workEndTime 
            ? differenceInHours(workEndTime, workStartTime) - 1 // 1 hour lunch break
            : 8;

        userAttendance.forEach((att) => {
            if (att.check_in && att.check_out) {
                const checkInTime = new Date(att.check_in);
                const checkOutTime = new Date(att.check_out);
                
                let sessionMinutes = differenceInMinutes(checkOutTime, checkInTime);
                
                // Deduct 1 hour for lunch, regardless of actual break time
                sessionMinutes -= 60; 

                totalMinutesWorked += sessionMinutes;
                const actualWorkHours = sessionMinutes / 60;
                
                // Overtime calculation
                if (workEndTime) {
                    const expectedCheckOutDateTime = new Date(checkOutTime);
                    expectedCheckOutDateTime.setHours(workEndTime.getHours(), workEndTime.getMinutes(), workEndTime.getSeconds(), 0);

                    if(checkOutTime > expectedCheckOutDateTime) {
                        const overtimeMinutes = differenceInMinutes(checkOutTime, expectedCheckOutDateTime);
                        totalExtraMinutes += overtimeMinutes;
                    }
                }

                if (actualWorkHours >= expectedWorkHours) {
                    fullDays++;
                } else if (actualWorkHours > 0) {
                    halfDays++;
                }
            }
        });
        
        const presentDays = fullDays + halfDays;
        const absentDays = totalWorkingDays - presentDays;

        const monthlySalary = user.monthly_salary || 0;
        const perDaySalary = totalWorkingDays > 0 ? monthlySalary / totalWorkingDays : 0;
        const payableSalary = fullDays * perDaySalary + halfDays * (perDaySalary / 2);

        return {
            user: user as Profile,
            totalWorkingDays,
            totalFullDays: fullDays,
            totalHalfDays: halfDays,
            totalAbsentDays: absentDays > 0 ? absentDays : 0,
            monthlySalary,
            payableSalary,
            extraHours: totalExtraMinutes / 60,
            totalHours: totalMinutesWorked / 60,
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
