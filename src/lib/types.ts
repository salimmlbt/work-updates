
import type { Database as DB } from './database.types';

export type Database = DB;

export type Project = DB['public']['Tables']['projects']['Row'];
export type Task = DB['public']['Tables']['tasks']['Row'] & { status_updated_at?: string };
export type Profile = Omit<DB['public']['Tables']['profiles']['Row'], 'role_id'> & {
    roles: Role | null;
    teams: { teams: Team | null }[];
};
export type Role = DB['public']['Tables']['roles']['Row'];
export type Team = DB['public']['Tables']['teams']['Row'];
export type Client = DB['public']['Tables']['clients']['Row'];
export type ProjectType = DB['public']['Tables']['project_types']['Row'];
export type AppSettings = DB['public']['Tables']['app_settings']['Row'];
export type OfficialHoliday = DB['public']['Tables']['official_holidays']['Row'];
export type Industry = DB['public']['Tables']['industries']['Row'];
export type WorkType = DB['public']['Tables']['work_types']['Row'];
export type ContentSchedule = DB['public']['Tables']['content_schedules']['Row'];


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
  path: string;
  publicUrl: string;
  name: string;
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
  status_updated_at: string | null;
}

export type Notification = {
    id: string;
    type: 'new' | 'deadline' | 'review';
    title: string;
    description: string;
}
