
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
      clients: {
        Row: {
          id: string
          created_at: string
          name: string
          avatar: string
          industry: string
          contact: string
          whatsapp: string | null
          projects_count: number | null
          tasks_count: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          avatar: string
          industry: string
          contact: string
          whatsapp?: string | null
          projects_count?: number | null
          tasks_count?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          avatar?: string
          industry?: string
          contact?: string
          whatsapp?: string | null
          projects_count?: number | null
          tasks_count?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          start_date: string | null
          due_date: string | null
          client_id: string | null
          status: string | null
          priority: string | null
          leaders: string[] | null
          members: string[] | null
          type: string | null
          is_deleted: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          start_date?: string | null
          due_date?: string | null
          client_id?: string | null
          status?: string | null
          priority?: string | null
          leaders?: string[] | null
          members?: string[] | null
          type?: string | null
          is_deleted?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          start_date?: string | null
          due_date?: string | null
          client_id?: string | null
          status?: string | null
          priority?: string | null
          leaders?: string[] | null
          members?: string[] | null
          type?: string | null
          is_deleted?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      project_types: {
        Row: {
          id: string
          created_at: string
          name: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          role_id: string | null
          status: string | null
          is_archived: boolean
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role_id?: string | null
          status?: string | null
          is_archived?: boolean
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role_id?: string | null
          status?: string | null
          is_archived?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_teams_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          }
        ]
      }
      roles: {
        Row: {
          id: string
          created_at: string
          name: string
          permissions: Json
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          permissions: Json
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          permissions?: Json
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          deadline: string
          description: string
          id: string
          project_id: string | null
          client_id: string | null
          status: "todo" | "inprogress" | "done"
          tags: string[] | null
          type: string | null
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          deadline: string
          description: string
          id?: string
          project_id?: string | null
          client_id?: string | null
          status?: "todo" | "inprogress" | "done"
          tags?: string[] | null
          type?: string | null
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          deadline?: string
          description?: string
          id?: string
          project_id?: string | null
          client_id?: string | null
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
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
           {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      teams: {
        Row: {
          id: string
          created_at: string
          name: string
          default_tasks: string[] | null
          owner_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          default_tasks?: string[] | null
          owner_id: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          default_tasks?: string[] | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
