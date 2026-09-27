import { describe, expect, it } from "vitest";

import type { TemplateContext, Values } from "../template-kit";
import { HR_TEMPLATES, workingDays } from "./hr";

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
  const template = HR_TEMPLATES.find((candidate) => candidate.key === key);
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

function facts(key: string, values: Values): Record<string, string> {
  const content = find(key).build(values, context);
  const block = content.blocks.find((candidate) => candidate.kind === "facts");
  return block && block.kind === "facts" ? Object.fromEntries(block.rows) : {};
}

describe("workingDays", () => {
  it("counts Monday to Friday, both ends included", () => {
    // Mon 28 Sep – Fri 2 Oct 2026
    expect(workingDays("2026-09-28", "2026-10-02")).toBe(5);
    // Mon 28 Sep – Mon 12 Oct 2026: two full weeks and a day
    expect(workingDays("2026-09-28", "2026-10-12")).toBe(11);
    // Fri 2 Oct – Mon 5 Oct 2026 spans a weekend
    expect(workingDays("2026-10-02", "2026-10-05")).toBe(2);
  });

  it("counts a single day, and a weekend as none", () => {
    expect(workingDays("2026-09-28", "2026-09-28")).toBe(1);
    expect(workingDays("2026-10-03", "2026-10-04")).toBe(0);
  });

  it("crosses months and leap days", () => {
    // Mon 28 Feb – Fri 3 Mar 2028, across 29 February
    expect(workingDays("2028-02-28", "2028-03-03")).toBe(5);
  });

  it("returns null for missing, invalid or reversed dates", () => {
    expect(workingDays(null, "2026-10-02")).toBeNull();
    expect(workingDays("2026-09-28", "")).toBeNull();
    expect(workingDays("2026-02-30", "2026-03-02")).toBeNull();
    expect(workingDays("28/09/2026", "2026-10-02")).toBeNull();
    expect(workingDays("2026-10-02", "2026-09-28")).toBeNull();
  });
});

describe("HR templates", () => {
  it.each(HR_TEMPLATES.map((template) => [template.key, template] as const))(
    "%s builds from its defaults",
    (key, template) => {
      const content = template.build(defaults(key), context);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.blocks.length).toBeGreaterThan(0);
      expect(template.category).toBe("HR & Recruitment");
    },
  );

  it("names the person with employeeName and position where a person is concerned", () => {
    for (const key of [
      "onboarding_checklist",
      "leave_request",
      "performance_review",
      "promotion_salary_letter",
      "offboarding_checklist",
      "disciplinary_notice",
    ]) {
      const names = find(key).fields.map((field) => field.name);
      expect(names).toContain("employeeName");
      expect(names).toContain("position");
    }
  });

  it("works out leave days from the dates, or shows a gap", () => {
    expect(facts("leave_request", defaults("leave_request"))["Working days"]).toBe("[Number of working days]");
    const values = { ...defaults("leave_request"), startDate: "2026-09-28", endDate: "2026-10-09" };
    expect(facts("leave_request", values)["Working days"]).toBe("10 working days");
    expect(facts("leave_request", { ...values, endDate: "2026-09-28" })["Working days"]).toBe("1 working day");
    expect(facts("leave_request", { ...values, days: "9 (1 public holiday)" })["Working days"]).toBe(
      "9 (1 public holiday)",
    );
  });

  it("words the promotion letter by type", () => {
    const base = { ...defaults("promotion_salary_letter"), employeeName: "Aline Uwase", position: "Developer" };
    const promotion = find("promotion_salary_letter").build({ ...base, newPosition: "Senior Developer" }, context);
    expect(promotion.title).toBe("Letter of Promotion");
    expect(JSON.stringify(promotion)).toContain("Your compensation remains unchanged.");

    const salary = find("promotion_salary_letter").build({ ...base, adjustmentType: "Salary adjustment" }, context);
    expect(salary.title).toBe("Salary Adjustment");
    expect(JSON.stringify(salary)).toContain("[New compensation]");
    expect(JSON.stringify(salary)).not.toContain("New Position");
  });

  it("asks the employee to acknowledge receipt of a warning, not agreement", () => {
    const content = find("disciplinary_notice").build(defaults("disciplinary_notice"), context);
    const text = JSON.stringify(content);
    expect(text).toContain("receipt of this notice only");
    expect(text).toContain("[Employee's full name]");
  });
});
