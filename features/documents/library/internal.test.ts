import { describe, expect, it } from "vitest";

import type { TemplateContext, Values } from "../template-kit";
import { INTERNAL_TEMPLATES } from "./internal";

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
};

function find(key: string) {
  const template = INTERNAL_TEMPLATES.find((candidate) => candidate.key === key);
  if (!template) throw new Error(`No template ${key}`);
  return template;
}

function defaults(key: string): Values {
  const values: Values = {};
  for (const field of find(key).fields) {
    values[field.name] = field.type !== "items" && field.default ? field.default(context) : "";
  }
  return values;
}

describe("Internal templates", () => {
  it.each(INTERNAL_TEMPLATES.map((template) => [template.key, template] as const))(
    "%s builds from its defaults",
    (key, template) => {
      const content = template.build(defaults(key), context);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.blocks.length).toBeGreaterThan(0);
      expect(template.category).toBe("Internal");
    },
  );

  it("shows the asset table from the rows given, or a gap", () => {
    const empty = find("asset_handover_form").build(defaults("asset_handover_form"), context);
    expect(JSON.stringify(empty)).toContain("[Assets]");
    const content = find("asset_handover_form").build(
      { ...defaults("asset_handover_form"), assets: "Laptop | MAL-IT-014 | Good | 2026-10-01" },
      context,
    );
    const table = content.blocks.find((block) => block.kind === "table");
    expect(table && table.kind === "table" ? table.rows : []).toEqual([["Laptop", "MAL-IT-014", "Good", "2026-10-01"]]);
  });

  it("puts the confidentiality undertaking in the agreement format", () => {
    const content = find("confidentiality_undertaking").build(defaults("confidentiality_undertaking"), context);
    expect(content.layout).toBe("contract");
    expect(content.date).toBe("");
    const headings = content.blocks.flatMap((block) => (block.kind === "heading" ? [block.text] : []));
    expect(headings[0]).toBe("1. UNDERTAKING");
  });

  it("ends the authorisation purpose as a sentence and leaves a specimen signature", () => {
    const content = find("authorization_letter").build(
      { ...defaults("authorization_letter"), purpose: "collect documents from RDB" },
      context,
    );
    const text = JSON.stringify(content);
    expect(text).toContain("to collect documents from RDB.");
    expect(text).toContain("Specimen signature of the authorised person");
  });
});
