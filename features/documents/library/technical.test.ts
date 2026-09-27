import { describe, expect, it } from "vitest";

import { initialValues } from "../templates";
import type { TemplateContext } from "../template-kit";
import { SECURITY_CHECKS, TECHNICAL_TEMPLATES, variableName } from "./technical";

const context: TemplateContext = {
  today: "2026-09-27",
  letterhead: {
    companyName: "Malhot Tech",
    tagline: "",
    address: "Kigali, Rwanda",
    email: "",
    phone: "",
    website: "",
    registration: "",
  },
  project: { key: "AS", name: "Attendance system", clientName: "Umoja Ltd", managerName: "Jean Habimana" },
};

const template = (key: string) => TECHNICAL_TEMPLATES.find((candidate) => candidate.key === key)!;

describe("technical templates", () => {
  it("defaults the project and manager from context", () => {
    const values = initialValues(template("technical_specification"), context);
    expect(values.projectName).toBe("Attendance system");
    expect(values.preparedBy).toBe("Jean Habimana");
  });

  it("counts the security checklist results", () => {
    const checklist = template("security_checklist");
    const values = {
      ...initialValues(checklist, context),
      authenticationStatus: "Pass",
      backupsStatus: "Fail",
      encryptionRestStatus: "N/A",
    };
    const content = checklist.build(values, context);
    const facts = Object.fromEntries(content.blocks.flatMap((block) => (block.kind === "facts" ? block.rows : [])));
    expect(facts.Result).toBe(`1 passed · 1 failed · 1 not applicable · ${SECURITY_CHECKS.length - 3} not checked`);
    const grid = content.blocks.find((block) => block.kind === "table");
    expect(grid?.kind === "table" && grid.rows.length).toBe(SECURITY_CHECKS.length);
    // A failure asks for actions instead of passing silently.
    expect(JSON.stringify(content)).toContain("[Action, owner and date for each failed check]");
  });

  it("never prints environment variable values in the runbook", () => {
    expect(variableName("DATABASE_URL=postgres://user:secret@host/db")).toBe("DATABASE_URL");
    const runbook = template("operations_runbook");
    const content = runbook.build(
      {
        ...initialValues(runbook, context),
        envVars: "DATABASE_URL = postgres://user:secret@host/db | Database\nRESEND_API_KEY | Email",
      },
      context,
    );
    const text = JSON.stringify(content);
    expect(text).not.toContain("postgres:");
    expect(text).toContain("RESEND_API_KEY");
  });

  it("builds without a project", () => {
    const bare = { ...context, project: null };
    for (const item of TECHNICAL_TEMPLATES) {
      const content = item.build(initialValues(item, bare), bare);
      expect(content.blocks.length).toBeGreaterThan(0);
      expect(JSON.stringify(content)).not.toContain("undefined");
    }
  });
});
