import { describe, expect, it } from "vitest";

import type { Block } from "../content";
import { initialValues } from "../templates";
import type { TemplateContext } from "../template-kit";
import { SUPPORT_TEMPLATES, incidentDuration } from "./support";

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
  project: { key: "AS", name: "Attendance system", clientName: "Umoja Ltd" },
};

const template = (key: string) => SUPPORT_TEMPLATES.find((candidate) => candidate.key === key)!;
const facts = (blocks: readonly Block[]) =>
  Object.fromEntries(blocks.flatMap((block) => (block.kind === "facts" ? block.rows : [])));

describe("incidentDuration", () => {
  it("works out hours and minutes between two times", () => {
    expect(incidentDuration("2026-09-27 14:05", "2026-09-27 16:20")).toBe("2 h 15 min");
    expect(incidentDuration("2026-09-27T14:05", "2026-09-27T14:50:30")).toBe("45 min");
  });

  it("spans days and midnight", () => {
    expect(incidentDuration("2026-09-27 23:30", "2026-09-29 01:30")).toBe("1 d 2 h");
    expect(incidentDuration("2026-09-27 10:00", "2026-09-27 10:00")).toBe("0 min");
  });

  it("gives up rather than guessing", () => {
    expect(incidentDuration("2026-09-27 16:00", "2026-09-27 14:00")).toBeNull();
    expect(incidentDuration("yesterday afternoon", "2026-09-27 14:00")).toBeNull();
    expect(incidentDuration("2026-09-27 25:00", "2026-09-27 26:00")).toBeNull();
    expect(incidentDuration("2026-09-27 14:00", null)).toBeNull();
  });
});

describe("support templates", () => {
  it("prints the incident duration, or a gap when it cannot be worked out", () => {
    const incident = template("incident_report");
    const values = { ...initialValues(incident, context), startTime: "2026-09-27 14:05", endTime: "2026-09-27 16:20" };
    const filled = facts(incident.build(values, context).blocks);
    expect(filled.Duration).toBe("2 h 15 min");
    expect(filled.Started).toBe("27 September 2026, 14:05");

    const open = facts(incident.build({ ...values, endTime: "" }, context).blocks);
    expect(open.Duration).toBe("[Duration]");
    expect(open.Severity).toBe("[Severity]");
  });

  it("defaults client and system from the project", () => {
    const request = template("support_request");
    const values = initialValues(request, context);
    expect(values.clientName).toBe("Umoja Ltd");
    expect(values.system).toBe("Attendance system");
    expect(values.requestId).toBe("SR/20260927");
    expect(facts(request.build(values, context).blocks).Priority).toBe("[Priority]");
  });

  it("builds without a project", () => {
    const bare = { ...context, project: null };
    for (const item of SUPPORT_TEMPLATES) {
      const content = item.build(initialValues(item, bare), bare);
      expect(content.blocks.length).toBeGreaterThan(0);
      expect(JSON.stringify(content)).not.toContain("undefined");
    }
  });
});
