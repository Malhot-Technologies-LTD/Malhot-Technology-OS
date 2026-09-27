import { describe, expect, it } from "vitest";

import type { Block } from "../content";
import { initialValues, type TemplateContext } from "../templates";
import { CONTRACT_TEMPLATES } from "./contracts";

const letterhead = {
  companyName: "Malhot Tech",
  tagline: "",
  address: "Kigali, Rwanda",
  email: "hello@malhot.com",
  phone: "",
  website: "",
  registration: "",
};

const bare: TemplateContext = { today: "2026-09-27", letterhead };

const withProject: TemplateContext = {
  ...bare,
  project: {
    key: "AS",
    name: "Attendance system",
    clientName: "Umoja Ltd",
    description: "A system to record staff attendance.",
    startDate: "2026-10-01",
    targetEndDate: "2026-12-15",
    milestones: [
      { title: "Design approved", due: "2026-10-15", done: false },
      { title: "Beta", due: null, done: false },
    ],
  },
};

function find(key: string) {
  const template = CONTRACT_TEMPLATES.find((candidate) => candidate.key === key);
  if (!template) throw new Error(`No template ${key}`);
  return template;
}

function tables(blocks: readonly Block[]) {
  return blocks.flatMap((block) => (block.kind === "table" ? [block] : []));
}

describe("contract templates", () => {
  it.each(CONTRACT_TEMPLATES.map((template) => [template.key, template] as const))(
    "%s builds in the agreement format with and without a project",
    (_, template) => {
      expect(template.category).toBe("Contracts & Legal");
      expect(template.legal).toBe(true);
      for (const context of [bare, withProject]) {
        const content = template.build(initialValues(template, context), context);
        expect(content.layout).toBe("contract");
        expect(content.blocks.some((block) => block.kind === "heading" && /^1\. [A-Z]/.test(block.text))).toBe(true);
        expect(content.blocks.at(-1)?.kind).toBe("signatures");
        expect(JSON.stringify(content)).not.toContain("undefined");
      }
    },
  );

  it("shows gaps instead of inventing facts", () => {
    const msa = find("master_services_agreement");
    const text = JSON.stringify(msa.build(initialValues(msa, bare), bare));
    expect(text).toContain("[Client]");
    expect(text).toContain("[CEO]");
    expect(msa.build(initialValues(msa, bare), bare).date).toBe("");
  });

  it("fills the statement of work from the project", () => {
    const sow = find("statement_of_work");
    const values = initialValues(sow, withProject);
    expect(values.reference).toBe("SOW/20260927");
    expect(values.projectName).toBe("Attendance system");
    const content = sow.build({ ...values, currency: "RWF" }, withProject);
    expect(content.subtitle).toBe("Attendance system");
    expect(tables(content.blocks)[0]?.rows).toEqual([
      ["Design approved", "15 October 2026", ""],
      ["Beta", "", ""],
    ]);
    const priced = sow.build({ ...values, milestones: "Launch | 2026-12-15 | 1,500,000" }, withProject);
    expect(tables(priced.blocks)[0]?.rows).toEqual([["Launch", "15 December 2026", "RWF 1,500,000"]]);
  });

  it("builds the SLA severity table from configurable defaults", () => {
    const sla = find("service_level_agreement");
    const values = initialValues(sla, bare);
    const content = sla.build(values, bare);
    const [severities] = tables(content.blocks);
    expect(severities?.columns).toEqual(["Severity", "Example", "Response", "Resolution target"]);
    expect(severities?.rows.map((row) => [row[0], row[2]])).toEqual([
      ["Critical", "1 hour"],
      ["High", "4 hours"],
      ["Medium", "1 business day"],
      ["Low", "2 business days"],
    ]);
    expect(JSON.stringify(content)).toContain("99.5% per calendar month");
    const custom = sla.build(
      { ...values, availability: "99.9%", severities: "P1 | Down | 30 minutes | 2 hours" },
      bare,
    );
    expect(JSON.stringify(custom)).toContain("99.9% per calendar month");
    expect(tables(custom.blocks)[0]?.rows).toEqual([["P1", "Down", "30 minutes", "2 hours"]]);
  });

  it("uses the configured breach deadline and cites Rwanda's data protection law", () => {
    const dpa = find("data_processing_agreement");
    const text = JSON.stringify(dpa.build({ ...initialValues(dpa, bare), breachHours: "12" }, bare));
    expect(text).toContain("within 12 hours");
    expect(text).toContain("Law No. 058/2021");
  });

  it("numbers change requests and makes chat messages non-binding", () => {
    const cr = find("change_request");
    const values = initialValues(cr, bare);
    expect(values.reference).toBe("CR/20260927");
    const content = cr.build(values, bare);
    expect(content.date).toBe("27 September 2026");
    expect(JSON.stringify(content)).toContain("WhatsApp");
  });
});
