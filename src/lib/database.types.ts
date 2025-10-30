
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          key: string
          value: Json | null
        }
        Insert: {
          id?: number
          key: string
          value?: Json | null
        }
        Update: {
          id?: number
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          date: string
          id: string
          lunch_in: string | null
          lunch_out: string | null
          total_hours: number | null
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          date: string
          id?: string
          lunch_in?: string | null
          lunch_out?: string | null
          total_hours?: number | null
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          date?: string
          id?: string
          lunch_in?: string | null
          lunch_out?: string | null
          total_hours?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avatar: string
          contact: string
          created_at: string
          id: string
          industry: string
          name: string
          projects_count: number | null
          tasks_count: number | null
          whatsapp: string | null
        }
        Insert: {
          avatar: string
          contact: string
          created_at?: string
          id?: string
          industry: string
          name: string
          projects_count?: number | null
          tasks_count?: number | null
          whatsapp?: string | null
        }
        Update: {
          avatar?: string
          contact?: string
          created_at?: string
          id?: string
          industry?: string
          name?: string
          projects_count?: number | null
          tasks_count?: number | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      official_holidays: {
        Row: {
          created_at: string
          date: string
          description: string | null
          falaq_event_type: "leave" | "event" | "meeting" | "working_sunday" | null
          id: number
          is_deleted: boolean
          name: string
          type: "official" | "personal" | "special_day"
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          falaq_event_type?: "leave" | "event" | "meeting" | "working_sunday" | null
          id?: number
          is_deleted?: boolean
          name: string
          type: "official" | "personal" | "special_day"
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          falaq_event_type?: "leave" | "event" | "meeting" | "working_sunday" | null
          id?: number
          is_deleted?: boolean
          name?: string
          type?: "official" | "personal" | "special_day"
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "official_holidays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_teams: {
        Row: {
          profile_id: string
          team_id: string
        }
        Insert: {
          profile_id: string
          team_id: string
        }
        Update: {
          profile_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_teams_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthday: string | null
          contact: string | null
          email: string | null
          full_name: string | null
          id: string
          instagram: string | null
          is_archived: boolean
          linkedin: string | null
          role_id: string | null
          status: string | null
          work_end_time: string | null
          work_start_time: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          contact?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          instagram?: string | null
          is_archived?: boolean
          linkedin?: string | null
          role_id?: string | null
          status?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          contact?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_archived?: boolean
          linkedin?: string | null
          role_id?: string | null
          status?: string | null
          work_end_time?: string | null
          work_start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_types: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          is_deleted: boolean
          leaders: string[] | null
          members: string[] | null
          name: string
          priority: string | null
          start_date: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          leaders?: string[] | null
          members?: string[] | null
          name: string
          priority?: string | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_deleted?: boolean
          leaders?: string[] | null
          members?: string[] | null
          name?: string
          priority?: string | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          permissions: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          attachments: Json | null
          client_id: string | null
          created_at: string
          deadline: string
          description: string
          id: string
          is_deleted: boolean
          project_id: string | null
          rich_description: Json | null
          status: "todo" | "inprogress" | "done"
          tags: string[] | null
          type: string | null
        }
        Insert: {
          assignee_id?: string | null
          attachments?: Json | null
          client_id?: string | null
          created_at?: string
          deadline: string
          description: string
          id?: string
          is_deleted?: boolean
          project_id?: string | null
          rich_description?: Json | null
          status?: "todo" | "inprogress" | "done"
          tags?: string[] | null
          type?: string | null
        }
        Update: {
          assignee_id?: string | null
          attachments?: Json | null
          client_id?: string | null
          created_at?: string
          deadline?: string
          description?: string
          id?: string
          is_deleted?: boolean
          project_id?: string | null
          rich_description?: Json | null
          status?: "todo" | "inprogress" | "done"
          tags?: string[] | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          default_tasks: string[] | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          default_tasks?: string[] | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          default_tasks?: string[] | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_project_and_tasks: {
        Args: {
          p_id: string
        }
        Returns: undefined
      }
      schedule_task_attachment_deletion: {
        Args: {
          p_task_id: string
          p_delay_seconds: number
        }
        Returns: undefined
      }
    }
    Enums: {
      falaq_event_type: "leave" | "event" | "meeting" | "working_sunday"
      task_status: "todo" | "inprogress" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
