import { describe, expect, it } from "vitest";

import {
  DEPARTMENTS,
  POSITIONS,
  POSITION_GROUPS,
  clausesForPositions,
  findPosition,
  positionTitles,
} from "./positions";
import { ROLE_NAMES } from "./roles";
import { findTemplate, initialValues, missingFields, type TemplateContext } from "./templates";

const context: TemplateContext = {
  today: "2026-09-27",
  letterhead: {
    companyName: "Malhot Technologies",
    tagline: "",
    address: "Kigali, Rwanda",
    email: "",
    phone: "",
    website: "",
    registration: "",
  },
  project: null,
};

describe("positions", () => {
  it("are unique, in a known department, and worded from known clause profiles", () => {
    expect(new Set(POSITIONS.map((position) => position.title.toLowerCase())).size).toBe(POSITIONS.length);
    for (const position of POSITIONS) {
      expect(DEPARTMENTS, position.title).toContain(position.department);
      expect(position.roles.length, position.title).toBeGreaterThan(0);
      for (const role of position.roles) expect(ROLE_NAMES, position.title).toContain(role);
    }
    expect(POSITION_GROUPS.flatMap((group) => group.options)).toHaveLength(POSITIONS.length);
  });

  it("covers leadership, hardware and administration", () => {
    for (const title of [
      "Chief Executive Officer (CEO)",
      "Project Manager",
      "Hardware Engineer",
      "Accountant",
      "Human Resources Manager",
      "Office Manager",
    ])
      expect(findPosition(title), title).not.toBeNull();
    expect(findPosition("chief executive officer (ceo)")?.title).toBe("Chief Executive Officer (CEO)");
  });

  it("reads one title per line, each once", () => {
    expect(positionTitles("CEO\n\n Software Engineer \nCEO")).toEqual(["CEO", "Software Engineer"]);
    expect(positionTitles(undefined)).toEqual([]);
  });

  it("gives a CTO both the executive and the technical clauses", () => {
    const cto = clausesForPositions(["Chief Technology Officer (CTO)"], null);
    expect(cto.responsibilities).toContain("setting strategy, goals and budgets");
    expect(cto.responsibilities).toContain("software development");
    expect(cto.ipHeading).toBe("Source code & IP ownership");
  });

  it("combines the clauses of several positions", () => {
    const both = clausesForPositions(["Chief Executive Officer (CEO)", "Accountant"], null);
    expect(both.responsibilities).toContain("representing the company");
    expect(both.responsibilities).toContain("bookkeeping");
    expect(both.subtitle).toBe("Executive / Management & Finance & Accounting / Administrative Role");
  });

  it("words a typed title from the 'clauses like' choice, and keeps old documents' role", () => {
    expect(clausesForPositions(["Chief Vibes Officer"], "Designer / Creative").subtitle).toBe(
      "Designer / Creative Role",
    );
    // An offer saved before positions: free-text title plus the old role picker.
    expect(clausesForPositions(["Developer"], "Social Media Manager").subtitle).toBe(
      "Social Media Manager / Marketing Role",
    );
    // A listed title ignores the leftover choice.
    expect(clausesForPositions(["Accountant"], "Designer / Creative").subtitle).toBe(
      "Finance & Accounting / Administrative Role",
    );
  });

  it("asks 'clauses like' only for a title that is not listed", () => {
    const offer = findTemplate("offer_letter")!;
    const base = initialValues(offer, context);
    const clausesLike = (position: string) =>
      missingFields(offer, { ...base, position, roleType: "" }).includes("Contract clauses like");
    expect(clausesLike("Accountant")).toBe(false);
    expect(clausesLike("Chief Vibes Officer")).toBe(true);
    expect(missingFields(offer, { ...base, position: "" })).toContain("Position");
  });
});
