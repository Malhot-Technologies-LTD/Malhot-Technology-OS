import { describe, expect, it } from "vitest";

import { initialValues, type TemplateContext } from "../templates";
import { PROJECT_TEMPLATES } from "./projects";

const letterhead = {
  companyName: "Malhot Tech",
  tagline: "",
  address: "Kigali, Rwanda",
  email: "",
  phone: "",
  website: "",
  registration: "",
};

const withProject: TemplateContext = {
  today: "2026-09-27",
  letterhead,
  project: {
    key: "AS",
    name: "Attendance system",
    clientName: "Umoja Ltd",
    description: "A check-in system for Umoja's staff.",
    startDate: "2026-09-01",
    targetEndDate: "2026-12-15",
    managerName: "Aline Uwase",
    team: [
      { name: "Aline Uwase", role: "Project manager" },
      { name: "Eric Nkurunziza", role: "Developer" },
    ],
    milestones: [
      { title: "Design approved", due: "2026-10-01", done: true },
      { title: "Launch", due: null, done: false },
    ],
  },
};

const withoutProject: TemplateContext = { today: "2026-09-27", letterhead, project: null };

const template = (key: string) => PROJECT_TEMPLATES.find((candidate) => candidate.key === key)!;

describe("project templates", () => {
  it("have unique keys, all in the Projects category", () => {
    expect(new Set(PROJECT_TEMPLATES.map((candidate) => candidate.key)).size).toBe(PROJECT_TEMPLATES.length);
    for (const candidate of PROJECT_TEMPLATES) expect(candidate.category).toBe("Projects");
  });

  it.each(PROJECT_TEMPLATES.map((candidate) => [candidate.key, candidate] as const))(
    "%s builds with and without a project",
    (_, candidate) => {
      for (const context of [withProject, withoutProject]) {
        const content = candidate.build(initialValues(candidate, context), context);
        expect(content.title.length).toBeGreaterThan(0);
        expect(content.blocks.length).toBeGreaterThan(0);
        expect(JSON.stringify(content)).not.toContain("undefined");
      }
    },
  );

  it("prefills the charter from the project: people, dates and milestones", () => {
    const charter = template("project_charter");
    const values = initialValues(charter, withProject);
    expect(values).toMatchObject({
      projectName: "Attendance system",
      clientName: "Umoja Ltd",
      projectManager: "Aline Uwase",
      purpose: "A check-in system for Umoja's staff.",
      startDate: "2026-09-01",
      targetEndDate: "2026-12-15",
      team: "Aline Uwase | Project manager\nEric Nkurunziza | Developer",
      milestones: "Design approved | 2026-10-01 | Done\nLaunch |  | Open",
    });
    const blocks = charter.build(values, withProject).blocks;
    expect(blocks).toContainEqual({
      kind: "table",
      columns: ["Milestone", "Due", "Status"],
      rows: [
        ["Design approved", "1 October 2026", "Done"],
        ["Launch", "", "Open"],
      ],
    });
    expect(blocks).toContainEqual({
      kind: "table",
      columns: ["Name", "Role"],
      rows: [
        ["Aline Uwase", "Project manager"],
        ["Eric Nkurunziza", "Developer"],
      ],
    });
  });

  it("shows gaps instead of project data when there is no project", () => {
    const charter = template("project_charter");
    const values = initialValues(charter, withoutProject);
    expect(values.projectName).toBe("");
    expect(values.team).toBe("");
    const text = JSON.stringify(charter.build(values, withoutProject));
    expect(text).toContain("[Project]");
    expect(text).toContain("[Project team]");
    expect(text).toContain("[Milestones]");
  });

  it("never assumes a status report's overall status", () => {
    const report = template("project_status_report");
    const values = initialValues(report, withProject);
    expect(values.overallStatus).toBe("");
    expect(JSON.stringify(report.build(values, withProject))).toContain("[Overall status]");
  });

  it("reads old minutes' actions written as 'what — who — by when'", () => {
    const minutes = template("meeting_minutes");
    const content = minutes.build(
      {
        ...initialValues(minutes, withoutProject),
        actions: "1. Send wireframes — Aline — 2026-10-03\nBook venue | Eric | Friday",
      },
      withoutProject,
    );
    expect(content.blocks).toContainEqual({
      kind: "table",
      columns: ["Action", "Responsible", "Deadline"],
      rows: [
        ["Send wireframes", "Aline", "3 October 2026"],
        ["Book venue", "Eric", "Friday"],
      ],
    });
  });

  it("keeps the handover certificate's original fields so saved certificates still build", () => {
    const handover = template("handover_certificate");
    const names = handover.fields.map((field) => field.name);
    for (const name of [
      "reference",
      "date",
      "clientName",
      "projectName",
      "deliverables",
      "handedOver",
      "warrantyEnds",
      "remarks",
      "signatoryName",
      "signatoryTitle",
      "clientSignatory",
    ])
      expect(names).toContain(name);
    const values = initialValues(handover, withProject);
    expect(values.completionDate).toBe("2026-12-15");
    const content = handover.build(
      { ...values, currency: "RWF", finalAmount: "4500000", outstandingBalance: "0", sourceCode: "GitHub repo" },
      withProject,
    );
    const text = JSON.stringify(content);
    expect(text).toContain("RWF 4,500,000");
    expect(text).toContain("RWF 0");
    expect(content.blocks).toContainEqual({
      kind: "table",
      columns: ["Item", "Details"],
      rows: [["Source code", "GitHub repo"]],
    });
  });

  it("counts passed and failed UAT cases", () => {
    const uat = template("uat_acceptance");
    const content = uat.build(
      {
        ...initialValues(uat, withProject),
        testCases: "TC-01 | Check in | Recorded | Recorded | Pass |\nTC-02 | Export | CSV | Error | Fail | Bug #12",
        overallResult: "Accepted with conditions",
      },
      withProject,
    );
    const text = JSON.stringify(content);
    expect(text).toContain("2 (1 passed, 1 failed)");
    expect(text).toContain("on condition that the outstanding issues");
  });
});
