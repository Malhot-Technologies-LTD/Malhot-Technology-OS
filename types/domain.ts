import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/types/database";

// Narrow re-exports of generated types. Add rows here as tables land in migrations.
export type Organization = Tables<"organizations">;
export type Profile = Tables<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;
export type OrganizationMember = Tables<"organization_members">;
export type Invitation = Tables<"invitations">;
export type InvitationInsert = TablesInsert<"invitations">;
export type Client = Tables<"clients">;
export type Project = Tables<"projects">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectUpdate = TablesUpdate<"projects">;
export type ProjectMember = Tables<"project_members">;
export type Goal = Tables<"goals">;
export type MvpItem = Tables<"mvp_items">;
export type Milestone = Tables<"milestones">;
export type ProjectDocument = Tables<"project_documents">;
export type ProjectShowcase = Tables<"project_showcases">;
export type ProjectShowcaseImage = Tables<"project_showcase_images">;

export type OrgRole = Enums<"org_role">;
/**
 * A grant on top of an organisation role (docs/product/user-roles.md#duties):
 * a member who runs the company's social media is still a member everywhere else.
 */
export const DUTIES = ["social_media"] as const;
export type Duty = (typeof DUTIES)[number];
export type ProjectRole = Enums<"project_role">;
export type ProjectStatus = Enums<"project_status">;
export type ProjectKind = Enums<"project_kind">;
export type GoalStatus = Enums<"goal_status">;
export type MvpItemStatus = Enums<"mvp_item_status">;
export type ProjectHealth = Enums<"project_health">;
export type Priority = Enums<"priority">;
export type TaskStatus = Enums<"task_status">;
export type BugStatus = Enums<"bug_status">;
export type DocumentStatus = Enums<"document_status">;
export type DocumentType = Enums<"document_type">;
