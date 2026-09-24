import { describe, expect, it } from "vitest";

import {
  BUDGET_RANGES,
  briefReference,
  composeBriefMessage,
  projectBriefSchema,
  type ProjectBriefOutput,
} from "./schemas";
import { budgetOptions } from "@/content/site";

const valid = {
  need: "new-product",
  projectTypes: ["website", "ui-ux"],
  title: "Depot dispatch tool",
  description: "We run three depots on spreadsheets and need one place to see every order.",
  budget: "15k-50k",
  timeline: "1-3m",
  contactName: "Aline K",
  contactEmail: "  Aline@Example.COM ",
  contactPhone: "+250 788 000 000",
  company: "Depot Co",
};

describe("projectBriefSchema", () => {
  it("accepts a complete brief and normalises the email", () => {
    const parsed = projectBriefSchema.parse(valid);
    expect(parsed.contactEmail).toBe("aline@example.com");
  });

  it("requires at least one project type", () => {
    expect(projectBriefSchema.safeParse({ ...valid, projectTypes: [] }).success).toBe(false);
  });

  it("rejects a budget the inquiries table would not accept", () => {
    // The website repo shipped "<5k" and "40k+"; those values would be written
    // straight into `inquiries.budget_range` and fail its check constraint.
    expect(projectBriefSchema.safeParse({ ...valid, budget: "<5k" }).success).toBe(false);
    expect(projectBriefSchema.safeParse({ ...valid, budget: "40k+" }).success).toBe(false);
  });

  it("rejects an unknown need or timeline rather than storing free text", () => {
    expect(projectBriefSchema.safeParse({ ...valid, need: "something-else" }).success).toBe(false);
    expect(projectBriefSchema.safeParse({ ...valid, timeline: "next year" }).success).toBe(false);
  });

  it("holds the description to a length worth replying to", () => {
    expect(projectBriefSchema.safeParse({ ...valid, description: "hi" }).success).toBe(false);
  });
});

/**
 * The wizard and the action have to agree on the budget values or a completed
 * brief is rejected at the last step, after six screens of work. This is the
 * one place that catches that.
 */
describe("the wizard's budget options", () => {
  it("offers exactly the values the schema accepts", () => {
    expect(budgetOptions.map((o) => o.value).sort()).toEqual(BUDGET_RANGES.map((b) => b.value).sort());
  });

  it("parses every option the wizard can produce", () => {
    for (const option of budgetOptions) {
      expect(projectBriefSchema.safeParse({ ...valid, budget: option.value }).success).toBe(true);
    }
  });
});

describe("composeBriefMessage", () => {
  const brief = projectBriefSchema.parse(valid) as ProjectBriefOutput;

  it("writes labels, not the stored values", () => {
    const message = composeBriefMessage(brief);
    expect(message).toContain("Looking for: Build a new product");
    expect(message).toContain("Type: Website, UI/UX Design");
    expect(message).toContain("Timeline: 1 – 3 months");
    expect(message).toContain("Budget: $15,000 to $50,000");
  });

  it("keeps the description last so an admin reads the prose after the facts", () => {
    const message = composeBriefMessage(brief);
    expect(message.endsWith(brief.description)).toBe(true);
  });

  it("omits the phone line when no number was given", () => {
    const withoutPhone = composeBriefMessage({ ...brief, contactPhone: undefined });
    expect(withoutPhone).not.toContain("Phone:");
  });

  it("fits the message column the inquiries schema allows", () => {
    expect(composeBriefMessage(brief).length).toBeLessThanOrEqual(5000);
  });
});

describe("briefReference", () => {
  it("is derived from the inquiry id, so it can be traced back", () => {
    expect(briefReference("3f2a91bc-0000-4000-8000-000000000000")).toBe("MAL-3F2A91");
  });

  it("is stable for the same id", () => {
    const id = "aabbccdd-1111-4000-8000-000000000000";
    expect(briefReference(id)).toBe(briefReference(id));
  });

  it("differs for different inquiries", () => {
    expect(briefReference("11111111-0000-4000-8000-000000000000")).not.toBe(
      briefReference("22222222-0000-4000-8000-000000000000"),
    );
  });
});
