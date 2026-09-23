import type { ProjectRole } from "@/types/domain";

/**
 * What a project role means, in one place.
 *
 * Written for the person holding it — what they can do, not how the system
 * models it — so the same words work in the assign control, the team list and
 * anywhere a role is explained. The order is the order people are usually added
 * in, not alphabetical.
 *
 * These descriptions must agree with `can()` in lib/permissions.ts; that matrix
 * is the enforcement, this is the vocabulary.
 */
export const PROJECT_ROLE_META: Record<ProjectRole, { label: string; summary: string }> = {
  manager: {
    label: "Manager",
    summary: "Runs the project: edits it, changes status, manages the team",
  },
  developer: {
    label: "Developer",
    summary: "Builds the work: takes tasks, moves them, logs against them",
  },
  designer: {
    label: "Designer",
    summary: "Designs the work: takes tasks, attaches designs, moves them",
  },
  qa: {
    label: "QA",
    summary: "Tests the work: runs tests, raises bugs, passes or fails a task",
  },
  marketer: {
    label: "Marketer",
    summary: "Takes the work to market: content, launch tasks, campaign notes",
  },
  viewer: {
    label: "Viewer",
    summary: "Reads the project and comments, but changes nothing",
  },
};

/** Assignment order: the roles people are most often added as come first. */
export const ASSIGNABLE_PROJECT_ROLES: readonly ProjectRole[] = [
  "developer",
  "designer",
  "qa",
  "marketer",
  "manager",
  "viewer",
];

export function projectRoleLabel(role: ProjectRole): string {
  return PROJECT_ROLE_META[role].label;
}
