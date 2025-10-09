
import type { Database as DB } from './database.types';

export type Database = DB;

export type Project = DB['public']['Tables']['projects']['Row'];
export type Task = DB['public']['Tables']['tasks']['Row'];
export type Profile = DB['public']['Tables']['profiles']['Row'] & {
    roles: Role | null;
    teams: Team | null;
};
export type Role = DB['public']['Tables']['roles']['Row'];
export type Team = DB['public']['Tables']['teams']['Row'];
export type Client = DB['public']['Tables']['clients']['Row'];
export type ProjectType = DB['public']['Tables']['project_types']['Row'];

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

    