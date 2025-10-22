
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

type AttendanceWithProfile = Attendance & {
  profiles: Profile;
};

function formatTime(time: string | null): string {
  if (!time) return '-';
  try {
    return format(parseISO(time), 'hh:mm a');
  } catch (e) {
    return '-';
  }
}

function formatHours(hours: number | null): string {
  if (hours === null || typeof hours === 'undefined') return '-';
  return `${hours.toFixed(2)} hrs`;
}

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
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.map((item) => (
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
                <TableCell>{formatTime(item.check_in)}</TableCell>
                <TableCell>{formatTime(item.check_out)}</TableCell>
                <TableCell>{formatHours(item.total_hours)}</TableCell>
                <TableCell>{getStatus(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
