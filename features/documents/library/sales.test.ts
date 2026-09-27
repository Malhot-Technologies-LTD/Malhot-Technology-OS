import { describe, expect, it } from "vitest";

import type { DocumentContent } from "../content";
import type { DocumentTemplate, TemplateContext, Values } from "../template-kit";
import { SALES_TEMPLATES } from "./sales";

const letterhead = {
  companyName: "Malhot Tech",
  tagline: "Your Vision. Our Technology. Real Solutions.",
  address: "Kigali, Rwanda",
  email: "hello@malhot.com",
  phone: "+250 788 113 456",
  website: "",
  registration: "TIN 123456789",
};

const bare: TemplateContext = { today: "2026-09-27", letterhead };

const withProject: TemplateContext = {
  ...bare,
  project: {
    key: "AS",
    name: "Attendance system",
    clientName: "Umoja Ltd",
    description: "A web system for recording staff attendance.",
    startDate: "2026-10-01",
    targetEndDate: "2026-12-15",
    managerName: "Aline Uwase",
    team: [
      { name: "Aline Uwase", role: "Project Manager" },
      { name: "Eric Niyonzima", role: "Developer" },
    ],
    milestones: [{ title: "Beta release", due: "2026-11-20", done: false }],
  },
};

function template(key: string): DocumentTemplate {
  const found = SALES_TEMPLATES.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`No template ${key}`);
  return found;
}

function defaults(subject: DocumentTemplate, context: TemplateContext): Values {
  const values: Values = {};
  for (const field of subject.fields) {
    if (field.type === "items") values[field.name] = [{ description: "", quantity: 1, unitPrice: 0 }];
    else values[field.name] = field.default ? field.default(context) : "";
  }
  return values;
}

const headings = (content: DocumentContent) =>
  content.blocks.flatMap((block) => (block.kind === "heading" ? [block.text] : []));

describe("sales templates", () => {
  it.each(SALES_TEMPLATES.map((subject) => [subject.key, subject] as const))(
    "%s builds without a project and shows gaps instead of facts",
    (_, subject) => {
      expect(subject.category).toBe("Sales & Clients");
      const content = subject.build(defaults(subject, bare), bare);
      expect(content.title.length).toBeGreaterThan(0);
      expect(JSON.stringify(content)).toMatch(/\[[A-Z][^\]]*\]/);
    },
  );

  it("defaults the proposal from the project and keeps the old field names", () => {
    const proposal = template("project_proposal");
    const values = defaults(proposal, withProject);
    expect(values).toMatchObject({
      clientName: "Umoja Ltd",
      projectName: "Attendance system",
      timeline: "1 October 2026 to 15 December 2026",
      phases: "Beta release | 2026-11-20 | ",
      team: "Aline Uwase | Project Manager\nEric Niyonzima | Developer",
    });
    for (const name of ["background", "approach", "phases", "timeline", "currency", "items", "validUntil"])
      expect(proposal.fields.some((field) => field.name === name)).toBe(true);
  });

  it("builds a full proposal from realistic values", () => {
    const proposal = template("project_proposal");
    const content = proposal.build(
      {
        ...defaults(proposal, withProject),
        background: "Attendance is recorded on paper.",
        approach: "A web app with QR check-in.",
        scope: "QR check-in\nReports",
        items: [{ description: "Build", quantity: 1, unitPrice: 4_500_000 }],
        validUntil: "2026-10-31",
        signatoryName: "J. Habimana",
      },
      withProject,
    );
    const text = JSON.stringify(content);
    expect(text).toContain("20 November 2026");
    expect(text).toContain("31 October 2026");
    expect(text).not.toContain("[Pricing]");
    expect(headings(content)).toEqual([
      "1. Executive summary",
      "2. The challenge",
      "3. Proposed solution",
      "4. Scope: features and modules",
      "5. Timeline",
      "6. Project team",
      "7. Pricing",
      "8. Payment terms",
      "9. Next steps",
      "10. Acceptance",
    ]);
  });

  it("opens proposals saved with the old one-per-line phases", () => {
    const proposal = template("project_proposal");
    const content = proposal.build({ phases: "Discovery\nBuild", timeline: "10 weeks from signing" }, bare);
    expect(content.blocks).toContainEqual({
      kind: "table",
      columns: ["Phase", "Timing", "Key output"],
      rows: [
        ["Discovery", "", ""],
        ["Build", "", ""],
      ],
    });
    expect(JSON.stringify(content)).toContain("10 weeks from signing");
  });

  it("tables the functional requirements", () => {
    const requirements = template("client_requirements");
    const content = requirements.build(
      { ...defaults(requirements, bare), functional: "FR-01 | QR check-in | Must have" },
      bare,
    );
    expect(content.blocks).toContainEqual({
      kind: "table",
      columns: ["ID", "Requirement", "Priority"],
      rows: [["FR-01", "QR check-in", "Must have"]],
    });
  });

  it("shortens the company profile into a capability statement", () => {
    const profile = template("company_profile");
    const projects = "A | Education | x\nB | Finance | y\nC | Commerce | z\nD | Agriculture | w";
    const full = profile.build({ ...defaults(profile, bare), projects }, bare);
    const short = profile.build({ ...defaults(profile, bare), projects, format: "Capability statement" }, bare);
    expect(full.title).toBe("Company Profile");
    expect(short.title).toBe("Capability Statement");
    expect(headings(full)).toContain("Industries we serve");
    expect(headings(short)).not.toContain("Industries we serve");
    const rows = (content: DocumentContent) => content.blocks.find((block) => block.kind === "table")?.rows.length ?? 0;
    expect(rows(full)).toBe(4);
    expect(rows(short)).toBe(3);
    expect(JSON.stringify(short)).toContain("TIN 123456789");
    expect(JSON.stringify(full)).toContain("Malhot Tech is a software company in Kigali");
  });
});
