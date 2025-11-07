
'use client';

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
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Attendance, Profile } from '@/lib/types';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type AttendanceWithProfile = Attendance & {
  profiles: Profile;
  extra_hours: number;
};

function TimeDisplay({ time }: { time: string | null }) {
  const [formattedTime, setFormattedTime] = useState('-');

  useEffect(() => {
    if (time) {
      try {
        const localTime = new Date(time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setFormattedTime(localTime);
      } catch (e) {
        setFormattedTime('-');
      }
    } else {
      setFormattedTime('-');
    }
  }, [time]);

  return <>{formattedTime}</>;
}


function formatHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined') return '-';
  return `${hours.toFixed(2)} hrs`;
}

function formatExtraHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined' || hours <= 0) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

function getStatus(attendance: AttendanceWithProfile) {
  if (attendance.check_in && !attendance.check_out) {
    return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Present</Badge>;
  }
  if (attendance.check_in && attendance.check_out) {
    return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300">Completed</Badge>;
  }
  return <Badge variant="destructive">Absent</Badge>;
}

export default function AttendanceClient({ initialData }: { initialData: AttendanceWithProfile[] }) {
  const router = useRouter();
  const [attendanceList, setAttendanceList] = useState(initialData);

  useEffect(() => {
    setAttendanceList(initialData);
  }, [initialData]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('realtime-attendance-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
           setAttendanceList((prevList) => {
            const newList = [...prevList];
            const record = payload.new as Attendance;
            const index = newList.findIndex(item => item.user_id === record.user_id);
            if (index !== -1) {
              const profile = newList[index].profiles;
               // Note: extra_hours won't be live updated here without a re-fetch or recalculation
              newList[index] = {
                ...record,
                profiles: profile,
                extra_hours: newList[index].extra_hours, 
              } as AttendanceWithProfile;
            }
            return newList;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRowClick = (userId: string) => {
    router.push(`/attendance/${userId}`);
  };

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Today's attendance for all team members.</p>
      </header>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">User</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Extra Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceList.map((item) => (
              <TableRow 
                key={item.user_id} 
                onClick={() => handleRowClick(item.user_id)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={item.profiles.avatar_url ?? undefined} alt={item.profiles.full_name ?? ''} />
                      <AvatarFallback>{getInitials(item.profiles.full_name)}</AvatarFallback>
                    </Avatar>
                    {item.profiles.full_name}
                  </div>
                </TableCell>
                <TableCell><TimeDisplay time={item.check_in} /></TableCell>
                <TableCell><TimeDisplay time={item.check_out} /></TableCell>
                <TableCell>{formatHours(item.total_hours)}</TableCell>
                <TableCell className="text-blue-600 font-medium">{formatExtraHours(item.extra_hours)}</TableCell>
                <TableCell>{getStatus(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
