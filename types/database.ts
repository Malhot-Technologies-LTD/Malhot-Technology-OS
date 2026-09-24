/**
 * GENERATED — do not edit by hand.
 * Regenerate after every migration with `npm run db:types`
 * (requires SUPABASE_ACCESS_TOKEN; see docs/engineering/environment-variables.md).
 * Source: PostgREST schema of project moqmqosagtwlpxeqpknn, 2026-09-21 (migration 0006).
 * Hand-written for migration 0006 because the CLI could not be authenticated;
 * `npm run db:types` regenerates and CI's drift check confirms it.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          owner_id: string | null
          position: number
          project_id: string
          status: Database["public"]["Enums"]["goal_status"]
          success_criteria: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          owner_id?: string | null
          position: number
          project_id: string
          status?: Database["public"]["Enums"]["goal_status"]
          success_criteria?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          owner_id?: string | null
          position?: number
          project_id?: string
          status?: Database["public"]["Enums"]["goal_status"]
          success_criteria?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          budget_range: string | null
          company: string | null
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          ip_hash: string | null
          message: string
          name: string
          organization_id: string
          source_path: string | null
        }
        Insert: {
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          organization_id: string
          source_path?: string | null
        }
        Update: {
          budget_range?: string | null
          company?: string | null
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          organization_id?: string
          source_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_rate_limits: {
        Row: {
          count: number
          ip_hash: string
          window_start: string
        }
        Insert: {
          count?: number
          ip_hash: string
          window_start: string
        }
        Update: {
          count?: number
          ip_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_role: Database["public"]["Enums"]["org_role"]
          organization_id: string
          project_grants: Json
          revoked_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          org_role?: Database["public"]["Enums"]["org_role"]
          organization_id: string
          project_grants?: Json
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_role?: Database["public"]["Enums"]["org_role"]
          organization_id?: string
          project_grants?: Json
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          overdue_notified_at: string | null
          position: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          overdue_notified_at?: string | null
          position: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          overdue_notified_at?: string | null
          position?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      mvp_items: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          goal_id: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["priority"]
          project_id: string
          status: Database["public"]["Enums"]["mvp_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          goal_id?: string | null
          id?: string
          position: number
          priority?: Database["public"]["Enums"]["priority"]
          project_id: string
          status?: Database["public"]["Enums"]["mvp_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string
          status?: Database["public"]["Enums"]["mvp_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_items_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          preferences: Json
          timezone: string
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          preferences?: Json
          timezone?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          preferences?: Json
          timezone?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sequences: {
        Row: {
          bug_seq: number
          project_id: string
          task_seq: number
        }
        Insert: {
          bug_seq?: number
          project_id: string
          task_seq?: number
        }
        Update: {
          bug_seq?: number
          project_id?: string
          task_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          accepted_at: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["priority"]
          project_id: string
          seq: number
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id: string
          seq: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string
          seq?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_end_date: string | null
          archived_at: string | null
          client_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          health_override: Database["public"]["Enums"]["project_health"] | null
          health_override_at: string | null
          id: string
          key: string
          kind: Database["public"]["Enums"]["project_kind"]
          manager_id: string | null
          name: string
          organization_id: string
          priority: Database["public"]["Enums"]["priority"]
          qa_required: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_end_date: string | null
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          archived_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          health_override?: Database["public"]["Enums"]["project_health"] | null
          health_override_at?: string | null
          id?: string
          key: string
          kind?: Database["public"]["Enums"]["project_kind"]
          manager_id?: string | null
          name: string
          organization_id: string
          priority?: Database["public"]["Enums"]["priority"]
          qa_required?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          archived_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          health_override?: Database["public"]["Enums"]["project_health"] | null
          health_override_at?: string | null
          id?: string
          key?: string
          kind?: Database["public"]["Enums"]["project_kind"]
          manager_id?: string | null
          name?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          qa_required?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_uid: { Args: never; Returns: string }
      can_contribute: { Args: { project: string }; Returns: boolean }
      can_manage_project: { Args: { project: string }; Returns: boolean }
      is_org_admin: { Args: { org: string }; Returns: boolean }
      is_org_member: { Args: { org: string }; Returns: boolean }
      is_org_owner: { Args: { org: string }; Returns: boolean }
      is_project_member: { Args: { project: string }; Returns: boolean }
      next_project_sequence: { Args: { kind: string; project: string }; Returns: number }
      project_group_of: { Args: { project: string }; Returns: string }
      project_is_writable: { Args: { project: string }; Returns: boolean }
      project_org: { Args: { project: string }; Returns: string }
      project_role_of: {
        Args: { project: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      raise_malhot: {
        Args: { code: string; detail: string }
        Returns: undefined
      }
      shares_org_with: { Args: { other: string }; Returns: boolean }
      submit_inquiry: {
        Args: {
          p_budget_range: string
          p_company: string
          p_email: string
          p_ip_hash: string
          p_limit?: number
          p_message: string
          p_name: string
          p_source_path: string
        }
        Returns: string
      }
    }
    Enums: {
      bug_severity: "low" | "medium" | "high" | "critical"
      bug_status: "open" | "in_progress" | "fixed" | "retest" | "closed"
      deployment_env: "preview" | "staging" | "production"
      deployment_status: "pending" | "in_progress" | "success" | "failure"
      document_status: "draft" | "in_review" | "approved" | "archived"
      document_type:
        | "project_brief"
        | "requirements"
        | "mvp_specification"
        | "project_plan"
        | "meeting_notes"
        | "testing_report"
        | "deployment_report"
        | "final_report"
        | "other"
      entity_type:
        | "organization"
        | "member"
        | "project"
        | "goal"
        | "mvp_item"
        | "milestone"
        | "task"
        | "comment"
        | "attachment"
        | "test_case"
        | "test_run"
        | "test_result"
        | "bug"
        | "document"
        | "github_repository"
        | "github_pull_request"
        | "github_issue"
        | "deployment"
        | "inquiry"
      github_link_kind: "issue" | "pull_request"
      goal_status: "not_started" | "in_progress" | "achieved" | "dropped"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      issue_state: "open" | "closed"
      link_source: "auto" | "manual"
      mvp_item_status: "planned" | "in_progress" | "done" | "dropped"
      notification_type:
        | "task_assigned"
        | "mentioned"
        | "review_requested"
        | "testing_requested"
        | "task_overdue"
        | "project_updated"
        | "bug_assigned"
        | "document_review_requested"
        | "document_approved"
        | "inquiry_received"
      org_role: "owner" | "admin" | "member"
      pr_state: "open" | "closed" | "merged"
      priority: "low" | "medium" | "high" | "urgent"
      project_health: "on_track" | "at_risk" | "off_track"
      project_kind: "project" | "job"
      project_role:
        | "manager"
        | "developer"
        | "designer"
        | "qa"
        | "marketer"
        | "viewer"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "completed"
        | "archived"
      task_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "review"
        | "testing"
        | "done"
      test_result_status: "pass" | "fail" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bug_severity: ["low", "medium", "high", "critical"],
      bug_status: ["open", "in_progress", "fixed", "retest", "closed"],
      deployment_env: ["preview", "staging", "production"],
      deployment_status: ["pending", "in_progress", "success", "failure"],
      document_status: ["draft", "in_review", "approved", "archived"],
      document_type: [
        "project_brief",
        "requirements",
        "mvp_specification",
        "project_plan",
        "meeting_notes",
        "testing_report",
        "deployment_report",
        "final_report",
        "other",
      ],
      entity_type: [
        "organization",
        "member",
        "project",
        "goal",
        "mvp_item",
        "milestone",
        "task",
        "comment",
        "attachment",
        "test_case",
        "test_run",
        "test_result",
        "bug",
        "document",
        "github_repository",
        "github_pull_request",
        "github_issue",
        "deployment",
        "inquiry",
      ],
      github_link_kind: ["issue", "pull_request"],
      goal_status: ["not_started", "in_progress", "achieved", "dropped"],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      issue_state: ["open", "closed"],
      link_source: ["auto", "manual"],
      mvp_item_status: ["planned", "in_progress", "done", "dropped"],
      notification_type: [
        "task_assigned",
        "mentioned",
        "review_requested",
        "testing_requested",
        "task_overdue",
        "project_updated",
        "bug_assigned",
        "document_review_requested",
        "document_approved",
        "inquiry_received",
      ],
      org_role: ["owner", "admin", "member"],
      pr_state: ["open", "closed", "merged"],
      priority: ["low", "medium", "high", "urgent"],
      project_health: ["on_track", "at_risk", "off_track"],
      project_kind: ["project", "job"],
      project_role: [
        "manager",
        "developer",
        "designer",
        "qa",
        "marketer",
        "viewer",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "completed",
        "archived",
      ],
      task_status: [
        "backlog",
        "todo",
        "in_progress",
        "review",
        "testing",
        "done",
      ],
      test_result_status: ["pass", "fail", "blocked"],
    },
  },
} as const
