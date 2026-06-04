import type { Database as DB } from './database.types';

export type Database = DB;

export type Project = DB['public']['Tables']['projects']['Row'];
export type Task = DB['public']['Tables']['tasks']['Row'];
export type Profile = Omit<DB['public']['Tables']['profiles']['Row'], 'role_id'> & {
    roles: Role | null;
    teams: { teams: Team | null }[];
    designation?: string | null;
    // Location-based attendance fields
    latitude?: number | null;
    longitude?: number | null;
    radius?: number | null;
    geofencing_enabled?: boolean;
    permitted_locations?: PermittedLocation[] | null;
};
export type Role = DB['public']['Tables']['roles']['Row'];
export type Team = DB['public']['Tables']['teams']['Row'];
export type Client = DB['public']['Tables']['clients']['Row'];
export type ProjectType = DB['public']['Tables']['project_types']['Row'];
export type AppSettings = DB['public']['Tables']['app_settings']['Row'];
export type OfficialHoliday = DB['public']['Tables']['official_holidays']['Row'];
export type Industry = DB['public']['Tables']['industries']['Row'];
export type WorkType = DB['public']['Tables']['work_types']['Row'];
export type Attendance = DB['public']['Tables']['attendance']['Row'] & {
  check_in_reason?: string | null;
};

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  created_at: string;
}

export interface PermittedLocation {
  id?: string; // id exists if it's a global office location
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface Leave {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string | null;
  status: LeaveStatus;
  created_at: string;
  approved_days?: string[] | null;
  day_type?: string | null;
}

export interface LeaveTypeConfig {
  id: string;
  label: string;
  leadTime: number; // minimum days from today
  color: 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'teal';
}

export type SubmissionType = 'original' | 'correction' | 'recreate' | 'scheduled' | 'posted' | 'completed';

export type SubmissionHistoryEntry = {
  date: string;
  type: SubmissionType;
};

export type TaskWithAssignee = Task & {
  profiles: DB['public']['Tables']['profiles']['Row'] | null;
};

export type TaskWithPriority = TaskWithAssignee & {
  priority?: "High" | "Medium" | "Low";
  reason?: string;
};

export type PermissionLevel = "Restricted" | "Viewer" | "Editor";

export type RoleWithPermissions = Omit<Role, 'permissions'> & {
    permissions: Record<string, PermissionLevel>;
};

export type Attachment = {
  path?: string;
  publicUrl: string;
  name: string;
  type?: 'file' | 'link';
}

export type Correction = {
  note: string;
  author_id: string;
  created_at: string;
};

export type Revisions = {
  corrections: number;
  recreations: number;
};

export type TaskWithDetails = Task & {
  profiles: Profile | null;
  projects: Project | null;
  clients: Client | null;
  attachments: Attachment[] | null;
  revisions: Revisions | null;
  corrections: Correction[] | null;
  submission_history?: SubmissionHistoryEntry[] | null;
}

export type ReportEntry = {
  id: string;
  task_id: string;
  user_id: string;
  submitted_at: string;
  final_status: string;
  is_correction_cycle: boolean;
};

export type TaskStatusHistory = {
  id: string;
  task_id: string;
  from_status: string;
  to_status: string;
  changed_at: string;
};

export type Notification = {
    id: string;
    type: 'new' | 'deadline' | 'review' | 'approved' | 'correction' | 'recreate' | 'leave_approved' | 'leave_rejected';
    title: string;
    description: string;
}

export type WorkTypeStatusConfig = Record<string, string[]>;
