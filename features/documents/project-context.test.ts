import { describe, expect, it } from "vitest";

import { toTemplateProject } from "./project-context";
import { findTemplate, initialValues } from "./templates";

const project = {
  key: "AS",
  name: "Attendance system",
  client: { id: "c1", name: "Umoja Ltd" },
  description: "Staff check-in by phone",
  start_date: "2026-10-01",
  target_end_date: "2027-01-31",
  manager: { id: "u1", full_name: "Aline Uwase" },
};

const members = [
  {
    user_id: "u1",
    role: "manager" as const,
    created_at: "",
    profile: { id: "u1", full_name: "Aline Uwase", title: null, avatar_url: null },
  },
  {
    user_id: "u2",
    role: "qa" as const,
    created_at: "",
    profile: { id: "u2", full_name: "Eric Mugisha", title: null, avatar_url: null },
  },
  { user_id: "u3", role: "developer" as const, created_at: "", profile: null },
];

const milestones = [
  { title: "Design signed off", due_date: "2026-10-20", completed_at: "2026-10-19T09:00:00Z" },
  { title: "Beta", due_date: "2026-12-01", completed_at: null },
];

describe("toTemplateProject", () => {
  const result = toTemplateProject(project, members, milestones);

  it("maps the project's own facts", () => {
    expect(result).toMatchObject({
      key: "AS",
      clientName: "Umoja Ltd",
      startDate: "2026-10-01",
      targetEndDate: "2027-01-31",
      managerName: "Aline Uwase",
    });
  });

  it("names the team by project role and skips members without a readable profile", () => {
    expect(result.team).toEqual([
      { name: "Aline Uwase", role: "Manager" },
      { name: "Eric Mugisha", role: "QA" },
    ]);
  });

  it("marks completed milestones done", () => {
    expect(result.milestones).toEqual([
      { title: "Design signed off", due: "2026-10-20", done: true },
      { title: "Beta", due: "2026-12-01", done: false },
    ]);
  });

  it("prefills a template from the project", () => {
    const minutes = findTemplate("meeting_minutes")!;
    const values = initialValues(minutes, { today: "2026-09-27", letterhead: {} as never, project: result });
    expect(values.chair).toBe("Aline Uwase");
    expect(values.attendees).toBe("Aline Uwase (Manager)\nEric Mugisha (QA)");
  });
});
